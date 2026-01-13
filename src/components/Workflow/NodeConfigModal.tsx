import React, { useState, useEffect } from 'react';
import type { WorkflowNode, NodeConfigSchema, NodeExecutionRecord } from './types';
import { DynamicForm } from '@/components/DynamicForm';
import {
  X,
  Settings,
  Sliders,
  ArrowRightLeft,
  Plus,
  Trash2,
  Play,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import './NodeConfigModal.scss';

interface NodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: WorkflowNode | null;
  schema: NodeConfigSchema | undefined;
  formComponents?: Record<string, React.ComponentType<any>>;
  onSave: (nodeId: string, data: any) => void;
  onNodeTest?: (nodeId: string, inputs: any) => Promise<NodeExecutionRecord>;
}

const JsonView: React.FC<{ data: any; title?: string }> = ({ data, title }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      {title && (
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#374151' }}>
          {title}
        </div>
      )}
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
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
};

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  isOpen,
  onClose,
  node,
  schema,
  formComponents,
  onSave,
  onNodeTest,
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'output' | 'config' | 'test'>('params');
  const [formData, setFormData] = useState<any>({});
  const [testResult, setTestResult] = useState<NodeExecutionRecord | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setFormData({ ...node.data });
      // Reset tab when node changes
      setActiveTab('params');
      setTestResult(null);
      setTestError(null);
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleTest = async () => {
    if (!onNodeTest) return;

    // Use formData as inputs for the test
    const inputs = { ...formData };

    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const result = await onNodeTest(node.id, inputs);
      setTestResult(result);
    } catch (e: any) {
      setTestError(e.message || 'Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave(node.id, formData);
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addOutputMapping = () => {
    const newMapping = { source: '', target: '' };
    setFormData((prev: any) => ({
      ...prev,
      outputMappings: [...(prev.outputMappings || []), newMapping],
    }));
  };

  const updateOutputMapping = (index: number, field: 'source' | 'target', value: string) => {
    setFormData((prev: any) => {
      const newMappings = [...(prev.outputMappings || [])];
      newMappings[index] = { ...newMappings[index], [field]: value };
      return { ...prev, outputMappings: newMappings };
    });
  };

  const removeOutputMapping = (index: number) => {
    setFormData((prev: any) => {
      const newMappings = [...(prev.outputMappings || [])];
      newMappings.splice(index, 1);
      return { ...prev, outputMappings: newMappings };
    });
  };

  return (
    <div className="node-config-modal-overlay">
      <div className="node-config-modal">
        <div className="node-config-modal-header">
          <div className="title">Configure {node.type} Node</div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="node-config-tabs">
          <button
            className={`tab-btn ${activeTab === 'params' ? 'active' : ''}`}
            onClick={() => setActiveTab('params')}
          >
            <Sliders size={14} />
            Parameters
          </button>
          <button
            className={`tab-btn ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            <ArrowRightLeft size={14} />
            Output
          </button>
          <button
            className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={14} />
            Configuration
          </button>
          {onNodeTest && (
            <button
              className={`tab-btn ${activeTab === 'test' ? 'active' : ''}`}
              onClick={() => setActiveTab('test')}
            >
              <Play size={14} />
              Test
            </button>
          )}
        </div>

        <div className="node-config-modal-body">
          {activeTab === 'params' && (
            <div className="params-config">
              {schema ? (
                <DynamicForm
                  schema={schema}
                  defaultValues={formData}
                  onChange={setFormData}
                  widgets={formComponents}
                  showSubmitButton={false}
                  renderAsForm={false}
                />
              ) : (
                <div className="no-schema">No configuration available for this node type.</div>
              )}
            </div>
          )}

          {activeTab === 'output' && (
            <div className="mapping-section">
              <div className="section-title">
                Output Variable Mapping
                <button className="add-btn" onClick={addOutputMapping}>
                  <Plus size={14} /> Add
                </button>
              </div>

              {(formData.outputMappings || []).length > 0 && (
                <div className="mapping-header">
                  <div className="col-variable">Variable Name</div>
                  <div className="col-arrow"></div>
                  <div className="col-expression">Expression</div>
                  <div className="col-action"></div>
                </div>
              )}

              <div className="mapping-list">
                {(formData.outputMappings || []).length === 0 ? (
                  <div className="mapping-empty">No output mappings configured</div>
                ) : (
                  (formData.outputMappings || []).map((mapping: any, index: number) => (
                    <div key={index} className="mapping-item">
                      <div className="field-group">
                        <input
                          type="text"
                          value={mapping.target}
                          onChange={e => updateOutputMapping(index, 'target', e.target.value)}
                          placeholder="Variable Name"
                        />
                      </div>
                      <div className="arrow">=</div>
                      <div className="field-group">
                        <input
                          type="text"
                          value={mapping.source}
                          onChange={e => updateOutputMapping(index, 'source', e.target.value)}
                          placeholder="Expression"
                        />
                      </div>
                      <button
                        className="delete-btn"
                        onClick={() => removeOutputMapping(index)}
                        title="Remove Mapping"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="general-config">
              <div className="form-group">
                <label>Node Name</label>
                <input
                  type="text"
                  value={formData.label || ''}
                  onChange={e => handleInputChange('label', e.target.value)}
                  placeholder="Enter node name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => handleInputChange('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="general-config">
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    cursor: isTesting ? 'not-allowed' : 'pointer',
                    opacity: isTesting ? 0.7 : 1,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Run Test
                </button>
              </div>

              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 13,
                  color: '#6b7280',
                }}
              >
                The test will use the parameters configured in the "Parameters" tab.
              </div>

              {testError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#dc2626',
                    fontSize: 13,
                  }}
                >
                  <AlertCircle size={16} />
                  {testError}
                </div>
              )}

              {testResult && (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>
                      Test Result
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background:
                          testResult.status === 'success'
                            ? '#ecfdf5'
                            : testResult.status === 'failure'
                              ? '#fef2f2'
                              : '#f3f4f6',
                        color:
                          testResult.status === 'success'
                            ? '#059669'
                            : testResult.status === 'failure'
                              ? '#dc2626'
                              : '#6b7280',
                        border: '1px solid currentColor',
                      }}
                    >
                      {testResult.status.toUpperCase()}
                    </span>
                  </div>

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
                      <span style={{ color: '#6b7280' }}>Duration:</span>{' '}
                      {testResult.endTime && testResult.startTime
                        ? `${testResult.endTime - testResult.startTime}ms`
                        : '-'}
                    </div>
                  </div>

                  {testResult.error && (
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
                          fontSize: 13,
                        }}
                      >
                        <AlertCircle size={16} style={{ marginRight: 8 }} />
                        Error Occurred
                      </div>
                      <div style={{ color: '#b91c1c', fontSize: 12 }}>
                        {testResult.error.message}
                      </div>
                    </div>
                  )}

                  {testResult.outputs && <JsonView title="Outputs" data={testResult.outputs} />}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="node-config-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
