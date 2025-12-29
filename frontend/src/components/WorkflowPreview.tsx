import React, { useState } from 'react';
import {
  Clock,
  Webhook,
  Play,
  ArrowRight,
  Globe,
  Mail,
  Timer,
  Save,
  Rocket,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WorkflowDefinition, HttpRequestConfig, SendEmailConfig, DelayConfig } from '../types';
import { useChatStore, useAuthStore } from '../stores';
import { chatApi } from '../lib/api';

interface WorkflowPreviewProps {
  workflow: Partial<WorkflowDefinition>;
  isComplete: boolean;
}

const triggerIcons: Record<string, React.ElementType> = {
  schedule: Clock,
  webhook: Webhook,
  manual: Play,
};

const stepIcons: Record<string, React.ElementType> = {
  http_request: Globe,
  send_email: Mail,
  transform_data: ArrowRight,
  delay: Timer,
};

const triggerLabels: Record<string, string> = {
  schedule: 'Scheduled',
  webhook: 'Webhook',
  manual: 'Manual',
};

const stepLabels: Record<string, string> = {
  http_request: 'HTTP Request',
  send_email: 'Send Email',
  transform_data: 'Transform Data',
  delay: 'Delay',
};

export function WorkflowPreview({ workflow, isComplete }: WorkflowPreviewProps) {
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const { sessionId } = useChatStore();
  const { token } = useAuthStore();

  const handleSave = async () => {
    if (!token || !sessionId || !workflowName.trim()) return;

    setSaving(true);
    try {
      await chatApi.saveWorkflow(sessionId, workflowName, undefined, token);
      setShowSaveModal(false);
      setWorkflowName('');
      alert('Workflow saved successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  if (!workflow.trigger && !workflow.steps) return null;

  const TriggerIcon = workflow.trigger ? triggerIcons[workflow.trigger.type] || Play : Play;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
            <Rocket className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-gray-900">Workflow Preview</span>
          {isComplete && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Ready to save
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {expanded && (
        <div className="p-4">
          {/* Trigger */}
          {workflow.trigger && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Trigger</div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TriggerIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {triggerLabels[workflow.trigger.type]}
                  </div>
                  <div className="text-sm text-gray-500">
                    {workflow.trigger.type === 'schedule' && workflow.trigger.cron && (
                      <>Cron: {workflow.trigger.cron}</>
                    )}
                    {workflow.trigger.type === 'webhook' && 'Receives incoming HTTP requests'}
                    {workflow.trigger.type === 'manual' && 'Triggered manually by user'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          {workflow.steps && workflow.steps.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Steps</div>
              <div className="space-y-2">
                {workflow.steps.map((step, index) => {
                  const StepIcon = stepIcons[step.type] || ArrowRight;
                  return (
                    <div key={step.id || index} className="relative">
                      {index > 0 && (
                        <div className="absolute left-5 -top-2 w-0.5 h-2 bg-gray-300" />
                      )}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <StepIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {step.name || stepLabels[step.type]}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {step.type === 'http_request' &&
                              `${(step.config as HttpRequestConfig).method} ${(step.config as HttpRequestConfig).url}`}
                            {step.type === 'send_email' &&
                              `To: ${(step.config as SendEmailConfig).to}`}
                            {step.type === 'delay' &&
                              `Wait ${(step.config as DelayConfig).duration} ${(step.config as DelayConfig).unit}`}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">#{index + 1}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          {isComplete && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Workflow
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Workflow</h3>
            <input
              type="text"
              placeholder="Workflow name"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!workflowName.trim() || saving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
