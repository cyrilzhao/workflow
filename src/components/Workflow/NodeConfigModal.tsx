import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkflowNode, NodeConfigSchema, NodeExecutionRecord } from './types';
import { DynamicForm } from '@/components/DynamicForm';
import type { DynamicFormRef } from '@/components/DynamicForm/types';
import { SchemaValidator } from '@/components/DynamicForm/core/SchemaValidator';
import { X, Settings, Sliders, ArrowRightLeft, Play, AlertCircle, Loader2 } from 'lucide-react';
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
  const [pendingValidation, setPendingValidation] = useState(false);
  const formRef = useRef<DynamicFormRef>(null);
  const outputFormRef = useRef<DynamicFormRef>(null);

  useEffect(() => {
    if (node) {
      setFormData({ ...node.data });
      setActiveTab('params');
      setTestResult(null);
      setTestError(null);
      setPendingValidation(false);

      formRef.current?.setValues({ ...node.data });
      outputFormRef.current?.setValues({ outputMappings: node.data.outputMappings || [] });
    }
  }, [node]);

  // 当切换到 params tab 且需要触发校验时，调用 DynamicForm 的 validate 方法
  useEffect(() => {
    if (activeTab === 'params' && pendingValidation && formRef.current) {
      // 触发校验
      formRef.current.validate().then(isValid => {
        if (isValid && node) {
          // 校验通过，执行保存
          onSave(node.id, formData);
          onClose();
        }
        // 校验失败时，错误会自动显示在 DynamicForm 中
        setPendingValidation(false);
      });
    }
  }, [activeTab, pendingValidation, node, formData, onSave, onClose]);

  const handleTest = useCallback(async () => {
    if (!onNodeTest || !node) return;

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
  }, [onNodeTest, node, formData]);

  const handleSave = useCallback(async () => {
    if (!node) return;

    // 如果有 inputSchema，需要进行校验
    if (schema?.inputSchema) {
      // 第一步：使用 SchemaValidator 快速检查是否有错误
      const validator = new SchemaValidator(schema.inputSchema);
      const validationErrors = validator.validate(formData, true);
      const hasValidationErrors = Object.keys(validationErrors).length > 0;

      // 如果快速检查发现有错误
      if (hasValidationErrors) {
        // 如果当前在 params tab 且 formRef 可用，直接触发 DynamicForm 的完整校验
        if (activeTab === 'params' && formRef.current) {
          const isValid = await formRef.current.validate();
          if (!isValid) {
            // 校验失败，手动滚动到第一个错误字段
            setTimeout(() => {
              // 从 validationErrors 中找到第一个数组错误的索引
              // 例如 "cases[3].label" -> 提取出字段名 "cases" 和索引 3
              const firstArrayError = Object.keys(validationErrors).find(key => key.includes('['));
              if (firstArrayError) {
                const match = firstArrayError.match(/^(\w+)\[(\d+)\]/);
                if (match) {
                  const fieldName = match[1]; // "cases"
                  const errorIndex = match[2]; // "3"

                  // 查找对应的数组项元素
                  const errorElement = document.querySelector(
                    `[data-array-item-name="${fieldName}.${errorIndex}"]`
                  );

                  if (errorElement) {
                    errorElement.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }
                }
              }
            }, 150);
            return;
          }
        } else {
          // 不在 params tab，切换过去并标记需要校验
          setPendingValidation(true);
          setActiveTab('params');
          return;
        }
      }
    }

    // 校验通过或无需校验，执行保存
    onSave(node.id, formData);
    onClose();
  }, [schema?.inputSchema, formData, node, onSave, onClose, activeTab]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Output tab schema 定义
  const outputSchema = {
    type: 'object',
    properties: {
      outputMappings: {
        type: 'array',
        title: 'Output Variable Mapping',
        items: {
          type: 'object',
          properties: {
            target: { type: 'string', title: 'Variable Name' },
            source: { type: 'string', title: 'Expression' },
          },
        },
        ui: {
          widget: 'key-value-array',
          widgetProps: {
            keyField: 'target',
            valueField: 'source',
            keyLabel: 'Variable Name',
            valueLabel: 'Expression',
            keyPlaceholder: 'Variable Name',
            valuePlaceholder: 'Expression',
            addButtonText: 'Add',
            emptyText: 'No output mappings configured',
          },
        },
      },
    },
  };

  // 处理 output form 的变化
  const handleOutputChange = useCallback((data: any) => {
    setFormData((prev: any) => ({
      ...prev,
      outputMappings: data.outputMappings || [],
    }));
  }, []);

  if (!isOpen || !node) return null;

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
          {onNodeTest && schema?.testable && (
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
              {schema?.inputSchema ? (
                <DynamicForm
                  ref={formRef}
                  schema={schema.inputSchema}
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
            <div className="output-config">
              <DynamicForm
                ref={outputFormRef}
                schema={outputSchema}
                defaultValues={{ outputMappings: formData.outputMappings || [] }}
                onChange={handleOutputChange}
                showSubmitButton={false}
                renderAsForm={false}
              />
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
