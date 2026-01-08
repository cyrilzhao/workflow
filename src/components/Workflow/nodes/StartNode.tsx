import React from 'react';
import { Play } from 'lucide-react';
import { Position } from 'reactflow';
import BaseNode from './BaseNode';
import type { CustomNodeProps } from '../types';

const StartNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      title={data.label || 'Start'}
      icon={<Play size={16} />}
      selected={selected}
      handles={[{ type: 'source', position: Position.Right }]}
      className="start-node"
      executionStatus={data._status}
      executionCount={data._runCount}
      executionDuration={data._duration}
    >
      {data.description && <p>{data.description}</p>}
    </BaseNode>
  );
};

export default StartNode;
