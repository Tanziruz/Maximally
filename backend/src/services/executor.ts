import type {
  WorkflowDefinition,
  WorkflowStep,
  HttpRequestConfig,
  SendEmailConfig,
  TransformDataConfig,
  DelayConfig,
  TriggerType,
} from '../types/index.js';
import {
  getWorkflowById,
  updateExecution,
  createStepExecution,
  updateStepExecution,
} from './workflows.js';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// Template engine for variable substitution
function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value: any = context;
    
    for (const key of keys) {
      if (value === undefined || value === null) {
        console.log(`❌ Template resolution failed at key "${key}". Available keys:`, Object.keys(value || {}));
        return match; // Keep original if path not found
      }
      value = value[key];
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value !== undefined ? String(value) : match;
  });
}

function resolveConfigTemplates(config: any, context: Record<string, any>): any {
  if (typeof config === 'string') {
    return resolveTemplate(config, context);
  }
  
  if (Array.isArray(config)) {
    return config.map(item => resolveConfigTemplates(item, context));
  }
  
  if (typeof config === 'object' && config !== null) {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      resolved[key] = resolveConfigTemplates(value, context);
    }
    return resolved;
  }
  
  return config;
}

// Step executors
async function executeHttpRequest(
  config: HttpRequestConfig,
  context: Record<string, any>
): Promise<any> {
  const resolvedConfig = resolveConfigTemplates(config, context) as HttpRequestConfig;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...resolvedConfig.headers,
  };

  // Handle authentication
  if (resolvedConfig.auth) {
    switch (resolvedConfig.auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${resolvedConfig.auth.credentials.token}`;
        break;
      case 'basic':
        const basicAuth = Buffer.from(
          `${resolvedConfig.auth.credentials.username}:${resolvedConfig.auth.credentials.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
        break;
      case 'api_key':
        headers[resolvedConfig.auth.credentials.headerName || 'X-API-Key'] = 
          resolvedConfig.auth.credentials.key;
        break;
    }
  }

  const fetchOptions: RequestInit = {
    method: resolvedConfig.method,
    headers,
  };

  if (['POST', 'PUT', 'PATCH'].includes(resolvedConfig.method) && resolvedConfig.body) {
    fetchOptions.body = typeof resolvedConfig.body === 'string' 
      ? resolvedConfig.body 
      : JSON.stringify(resolvedConfig.body);
  }

  console.log(`🌐 Making ${resolvedConfig.method} request to: ${resolvedConfig.url}`);
  
  let response;
  try {
    response = await fetch(resolvedConfig.url, fetchOptions);
  } catch (error: any) {
    console.error(`❌ HTTP Request failed:`, {
      url: resolvedConfig.url,
      method: resolvedConfig.method,
      error: error.message,
      cause: error.cause?.message,
    });
    throw error;
  }
  
  let responseBody: any;
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  console.log(`✅ Response received: ${response.status} ${response.statusText}`);

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseBody,
  };
}

async function executeSendEmail(
  config: SendEmailConfig,
  context: Record<string, any>
): Promise<any> {
  const resolvedConfig = resolveConfigTemplates(config, context) as SendEmailConfig;

  // Prepare recipients
  const to = Array.isArray(resolvedConfig.to) ? resolvedConfig.to : [resolvedConfig.to];
  const cc = resolvedConfig.cc 
    ? (Array.isArray(resolvedConfig.cc) ? resolvedConfig.cc : [resolvedConfig.cc])
    : undefined;
  const bcc = resolvedConfig.bcc
    ? (Array.isArray(resolvedConfig.bcc) ? resolvedConfig.bcc : [resolvedConfig.bcc])
    : undefined;

  // Ensure subject exists
  const subject = resolvedConfig.subject?.trim() || 'No Subject';

  // Send email using SendGrid
  const emailOptions: any = {
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    to,
    subject,
  };

  if (cc && cc.length > 0) {
    emailOptions.cc = cc;
  }

  if (bcc && bcc.length > 0) {
    emailOptions.bcc = bcc;
  }

  if (resolvedConfig.isHtml) {
    emailOptions.html = resolvedConfig.body;
  } else {
    emailOptions.text = resolvedConfig.body;
  }

  try {
    const result = await sgMail.send(emailOptions);
    return {
      messageId: result[0]?.headers['x-message-id'],
      success: true,
    };
  } catch (error: any) {
    console.error('SendGrid API Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.body,
    });
    throw new Error(`Email sending failed: ${error.response?.body?.errors?.[0]?.message || error.message}`);
  }
}

