import React, { useState } from 'react';
import { WorkflowIDE } from '../../components/Workflow/WorkflowIDE';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecutionSnapshot,
  CustomNodeProps,
} from '../../components/Workflow/types';
import { BaseNode } from '@/components/Workflow';
import { Mail } from 'lucide-react';
import { Position } from 'reactflow';

// Initial Workflow State

const initialNodes: WorkflowNode[] = [
  {
    id: 'start',
    type: 'start',
    position: {
      x: -156.70740794135415,
      y: 80.21123726596025,
    },
    data: {
      label: 'Start Trigger',
    },
    width: 200,
    height: 44,
    selected: true,
    positionAbsolute: {
      x: -156.70740794135415,
      y: 80.21123726596025,
    },
    dragging: false,
  },
  {
    id: 'loop',
    type: 'loop',
    position: {
      x: 173.3175097399626,
      y: 55.751186769502795,
    },
    data: {
      label: 'Process Items',
    },
    width: 200,
    height: 85,
    selected: false,
    positionAbsolute: {
      x: 173.3175097399626,
      y: 55.751186769502795,
    },
    dragging: false,
  },
  {
    id: 'process',
    type: 'switch',
    position: {
      x: 0.8388502696868017,
      y: 283.3078571802565,
    },
    data: {
      label: 'Check Value',
      cases: [
        {
          id: 'true',
          label: '> 5',
        },
        {
          id: 'false',
          label: '<= 5',
        },
      ],
    },
    width: 200,
    height: 133,
    selected: false,
    positionAbsolute: {
      x: 0.8388502696868017,
      y: 283.3078571802565,
    },
    dragging: false,
  },
  {
    id: 'end',
    type: 'end',
    position: {
      x: 514.567250974254,
      y: 74.60969502011284,
    },
    data: {
      label: 'Finish',
    },
    width: 200,
    height: 44,
    selected: false,
    positionAbsolute: {
      x: 514.567250974254,
      y: 74.60969502011284,
    },
    dragging: false,
  },
  {
    id: 'message-1767859245147',
    type: 'message',
    position: {
      x: 331.04421177146634,
      y: 247.74508504743943,
    },
    data: {
      label: 'message',
    },
    width: 200,
    height: 69,
    selected: false,
    positionAbsolute: {
      x: 331.04421177146634,
      y: 247.74508504743943,
    },
    dragging: false,
  },
  {
    id: 'message-1767859246752',
    type: 'message',
    position: {
      x: 327.2733087971184,
      y: 408.9511872008154,
    },
    data: {
      label: 'message',
    },
    width: 200,
    height: 69,
    selected: false,
    positionAbsolute: {
      x: 327.2733087971184,
      y: 408.9511872008154,
    },
    dragging: false,
  },
];

const initialEdges: WorkflowEdge[] = [
  {
    id: 'e1',
    source: 'start',
    target: 'loop',
    targetHandle: 'entry',
  },
  {
    id: 'e2',
    source: 'loop',
    sourceHandle: 'loop-start',
    target: 'process',
    targetHandle: 'entry',
  },
  {
    id: 'e5',
    source: 'loop',
    sourceHandle: 'next',
    target: 'end',
  },
  {
    type: 'default',
    animated: true,
    zIndex: 999,
    source: 'process',
    sourceHandle: 'true',
    target: 'message-1767859245147',
    targetHandle: null,
    id: 'reactflow__edge-processtrue-message-1767859245147',
  },
  {
    type: 'default',
    animated: true,
    zIndex: 999,
    source: 'process',
    sourceHandle: 'false',
    target: 'message-1767859246752',
    targetHandle: null,
    id: 'reactflow__edge-processfalse-message-1767859246752',
  },
  {
    type: 'default',
    animated: true,
    zIndex: 999,
    source: 'message-1767859245147',
    sourceHandle: null,
    target: 'loop',
    targetHandle: 'loop-end',
    id: 'reactflow__edge-message-1767859245147-looploop-end',
  },
  {
    type: 'default',
    animated: true,
    zIndex: 999,
    source: 'message-1767859246752',
    sourceHandle: null,
    target: 'loop',
    targetHandle: 'loop-end',
    id: 'reactflow__edge-message-1767859246752-looploop-end',
  },
];

