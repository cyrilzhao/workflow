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
import { Bot } from 'lucide-react';
import '@/styles/pages/Home.scss';

// Custom Node Example using BaseNode
const AgentNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      title={data.label}
      icon={<Bot size={16} style={{ color: '#8b5cf6' }} />}
      selected={selected}
      handles={[
        { type: 'target', position: Position.Left },
        { type: 'source', position: Position.Right },
      ]}
    >
      <div style={{ fontSize: '12px', color: '#6b7280' }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Prompt:</div>
        <div
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
          }}
        >
          {data.prompt as string}
        </div>
      </div>
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
        { id: 'complex', label: 'Complex Loop', condition: '${mode} == "complex"' },
        { id: 'simple', label: 'Simple Path', condition: '${mode} == "simple"' },
        { id: 'other', label: 'Other', condition: 'true' },
      ],
    },
  },
  // Simple Path Node
  {
    id: 'node-simple',
    type: 'agent',
    position: { x: 500, y: 100 },
    data: { label: 'Agent Task', prompt: 'Summarize the input data.' },
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
    type: 'agent',
    position: { x: 500, y: 500 },
    data: { label: 'Node A', prompt: 'Analyze item {{item}}' },
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
    type: 'agent',
    position: { x: 800, y: 700 },
    data: { label: 'Node C', prompt: 'Generate steps for {{subItem}}' },
  },
  // Node D (Inside Inner)
  {
    id: 'node-d',
    type: 'agent',
    position: { x: 1100, y: 700 },
    data: { label: 'Node D', prompt: 'Verify steps' },
  },
  // Node B (Inside Outer, After Inner)
  {
    id: 'node-b',
    type: 'agent',
    position: { x: 1100, y: 500 },
    data: { label: 'Node B', prompt: 'Aggregate results' },
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
  agent: AgentNode,
};

const formComponents = {
  'expression-input': ExpressionInput,
};

