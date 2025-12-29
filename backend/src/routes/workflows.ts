import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  createWorkflow,
  getWorkflowById,
  getWorkflowsByUserId,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  createExecution,
  getExecutionsByWorkflowId,
  getStepExecutionsByExecutionId,
} from '../services/workflows.js';
import { testWorkflow } from '../services/executor.js';
import { addWorkflowJob } from '../lib/queue.js';
import { WorkflowDefinitionSchema } from '../types/index.js';

const router = Router();

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  workflow_definition: WorkflowDefinitionSchema,
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  workflow_definition: WorkflowDefinitionSchema.optional(),
});

// Create workflow
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = createWorkflowSchema.parse(req.body);
    const userId = req.user!.userId;

    const workflow = await createWorkflow(
      userId,
      body.name,
      body.description || null,
      body.workflow_definition
    );

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

    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get user's workflows
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { workflows, total } = await getWorkflowsByUserId(userId, page, limit);

    res.json({
      success: true,
      data: workflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get single workflow
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Update workflow
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = updateWorkflowSchema.parse(req.body);
    const userId = req.user!.userId;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const updated = await updateWorkflow(req.params.id, body);

    res.json({
      success: true,
      data: updated,
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

    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Delete workflow
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    // Deactivate first to clean up scheduled jobs
    if (workflow.is_active) {
      await deactivateWorkflow(req.params.id);
    }

    await deleteWorkflow(req.params.id);

    res.json({
      success: true,
      message: 'Workflow deleted',
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Activate workflow (deploy)
router.post('/:id/activate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const activated = await activateWorkflow(req.params.id);

    res.json({
      success: true,
      data: activated,
      message: 'Workflow activated',
    });
  } catch (error) {
    console.error('Activate workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Deactivate workflow
router.post('/:id/deactivate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const deactivated = await deactivateWorkflow(req.params.id);

    res.json({
      success: true,
      data: deactivated,
      message: 'Workflow deactivated',
    });
  } catch (error) {
    console.error('Deactivate workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Test workflow (dry run)
router.post('/:id/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sampleData } = req.body;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const result = await testWorkflow(
      workflow.workflow_definition,
      sampleData
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Test workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Run workflow manually
router.post('/:id/run', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { triggerData } = req.body;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    // Create execution record
    const execution = await createExecution(
      workflow.id,
      'manual',
      triggerData || { triggeredAt: new Date().toISOString() }
    );

    // Add to job queue
    await addWorkflowJob({
      workflowId: workflow.id,
      executionId: execution.id,
      triggerType: 'manual',
      triggerData,
    });

    res.json({
      success: true,
      data: {
        executionId: execution.id,
        message: 'Workflow execution started',
      },
    });
  } catch (error) {
    console.error('Run workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get workflow executions
router.get('/:id/executions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const { executions, total } = await getExecutionsByWorkflowId(
      req.params.id,
      page,
      limit
    );

    res.json({
      success: true,
      data: executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get execution details with step results
router.get('/:id/executions/:executionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const workflow = await getWorkflowById(req.params.id);

    if (!workflow || workflow.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const { getExecutionById } = await import('../services/workflows.js');
    const execution = await getExecutionById(req.params.executionId);

    if (!execution || execution.workflow_id !== req.params.id) {
      res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
      return;
    }

    const steps = await getStepExecutionsByExecutionId(req.params.executionId);

    res.json({
      success: true,
      data: {
        ...execution,
        steps,
      },
    });
  } catch (error) {
    console.error('Get execution details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
