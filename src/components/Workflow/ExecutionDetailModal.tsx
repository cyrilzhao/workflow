import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type { WorkflowNode, NodeExecutionSummary, NodeExecutionRecord } from './types';
import './NodeConfigModal.scss'; // Reuse existing styles

interface ExecutionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: WorkflowNode | null;
  executionSummary?: NodeExecutionSummary;
}

const JsonView: React.FC<{ data: any; title: string }> = ({ data, title }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#374151' }}>
        {title}
      </div>
      <div
        style={{
          background: '#f3f4f6',
          padding: 12,
          borderRadius: 6,
          fontSize: 12,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          overflowX: 'auto',
          maxHeight: 200,
          overflowY: 'auto',
          color: '#1f2937',
        }}
      >
        {JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
};

export const ExecutionDetailModal: React.FC<ExecutionDetailModalProps> = ({
  isOpen,
  onClose,
  node,
  executionSummary,
}) => {
  const [iterationIndex, setIterationIndex] = useState(0);

  useEffect(() => {
    setIterationIndex(0);
  }, [node?.id]);

  if (!isOpen || !node) return null;

  const records = executionSummary?.records || [];
  const currentRecord: NodeExecutionRecord | undefined = records[iterationIndex] || records[0];
  const totalIterations = records.length;
  const hasMultipleIterations = totalIterations > 1;

  return (
    <div className="node-config-modal-overlay" onClick={onClose}>
      <div className="node-config-modal" onClick={e => e.stopPropagation()}>
        <div className="node-config-modal-header">
          <div className="title">
            Execution Details: {node.data.label || node.type}
            {executionSummary?.status && (
              <span
                style={{
                  marginLeft: 12,
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background:
                    executionSummary.status === 'success'
                      ? '#ecfdf5'
                      : executionSummary.status === 'failure'
                        ? '#fef2f2'
                        : '#f3f4f6',
                  color:
                    executionSummary.status === 'success'
                      ? '#059669'
                      : executionSummary.status === 'failure'
                        ? '#dc2626'
                        : '#6b7280',
                  border: '1px solid currentColor',
                }}
              >
                {executionSummary.status.toUpperCase()}
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="node-config-modal-body">
          {!executionSummary ? (
            <div className="no-schema">No execution data available for this node.</div>
          ) : (
            <>
              {hasMultipleIterations && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    padding: 8,
                    background: '#f9fafb',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <button
                    onClick={() => setIterationIndex(prev => Math.max(0, prev - 1))}
                    disabled={iterationIndex === 0}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: iterationIndex === 0 ? 'not-allowed' : 'pointer',
                      color: iterationIndex === 0 ? '#d1d5db' : '#6b7280',
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ margin: '0 12px', fontSize: 12, fontWeight: 500 }}>
                    Iteration {iterationIndex + 1} of {totalIterations}
                  </span>
                  <button
                    onClick={() =>
                      setIterationIndex(prev => Math.min(totalIterations - 1, prev + 1))
                    }
                    disabled={iterationIndex === totalIterations - 1}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: iterationIndex === totalIterations - 1 ? 'not-allowed' : 'pointer',
                      color: iterationIndex === totalIterations - 1 ? '#d1d5db' : '#6b7280',
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 16,
                  fontSize: 12,
                }}
              >
                <div>
                  <span style={{ color: '#6b7280' }}>Start Time:</span>{' '}
                  {currentRecord?.startTime
                    ? new Date(currentRecord.startTime).toLocaleTimeString()
                    : '-'}
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Duration:</span>{' '}
                  {currentRecord?.endTime && currentRecord?.startTime
                    ? `${currentRecord.endTime - currentRecord.startTime}ms`
                    : '-'}
                </div>
              </div>

              {currentRecord?.error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: '#dc2626',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    <AlertTriangle size={16} style={{ marginRight: 8 }} />
                    Error Occurred
                  </div>
                  <div style={{ color: '#b91c1c', fontSize: 12 }}>
                    {currentRecord.error.message}
                  </div>
                  {currentRecord.error.stack && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 10,
                        color: '#7f1d1d',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {currentRecord.error.stack}
                    </div>
                  )}
                </div>
              )}

              {currentRecord?.inputs && <JsonView title="Inputs" data={currentRecord.inputs} />}
              {currentRecord?.outputs && <JsonView title="Outputs" data={currentRecord.outputs} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
