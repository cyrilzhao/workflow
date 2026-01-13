import React, { useState } from 'react';
import { WorkflowIDE } from '../../components/Workflow/WorkflowIDE';
import type {
  WorkflowNode,
  WorkflowEdge,
  CustomNodeProps,
  NodeExecutionRecord,
} from '../../components/Workflow/types';
import { BaseNode } from '@/components/Workflow';
import { Bot } from 'lucide-react';
import { Position } from 'reactflow';

// Initial Workflow State
const initialNodes: WorkflowNode[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 50, y: 150 },
    data: { label: 'Start' },
  },
  {
    id: 'agent-1',
    type: 'agent',
    position: { x: 300, y: 150 },
    data: {
      label: 'AI Agent',
      description: 'An AI agent that processes text',
      prompt: 'Summarize the following text: {{input}}',
    },
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 550, y: 150 },
    data: { label: 'End' },
  },
];

const initialEdges: WorkflowEdge[] = [
  { id: 'e1', source: 'start', target: 'agent-1' },
  { id: 'e2', source: 'agent-1', target: 'end' },
];

// Custom Agent Node
const AgentNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      title={data.label}
      icon={<Bot size={16} style={{ color: '#3b82f6' }} />}
      selected={selected}
      handles={[
        { type: 'target', position: Position.Left },
        { type: 'source', position: Position.Right },
      ]}
      executionStatus={data._status}
      executionCount={data._runCount}
      executionDuration={data._duration}
    >
      <div style={{ fontSize: '12px', color: '#6b7280' }}>
        {data.description || 'No description'}
      </div>
    </BaseNode>
  );
};

const customNodeTypes = {
  agent: AgentNode,
};

// Node Config Schema for Agent Node
const nodeConfigSchemas: Record<string, any> = {
  agent: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        title: 'Prompt Template',
        'x-component': 'Textarea',
        'x-component-props': {
          rows: 5,
          placeholder: 'Enter your prompt template here...',
        },
      },
      model: {
        type: 'string',
        title: 'Model',
        enum: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-opus'],
        default: 'gpt-3.5-turbo',
      },
      temperature: {
        type: 'number',
        title: 'Temperature',
        minimum: 0,
        maximum: 1,
        default: 0.7,
        'x-component': 'Number',
      },
    },
  },
};

const AgentNodeTestExample: React.FC = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const handleSave = (data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => {
    console.log('Saved workflow:', data);
    setNodes(data.nodes);
    setEdges(data.edges);
  };

  // Mock implementation of node testing
  const handleNodeTest = async (nodeId: string, inputs: any): Promise<NodeExecutionRecord> => {
    console.log(`Testing node ${nodeId} with inputs:`, inputs);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Mock logic based on node type
    if (node.type === 'agent') {
      const prompt = (node.data.prompt as string) || '';
      const filledPrompt = prompt.replace('{{input}}', inputs.input || '');

      // Mock success or failure
      if (inputs.shouldFail) {
        throw new Error('Simulated AI service failure');
      }

      return {
        nodeId,
        status: 'success',
        startTime: Date.now() - 1500,
        endTime: Date.now(),
        inputs,
        outputs: {
          result: `[Mock AI Response] Processed: ${filledPrompt}`,
          tokens: filledPrompt.length / 4,
          model: node.data.model || 'gpt-3.5-turbo',
        },
      };
    }

    return {
      nodeId,
      status: 'success',
      startTime: Date.now() - 100,
      endTime: Date.now(),
      inputs,
      outputs: { result: 'default success' },
    };
  };

  return (
    <div style={{ height: 'calc(100vh - 60px)', padding: 20 }}>
      <h1>Agent Node Test Example</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>
        Select the "AI Agent" node and go to the "Test" tab to try out the node testing
        functionality. Try inputting JSON like: <code>{`{ "input": "Hello World" }`}</code> or{' '}
        <code>{`{ "input": "...", "shouldFail": true }`}</code> to simulate error.
      </p>
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
          nodeTypes={customNodeTypes}
          nodeConfigSchemas={nodeConfigSchemas}
          onNodeTest={handleNodeTest}
        />
      </div>
    </div>
  );
};

export default AgentNodeTestExample;
