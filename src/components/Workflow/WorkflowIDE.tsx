import React, { useState } from 'react';
import { Workflow } from './Workflow';
import { ExecutionsList } from './ExecutionsList';
import type { WorkflowProps, WorkflowExecutionSnapshot } from './types';
import './WorkflowIDE.scss';

export interface WorkflowIDEProps extends WorkflowProps {
  executions?: WorkflowExecutionSnapshot[];
  onCopyToEditor?: (execution: WorkflowExecutionSnapshot) => void;
}

export const WorkflowIDE: React.FC<WorkflowIDEProps> = ({
  executions = [],
  onCopyToEditor,
  ...workflowProps
}) => {
  const [viewMode, setViewMode] = useState<'editor' | 'executions'>('editor');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const currentExecution = executions.find(ex => ex.executionId === selectedExecutionId);

  const handleCopyToEditor = () => {
    if (currentExecution && onCopyToEditor) {
      onCopyToEditor(currentExecution);
      setViewMode('editor');
    }
  };

  return (
    <div className="workflow-ide">
      <div className="ide-header">
        <div className="ide-tabs">
          <button
            className={`ide-tab ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => setViewMode('editor')}
          >
            Editor
          </button>
          <button
            className={`ide-tab ${viewMode === 'executions' ? 'active' : ''}`}
            onClick={() => setViewMode('executions')}
          >
            Executions
          </button>
        </div>

        {viewMode === 'executions' && currentExecution && (
          <div className="header-actions">
            <button onClick={handleCopyToEditor}>Copy to Editor</button>
          </div>
        )}
      </div>

      <div className="ide-body">
        {viewMode === 'editor' ? (
          <div className="editor-view">
            <Workflow mode="edit" {...workflowProps} />
          </div>
        ) : (
          <div className="executions-view">
            <ExecutionsList
              executions={executions}
              selectedExecutionId={selectedExecutionId}
              onSelect={setSelectedExecutionId}
              onRefresh={() => console.log('Refresh executions')}
            />
            <div className="executions-canvas">
              {currentExecution ? (
                <Workflow
                  key={currentExecution.executionId} // Force re-render on execution switch
                  mode="history"
                  initialNodes={currentExecution.nodes}
                  initialEdges={currentExecution.edges}
                  executionData={currentExecution.nodeExecutions}
                  readonly
                  {...workflowProps}
                  // Override workflowProps that shouldn't apply in history
                  onSave={undefined}
                  onTest={undefined}
                />
              ) : (
                <div className="no-selection">Select an execution to view details</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
