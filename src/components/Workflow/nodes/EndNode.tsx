import React from 'react';
import { Square } from 'lucide-react';
import { Position } from 'reactflow';
import BaseNode from './BaseNode';
import type { CustomNodeProps } from '../types';

const EndNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      title={data.label || 'End'}
      icon={<Square size={16} />}
      selected={selected}
      handles={[{ type: 'target', position: Position.Left }]}
      className="end-node"
    >
      {data.description && <p>{data.description}</p>}
    </BaseNode>
  );
};

export default EndNode;
