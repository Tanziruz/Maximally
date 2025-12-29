import { Router, Request, Response } from 'express';
import { getWorkflowByWebhookId, createExecution } from '../services/workflows.js';
import { addWorkflowJob } from '../lib/queue.js';

const router = Router();

// Receive webhook trigger
router.all('/:webhookId', async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;

    const workflow = await getWorkflowByWebhookId(webhookId);

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or workflow is inactive',
      });
      return;
    }

    // Collect trigger data from request
    const triggerData = {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
      receivedAt: new Date().toISOString(),
    };

    // Create execution record
    const execution = await createExecution(workflow.id, 'webhook', triggerData);

    // Add to job queue
    await addWorkflowJob({
      workflowId: workflow.id,
      executionId: execution.id,
      triggerType: 'webhook',
      triggerData,
    });

    res.json({
      success: true,
      data: {
        executionId: execution.id,
        message: 'Webhook received, workflow execution started',
      },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
