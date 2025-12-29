import React, { useEffect, useState } from 'react';
import {
  Clock,
  Webhook,
  Play,
  Trash2,
  Power,
  PowerOff,
  PlayCircle,
  Loader2,
} from 'lucide-react';
import type { Workflow } from '../types';
import { useWorkflowsStore, useAuthStore } from '../stores';
import { workflowsApi } from '../lib/api';

const triggerIcons: Record<string, React.ElementType> = {
  schedule: Clock,
  webhook: Webhook,
  manual: Play,
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
};

export function WorkflowsList() {
  const { workflows, isLoading, error, fetchWorkflows, deleteWorkflow, activateWorkflow, deactivateWorkflow } =
    useWorkflowsStore();
  const { token } = useAuthStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleRun = async (workflowId: string) => {
    if (!token) return;
    setActionLoading(workflowId);
    try {
      await workflowsApi.run(workflowId, {}, token);
      alert('Workflow execution started!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to run workflow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    setActionLoading(workflow.id);
    try {
      if (workflow.is_active) {
        await deactivateWorkflow(workflow.id);
      } else {
        await activateWorkflow(workflow.id);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    setActionLoading(workflowId);
    try {
      await deleteWorkflow(workflowId);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading && workflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
        <p className="text-gray-600">
          Start a conversation to create your first workflow
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => {
        const TriggerIcon = triggerIcons[workflow.workflow_definition.trigger.type] || Play;
        const isActionLoading = actionLoading === workflow.id;

        return (
          <div
            key={workflow.id}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <TriggerIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                  {workflow.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{workflow.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        statusColors[workflow.status]
                      }`}
                    >
                      {workflow.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {workflow.workflow_definition.steps.length} step
                      {workflow.workflow_definition.steps.length !== 1 ? 's' : ''}
                    </span>
                    {workflow.workflow_definition.trigger.type === 'schedule' && (
                      <span className="text-xs text-gray-400">
                        {workflow.workflow_definition.trigger.cron}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRun(workflow.id)}
                  disabled={isActionLoading}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Run workflow"
                >
                  {isActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleToggleActive(workflow)}
                  disabled={isActionLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    workflow.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title={workflow.is_active ? 'Deactivate' : 'Activate'}
                >
                  {workflow.is_active ? (
                    <Power className="w-4 h-4" />
                  ) : (
                    <PowerOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(workflow.id)}
                  disabled={isActionLoading}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete workflow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Webhook URL */}
            {workflow.webhook_id && workflow.workflow_definition.trigger.type === 'webhook' && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Webhook URL</div>
                <code className="text-xs text-gray-700 break-all">
                  {import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/webhooks/{workflow.webhook_id}
                </code>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
