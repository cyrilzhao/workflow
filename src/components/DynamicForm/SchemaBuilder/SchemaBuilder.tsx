import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { cloneDeep, get, set, unset } from 'lodash';
import type {
  SchemaBuilderProps,
  SchemaBuilderContextType,
  SchemaNode,
  SchemaNodeType,
} from './types';
import type { ExtendedJSONSchema } from '../types/schema';
import { SchemaTree } from './SchemaTree';
import { PropertyEditor } from './PropertyEditor';
import { Card, Divider, Tabs, Tab } from '@blueprintjs/core';
import { DynamicForm } from '../../DynamicForm';
import './SchemaBuilder.scss';

const defaultSchema: ExtendedJSONSchema = {
  type: 'object',
  title: 'Root',
  properties: {},
};

// 生成随机字段 key 的辅助函数
const generateRandomKeyStatic = (properties: Record<string, any>): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let newKey = '';
  do {
    let randomStr = '';
    for (let i = 0; i < 4; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    newKey = `field_${randomStr}`;
  } while (properties[newKey]);
  return newKey;
};

// 确保 schema 至少有一个一级节点
const ensureHasFirstLevelNodeStatic = (schema: ExtendedJSONSchema | null | undefined): ExtendedJSONSchema => {
  // 处理 null、undefined 或空对象的情况
  if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
    const newSchema: ExtendedJSONSchema = {
      type: 'object',
      title: 'Root',
      properties: {},
    };

    const placeholderKey = generateRandomKeyStatic(newSchema.properties!);
    newSchema.properties![placeholderKey] = {
      type: 'string',
      title: 'New Field',
    };

    return newSchema;
  }

  // 处理非 object 类型的情况，强制转换为 object
  if (schema.type !== 'object') {
    const newSchema: ExtendedJSONSchema = {
      type: 'object',
      title: schema.title || 'Root',
      properties: {},
    };

    const placeholderKey = generateRandomKeyStatic(newSchema.properties!);
    newSchema.properties![placeholderKey] = {
      type: 'string',
      title: 'New Field',
    };

    return newSchema;
  }

  // 处理 type 为 object 但没有 properties 或 properties 为空的情况
  const hasProperties = schema.properties && Object.keys(schema.properties).length > 0;

  if (!hasProperties) {
    const newSchema = cloneDeep(schema);
    if (!newSchema.properties) {
      newSchema.properties = {};
    }

    // 创建占位节点
    const placeholderKey = generateRandomKeyStatic(newSchema.properties);
    newSchema.properties[placeholderKey] = {
      type: 'string',
      title: 'New Field',
    };

    return newSchema;
  }

  return schema;
};

export const SchemaBuilderContext = createContext<SchemaBuilderContextType | undefined>(undefined);

