import type { Node, Edge, NodeProps } from 'reactflow';
import type { ExtendedJSONSchema } from '@/components/DynamicForm/types/schema';

export interface NodeConfigSchema {
  inputSchema?: ExtendedJSONSchema;
  outputSchema?: ExtendedJSONSchema;
  configSchema?: ExtendedJSONSchema;
  testable?: boolean; // 是否支持测试面板，默认 false
}

export interface WorkflowNodeData {
  label: string;
  description?: string;
  // Execution specific data
  _status?: ExecutionStatus;
  _runCount?: number;
  _duration?: number;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

export interface CustomNodeProps extends NodeProps<WorkflowNodeData> {
  // Add any specific props if needed
  [key: string]: unknown;
}

export type NodeType = 'start' | 'end' | 'loop' | 'switch' | string;

export interface UndoRedoOptions {
  enabled?: boolean; // 是否启用，默认 true
  maxHistorySize?: number; // 最大历史记录数，默认 50
  debounceMs?: number; // 防抖延迟，默认 500ms
}

// --- Execution History Types ---

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failure' | 'skipped';

// 单次执行记录
export interface NodeExecutionRecord {
  nodeId: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  inputs?: any;
  outputs?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  iterationIndex?: number; // 在循环中的索引 (0, 1, 2...)
}

// 节点的聚合状态（用于渲染画布）
export interface NodeExecutionSummary {
  nodeId: string;
  status: ExecutionStatus; // 整体状态（如果又一次失败则视为失败，或取最后一次状态）
  runCount: number; // 总运行次数
  records: NodeExecutionRecord[]; // 详细记录列表
}

// 整个 Workflow 的一次运行快照
export interface WorkflowExecutionSnapshot {
  executionId: string;
  workflowId: string;
  startTime: number;
  endTime?: number;
  status: ExecutionStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  // 键为 nodeId，值为该节点的执行摘要
  nodeExecutions: Record<string, NodeExecutionSummary>;
}

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
  undoRedoOptions?: UndoRedoOptions;
  onSave?: (data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  onTest?: (data: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  onNodeTest?: (nodeId: string, inputs: any) => Promise<NodeExecutionRecord>;

  // New props for execution history
  mode?: 'edit' | 'history' | 'readonly';
  executionData?: Record<string, NodeExecutionSummary>;
  onNodeClick?: (
    event: React.MouseEvent,
    node: WorkflowNode,
    executionSummary?: NodeExecutionSummary
  ) => void;
}
