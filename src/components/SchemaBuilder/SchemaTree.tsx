import React, { useState } from 'react';
import {
  Tree,
  Icon,
  Classes,
  Button,
  Menu,
  MenuItem,
  Popover,
  Position,
  MenuDivider,
  Tooltip,
} from '@blueprintjs/core';
import type { TreeNodeInfo } from '@blueprintjs/core';
import { useSchemaBuilder } from './SchemaBuilder';
import type { ExtendedJSONSchema } from '../DynamicForm/types/schema';
import type { SchemaNodeType } from './types';

export const SchemaTree: React.FC = () => {
  const {
    schema,
    selectedPath,
    expandedPaths,
    onSelect,
    onAddChild,
    onAddSibling,
    onDelete,
    onToggleExpand,
  } = useSchemaBuilder();

  const handleNodeClick = (node: TreeNodeInfo) => {
    const path = node.nodeData as string[];
    onSelect(path);
  };

  const handleNodeCollapse = (node: TreeNodeInfo) => {
    const path = node.nodeData as string[];
    onToggleExpand(path, false);
  };

  const handleNodeExpand = (node: TreeNodeInfo) => {
    const path = node.nodeData as string[];
    onToggleExpand(path, true);
  };

  const renderNodeMenu = (path: string[], currentSchema: ExtendedJSONSchema) => {
    // Logic for allowed actions
    const isRoot = path.length === 0;
    const key = path.length > 0 ? path[path.length - 1] : '';
    const parentKey = path.length > 1 ? path[path.length - 2] : '';

    const canAddChild = currentSchema.type === 'object' || currentSchema.type === 'array';

    // Can add sibling if parent is 'properties' (standard object field)
    const canAddSibling = !isRoot && parentKey === 'properties';

    // 检查是否是一级节点（path 为 ['properties', 'fieldName']）
    const isFirstLevelNode = path.length === 2 && path[0] === 'properties';

    // 如果是一级节点，检查是否是最后一个节点
    let isLastFirstLevelNode = false;
    if (isFirstLevelNode && schema.properties) {
      const firstLevelNodeCount = Object.keys(schema.properties).length;
      isLastFirstLevelNode = firstLevelNodeCount === 1;
    }

    // Can delete if not root and not 'items' of an array (enforcing read-only structure for items)
    // 如果是最后一个一级节点，则不能删除
    const canDelete = !isRoot && key !== 'items' && !isLastFirstLevelNode;

    return (
      <Menu>
        {canAddChild && (
          <MenuItem text="Add Child Node" icon="plus" onClick={() => onAddChild(path, 'string')} />
        )}
        {canAddSibling && (
          <MenuItem
            text="Add Sibling Node"
            icon="new-object"
            onClick={() => onAddSibling(path, 'string')}
          />
        )}

        {(canAddChild || canAddSibling) && <MenuDivider />}

        {canDelete && (
          <MenuItem
            text="Delete Node"
            icon="trash"
            intent="danger"
            onClick={() => onDelete(path)}
          />
        )}
      </Menu>
    );
  };

  const buildTreeNodes = (
    currentSchema: ExtendedJSONSchema,
    path: string[] = []
  ): TreeNodeInfo[] => {
    const pathStr = path.join('.');
    const isSelected = path.join('.') === selectedPath.join('.');
    const isExpanded = !!expandedPaths[pathStr];

    // Determine label
    let label = currentSchema.title || (path.length > 0 ? path[path.length - 1] : 'Root');

    // Formatting label
    if (path.length > 0) {
      const key = path[path.length - 1];
      if (path[path.length - 2] === 'properties') {
        label = currentSchema.title ? `${currentSchema.title} (${key})` : key;
      } else if (key === 'items') {
        label = currentSchema.title ? `${currentSchema.title} (items)` : 'items';
      }
    }

    const canAddChild = currentSchema.type === 'object';
    const canAddSibling = path.length > 0 && path[path.length - 2] === 'properties';
    const showActions = canAddChild || canAddSibling || path.length > 0;

    // console.info('cyril currentSchema: ', currentSchema);
    // console.info('cyril canAddSibling: ', canAddSibling);
    // console.info('cyril canAddChild: ', canAddChild);

    const node: TreeNodeInfo = {
      id: pathStr || 'root',
      label: (
        <div className="schema-tree-node-label">
          <Tooltip content={label} hoverOpenDelay={500} position={Position.TOP_LEFT}>
            <span className="node-text">{label}</span>
          </Tooltip>
          <div className="node-actions">
            {showActions && (
              <Popover
                content={renderNodeMenu(path, currentSchema)}
                position={Position.BOTTOM_LEFT}
                interactionKind="click"
              >
                <Button icon="more" minimal small />
              </Popover>
            )}
          </div>
        </div>
      ),
      // No icon as per requirement
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
    }

    if (children.length > 0) {
      node.childNodes = children;
    }

    return [node];
  };

  const nodes = buildTreeNodes(schema);

  // 显示根节点
  const displayNodes = nodes;

  return (
    <Tree
      contents={displayNodes}
      onNodeClick={handleNodeClick}
      onNodeCollapse={handleNodeCollapse}
      onNodeExpand={handleNodeExpand}
      className={Classes.ELEVATION_0}
    />
  );
};
