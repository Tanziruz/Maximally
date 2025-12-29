import dotenv from 'dotenv';
import { createWorkflowWorker, createScheduledWorker } from './lib/queue.js';

dotenv.config();

console.log('🔧 Starting workflow workers...');

// Create workers
const workflowWorker = createWorkflowWorker();
const scheduledWorker = createScheduledWorker();

console.log('✅ Workflow execution worker started');
console.log('✅ Scheduled jobs worker started');

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers...');
  await workflowWorker.close();
  await scheduledWorker.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