const nodeConfigSchemas: Record<string, NodeConfigSchema> = {
  start: {
    inputSchema: {
      type: 'object',
      properties: {
        triggerType: {
          type: 'string',
          title: 'Trigger Type',
          enum: ['manual', 'webhook', 'schedule'],
          enumNames: ['Manual', 'Webhook', 'Schedule'],
          default: 'manual',
          ui: {
            widget: 'select',
          },
        },
      },
      dependencies: {
        triggerType: {
          oneOf: [
            {
              properties: {
                triggerType: { const: 'manual' },
                inputSchema: {
                  type: 'string',
                  title: 'Input Schema (JSON)',
                  ui: { widget: 'textarea', rows: 5 },
                },
              },
            },
            {
              properties: {
                triggerType: { const: 'webhook' },
                method: {
                  type: 'string',
                  title: 'HTTP Method',
                  enum: ['GET', 'POST', 'PUT', 'DELETE'],
                  default: 'POST',
                },
                path: { type: 'string', title: 'Path', default: '/webhook' },
              },
              required: ['method', 'path'],
            },
            {
              properties: {
                triggerType: { const: 'schedule' },
                cron: {
                  type: 'string',
                  title: 'Cron Expression',
                  default: '0 0 * * *',
                  ui: { placeholder: 'e.g. 0 0 * * *' },
                },
              },
              required: ['cron'],
            },
          ],
        },
      },
    },
  },
  end: {
    inputSchema: {
      type: 'object',
      properties: {
        outputType: {
          type: 'string',
          title: 'Output Type',
          enum: ['json', 'html', 'text'],
          enumNames: ['JSON', 'HTML', 'Plain Text'],
          default: 'json',
          ui: {
            widget: 'radio',
          },
        },
        statusCode: {
          type: 'number',
          title: 'Status Code',
          default: 200,
          minimum: 100,
          maximum: 599,
        },
        body: {
          type: 'string',
          title: 'Response Body',
          ui: {
            widget: 'expression-input',
          },
        },
      },
      required: ['outputType'],
    },
  },
  loop: {
    inputSchema: {
      type: 'object',
      properties: {
        loopType: {
          type: 'string',
          title: 'Loop Type',
          enum: ['collection', 'count', 'condition'],
          enumNames: ['For Each (Collection)', 'Count (Fixed)', 'While (Condition)'],
          default: 'collection',
          ui: { widget: 'select', placeholder: 'Please select' },
        },
        inputCollection: {
          type: 'string',
          title: 'Input Collection',
          ui: {
            widget: 'expression-input',
            linkage: {
              type: 'visibility',
              dependencies: ['#/properties/loopType'],
              when: {
                field: 'loopType',
                operator: '==',
                value: 'collection',
              },
              fulfill: {
                state: {
                  visible: true,
                },
              },
              otherwise: {
                state: {
                  visible: false,
                },
              },
            },
          },
        },
        inputElement: {
          type: 'string',
          title: 'Input Element',
          ui: {
            widget: 'expression-input',
            linkage: {
              type: 'visibility',
              dependencies: ['#/properties/loopType'],
              when: {
                field: 'loopType',
                operator: '==',
                value: 'collection',
              },
              fulfill: {
                state: {
                  visible: true,
                },
              },
              otherwise: {
                state: {
                  visible: false,
                },
              },
            },
          },
        },
        outputCollection: {
          type: 'string',
          title: 'Output Collection',
          ui: {
            widget: 'expression-input',
            linkage: {
              type: 'visibility',
              dependencies: ['#/properties/loopType'],
              when: {
                field: 'loopType',
                operator: '==',
                value: 'collection',
              },
              fulfill: {
                state: {
                  visible: true,
                },
              },
              otherwise: {
                state: {
                  visible: false,
                },
              },
            },
          },
        },
        outputElement: {
          type: 'string',
          title: 'Output Element',
          ui: {
            widget: 'expression-input',
            linkage: {
              type: 'visibility',
              dependencies: ['#/properties/loopType'],
              when: {
                field: 'loopType',
                operator: '==',
                value: 'collection',
              },
              fulfill: {
                state: {
                  visible: true,
                },
              },
              otherwise: {
                state: {
                  visible: false,
                },
              },
            },
          },
        },
      },
      dependencies: {
        loopType: {
          oneOf: [
            {
              properties: {
                loopType: { const: 'collection' },
                collection: {
                  type: 'string',
                  title: 'Input Collection',
                  description: 'The array to iterate over',
                  ui: { widget: 'expression-input' },
                },
                itemVar: {
                  type: 'string',
                  title: 'Input Element',
                  description: 'Variable name for current item',
                  default: 'item',
                },
                outputCollection: {
                  type: 'string',
                  title: 'Output Collection',
                  description: 'Variable name to store results',
                  default: 'results',
                },
                outputElement: {
                  type: 'string',
                  title: 'Output Element',
                  description: 'Expression for the result of each iteration',
                  ui: { widget: 'expression-input' },
                },
              },
              required: ['collection', 'itemVar'],
            },
            {
              properties: {
                loopType: { const: 'count' },
                count: {
                  type: 'number',
                  title: 'Iteration Count',
                  default: 3,
                  minimum: 1,
                },
              },
              required: ['count'],
            },
            {
              properties: {
                loopType: { const: 'condition' },
                condition: {
                  type: 'string',
                  title: 'Break Condition',
                  description: 'Expression evaluating to boolean',
                  ui: { widget: 'expression-input' },
                },
              },
              required: ['condition'],
            },
          ],
        },
      },
    },
  },
  agent: {
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          title: 'Prompt',
          description: 'Input prompt for the agent',
          ui: {
            widget: 'textarea',
            // widget: 'expression-input', // Use expression input for dynamic prompts
          },
        },
        model: {
          type: 'string',
          title: 'Model',
          enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'gemini-pro'],
          default: 'gpt-3.5-turbo',
          ui: {
            widget: 'select',
          },
        },
        temperature: {
          type: 'number',
          title: 'Temperature',
          minimum: 0,
          maximum: 1,
          default: 0.7,
          ui: {
            widget: 'range',
            step: 0.1,
          },
        },
      },
      required: ['prompt'],
    },
  },
  switch: {
    inputSchema: {
      type: 'object',
      properties: {
        // Removed global expression, as conditions are per-case
        cases: {
          type: 'array',
          title: 'Conditions',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                title: 'Branch ID',
                ui: { hidden: true, autogenerate: 'uuid' },
              },
              label: { type: 'string', title: 'Condition Name' },
              condition: {
                type: 'string',
                title: 'Expression',
                description: 'Expression evaluating to boolean',
                ui: { widget: 'expression-input' },
              },
            },
            required: ['id', 'label', 'condition'],
          },
          ui: {
            addButtonText: 'Add Condition',
          },
        },
      },
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