export const useSchemaBuilder = () => {
  const context = useContext(SchemaBuilderContext);
  if (!context) {
    throw new Error('useSchemaBuilder must be used within a SchemaBuilderProvider');
  }
  return context;
};

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
  defaultValue,
  onChange,
  className,
  style,
}) => {
  // 初始化时确保至少有一个一级节点
  const getInitialSchema = () => {
    const initialSchema = defaultValue || defaultSchema;
    return ensureHasFirstLevelNodeStatic(initialSchema);
  };

  const [schema, setSchema] = useState<ExtendedJSONSchema>(getInitialSchema());
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({ '': true });
  const [previewData, setPreviewData] = useState({});
  const [previewTab, setPreviewTab] = useState<'form' | 'json'>('form');

  // Resizable sidebar state
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const isResizingRef = useRef(false);

  useEffect(() => {
    if (defaultValue) {
      // 检查是否需要创建占位节点
      const schemaToSet = ensureHasFirstLevelNodeStatic(defaultValue);
      setSchema(schemaToSet);
    }
  }, [defaultValue]);

  // Resize handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
        // Calculate new width relative to container if possible,
        // but here we can just update based on mouse position if we assume sidebar is on the left
        // A simpler approach for absolute width:
        // We need the offset of the container.
        // Let's rely on movementX? No, that accumulates errors.
        // We can track the initial mouse X and initial width.
        // But React state updates might be slow for drag.
        // Let's use requestAnimationFrame if needed, but for simple resize state update is usually fine.

        // Actually, since the component might be anywhere on screen, we need clientX relative to the sidebar start.
        // But we don't have ref to container easily here without adding more refs.
        // Let's assume standard behavior:
        // New Width = Current Width + Movement
        setLeftPanelWidth(prev => Math.max(200, Math.min(600, prev + e.movementX)));
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text selection
    e.preventDefault();
  };

  const handleToggleExpand = useCallback((path: string[], expanded: boolean) => {
    const pathStr = path.join('.');
    setExpandedPaths(prev => ({ ...prev, [pathStr]: expanded }));
  }, []);

  const handleUpdate = useCallback(
    (path: string[], updates: Partial<SchemaNode>, newKey?: string) => {
      setSchema(prevSchema => {
        const nextSchema = cloneDeep(prevSchema);
        const targetPath = path.length === 0 ? [] : path;

        // Get the current node at the path
        const currentNode = path.length === 0 ? nextSchema : get(nextSchema, targetPath);

        if (!currentNode) return prevSchema;

        // Apply updates
        Object.assign(currentNode, updates);

        // Auto-create items for array type
        if (updates.type === 'array' && !currentNode.items) {
          const newSubFieldKey = generateRandomKey({});

          currentNode.items = {
            type: 'object',
            title: 'Items',
            properties: {
              [newSubFieldKey]: {
                type: 'string',
                title: 'New Field',
              },
            },
          };
        } else if (updates.type === 'object') {
          const newSubFieldKey = generateRandomKey({});

          currentNode.properties = {
            [newSubFieldKey]: {
              type: 'string',
              title: 'New Field',
            },
          };
        }

        // Remove items if switching away from array
        if (updates.type && updates.type !== 'array' && currentNode.items) {
          delete currentNode.items;
        }

        // Auto-expand logic
        if (updates.type === 'array' || updates.type === 'object') {
          const pathStr = path.join('.');
          setExpandedPaths(prev => {
            const next = { ...prev, [pathStr]: true };
            if (updates.type === 'array') {
              // Expand items as well if requested "expand new items child field"
              // Path to items is path + ['items']
              const itemsPathStr = [...path, 'items'].join('.');
              next[itemsPathStr] = true;
            }
            return next;
          });
        }

        // Handle key renaming if newKey is provided and it's different from the last part of the path
        if (newKey && path.length > 0) {
          const parentPath = path.slice(0, -1);
          const oldKey = path[path.length - 1];

          // Only rename if it's property of an object (inside properties)
          if (parentPath[parentPath.length - 1] === 'properties' && oldKey !== newKey) {
            const parentNode = get(nextSchema, parentPath);
            if (parentNode) {
              // Check if new key already exists to avoid overwrite
              if (parentNode[newKey]) {
                console.warn(`Key "${newKey}" already exists.`);
                return prevSchema;
              }

              // Create new property with new key
              parentNode[newKey] = parentNode[oldKey];
              // Delete old property
              delete parentNode[oldKey];

              // Update selected path to reflect the new key
              const newPath = [...parentPath, newKey];
              setSelectedPath(newPath);

              // Update expanded paths if needed (rename keys in expandedPaths map)
              // This is complex because keys are path strings.
              // For simplicity, we might just lose expansion state for children of renamed node,
              // or try to migrate.
              // Migration:
              const oldPathPrefix = path.join('.') + '.';
              const newPathPrefix = newPath.join('.') + '.';

              setExpandedPaths(prev => {
                const next: Record<string, boolean> = {};
                Object.keys(prev).forEach(key => {
                  if (key === path.join('.')) {
                    next[newPath.join('.')] = prev[key];
                  } else if (key.startsWith(oldPathPrefix)) {
                    const suffix = key.substring(oldPathPrefix.length);
                    next[newPathPrefix + suffix] = prev[key];
                  } else {
                    next[key] = prev[key];
                  }
                });
                return next;
              });
            }
          }
        }

        onChange?.(nextSchema);
        return nextSchema;
      });
    },
    [onChange]
  );

  const generateRandomKey = (properties: Record<string, any>) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let newKey = '';
    do {
      let randomStr = '';
      for (let i = 0; i < 4; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // newKey = `field_${randomStr}`;
      newKey = `field_${randomStr}`;
    } while (properties[newKey]);
    return newKey;
  };

  const handleAddChild = useCallback(
    (path: string[], type: SchemaNodeType) => {
      setSchema(prevSchema => {
        const nextSchema = cloneDeep(prevSchema);
        const targetNode = path.length === 0 ? nextSchema : get(nextSchema, path);

        if (!targetNode) return prevSchema;

        if (targetNode.type === 'object') {
          if (!targetNode.properties) {
            targetNode.properties = {};
          }

          const newKey = generateRandomKey(targetNode.properties);

          let newNode: any = {
            type: type,
            title: `New Field`,
          };

          // If explicitly adding object/array (though UI defaults to string), set defaults
          if (type === 'object') {
            newNode.properties = {};
          } else if (type === 'array') {
            newNode.items = {
              type: 'string',
              title: 'Item',
            };
          }

          targetNode.properties[newKey] = newNode;

          // Auto expand parent to show new child
          const pathStr = path.join('.');
          setExpandedPaths(prev => ({ ...prev, [pathStr]: true }));
        } else if (targetNode.type === 'array') {
          // Ensure items exists
          if (!targetNode.items) {
            targetNode.items = {
              type: type,
              title: 'Item',
            };
          }
          // Expand array
          const pathStr = path.join('.');
          setExpandedPaths(prev => ({ ...prev, [pathStr]: true }));
        }

        onChange?.(nextSchema);
        return nextSchema;
      });
    },
    [onChange]
  );

  const handleAddSibling = useCallback(
    (path: string[], type: SchemaNodeType) => {
      if (path.length === 0) return; // Cannot add sibling to root

      setSchema(prevSchema => {
        const nextSchema = cloneDeep(prevSchema);

        // Determine parent
        // path: ['properties', 'field1']
        // parentPath: ['properties'] -> This is the object containing fields
        // grandParentPath: [] -> This is the node containing properties

        // If we are in properties object
        if (path.length >= 2 && path[path.length - 2] === 'properties') {
          const propertiesPath = path.slice(0, -1);
          const propertiesNode = get(nextSchema, propertiesPath);

          if (propertiesNode) {
            const newKey = generateRandomKey(propertiesNode);

            let newNode: any = {
              type: type,
              title: `New Field`,
            };

            if (type === 'object') {
              newNode.properties = {};
            } else if (type === 'array') {
              newNode.items = {
                type: 'string',
                title: 'Item',
              };
            }

            propertiesNode[newKey] = newNode;
          }
        }

        // Cannot add sibling for 'items' node in simple array (it's a single object)

        onChange?.(nextSchema);
        return nextSchema;
      });
    },
    [onChange]
  );

  const handleDelete = useCallback(
    (path: string[]) => {
      if (path.length === 0) return; // Cannot delete root

      setSchema(prevSchema => {
        const nextSchema = cloneDeep(prevSchema);
        const parentPath = path.slice(0, -1);
        const keyToDelete = path[path.length - 1];

        const parentNode = path.length === 1 ? nextSchema : get(nextSchema, parentPath);

        if (parentNode) {
          if (Array.isArray(parentNode)) {
            // Should not happen in standard schema structure for properties
          } else {
            if (parentPath[parentPath.length - 1] === 'properties') {
              delete parentNode[keyToDelete];
            } else if (keyToDelete === 'items') {
              delete parentNode.items;
            }
          }
          setSelectedPath([]);
        }

        onChange?.(nextSchema);
        return nextSchema;
      });
    },
    [onChange]
  );

  console.info('cyril schema: ', JSON.stringify(schema));

  return (
    <SchemaBuilderContext.Provider
      value={{
        schema,
        selectedPath,
        expandedPaths,
        onSelect: setSelectedPath,
        onUpdate: handleUpdate,
        onAddChild: handleAddChild,
        onAddSibling: handleAddSibling,
        onDelete: handleDelete,
        onToggleExpand: handleToggleExpand,
      }}
    >
      <div className={`schema-builder ${className || ''}`} style={style}>
        <div className="schema-builder-left" style={{ width: leftPanelWidth }}>
          <SchemaTree />
        </div>
        <div className="schema-builder-resizer" onMouseDown={startResizing} />
        <div className="schema-builder-middle">
          <PropertyEditor />
        </div>
        <Divider />
        <div className="schema-builder-right">
          <Tabs
            id="preview-tabs"
            selectedTabId={previewTab}
            onChange={id => setPreviewTab(id as any)}
          >
            <Tab
              id="form"
              title="Live Preview"
              panel={
                <div className="preview-content">
                  <DynamicForm schema={schema} onChange={setPreviewData} />
                  <Divider />
                  <div className="preview-data">
                    <h5>Data</h5>
                    <pre>{JSON.stringify(previewData, null, 2)}</pre>
                  </div>
                </div>
              }
            />
            <Tab
              id="json"
              title="JSON Schema"
              panel={
                <div className="preview-content">
                  <pre>{JSON.stringify(schema, null, 2)}</pre>
                </div>
              }
            />
          </Tabs>
        </div>
      </div>
    </SchemaBuilderContext.Provider>
  );
};
