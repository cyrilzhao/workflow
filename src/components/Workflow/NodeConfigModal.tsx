import React, { useState, useEffect } from 'react';
import type { WorkflowNode, NodeConfigSchema } from './types';
import { DynamicForm } from '@/components/DynamicForm';
import { X, Settings, Sliders, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import './NodeConfigModal.scss';

interface NodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: WorkflowNode | null;
  schema: NodeConfigSchema | undefined;
  formComponents?: Record<string, React.ComponentType<any>>;
  onSave: (nodeId: string, data: any) => void;
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  isOpen,
  onClose,
  node,
  schema,
  formComponents,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'output' | 'config'>('params');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node) {
      setFormData({ ...node.data });
      // Reset tab when node changes
      setActiveTab('params');
    }
  }, [node]);

  if (!isOpen || !node) return null;

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