async function executeTransformData(
  config: TransformDataConfig,
  context: Record<string, any>
): Promise<any> {
  const resolvedConfig = resolveConfigTemplates(config, context) as TransformDataConfig;
  
  // Simple expression evaluation using template resolution
  // For more complex transformations, you could use a proper expression library
  const result = resolveTemplate(resolvedConfig.expression, context);
  
  try {
    // Try to parse as JSON if it looks like JSON
    return JSON.parse(result);
  } catch {
    return result;
  }
}

async function executeDelay(config: DelayConfig): Promise<any> {
  const multipliers: Record<string, number> = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  const delayMs = config.duration * multipliers[config.unit];
  
  // Cap delay at 5 minutes for safety
  const cappedDelay = Math.min(delayMs, 5 * 60 * 1000);
  
  await new Promise(resolve => setTimeout(resolve, cappedDelay));
  
  return { delayed: cappedDelay };
}

async function executeStep(
  step: WorkflowStep,
  context: Record<string, any>
): Promise<any> {
  switch (step.type) {
    case 'http_request':
      return executeHttpRequest(step.config as HttpRequestConfig, context);
    case 'send_email':
      return executeSendEmail(step.config as SendEmailConfig, context);
    case 'transform_data':
      return executeTransformData(step.config as TransformDataConfig, context);
    case 'delay':
      return executeDelay(step.config as DelayConfig);
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

// Main workflow executor
export async function executeWorkflow(
  workflowId: string,
  executionId: string,
  triggerType: TriggerType,
  triggerData?: Record<string, any>
): Promise<{ success: boolean; results: Record<string, any> }> {
  const workflow = await getWorkflowById(workflowId);
  
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const definition = workflow.workflow_definition as WorkflowDefinition;
  
  // Mark execution as running
  await updateExecution(executionId, {
    status: 'running',
    started_at: new Date(),
  });

  // Execution context with trigger data and step results
  const context: Record<string, any> = {
    trigger: {
      type: triggerType,
      data: triggerData || {},
    },
  };

  const results: Record<string, any> = {};
  let hasError = false;
  let errorMessage = '';

  // Execute steps in order
  for (const step of definition.steps) {
    const stepExecution = await createStepExecution(
      executionId,
      step.id,
      step.type,
      { context: { ...context } }
    );

    await updateStepExecution(stepExecution.id, {
      status: 'running',
      started_at: new Date(),
    });

    try {
      const result = await executeStep(step, context);
      
      // Store result in context for subsequent steps
      context[step.id] = { response: result };
      results[step.id] = result;

      await updateStepExecution(stepExecution.id, {
        status: 'completed',
        output_data: result,
        completed_at: new Date(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      hasError = true;
      errorMessage = `Step ${step.id} failed: ${errorMsg}`;

      console.error(`❌ Step execution error:`, {
        stepId: step.id,
        stepType: step.type,
        error: errorMsg,
        stack: errorStack,
      });

      await updateStepExecution(stepExecution.id, {
        status: 'failed',
        error: errorMsg,
        completed_at: new Date(),
      });

      // Stop execution on error (could be configurable)
      break;
    }
  }

  // Update final execution status
  await updateExecution(executionId, {
    status: hasError ? 'failed' : 'completed',
    completed_at: new Date(),
    error: hasError ? errorMessage : null,
  });

  return {
    success: !hasError,
    results,
  };
}

// Test workflow with sample data (dry run)
export async function testWorkflow(
  definition: WorkflowDefinition,
  sampleTriggerData?: Record<string, any>
): Promise<{ success: boolean; results: Record<string, any>; errors: string[] }> {
  const context: Record<string, any> = {
    trigger: {
      type: definition.trigger.type,
      data: sampleTriggerData || {},
    },
  };

  const results: Record<string, any> = {};
  const errors: string[] = [];

  for (const step of definition.steps) {
    try {
      // For testing, we simulate some steps instead of actually executing
      if (step.type === 'send_email') {
        results[step.id] = {
          simulated: true,
          message: 'Email would be sent',
          config: resolveConfigTemplates(step.config, context),
        };
      } else if (step.type === 'delay') {
        results[step.id] = {
          simulated: true,
          message: 'Delay would occur',
          config: step.config,
        };
      } else {
        const result = await executeStep(step, context);
        context[step.id] = { response: result };
        results[step.id] = result;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Step ${step.id}: ${errorMsg}`);
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  };
}
