import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Position } from 'reactflow';
import BaseNode from './BaseNode';
import type { CustomNodeProps } from '../types';
import './LoopNode.scss';

const LoopNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
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
    >
      {data.description && <p>{data.description}</p>}
    </BaseNode>
  );
};

export default LoopNode;
