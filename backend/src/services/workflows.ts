import { query } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  Workflow,
  WorkflowDefinition,
  WorkflowExecution,
  StepExecution,
  TriggerType,
} from '../types/index.js';
import { addScheduledJob, removeScheduledJob } from '../lib/queue.js';

// Workflow CRUD operations

export async function createWorkflow(
  userId: string,
  name: string,
  description: string | null,
  workflowDefinition: WorkflowDefinition
): Promise<Workflow> {
  const webhookId = workflowDefinition.trigger.type === 'webhook' ? uuidv4() : null;
  
  const result = await query<Workflow>(
    `INSERT INTO workflows (user_id, name, description, workflow_definition, webhook_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, name, description, JSON.stringify(workflowDefinition), webhookId]
  );
  
  return result.rows[0];
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const result = await query<Workflow>(
    'SELECT * FROM workflows WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getWorkflowByWebhookId(webhookId: string): Promise<Workflow | null> {
  const result = await query<Workflow>(
    'SELECT * FROM workflows WHERE webhook_id = $1 AND is_active = true',
    [webhookId]
  );
  return result.rows[0] || null;
}

export async function getWorkflowsByUserId(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ workflows: Workflow[]; total: number }> {
  const offset = (page - 1) * limit;
  
  const [workflowsResult, countResult] = await Promise.all([
    query<Workflow>(
      `SELECT * FROM workflows WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM workflows WHERE user_id = $1',
      [userId]
    ),
  ]);
  
  return {
    workflows: workflowsResult.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

export async function updateWorkflow(
  id: string,
  updates: Partial<Pick<Workflow, 'name' | 'description' | 'workflow_definition' | 'status' | 'is_active'>>
): Promise<Workflow | null> {
  const setClause: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClause.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClause.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.workflow_definition !== undefined) {
    setClause.push(`workflow_definition = $${paramIndex++}`);
    values.push(JSON.stringify(updates.workflow_definition));
  }
  if (updates.status !== undefined) {
    setClause.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.is_active !== undefined) {
    setClause.push(`is_active = $${paramIndex++}`);
    values.push(updates.is_active);
  }

  if (setClause.length === 0) {
    return getWorkflowById(id);
  }

  setClause.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<Workflow>(
    `UPDATE workflows SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  const result = await query('DELETE FROM workflows WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function activateWorkflow(id: string): Promise<Workflow | null> {
  const workflow = await getWorkflowById(id);
  if (!workflow) return null;

  const definition = workflow.workflow_definition as WorkflowDefinition;
  
  // If schedule trigger, set up cron job
  if (definition.trigger.type === 'schedule') {
    await addScheduledJob(id, definition.trigger.cron, `schedule-${id}`);
  }

  return updateWorkflow(id, { is_active: true, status: 'active' });
}

export async function deactivateWorkflow(id: string): Promise<Workflow | null> {
  const workflow = await getWorkflowById(id);
  if (!workflow) return null;

  const definition = workflow.workflow_definition as WorkflowDefinition;
  
  // If schedule trigger, remove cron job
  if (definition.trigger.type === 'schedule') {
    try {
      await removeScheduledJob(`schedule-${id}`);
    } catch (e) {
      console.error('Failed to remove scheduled job:', e);
    }
  }

  return updateWorkflow(id, { is_active: false, status: 'paused' });
}

// Execution operations

export async function createExecution(
  workflowId: string,
  triggerType: TriggerType,
  triggerData?: Record<string, any>
): Promise<WorkflowExecution> {
  const result = await query<WorkflowExecution>(
    `INSERT INTO workflow_executions (workflow_id, trigger_type, trigger_data, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [workflowId, triggerType, triggerData ? JSON.stringify(triggerData) : null]
  );
  
  return result.rows[0];
}

export async function getExecutionById(id: string): Promise<WorkflowExecution | null> {
  const result = await query<WorkflowExecution>(
    'SELECT * FROM workflow_executions WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getExecutionsByWorkflowId(
  workflowId: string,
  page = 1,
  limit = 20
): Promise<{ executions: WorkflowExecution[]; total: number }> {
  const offset = (page - 1) * limit;
  
  const [executionsResult, countResult] = await Promise.all([
    query<WorkflowExecution>(
      `SELECT * FROM workflow_executions WHERE workflow_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [workflowId, limit, offset]
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM workflow_executions WHERE workflow_id = $1',
      [workflowId]
    ),
  ]);
  
  return {
    executions: executionsResult.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

export async function updateExecution(
  id: string,
  updates: Partial<Pick<WorkflowExecution, 'status' | 'started_at' | 'completed_at' | 'error'>>
): Promise<WorkflowExecution | null> {
  const setClause: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClause.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.started_at !== undefined) {
    setClause.push(`started_at = $${paramIndex++}`);
    values.push(updates.started_at);
  }
  if (updates.completed_at !== undefined) {
    setClause.push(`completed_at = $${paramIndex++}`);
    values.push(updates.completed_at);
  }
  if (updates.error !== undefined) {
    setClause.push(`error = $${paramIndex++}`);
    values.push(updates.error);
  }

  if (setClause.length === 0) {
    return getExecutionById(id);
  }

  values.push(id);

  const result = await query<WorkflowExecution>(
    `UPDATE workflow_executions SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

// Step execution operations

export async function createStepExecution(
  executionId: string,
  stepId: string,
  stepType: string,
  inputData?: Record<string, any>
): Promise<StepExecution> {
  const result = await query<StepExecution>(
    `INSERT INTO step_executions (execution_id, step_id, step_type, input_data, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [executionId, stepId, stepType, inputData ? JSON.stringify(inputData) : null]
  );
  
  return result.rows[0];
}

export async function updateStepExecution(
  id: string,
  updates: Partial<Pick<StepExecution, 'status' | 'output_data' | 'error' | 'started_at' | 'completed_at'>>
): Promise<StepExecution | null> {
  const setClause: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClause.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.output_data !== undefined) {
    setClause.push(`output_data = $${paramIndex++}`);
    values.push(JSON.stringify(updates.output_data));
  }
  if (updates.error !== undefined) {
    setClause.push(`error = $${paramIndex++}`);
    values.push(updates.error);
  }
  if (updates.started_at !== undefined) {
    setClause.push(`started_at = $${paramIndex++}`);
    values.push(updates.started_at);
  }
  if (updates.completed_at !== undefined) {
    setClause.push(`completed_at = $${paramIndex++}`);
    values.push(updates.completed_at);
  }

  if (setClause.length === 0) {
    return null;
  }

  values.push(id);

  const result = await query<StepExecution>(
    `UPDATE step_executions SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function getStepExecutionsByExecutionId(
  executionId: string
): Promise<StepExecution[]> {
  const result = await query<StepExecution>(
    'SELECT * FROM step_executions WHERE execution_id = $1 ORDER BY created_at',
    [executionId]
  );
  return result.rows;
}
