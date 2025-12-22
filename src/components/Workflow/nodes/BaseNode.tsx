import React, { type ReactNode } from 'react';
import { Handle, Position } from 'reactflow';
import './BaseNode.scss';

export interface BaseNodeProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  selected?: boolean;
  handles?: {
    type: 'source' | 'target';
    position: Position;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
  }[];
  className?: string;
}

const BaseNode: React.FC<BaseNodeProps> = ({
  icon,
  title,
  children,
  selected,
  handles = [],
  className = '',
}) => {
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''} ${className}`}>
      <div className="workflow-node-header">
        {icon && <div className="workflow-node-icon">{icon}</div>}
        <div className="workflow-node-title">{title}</div>
      </div>
      {children && <div className="workflow-node-body">{children}</div>}

      {handles.map((handle, index) => (
        <Handle
          key={`${handle.type}-${index}`}
          type={handle.type}
          position={handle.position}
          id={handle.id}
          className={`workflow-handle ${handle.type} ${handle.className || ''}`}
          style={handle.style}
        />
      ))}
    </div>
  );
};

export default BaseNode;
