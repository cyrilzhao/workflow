import React from 'react';
import { Link } from 'react-router-dom';
import {
  Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  BaseNode,
  type CustomNodeProps,
  type NodeConfigSchema,
} from '@/components/Workflow';
import { ExpressionInput } from '@/components/ExpressionInput';
import { Position } from 'reactflow';
import { Mail } from 'lucide-react';
import '@/styles/pages/Home.scss';

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

const initialNodes: WorkflowNode[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 0, y: 300 },
    data: { label: 'Start' },
  },
  // Switch
  {
    id: 'switch-mode',
    type: 'switch',
    position: { x: 250, y: 300 },
    data: {
      label: 'Select Mode',
      cases: [
        { id: 'complex', label: 'Complex Loop' },
        { id: 'simple', label: 'Simple Path' },
        { id: 'other', label: 'Other' },
      ],
    },
  },
  // Simple Path Node
  {
    id: 'node-simple',
    type: 'message',
    position: { x: 500, y: 100 },
    data: { label: 'Simple Task', content: 'Doing simple work...' },
  },
  // Outer Loop
  {
    id: 'loop-outer',
    type: 'loop',
    position: { x: 500, y: 300 },
    data: { label: 'Outer Loop', description: 'Process Items' },
  },
  // Node A (Inside Outer, Before Inner)
  {
    id: 'node-a',
    type: 'message',
    position: { x: 500, y: 500 },
    data: { label: 'Node A', content: 'Pre-process item' },
  },
  // Inner Loop
  {
    id: 'loop-inner',
    type: 'loop',
    position: { x: 800, y: 500 },
    data: { label: 'Inner Loop', description: 'Process Sub-items' },
  },
  // Node C (Inside Inner)
  {
    id: 'node-c',
    type: 'message',
    position: { x: 800, y: 700 },
    data: { label: 'Node C', content: 'Step 1' },
  },
  // Node D (Inside Inner)
  {
    id: 'node-d',
    type: 'message',
    position: { x: 1100, y: 700 },
    data: { label: 'Node D', content: 'Step 2' },
  },
  // Node B (Inside Outer, After Inner)
  {
    id: 'node-b',
    type: 'message',
    position: { x: 1100, y: 500 },
    data: { label: 'Node B', content: 'Post-process item' },
  },
  // End
  {
    id: 'end',
    type: 'end',
    position: { x: 1100, y: 300 },
    data: { label: 'End' },
  },
];

const initialEdges: WorkflowEdge[] = [
  // Start -> Switch
  { id: 'e1', source: 'start', target: 'switch-mode', targetHandle: 'entry' },

  // Switch -> Simple
  {
    id: 'e-sw-simple',
    source: 'switch-mode',
    sourceHandle: 'simple',
    target: 'node-simple',
    targetHandle: 'entry',
  },
  { id: 'e-simple-end', source: 'node-simple', target: 'end', targetHandle: 'entry' },

  // Switch -> Complex (Outer Loop)
  {
    id: 'e-sw-complex',
    source: 'switch-mode',
    sourceHandle: 'complex',
    target: 'loop-outer',
    targetHandle: 'entry',
  },

  // Outer Loop Body: Outer -> A -> Inner -> B -> Outer
  { id: 'e-outer-start', source: 'loop-outer', sourceHandle: 'loop-start', target: 'node-a' },
  { id: 'e-a-inner', source: 'node-a', target: 'loop-inner', targetHandle: 'entry' },

  // Inner Loop Body: Inner -> C -> D -> Inner
  { id: 'e-inner-start', source: 'loop-inner', sourceHandle: 'loop-start', target: 'node-c' },
  { id: 'e-c-d', source: 'node-c', target: 'node-d' },
  { id: 'e-d-inner', source: 'node-d', target: 'loop-inner', targetHandle: 'loop-end' },

  // Inner Loop Exit -> B
  { id: 'e-inner-exit', source: 'loop-inner', sourceHandle: 'next', target: 'node-b' },

  // B -> Outer Loop Return
  { id: 'e-b-outer', source: 'node-b', target: 'loop-outer', targetHandle: 'loop-end' },

  // Outer Loop Exit -> End
  { id: 'e-outer-exit', source: 'loop-outer', sourceHandle: 'next', target: 'end' },
];

const customNodeTypes = {
  message: MessageNode,
};

// Custom Form Component
const ColorPicker = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {['#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(color => (
        <div
          key={color}
          onClick={() => onChange(color)}
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: color,
            borderRadius: '50%',
            cursor: 'pointer',
            border: value === color ? '2px solid #000' : '2px solid transparent',
          }}
        />
      ))}
    </div>
  );
};

const formComponents = {
  'color-picker': ColorPicker,
  'expression-input': ExpressionInput,
};

const nodeConfigSchemas: Record<string, NodeConfigSchema> = {
  start: {
    type: 'object',
    properties: {
      label: { type: 'string', title: 'Label' },
      description: { type: 'string', title: 'Description' },
      triggerType: {
        type: 'string',
        title: 'Trigger Type',
        enum: ['manual', 'webhook', 'schedule'],
        enumNames: ['Manual', 'Webhook', 'Schedule'],
        ui: {
          widget: 'select',
        },
      },
    },
  },
  end: {
    type: 'object',
    properties: {
      label: { type: 'string', title: 'Label' },
      outputType: {
        type: 'string',
        title: 'Output Type',
        enum: ['json', 'html'],
        enumNames: ['JSON', 'HTML'],
        ui: {
          widget: 'radio',
        },
      },
    },
  },
  loop: {
    type: 'object',
    properties: {
      label: { type: 'string', title: 'Label' },
      maxIterations: { type: 'number', title: 'Max Iterations', default: 10 },
      condition: { type: 'string', title: 'Loop Condition' },
    },
  },
  message: {
    type: 'object',
    properties: {
      label: { type: 'string', title: 'Label' },
      content: {
        type: 'string',
        title: 'Message Content',
        ui: {
          widget: 'textarea',
        },
      },
      priority: {
        type: 'string',
        title: 'Priority',
        enum: ['high', 'medium', 'low'],
        enumNames: ['High', 'Medium', 'Low'],
        ui: {
          widget: 'select',
        },
      },
      themeColor: {
        type: 'string',
        title: 'Theme Color',
        ui: {
          widget: 'color-picker', // Custom widget
        },
      },
      dynamicContent: {
        type: 'string',
        title: 'Dynamic Content (Template)',
        description: 'Use {{ variable }} to insert dynamic values',
        ui: {
          widget: 'expression-input',
        },
      },
    },
  },
  switch: {
    type: 'object',
    properties: {
      label: { type: 'string', title: 'Label' },
      description: { type: 'string', title: 'Description' },
    },
  },
};

const Home = () => {
  return (
    <div
      className="home-page"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1>Workflow Demo</h1>
          <p>
            Double click on nodes to configure them. Supports dynamic JSON Schema forms with Custom
            Components (e.g. Color Picker).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/workflow-history"
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Execution History Demo
          </Link>
        </div>
      </div>
      <div style={{ flex: 1, padding: '20px' }}>
        <Workflow
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          nodeTypes={customNodeTypes}
          nodeConfigSchemas={nodeConfigSchemas}
          formComponents={formComponents}
        />
      </div>
    </div>
  );
};

export default Home;
