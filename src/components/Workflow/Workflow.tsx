import React, { useCallback, useEffect } from 'react';
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
  ControlButton,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Undo, Redo, Play, Save } from 'lucide-react';
import { isEqual } from 'lodash';

import { nodeTypes as defaultNodeTypes } from './nodes';
import type { WorkflowProps, WorkflowNode, NodeExecutionSummary } from './types';
import './Workflow.scss';
import { WorkflowPanel } from './WorkflowPanel';
import { NodeConfigModal } from './NodeConfigModal';
import { ExecutionDetailModal } from './ExecutionDetailModal';
import { useUndoRedo } from './useUndoRedo';

const WorkflowContent: React.FC<WorkflowProps> = ({
  initialNodes = [],
  initialEdges = [],
  nodeTypes = {},
  nodeConfigSchemas = {},
  onNodesChange: onNodesChangeProp,
  onEdgesChange: _onEdgesChangeProp,
  formComponents,
  readonly = false,
  undoRedoOptions,
  onSave,
  onTest,
  mode = 'edit',
  executionData,
  onNodeClick,
}) => {
  const { enabled: undoRedoEnabled = true, maxHistorySize = 50 } = undoRedoOptions || {};
  const isHistoryMode = mode === 'history';
  const isReadonly = readonly || isHistoryMode;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [selectedNode, setSelectedNode] = React.useState<WorkflowNode | null>(null);
  const [highlightedLoopId, setHighlightedLoopId] = React.useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = React.useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = React.useState(false);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  // 初始化 undo/redo 功能（将 nodes 和 edges 作为一个整体管理）
  const workflowHistory = useUndoRedo<{ nodes: WorkflowNode[]; edges: typeof initialEdges }>(
    { nodes: initialNodes, edges: initialEdges },
    { maxHistorySize }
  );

  console.info('cyril nodes: ', nodes);
  console.info('cyril edges: ', edges);

  // 用于标记是否正在执行 undo/redo，避免记录历史
  const isUndoingRef = React.useRef(false);

  // 使用 ref 保存最新的 nodes 和 edges，避免 takeSnapshot 依赖它们
  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Inject execution data into nodes when in history mode
  useEffect(() => {
    if (isHistoryMode && executionData) {
      setNodes(nds =>
        nds.map(node => {
          const summary = executionData[node.id];
          if (summary) {
            // Check if data actually changed to avoid infinite loops if setNodes triggers re-render
            const newData = {
              ...node.data,
              _status: summary.status,
              _runCount: summary.runCount,
              // Calculate duration from the last record or aggregate?
              // Let's use the last record's duration for now, or sum if needed.
              // For simplicity, let's assume summary has duration or we calc it here.
              // The types say records have startTime/endTime.
              _duration: summary.records.reduce((acc, r) => {
                if (r.startTime && r.endTime) return acc + (r.endTime - r.startTime);
                return acc;
              }, 0),
            };

            if (!isEqual(node.data, newData)) {
              return { ...node, data: newData };
            }
          } else {
            // Reset status if not found (e.g. cleared execution data)
            if (node.data._status) {
              const { _status, _runCount, _duration, ...rest } = node.data;
              return { ...node, data: rest };
            }
          }
          return node;
        })
      );
    } else if (!isHistoryMode) {
      // Clear execution status when switching back to edit mode
      setNodes(nds =>
        nds.map(node => {
          if (node.data._status) {
            const { _status, _runCount, _duration, ...rest } = node.data;
            return { ...node, data: rest };
          }
          return node;
        })
      );
    }
  }, [isHistoryMode, executionData, setNodes]);

  // 记录初始状态（只在组件挂载时执行一次）
  const isInitializedRef = React.useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current && undoRedoEnabled && !isReadonly) {
      // 立即记录初始状态
      workflowHistory.set({ nodes, edges }, true);
      isInitializedRef.current = true;
    }
  }, [undoRedoEnabled, isReadonly, nodes, edges, workflowHistory]);

  // 辅助函数：记录当前状态到历史
  const takeSnapshot = useCallback(() => {
    if (!undoRedoEnabled || isReadonly || isUndoingRef.current) return;

    // 使用 ref 获取最新的 nodes 和 edges
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    const cleanupClassName = (className?: string) =>
      (className || '').replace(/\s*(highlighted|dimmed|animated)\s*/g, ' ').trim() || undefined;

    // 过滤掉 UI 状态属性（selected, dragging 等），只比较实质性属性
    const cleanNodes = currentNodes.map(node => {
      const { selected, dragging, className, ...rest } = node as any;
      return { ...rest, className: cleanupClassName(className) };
    });

    const cleanEdges = currentEdges.map(edge => {
      const { selected, className, ...rest } = edge as any;
      return { ...rest, className: cleanupClassName(className) };
    });

    // 检查是否与当前历史状态相同（只比较实质性属性）
    const lastState = workflowHistory.present;
    if (lastState) {
      const lastCleanNodes = lastState.nodes.map(node => {
        const { selected, dragging, className, ...rest } = node as any;
        return { ...rest, className: cleanupClassName(className) };
      });

      const lastCleanEdges = lastState.edges.map(edge => {
        const { selected, className, ...rest } = edge as any;
        return { ...rest, className: cleanupClassName(className) };
      });

      // 使用 lodash.isEqual 进行深度比较
      if (isEqual(cleanNodes, lastCleanNodes) && isEqual(cleanEdges, lastCleanEdges)) {
        return;
      }
    }

    workflowHistory.set({ nodes: cleanNodes, edges: cleanEdges });
  }, [undoRedoEnabled, isReadonly, workflowHistory]);

  // 连接节点时记录历史
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges(eds => addEdge(params, eds));
      // 延迟记录，确保状态已更新
      setTimeout(() => takeSnapshot(), 0);
    },
    [setEdges, takeSnapshot]
  );

  const mergedNodeTypes = React.useMemo(
    () => ({
      ...defaultNodeTypes,
      ...nodeTypes,
    }),
    [nodeTypes]
  );

  // 同步 undo/redo（nodes 和 edges 需要同步操作）
  const undo = useCallback(() => {
    if (!undoRedoEnabled || isReadonly || !workflowHistory.canUndo) return;

    // 先获取历史状态
    const prevState = workflowHistory.past[workflowHistory.past.length - 1];

    // 设置标志，防止记录历史
    isUndoingRef.current = true;

    // 执行 undo
    workflowHistory.undo();

    // 应用历史状态
    if (prevState) {
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
    }

    // 延长标志持续时间，确保所有状态更新完成
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 300);
  }, [undoRedoEnabled, isReadonly, workflowHistory, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!undoRedoEnabled || isReadonly || !workflowHistory.canRedo) return;

    // 先获取未来状态
    const nextState = workflowHistory.future[0];

    // 设置标志，防止记录历史
    isUndoingRef.current = true;

    // 执行 redo
    workflowHistory.redo();

    // 应用未来状态
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }

    // 延长标志持续时间，确保所有状态更新完成
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 300);
  }, [undoRedoEnabled, isReadonly, workflowHistory, setNodes, setEdges]);

  const canUndo = undoRedoEnabled && !isReadonly && workflowHistory.canUndo;
  const canRedo = undoRedoEnabled && !isReadonly && workflowHistory.canRedo;

  // 键盘快捷键支持
  useEffect(() => {
    if (!undoRedoEnabled || isReadonly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+R / Cmd+R
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, undoRedoEnabled, isReadonly]);

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

  // 节点删除时记录历史
  const onNodesDelete = useCallback(() => {
    setTimeout(() => takeSnapshot(), 0);
  }, [takeSnapshot]);

  // 连线删除时记录历史
  const onEdgesDelete = useCallback(() => {
    setTimeout(() => takeSnapshot(), 0);
  }, [takeSnapshot]);

  // 节点拖拽结束时记录历史
  const onNodeDragStop = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: WorkflowNode) => {
      if (isHistoryMode) return; // In history mode, use click/onNodeClick
      if (readonly) return;
      setSelectedNode(node);
      setIsConfigModalOpen(true);
    },
    [readonly, isHistoryMode]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: WorkflowNode) => {
      if (isHistoryMode) {
        const summary = executionData?.[node.id];
        setSelectedNode(node);
        setIsExecutionModalOpen(true);
        if (onNodeClick) {
          onNodeClick(event, node, summary);
        }
      }
    },
    [isHistoryMode, executionData, onNodeClick]
  );

  // 计算 Loop 节点的高亮流
  const getLoopFlowElements = useCallback(
    (loopNodeId: string, currentNodes: WorkflowNode[], currentEdges: Edge[]) => {
      const activeEdgeIds = new Set<string>();
      const activeNodeIds = new Set<string>();
      const visited = new Set<string>();
      const loopNode = currentNodes.find(n => n.id === loopNodeId);

      if (!loopNode) return { activeNodeIds, activeEdgeIds };

      const queue: WorkflowNode[] = [];

      // Find initial edges from loop-start
      currentEdges.forEach(e => {
        if (e.source === loopNodeId && e.sourceHandle === 'loop-start') {
          activeEdgeIds.add(e.id);
          const targetNode = currentNodes.find(n => n.id === e.target);
          if (targetNode && !visited.has(targetNode.id)) {
            // Check if it loops back directly to loop-end (unlikely but possible)
            if (targetNode.id === loopNodeId && e.targetHandle === 'loop-end') {
              return;
            }
            visited.add(targetNode.id);
            activeNodeIds.add(targetNode.id);
            queue.push(targetNode);
          }
        }
      });

      while (queue.length > 0) {
        const curr = queue.shift()!;

        currentEdges.forEach(e => {
          if (e.source !== curr.id) return;

          // If current node is a nested loop, ONLY follow 'next' handle (treat as black box)
          if (curr.type === 'loop' && e.sourceHandle !== 'next') return;

          if (e.target === loopNodeId) {
            // End of the loop
            if (e.targetHandle === 'loop-end') {
              activeEdgeIds.add(e.id);
            }
          } else {
            activeEdgeIds.add(e.id);
            const targetNode = currentNodes.find(n => n.id === e.target);
            if (targetNode && !visited.has(targetNode.id)) {
              visited.add(targetNode.id);
              activeNodeIds.add(targetNode.id);
              queue.push(targetNode);
            }
          }
        });
      }

      return { activeNodeIds, activeEdgeIds };
    },
    []
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: WorkflowNode[] }) => {
      const loopNode =
        selectedNodes.length === 1 && selectedNodes[0].type === 'loop' ? selectedNodes[0] : null;

      if (loopNode) {
        if (loopNode.id !== highlightedLoopId) {
          setHighlightedLoopId(loopNode.id);
        }
      } else {
        if (highlightedLoopId !== null) {
          setHighlightedLoopId(null);
        }
      }
    },
    [highlightedLoopId]
  );

  // Apply highlighting effect
  useEffect(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    let activeNodeIds = new Set<string>();
    let activeEdgeIds = new Set<string>();

    if (highlightedLoopId) {
      const loopNode = currentNodes.find(n => n.id === highlightedLoopId);
      if (loopNode) {
        ({ activeNodeIds, activeEdgeIds } = getLoopFlowElements(
          highlightedLoopId,
          currentNodes,
          currentEdges
        ));
        // Also highlight the loop node itself
        activeNodeIds.add(highlightedLoopId);
      }
    }

    // Update Nodes
    setNodes(nds =>
      nds.map(n => {
        const baseClass = (n.className || '')
          .replace(/\s*(highlighted|dimmed|animated)\s*/g, ' ')
          .trim();

        let newClass = baseClass;
        if (highlightedLoopId) {
          if (activeNodeIds.has(n.id)) {
            newClass = `${newClass} highlighted`;
          }
          // Remove dimmed effect based on user feedback
        }

        if (n.className !== newClass.trim()) {
          return { ...n, className: newClass.trim() || undefined };
        }
        return n;
      })
    );

    // Update Edges
    setEdges(eds =>
      eds.map(e => {
        const baseClass = (e.className || '')
          .replace(/\s*(highlighted|dimmed|animated)\s*/g, ' ')
          .trim();

        let newClass = baseClass;
        if (highlightedLoopId) {
          if (activeEdgeIds.has(e.id)) {
            newClass = `${newClass} highlighted animated`;
          }
          // Remove dimmed effect based on user feedback
        }

        if (e.className !== newClass.trim()) {
          return { ...e, className: newClass.trim() || undefined };
        }
        return e;
      })
    );
  }, [highlightedLoopId, getLoopFlowElements, setNodes, setEdges]);

  const handleSaveNodeConfig = (nodeId: string, data: any) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
    // 延迟记录，确保状态已更新
    setTimeout(() => takeSnapshot(), 0);
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
      // 延迟记录，确保状态已更新
      setTimeout(() => takeSnapshot(), 0);
    },
    [screenToFlowPosition, setNodes, takeSnapshot]
  );

  const handleSave = () => {
    if (onSave) {
      onSave({ nodes, edges });
    }
  };

  const handleTest = () => {
    if (onTest) {
      onTest({ nodes, edges });
    }
  };

  return (
    <div
      className="workflow-container"
      onDrop={isReadonly ? undefined : onDrop}
      onDragOver={isReadonly ? undefined : onDragOver}
    >
      {!isReadonly && <WorkflowPanel />}
      <NodeConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        node={selectedNode}
        schema={selectedNode ? nodeConfigSchemas[selectedNode.type || ''] : undefined}
        formComponents={formComponents}
        onSave={handleSaveNodeConfig}
      />
      <ExecutionDetailModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        node={selectedNode}
        executionSummary={selectedNode ? executionData?.[selectedNode.id] : undefined}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isReadonly ? undefined : onConnect}
        onNodesDelete={isReadonly ? undefined : onNodesDelete}
        onEdgesDelete={isReadonly ? undefined : onEdgesDelete}
        onNodeDragStop={isReadonly ? undefined : onNodeDragStop}
        nodeTypes={mergedNodeTypes}
        fitView
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeClick={handleNodeClick}
        nodesDraggable={!isReadonly}
        nodesConnectable={!isReadonly}
        elementsSelectable={!isReadonly}
        onSelectionChange={onSelectionChange}
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
          // @ts-ignore - curvature is a valid prop for BezierEdge but might not be in the strict default types
          curvature: 0.5,
          zIndex: 999,
        }}
      >
        <Controls position="top-right">
          {!isReadonly && (
            <>
              <ControlButton onClick={handleSave} title="保存">
                <Save size={16} />
              </ControlButton>
              <ControlButton onClick={handleTest} title="测试">
                <Play size={16} />
              </ControlButton>
            </>
          )}
          {undoRedoEnabled && !isReadonly && (
            <>
              <ControlButton onClick={undo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
                <Undo size={16} />
              </ControlButton>
              <ControlButton onClick={redo} disabled={!canRedo} title="重做 (Ctrl+R)">
                <Redo size={16} />
              </ControlButton>
            </>
          )}
        </Controls>
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
