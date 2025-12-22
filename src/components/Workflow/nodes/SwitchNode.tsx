import React from 'react';
import { GitBranch } from 'lucide-react';
import { Position } from 'reactflow';
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

  const handles = [
    { type: 'target', position: Position.Left, id: 'entry' },
    ...cases.map((c: SwitchCase, index: number) => ({
      type: 'source',
      position: Position.Right,
      id: c.id,
      style: { top: `${((index + 1) * 100) / (cases.length + 1)}%` },
    })),
  ];

  return (
    <BaseNode
      title={data.label || 'Switch'}
      icon={<GitBranch size={16} />}
      selected={selected}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handles={handles as any} // Typing issue workaround, can be improved
      className="switch-node"
    >
      {data.description && <p>{data.description}</p>}
      <div className="switch-cases">
        {cases.map((c: SwitchCase) => (
          <div key={c.id} className="switch-case-label">
            {c.label}
          </div>
        ))}
      </div>
    </BaseNode>
  );
};

export default SwitchNode;
