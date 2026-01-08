import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Position } from 'reactflow';
import BaseNode from './BaseNode';
import type { CustomNodeProps } from '../types';
import './LoopNode.scss';

const LoopNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const hasExecutionData = data._status || data._runCount || data._duration !== undefined;

  return (
    <BaseNode
      title={data.label || 'Loop'}
      icon={<RefreshCw size={16} />}
      selected={selected}
      handles={[
        { type: 'target', position: Position.Left, id: 'entry' },
        { type: 'source', position: Position.Right, id: 'next' },
        { type: 'source', position: Position.Bottom, id: 'loop-start', className: 'loop-start' },
        { type: 'target', position: Position.Bottom, id: 'loop-end', className: 'loop-end' },
      ]}
      className="loop-node"
      executionStatus={data._status}
      executionCount={data._runCount}
      executionDuration={data._duration}
      customFooter={
        hasExecutionData ? (
          <div className="loop-handles-footer-with-execution">
            <span className="loop-handle-label start">Start</span>
            <span className="loop-handle-label end">End</span>
          </div>
        ) : undefined
      }
    >
      {data.description && <p>{data.description}</p>}
      {!hasExecutionData && (
        <div className="loop-handles-footer">
          <span className="loop-handle-label start">Start</span>
          <span className="loop-handle-label end">End</span>
        </div>
      )}
    </BaseNode>
  );
};

export default LoopNode;
