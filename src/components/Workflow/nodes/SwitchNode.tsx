import React from 'react';
import { GitBranch } from 'lucide-react';
import { Position, Handle } from 'reactflow';
import BaseNode from './BaseNode';
import type { CustomNodeProps } from '../types';
import './SwitchNode.scss';

interface SwitchCase {
  id: string;
  label: string;
}

const SwitchNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  // Assuming cases are passed in data.cases or defaulting to true/false
  const cases = (data.cases as SwitchCase[]) || [
    { id: 'true', label: 'True' },
    { id: 'false', label: 'False' },
  ];

  const handles = [{ type: 'target', position: Position.Left, id: 'entry' }];

  return (
    <BaseNode
      title={data.label || 'Switch'}
      icon={<GitBranch size={16} />}
      selected={selected}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handles={handles as any}
      className="switch-node"
    >
      {data.description && <p>{data.description}</p>}
      <div className="switch-cases">
        {cases.map((c: SwitchCase) => (
          <div key={c.id} className="switch-case-wrapper">
            <div className="switch-case-label">{c.label}</div>
            <Handle type="source" position={Position.Right} id={c.id} className="switch-handle" />
          </div>
        ))}
      </div>
    </BaseNode>
  );
};

export default SwitchNode;
