import type { Node, Edge, NodeProps } from 'reactflow';

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select';
  title: string;
  description?: string;
  default?: any;
  options?: { label: string; value: string | number }[]; // For select type
}

export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface WorkflowNodeData {
  label: string;
  description?: string;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

export interface CustomNodeProps extends NodeProps<WorkflowNodeData> {
  // Add any specific props if needed
  [key: string]: unknown;
}

export type NodeType = 'start' | 'end' | 'loop' | 'switch' | string;

export interface WorkflowProps {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  nodeTypes?: Record<string, React.ComponentType<CustomNodeProps>>;
  nodeConfigSchemas?: Record<string, JsonSchema>; // Keyed by node type
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  readonly?: boolean;
}
