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
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes as defaultNodeTypes } from './nodes';
import type { WorkflowProps, WorkflowNode } from './types';
import './Workflow.scss';
import { WorkflowPanel } from './WorkflowPanel';
import { NodeConfigModal } from './NodeConfigModal';

const WorkflowContent: React.FC<WorkflowProps> = ({
  initialNodes = [],
  initialEdges = [],
  nodeTypes = {},
  nodeConfigSchemas = {},
  onNodesChange: onNodesChangeProp,
  onEdgesChange: _onEdgesChangeProp,
  readonly = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [selectedNode, setSelectedNode] = React.useState<WorkflowNode | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

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

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: WorkflowNode) => {
      if (readonly) return;
      setSelectedNode(node);
      setIsModalOpen(true);
    },
    [readonly]
  );

  const handleSaveNodeConfig = (nodeId: string, data: any) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type}` },
      };

      setNodes(nds => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div
      className="workflow-container"
      onDrop={readonly ? undefined : onDrop}
      onDragOver={readonly ? undefined : onDragOver}
    >
      {!readonly && <WorkflowPanel />}
      <NodeConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        node={selectedNode}
        schema={selectedNode ? nodeConfigSchemas[selectedNode.type || ''] : undefined}
        onSave={handleSaveNodeConfig}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={readonly ? undefined : onConnect}
        nodeTypes={mergedNodeTypes}
        fitView
        onNodeDoubleClick={onNodeDoubleClick}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
          // @ts-ignore - curvature is a valid prop for BezierEdge but might not be in the strict default types
          curvature: 0.5,
          zIndex: 999,
        }}
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
