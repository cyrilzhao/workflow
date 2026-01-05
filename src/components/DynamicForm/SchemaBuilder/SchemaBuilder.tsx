import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { Card, Divider } from '@blueprintjs/core';
import './SchemaBuilder.scss'; // We'll create this later

const defaultSchema: ExtendedJSONSchema = {
  type: 'object',
  title: 'Root',
  properties: {},
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
  const [schema, setSchema] = useState<ExtendedJSONSchema>(defaultValue || defaultSchema);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  useEffect(() => {
    if (defaultValue) {
      setSchema(defaultValue);
    }
  }, [defaultValue]);

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
            }
          }
        }

        onChange?.(nextSchema);
        return nextSchema;
      });
    },
    [onChange]
  );

  const handleAdd = useCallback(
    (path: string[], type: SchemaNodeType) => {
      setSchema(prevSchema => {
        const nextSchema = cloneDeep(prevSchema);
        const targetNode = path.length === 0 ? nextSchema : get(nextSchema, path);

        if (!targetNode) return prevSchema;

        if (targetNode.type === 'object') {
          if (!targetNode.properties) {
            targetNode.properties = {};
          }

          // Generate a unique key
          let counter = 1;
          let newKey = `field_${counter}`;
          while (targetNode.properties[newKey]) {
            counter++;
            newKey = `field_${counter}`;
          }

          targetNode.properties[newKey] = {
            type: type,
            title: `New ${type}`,
          };
        } else if (targetNode.type === 'array') {
          // Set items schema
          targetNode.items = {
            type: type,
            title: `Item`,
          };
        }

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
          // If deleting from properties object
          if (Array.isArray(parentNode)) {
            // If parent is array (should not happen for JSON schema structure usually, unless accessing array items directly?
            // In JSON Schema, properties is an object, items is an object or array of objects.
            // Our path structure will be like ['properties', 'field1'] or ['items']
          } else {
            if (parentPath[parentPath.length - 1] === 'properties') {
              delete parentNode[keyToDelete];
            } else if (keyToDelete === 'items') {
              delete parentNode.items;
            }
          }

          // If selected node was deleted, select parent
          // Or unselect if root properties deleted?
          // Simple logic: select root
          setSelectedPath([]);
        }

        onChange?.(nextSchema);
        return nextSchema;
      });
    },
    [onChange]
  );

  return (
    <SchemaBuilderContext.Provider
      value={{
        schema,
        selectedPath,
        onSelect: setSelectedPath,
        onUpdate: handleUpdate,
        onAdd: handleAdd,
        onDelete: handleDelete,
      }}
    >
      <div className={`schema-builder ${className || ''}`} style={style}>
        <div className="schema-builder-left">
          <SchemaTree />
        </div>
        <Divider />
        <div className="schema-builder-right">
          <PropertyEditor />
        </div>
      </div>
    </SchemaBuilderContext.Provider>
  );
};
