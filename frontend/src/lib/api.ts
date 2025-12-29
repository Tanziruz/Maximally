const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }

  return data;
}

// Auth API
export const authApi = {
  register: (email: string, password: string, name?: string) =>
    fetchApi<{ success: boolean; data: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    fetchApi<{ success: boolean; data: { user: any; token: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: (token: string) =>
    fetchApi<{ success: boolean; data: any }>('/api/auth/me', { token }),
};

// Chat API
export const chatApi = {
  sendMessage: (message: string, sessionId: string | undefined, token: string) =>
    fetchApi<{ success: boolean; data: any }>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
      token,
    }),

  getSessions: (token: string, page = 1, limit = 20) =>
    fetchApi<{ success: boolean; data: any[]; pagination: any }>(
      `/api/chat/sessions?page=${page}&limit=${limit}`,
      { token }
    ),

  getSession: (id: string, token: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/chat/sessions/${id}`, { token }),

  deleteSession: (id: string, token: string) =>
    fetchApi<{ success: boolean }>(`/api/chat/sessions/${id}`, {
      method: 'DELETE',
      token,
    }),

  saveWorkflow: (sessionId: string, name: string, description: string | undefined, token: string) =>
    fetchApi<{ success: boolean; data: any }>('/api/chat/save-workflow', {
      method: 'POST',
      body: JSON.stringify({ sessionId, name, description }),
      token,
    }),

  improveWorkflow: (workflow: any, feedback: string, sessionId: string | undefined, token: string) =>
    fetchApi<{ success: boolean; data: any }>('/api/chat/improve-workflow', {
      method: 'POST',
      body: JSON.stringify({ workflow, feedback, sessionId }),
      token,
    }),
};

// Workflows API
export const workflowsApi = {
  create: (name: string, description: string | undefined, workflow_definition: any, token: string) =>
    fetchApi<{ success: boolean; data: any }>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ name, description, workflow_definition }),
      token,
    }),

  getAll: (token: string, page = 1, limit = 20) =>
    fetchApi<{ success: boolean; data: any[]; pagination: any }>(
      `/api/workflows?page=${page}&limit=${limit}`,
      { token }
    ),

  getById: (id: string, token: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/workflows/${id}`, { token }),

  update: (id: string, updates: any, token: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      token,
    }),

  delete: (id: string, token: string) =>
    fetchApi<{ success: boolean }>(`/api/workflows/${id}`, {
      method: 'DELETE',
      token,
    }),

  activate: (id: string, token: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/workflows/${id}/activate`, {
      method: 'POST',
      token,
    }),

  deactivate: (id: string, token: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/workflows/${id}/deactivate`, {
      method: 'POST',
      token,
    }),

  test: (id: string, sampleData: any, token: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/workflows/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ sampleData }),
      token,
    }),

  run: (id: string, triggerData: any, token: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ triggerData }),
      token,
    }),

  getExecutions: (id: string, token: string, page = 1, limit = 20) =>
    fetchApi<{ success: boolean; data: any[]; pagination: any }>(
      `/api/workflows/${id}/executions?page=${page}&limit=${limit}`,
      { token }
    ),

  getExecution: (workflowId: string, executionId: string, token: string) =>
    fetchApi<{ success: boolean; data: any }>(
      `/api/workflows/${workflowId}/executions/${executionId}`,
      { token }
    ),
};