const mockExecutions: WorkflowExecutionSnapshot[] = [
  {
    executionId: 'exec-001',
    workflowId: 'wf-demo',
    status: 'success',
    startTime: Date.now() - 100000,
    endTime: Date.now() - 98000,
    nodes: initialNodes,
    edges: initialEdges,
    nodeExecutions: {
      start: {
        nodeId: 'start',
        status: 'success',
        runCount: 1,
        records: [
          {
            nodeId: 'start',
            startTime: Date.now() - 100000,
            endTime: Date.now() - 99900,
            status: 'success',
            inputs: {},
            outputs: { trigger: 'manual' },
          },
        ],
      },
      loop: {
        nodeId: 'loop',
        status: 'success',
        runCount: 1, // Loop node itself runs once as a container
        records: [
          {
            nodeId: 'loop',
            startTime: Date.now() - 99900,
            endTime: Date.now() - 98500,
            status: 'success',
            inputs: { items: [1, 6, 3] },
            outputs: { processed: 3 },
          },
        ],
      },
      process: {
        nodeId: 'process',
        status: 'success',
        runCount: 3,
        records: [
          {
            nodeId: 'process',
            iterationIndex: 0,
            startTime: Date.now() - 99800,
            endTime: Date.now() - 99700,
            status: 'success',
            inputs: { value: 1 },
            outputs: { result: 'false' },
          },
          {
            nodeId: 'process',
            iterationIndex: 1,
            startTime: Date.now() - 99600,
            endTime: Date.now() - 99500,
            status: 'success',
            inputs: { value: 6 },
            outputs: { result: 'true' },
          },
          {
            nodeId: 'process',
            iterationIndex: 2,
            startTime: Date.now() - 99400,
            endTime: Date.now() - 99300,
            status: 'success',
            inputs: { value: 3 },
            outputs: { result: 'false' },
          },
        ],
      },
      end: {
        nodeId: 'end',
        status: 'success',
        runCount: 1,
        records: [
          {
            nodeId: 'end',
            startTime: Date.now() - 98500,
            endTime: Date.now() - 98000,
            status: 'success',
            inputs: { processed: 3 },
            outputs: { done: true },
          },
        ],
      },
    },
  },
  {
    executionId: 'exec-002',
    workflowId: 'wf-demo',
    status: 'failure',
    startTime: Date.now() - 50000,
    endTime: Date.now() - 48000,
    nodes: initialNodes,
    edges: initialEdges,
    nodeExecutions: {
      start: {
        nodeId: 'start',
        status: 'success',
        runCount: 1,
        records: [
          {
            nodeId: 'start',
            startTime: Date.now() - 50000,
            endTime: Date.now() - 49900,
            status: 'success',
            inputs: {},
            outputs: { trigger: 'webhook' },
          },
        ],
      },
      loop: {
        nodeId: 'loop',
        status: 'failure',
        runCount: 1,
        records: [
          {
            nodeId: 'loop',
            startTime: Date.now() - 49900,
            endTime: Date.now() - 48000,
            status: 'failure',
            inputs: { items: [10, 'invalid'] },
          },
        ],
      },
      process: {
        nodeId: 'process',
        status: 'failure',
        runCount: 2,
        records: [
          {
            nodeId: 'process',
            iterationIndex: 0,
            startTime: Date.now() - 49800,
            endTime: Date.now() - 49700,
            status: 'success',
            inputs: { value: 10 },
            outputs: { result: 'true' },
          },
          {
            nodeId: 'process',
            iterationIndex: 1,
            startTime: Date.now() - 49600,
            endTime: Date.now() - 49500,
            status: 'failure',
            error: {
              message: 'TypeError: value is not a number',
              stack: 'TypeError: value is not a number\n    at ProcessNode.run (workflow.js:50:12)',
            },
            inputs: { value: 'invalid' },
          },
        ],
      },
    },
  },
];

// Custom Node Example using BaseNode
const MessageNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      title={data.label}
      icon={<Mail size={16} style={{ color: '#8b5cf6' }} />}
      selected={selected}
      handles={[
        { type: 'target', position: Position.Left },
        { type: 'source', position: Position.Right },
      ]}
    >
      <div style={{ fontSize: '12px', color: '#6b7280' }}>{data.content as string}</div>
    </BaseNode>
  );
};

const customNodeTypes = {
  message: MessageNode,
};

const WorkflowExecutionHistoryExample: React.FC = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const handleSave = (data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => {
    console.log('Saved workflow:', data);
    setNodes(data.nodes);
    setEdges(data.edges);
  };

  const handleCopyToEditor = (execution: WorkflowExecutionSnapshot) => {
    // In a real app, you might want to confirm before overwriting
    if (window.confirm('Replace current workflow with this execution state?')) {
      setNodes(execution.nodes);
      setEdges(execution.edges);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 60px)', padding: 20 }}>
      <h1>Workflow Execution History</h1>
      <div
        style={{
          height: '800px',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <WorkflowIDE
          initialNodes={nodes}
          initialEdges={edges}
          onSave={handleSave}
          executions={mockExecutions}
          onCopyToEditor={handleCopyToEditor}
          nodeTypes={customNodeTypes}
        />
      </div>
    </div>
  );
};

export default WorkflowExecutionHistoryExample;
