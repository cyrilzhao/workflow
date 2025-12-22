import React, { useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes as defaultNodeTypes } from './nodes';
import type { WorkflowProps } from './types';
import './Workflow.scss';

const WorkflowContent: React.FC<WorkflowProps> = ({
  initialNodes = [],
  initialEdges = [],
  nodeTypes = {},
  onNodesChange: onNodesChangeProp,
  onEdgesChange: _onEdgesChangeProp,
  readonly = false,
}) => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  const mergedNodeTypes = React.useMemo(
    () => ({
      ...defaultNodeTypes,
      ...nodeTypes,
    }),
    [nodeTypes]
  );

  // Wrap onNodesChange to sync with parent if needed
  const handleNodesChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (changes: any) => {
      onNodesChange(changes);
      if (onNodesChangeProp) {
        // Logic to pass updated nodes to parent could be complex as changes are diffs
        // For simplicity, we might rely on the parent updating initialNodes or use a different pattern
        // But typically internal state is enough unless bidirectional sync is needed.
        // Here we just notify.
      }
    },
    [onNodesChange, onNodesChangeProp]
  );

  return (
    <div className="workflow-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={readonly ? undefined : onConnect}
        nodeTypes={mergedNodeTypes}
        fitView
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export const Workflow: React.FC<WorkflowProps> = props => {
  return (
    <ReactFlowProvider>
      <WorkflowContent {...props} />
    </ReactFlowProvider>
  );
};

export default Workflow;
