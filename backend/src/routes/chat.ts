import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { generateWorkflowResponse, improveWorkflow } from '../services/gemini.js';
import {
  createSession,
  getSessionById,
  getSessionsByUserId,
  addMessageToSession,
  updateSessionContext,
  linkWorkflowToSession,
  deleteSession,
} from '../services/conversations.js';
import { createWorkflow } from '../services/workflows.js';
import {  WorkflowDefinition } from '../types/index.js';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    workflowPreview?: Partial<WorkflowDefinition>;
    suggestedActions?: string[];
  };
}

const router = Router();

const chatMessageSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().uuid().optional(),
});

const saveWorkflowSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
});

// Send chat message
router.post('/message', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = chatMessageSchema.parse(req.body);
    const userId = req.user!.userId;

    // Get or create session
    let session;
    if (body.sessionId) {
      session = await getSessionById(body.sessionId);
      if (!session || session.user_id !== userId) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
        });
        return;
      }
    } else {
      session = await createSession(userId);
    }

    // Add user message to session
    const userMessage: ConversationMessage = {
      role: 'user',
      content: body.message,
      timestamp: new Date().toISOString(),
    };
    await addMessageToSession(session.id, userMessage);

    // Get AI response
    const messages = [...(session.messages as ConversationMessage[]), userMessage];
    const aiResult = await generateWorkflowResponse(messages, body.message);

    // Add assistant message to session
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: aiResult.response,
      timestamp: new Date().toISOString(),
      metadata: {
        workflowPreview: aiResult.workflowPreview,
      },
    };
    await addMessageToSession(session.id, assistantMessage);

    // Update context if workflow is generated
    if (aiResult.workflowPreview) {
      await updateSessionContext(session.id, {
        currentWorkflow: aiResult.workflowPreview,
      });
    }

    res.json({
      success: true,
      data: {
        message: aiResult.response,
        sessionId: session.id,
        workflowPreview: aiResult.workflowPreview,
        isComplete: aiResult.isComplete,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get chat sessions
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { sessions, total } = await getSessionsByUserId(userId, page, limit);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get single session
router.get('/sessions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const session = await getSessionById(req.params.id);

    if (!session || session.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Delete session
router.delete('/sessions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const session = await getSessionById(req.params.id);

    if (!session || session.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    await deleteSession(req.params.id);

    res.json({
      success: true,
      message: 'Session deleted',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Save workflow from session
router.post('/save-workflow', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = saveWorkflowSchema.parse(req.body);
    const userId = req.user!.userId;

    const session = await getSessionById(body.sessionId);

    if (!session || session.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    const context = session.context as { currentWorkflow?: WorkflowDefinition };

    if (!context.currentWorkflow) {
      res.status(400).json({
        success: false,
        error: 'No workflow found in session',
      });
      return;
    }

    const workflow = await createWorkflow(
      userId,
      body.name,
      body.description || null,
      context.currentWorkflow as WorkflowDefinition
    );

    await linkWorkflowToSession(body.sessionId, workflow.id);

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Save workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Improve existing workflow
router.post('/improve-workflow', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { workflow, feedback, sessionId } = req.body;
    const userId = req.user!.userId;

    if (!workflow || !feedback) {
      res.status(400).json({
        success: false,
        error: 'Workflow and feedback are required',
      });
      return;
    }

    const result = await improveWorkflow(workflow, feedback);

    // If session provided, update it
    if (sessionId) {
      const session = await getSessionById(sessionId);
      if (session && session.user_id === userId) {
        await updateSessionContext(sessionId, {
          currentWorkflow: result.updatedWorkflow,
        });
      }
    }

    res.json({
      success: true,
      data: {
        message: result.response,
        workflow: result.updatedWorkflow,
      },
    });
  } catch (error) {
    console.error('Improve workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
