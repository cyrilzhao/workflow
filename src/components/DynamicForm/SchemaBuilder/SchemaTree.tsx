import React, { useState } from 'react';
import { Tree, Icon, Classes, Button, Menu, MenuItem, Popover, Position } from '@blueprintjs/core';
import type { TreeNodeInfo } from '@blueprintjs/core';
import { useSchemaBuilder } from './SchemaBuilder';
import type { ExtendedJSONSchema } from '../types/schema';

export const SchemaTree: React.FC = () => {
  const { schema, selectedPath, onSelect, onAdd, onDelete } = useSchemaBuilder();
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({ '': true });

  const handleNodeClick = (node: TreeNodeInfo) => {
    const path = node.nodeData as string[];
    onSelect(path);
  };

  const handleNodeCollapse = (node: TreeNodeInfo) => {
    const pathStr = (node.nodeData as string[]).join('.');
    setExpandedPaths(prev => ({ ...prev, [pathStr]: false }));
  };

  const handleNodeExpand = (node: TreeNodeInfo) => {
    const pathStr = (node.nodeData as string[]).join('.');
    setExpandedPaths(prev => ({ ...prev, [pathStr]: true }));
  };

  const renderAddMenu = (path: string[]) => (
    <Menu>
      <MenuItem text="String" onClick={() => onAdd(path, 'string')} icon="font" />
      <MenuItem text="Number" onClick={() => onAdd(path, 'number')} icon="numerical" />
      <MenuItem text="Boolean" onClick={() => onAdd(path, 'boolean')} icon="tick" />
      <MenuItem text="Object" onClick={() => onAdd(path, 'object')} icon="symbol-square" />
      <MenuItem text="Array" onClick={() => onAdd(path, 'array')} icon="list" />
    </Menu>
  );

  const buildTreeNodes = (
    currentSchema: ExtendedJSONSchema,
    path: string[] = []
  ): TreeNodeInfo[] => {
    const pathStr = path.join('.');
    const isSelected = path.join('.') === selectedPath.join('.');
    const isExpanded = expandedPaths[pathStr];

    // Determine label and icon
    let label = currentSchema.title || (path.length > 0 ? path[path.length - 1] : 'Root');
    // If inside properties, use the key as label if title is not set, or format "Title (key)"
    if (path.length > 0 && path[path.length - 2] === 'properties') {
      const key = path[path.length - 1];
      label = currentSchema.title ? `${currentSchema.title} (${key})` : key;
    }

    let icon: any = 'symbol-circle';
    if (currentSchema.type === 'object') icon = 'symbol-square';
    else if (currentSchema.type === 'array') icon = 'list';
    else if (currentSchema.type === 'string') icon = 'font';
    else if (currentSchema.type === 'number' || currentSchema.type === 'integer')
      icon = 'numerical';
    else if (currentSchema.type === 'boolean') icon = 'tick';

    const node: TreeNodeInfo = {
      id: pathStr || 'root',
      label: (
        <div className="schema-tree-node-label">
          <span className="node-text">{label}</span>
          <div className="node-actions">
            {(currentSchema.type === 'object' || currentSchema.type === 'array') && (
              <Popover content={renderAddMenu(path)} position={Position.BOTTOM_LEFT}>
                <Button icon="plus" minimal small />
              </Popover>
            )}
            {path.length > 0 && (
              <Button
                icon="trash"
                minimal
                small
                intent="danger"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(path);
                }}
              />
            )}
          </div>
        </div>
      ),
      icon: icon,
      isSelected: isSelected,
      isExpanded: isExpanded,
      nodeData: path,
      hasCaret: currentSchema.type === 'object' || currentSchema.type === 'array',
    };

    const children: TreeNodeInfo[] = [];

    // Handle Object Properties
    if (currentSchema.type === 'object' && currentSchema.properties) {
      Object.entries(currentSchema.properties).forEach(([key, propSchema]) => {
        children.push(
          ...buildTreeNodes(propSchema as ExtendedJSONSchema, [...path, 'properties', key])
        );
      });
    }

    // Handle Array Items
    if (currentSchema.type === 'array' && currentSchema.items) {
      const itemsSchema = currentSchema.items;
      if (!Array.isArray(itemsSchema)) {
        // Single schema for all items
        children.push(...buildTreeNodes(itemsSchema as ExtendedJSONSchema, [...path, 'items']));
      }
      // Note: We are not handling tuple validation (array of schemas) for now as per design focus on common cases
    }

    if (children.length > 0) {
      node.childNodes = children;
    }

    return [node];
  };

  const nodes = buildTreeNodes(schema);

  return (
    <Tree
      contents={nodes}
      onNodeClick={handleNodeClick}
      onNodeCollapse={handleNodeCollapse}
      onNodeExpand={handleNodeExpand}
      className={Classes.ELEVATION_0}
    />
  );
};
