import React, { type ReactNode } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, XCircle, Clock, Loader2, MinusCircle } from 'lucide-react';
import type { ExecutionStatus } from '../types';
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

  // Execution History Props
  executionStatus?: ExecutionStatus;
  executionCount?: number;
  executionDuration?: number;
}

const StatusIcon: React.FC<{ status: ExecutionStatus }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 size={14} className="status-icon success" />;
    case 'failure':
      return <XCircle size={14} className="status-icon failure" />;
    case 'running':
      return <Loader2 size={14} className="status-icon running animate-spin" />;
    case 'skipped':
      return <MinusCircle size={14} className="status-icon skipped" />;
    case 'pending':
    default:
      return null;
  }
};

const BaseNode: React.FC<BaseNodeProps> = ({
  icon,
  title,
  children,
  selected,
  handles = [],
  className = '',
  executionStatus,
  executionCount,
  executionDuration,
}) => {
  const hasBody = !!children;
  const statusClass = executionStatus ? `status-${executionStatus}` : '';

  return (
    <div
      className={`workflow-node ${selected ? 'selected' : ''} ${!hasBody ? 'no-body' : ''} ${statusClass} ${className}`}
    >
      <div className="workflow-node-header">
        {icon && <div className="workflow-node-icon">{icon}</div>}
        <div className="workflow-node-title">{title}</div>
        {executionStatus && (
          <div className="workflow-node-status">
            <StatusIcon status={executionStatus} />
          </div>
        )}
        {executionCount && executionCount > 1 && (
          <div className="workflow-node-badge" title={`${executionCount} executions`}>
            x{executionCount}
          </div>
        )}
      </div>

      {children && <div className="workflow-node-body">{children}</div>}

      {executionDuration !== undefined && (
        <div className="workflow-node-footer">
          <Clock size={10} style={{ marginRight: 4 }} />
          {executionDuration}ms
        </div>
      )}

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
