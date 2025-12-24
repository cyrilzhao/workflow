import type { JSONSchema4 } from 'json-schema';
import type { Node, Edge, NodeProps } from 'reactflow';

export interface NodeConfigSchema extends JSONSchema4 {
  widget?: string;
  enumNames?: string[];
  props?: Record<string, any>;
  rules?: any;
  properties?: Record<string, NodeConfigSchema>;
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
  nodeConfigSchemas?: Record<string, NodeConfigSchema>; // Keyed by node type
  // Map of custom widget components for the form
  formComponents?: Record<string, React.ComponentType<any>>;
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  readonly?: boolean;
}
