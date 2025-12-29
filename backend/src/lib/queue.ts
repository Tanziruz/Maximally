import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from './redis.js';
import { executeWorkflow } from '../services/executor.js';

const connection = createRedisConnection();

// Main workflow execution queue
export const workflowQueue = new Queue('workflow-execution', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Scheduled jobs queue
export const scheduledQueue = new Queue('scheduled-workflows', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export interface WorkflowJobData {
  workflowId: string;
  executionId: string;
  triggerType: 'schedule' | 'webhook' | 'manual';
  triggerData?: Record<string, any>;
}

export async function addWorkflowJob(data: WorkflowJobData): Promise<Job<WorkflowJobData>> {
  return workflowQueue.add('execute', data, {
    jobId: data.executionId,
  });
}

export async function addScheduledJob(
  workflowId: string,
  cronExpression: string,
  jobId: string
): Promise<Job> {
  return scheduledQueue.add(
    'scheduled',
    { workflowId },
    {
      jobId,
      repeat: {
        pattern: cronExpression,
      },
    }
  );
}

export async function removeScheduledJob(jobId: string): Promise<void> {
  await scheduledQueue.removeRepeatableByKey(jobId);
}

export function createWorkflowWorker() {
  const worker = new Worker<WorkflowJobData>(
    'workflow-execution',
    async (job) => {
      console.log(`Processing workflow job: ${job.id}`);
      try {
        const result = await executeWorkflow(
          job.data.workflowId,
          job.data.executionId,
          job.data.triggerType,
          job.data.triggerData
        );
        return result;
      } catch (error) {
        console.error(`Workflow execution failed for job ${job.id}:`, error);
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  return worker;
}

export function createScheduledWorker() {
  const worker = new Worker(
    'scheduled-workflows',
    async (job) => {
      console.log(`Processing scheduled workflow: ${job.data.workflowId}`);
      // Create an execution and add to workflow queue
      const { createExecution } = await import('../services/workflows.js');
      const execution = await createExecution(job.data.workflowId, 'schedule', {
        scheduledAt: new Date().toISOString(),
      });
      
      await addWorkflowJob({
        workflowId: job.data.workflowId,
        executionId: execution.id,
        triggerType: 'schedule',
      });
    },
    {
      connection: createRedisConnection(),
    }
  );

  return worker;
}
