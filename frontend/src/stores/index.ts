import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User,  WorkflowDefinition, Workflow } from '../types';
import { authApi, chatApi } from '../lib/api';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    workflowPreview?: Partial<WorkflowDefinition>;
    suggestedActions?: string[];
  };
}

// Auth Store
interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password);
          set({
            user: response.data.user,
            token: response.data.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          await authApi.register(email, password, name);
          // Auto-login after registration
          await get().login(email, password);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) return;

        try {
          const response = await authApi.getMe(token);
          set({ user: response.data });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Chat Store
interface ChatStore {
  sessionId: string | null;
  messages: ConversationMessage[];
  workflowPreview: Partial<WorkflowDefinition> | null;
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  newChat: () => void;
  loadSession: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessionId: null,
  messages: [],
  workflowPreview: null,
  isComplete: false,
  isLoading: false,
  error: null,

  sendMessage: async (message) => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    // Add user message immediately
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await chatApi.sendMessage(message, get().sessionId || undefined, token);
      const data = response.data;

      // Add assistant message
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        metadata: {
          workflowPreview: data.workflowPreview,
        },
      };

      set((state) => ({
        sessionId: data.sessionId,
        messages: [...state.messages, assistantMessage],
        workflowPreview: data.workflowPreview || state.workflowPreview,
        isComplete: data.isComplete || false,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false,
      });
    }
  },

  newChat: () => {
    set({
      sessionId: null,
      messages: [],
      workflowPreview: null,
      isComplete: false,
      error: null,
    });
  },

  loadSession: async (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await chatApi.getSession(sessionId, token);
      const session = response.data;

      set({
        sessionId: session.id,
        messages: session.messages || [],
        workflowPreview: session.context?.currentWorkflow || null,
        isComplete: session.status === 'completed',
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false,
      });
    }
  },
}));

// Workflows Store
interface WorkflowsStore {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkflows: () => Promise<void>;
  fetchWorkflow: (id: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  activateWorkflow: (id: string) => Promise<void>;
  deactivateWorkflow: (id: string) => Promise<void>;
}

export const useWorkflowsStore = create<WorkflowsStore>((set) => ({
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  error: null,

  fetchWorkflows: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });

    try {
      const response = await (await import('../lib/api')).workflowsApi.getAll(token);
      set({ workflows: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch workflows',
        isLoading: false,
      });
    }
  },

  fetchWorkflow: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });

    try {
      const response = await (await import('../lib/api')).workflowsApi.getById(id, token);
      set({ currentWorkflow: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch workflow',
        isLoading: false,
      });
    }
  },

  deleteWorkflow: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      await (await import('../lib/api')).workflowsApi.delete(id, token);
      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
      });
    }
  },

  activateWorkflow: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const response = await (await import('../lib/api')).workflowsApi.activate(id, token);
      set((state) => ({
        workflows: state.workflows.map((w) =>
          w.id === id ? response.data : w
        ),
        currentWorkflow: state.currentWorkflow?.id === id ? response.data : state.currentWorkflow,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to activate workflow',
      });
    }
  },

  deactivateWorkflow: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const response = await (await import('../lib/api')).workflowsApi.deactivate(id, token);
      set((state) => ({
        workflows: state.workflows.map((w) =>
          w.id === id ? response.data : w
        ),
        currentWorkflow: state.currentWorkflow?.id === id ? response.data : state.currentWorkflow,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to deactivate workflow',
      });
    }
  },
}));
