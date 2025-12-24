import React, { useState, useEffect } from 'react';
import type { WorkflowNode, NodeConfigSchema } from './types';
import { SchemaForm } from './SchemaForm';
import { X } from 'lucide-react';
import './NodeConfigModal.scss';

interface NodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: WorkflowNode | null;
  schema: NodeConfigSchema | undefined; // Updated type
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
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node) {
      setFormData({ ...node.data });
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSave = () => {
    onSave(node.id, formData);
    onClose();
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
        <div className="node-config-modal-body">
          {schema ? (
            <SchemaForm
              schema={schema}
              data={formData}
              onChange={setFormData}
              formComponents={formComponents}
            />
          ) : (
            <div className="no-schema">No configuration available for this node type.</div>
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
