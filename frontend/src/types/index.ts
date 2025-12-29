// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Workflow types
export type TriggerType = 'schedule' | 'webhook' | 'manual';
export type StepType = 'http_request' | 'send_email' | 'transform_data' | 'conditional' | 'delay';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TriggerConfig {
  type: TriggerType;
  cron?: string;
  timezone?: string;
  webhook_id?: string;
}

export interface HttpRequestConfig {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  auth?: {
    type: 'basic' | 'bearer' | 'api_key';
    credentials: Record<string, string>;
  };
}

export interface SendEmailConfig {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface TransformDataConfig {
  expression: string;
  outputKey?: string;
}

export interface DelayConfig {
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

export interface WorkflowStep {
  id: string;
  name?: string;
  type: StepType;
  config: HttpRequestConfig | SendEmailConfig | TransformDataConfig | DelayConfig;
  dependsOn?: string[];
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface WorkflowDefinition {
  trigger: TriggerConfig;
  steps: WorkflowStep[];
  errorHandling?: {
    notifyOnError: boolean;
    notificationEmail?: string;
  };
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  workflow_definition: WorkflowDefinition;
  status: 'draft' | 'active' | 'paused' | 'error';
  is_active: boolean;
  webhook_id: string | null;
  created_at: string;
  updated_at: string;
}

// Execution types
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  trigger_type: TriggerType;
  trigger_data: Record<string, any> | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  created_at: string;
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
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
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
  created_at: string;
  updated_at: string;
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
