import { z } from 'zod';

// User types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
}

// Conversation types
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    workflowPreview?: Partial<WorkflowDefinition>;
    suggestedActions?: string[];
  };
}

// Workflow types
export const TriggerTypeSchema = z.enum(['schedule', 'webhook', 'manual']);
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

export const StepTypeSchema = z.enum(['http_request', 'send_email', 'transform_data', 'conditional', 'delay']);
export type StepType = z.infer<typeof StepTypeSchema>;

export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const TriggerConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('schedule'),
    cron: z.string(),
    timezone: z.string().optional().default('UTC'),
  }),
  z.object({
    type: z.literal('webhook'),
    webhook_id: z.string().optional(),
  }),
  z.object({
    type: z.literal('manual'),
  }),
]);
export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;

export const HttpRequestConfigSchema = z.object({
  method: HttpMethodSchema,
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  auth: z.object({
    type: z.enum(['basic', 'bearer', 'api_key']),
    credentials: z.record(z.string()),
  }).optional(),
});
export type HttpRequestConfig = z.infer<typeof HttpRequestConfigSchema>;

export const SendEmailConfigSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string(),
  body: z.string(),
  isHtml: z.boolean().optional().default(false),
});
export type SendEmailConfig = z.infer<typeof SendEmailConfigSchema>;

export const TransformDataConfigSchema = z.object({
  expression: z.string(),
  outputKey: z.string().optional(),
});
export type TransformDataConfig = z.infer<typeof TransformDataConfigSchema>;

export const ConditionalConfigSchema = z.object({
  condition: z.string(),
  trueBranch: z.array(z.string()),
  falseBranch: z.array(z.string()).optional(),
});
export type ConditionalConfig = z.infer<typeof ConditionalConfigSchema>;

export const DelayConfigSchema = z.object({
  duration: z.number().positive(),
  unit: z.enum(['seconds', 'minutes', 'hours', 'days']),
});
export type DelayConfig = z.infer<typeof DelayConfigSchema>;

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: StepTypeSchema,
  config: z.union([
    HttpRequestConfigSchema,
    SendEmailConfigSchema,
    TransformDataConfigSchema,
    ConditionalConfigSchema,
    DelayConfigSchema,
  ]),
  dependsOn: z.array(z.string()).optional(),
  retryConfig: z.object({
    maxRetries: z.number().int().min(0).max(10).default(3),
    retryDelay: z.number().int().min(1000).default(5000),
  }).optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowDefinitionSchema = z.object({
  trigger: TriggerConfigSchema,
  steps: z.array(WorkflowStepSchema).min(1),
  errorHandling: z.object({
    notifyOnError: z.boolean().default(true),
    notificationEmail: z.string().email().optional(),
  }).optional(),
});
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  workflow_definition: WorkflowDefinition;
  status: 'draft' | 'active' | 'paused' | 'error';
  is_active: boolean;
  webhook_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// Execution types
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  trigger_type: TriggerType;
  trigger_data: Record<string, any> | null;
  started_at: Date | null;
  completed_at: Date | null;
  error: string | null;
  created_at: Date;
}

export interface StepExecution {
  id: string;
  execution_id: string;
  step_id: string;
  step_type: StepType;
  status: ExecutionStatus;
  input_data: Record<string, any> | null;
  output_data: Record<string, any> | null;
  error: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}



export interface ConversationSession {
  id: string;
  user_id: string;
  workflow_id: string | null;
  messages: ConversationMessage[];
  context: {
    currentWorkflow?: Partial<WorkflowDefinition>;
    userIntent?: string;
    extractedEntities?: Record<string, any>;
  };
  status: 'active' | 'completed' | 'abandoned';
  created_at: Date;
  updated_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Chat request/response types
export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: string;
  sessionId: string;
  workflowPreview?: Partial<WorkflowDefinition>;
  suggestedActions?: string[];
  isComplete?: boolean;
}
