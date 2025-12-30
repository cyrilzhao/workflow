# Workflow 组件技术文档

## 概述

Workflow 组件是一个基于 [React Flow](https://reactflow.dev/) 封装的通用工作流编辑器组件。它提供了一组基础的功能节点（Start, End, Loop, Switch），并支持通过配置扩展自定义节点，适用于业务流程编排、规则引擎配置等场景。

## 依赖

- `reactflow`: 核心流程图库
- `lucide-react`: 图标库
- `react-hook-form`: 表单管理
- `json-schema`: Schema 类型定义

## 目录结构

```
src/components/Workflow/
├── nodes/                  # 节点组件目录
│   ├── BaseNode.tsx       # 基础节点包装器（处理通用样式和 Handle）
│   ├── StartNode.tsx      # 开始节点
│   ├── EndNode.tsx        # 结束节点
│   ├── LoopNode.tsx       # 循环节点
│   ├── SwitchNode.tsx     # 分支节点
│   └── index.ts           # 节点导出
├── Workflow.tsx           # 核心 Workflow 组件
├── Workflow.scss          # 样式文件
├── WorkflowPanel.tsx      # 组件面板（拖拽）
├── SchemaForm.tsx         # 动态表单组件
├── NodeConfigModal.tsx    # 节点配置弹窗
├── types.ts               # 类型定义
└── index.tsx              # 组件导出入口
```

## 使用说明

### 基础用法

```tsx
import { Workflow, WorkflowNode, WorkflowEdge } from '@/components/Workflow';

const nodes: WorkflowNode[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { label: '开始' },
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 300, y: 100 },
    data: { label: '结束' },
  },
];

const edges: WorkflowEdge[] = [{ id: 'e1-2', source: 'start', target: 'end' }];

export default function MyWorkflow() {
  return (
    <div style={{ height: 600 }}>
      <Workflow initialNodes={nodes} initialEdges={edges} />
    </div>
  );
}
```

## 组件 API

### Workflow Props

| 属性                | 类型                               | 默认值  | 说明                |
| ------------------- | ---------------------------------- | ------- | ------------------- |
| `initialNodes`      | `WorkflowNode[]`                   | `[]`    | 初始节点列表        |
| `initialEdges`      | `WorkflowEdge[]`                   | `[]`    | 初始连线列表        |
| `nodeTypes`         | `Record<string, Component>`        | `{}`    | 自定义节点类型映射  |
| `nodeConfigSchemas` | `Record<string, NodeConfigSchema>` | `{}`    | 节点配置表单 Schema |
| `formComponents`    | `Record<string, Component>`        | `{}`    | 自定义表单组件映射  |
| `onNodesChange`     | `(nodes) => void`                  | -       | 节点变化回调        |
| `onEdgesChange`     | `(edges) => void`                  | -       | 连线变化回调        |
| `readonly`          | `boolean`                          | `false` | 是否只读模式        |

## 节点配置 (Node Configuration)

组件支持基于 JSON Schema 的动态表单配置。双击节点即可打开配置弹窗。

### Schema 定义

使用 `NodeConfigSchema` (扩展自 JSONSchema4) 定义节点属性：

```tsx
import type { NodeConfigSchema } from '@/components/Workflow';

const schemas: Record<string, NodeConfigSchema> = {
  message: {
    type: 'object',
    properties: {
      label: { type: 'string', title: 'Label' },
      content: { type: 'string', widget: 'textarea', title: 'Content' },
      priority: {
        type: 'string',
        widget: 'select',
        enum: ['high', 'medium', 'low'],
        enumNames: ['High', 'Medium', 'Low'],
        title: 'Priority',
      },
    },
  },
};
```

### 支持的 Widget 类型

- `input` (默认): 单行文本框
- `textarea`: 多行文本框
- `select`: 下拉选择 (需配合 `enum` 和 `enumNames`)
- `radio`: 单选框 (需配合 `enum` 和 `enumNames`)
- `checkbox`: 复选框 (对应 `boolean` 类型)
- 自定义 Widget: 通过 `formComponents` 传入

### 自定义表单组件

```tsx
const ColorPicker = ({ value, onChange }) => (
  <input type="color" value={value} onChange={e => onChange(e.target.value)} />
);

<Workflow
  formComponents={{ 'color-picker': ColorPicker }}
  nodeConfigSchemas={{
    myNode: {
      type: 'object',
      properties: {
        color: { type: 'string', widget: 'color-picker', title: 'Color' },
      },
    },
  }}
  // ...
/>;
```

## 内置节点

### StartNode (type: 'start')

- **用途**: 流程起始点
- **Handles**: 一个右侧输出 (Source)
- **Data**: `label`, `description`

### EndNode (type: 'end')

- **用途**: 流程结束点
- **Handles**: 一个左侧输入 (Target)
- **Data**: `label`, `description`

### LoopNode (type: 'loop')

- **用途**: 循环结构
- **Handles**:
  - 左侧输入 (Target, id: `entry` - 流程进入点)
  - 右侧输出 (Source, id: `next` - 循环结束后的下一步)
  - 底部左侧输出 (Source, id: `loop-start` - 循环体开始)
  - 底部右侧输入 (Target, id: `loop-end` - 循环体结束返回)
- **Data**: `label`, `description`

### SwitchNode (type: 'switch')

- **用途**: 条件分支
- **Handles**:
  - 左侧输入 (Target, id: `entry`)
  - 右侧多个输出 (Source)，根据 `cases` 配置动态生成
- **Data**:
  - `label`, `description`
  - `cases`: `{ id: string, label: string }[]` (定义分支)

## 扩展自定义节点

组件支持通过 `nodeTypes` 属性传入自定义节点。建议自定义节点使用 `BaseNode` 进行包装以保持风格一致。

### 示例：自定义消息节点

1. **定义节点组件**

```tsx
// MessageNode.tsx
import { Position } from 'reactflow';
import { BaseNode, CustomNodeProps } from '@/components/Workflow';
import { Mail } from 'lucide-react';

const MessageNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      title={data.label}
      icon={<Mail size={16} />}
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
```

2. **注册并使用**

```tsx
const customNodeTypes = {
  message: MessageNode,
};

// ... 在 Workflow 中使用
<Workflow
  nodeTypes={customNodeTypes}
  initialNodes={[
    {
      id: 'msg1',
      type: 'message',
      position: { x: 0, y: 0 },
      data: { label: '发送邮件', content: '内容...' },
    },
  ]}
/>;
```

## 样式定制

Workflow 组件使用 SCSS 进行样式管理。

- `Workflow.scss`: 容器及 React Flow 控件样式
- `nodes/BaseNode.scss`: 节点通用样式
- `WorkflowPanel.scss`: 组件面板样式
- `SchemaForm.scss`: 表单样式
- `NodeConfigModal.scss`: 弹窗样式

如需修改节点样式，可覆盖 `.workflow-node` 类及其子元素。

## Undo/Redo 功能设计

### 概述

Workflow 组件支持撤销（Undo）和重做（Redo）功能，允许用户回退或重新应用对工作流的修改操作。该功能基于快照（Snapshot）机制实现，记录节点和连线的历史状态。

### 设计原则

1. **快照式状态管理**：在关键操作点保存完整的 nodes 和 edges 状态快照
2. **双栈历史记录**：维护 past（历史栈）和 future（未来栈）两个状态数组
3. **事件驱动记录**：在操作完成时记录历史，而非监听状态变化
4. **统一状态管理**：nodes 和 edges 作为一个整体进行历史记录，确保状态一致性
5. **智能过滤**：过滤 UI 状态（如 `selected`、`dragging`），只记录实质性修改
6. **内存限制**：限制历史记录的最大数量，防止内存溢出

### 技术实现

#### 1. 自定义 Hook：useUndoRedo

创建 `useUndoRedo` hook 来封装 undo/redo 逻辑：

```typescript
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;  // 最大历史记录数，默认 50
}

function useUndoRedo<T>(
  initialState: T,
  options?: UseUndoRedoOptions
) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // 用于防止在 undo/redo 时记录历史
  const isUndoRedoRef = useRef(false);

  // 设置新状态
  const set = useCallback((newState: T, checkpoint = true) => {
    // 如果正在执行 undo/redo，不记录历史
    if (isUndoRedoRef.current) {
      setHistory(prev => ({ ...prev, present: newState }));
      return;
    }

    // 如果不需要记录检查点，只更新当前状态
    if (!checkpoint) {
      setHistory(prev => ({ ...prev, present: newState }));
      return;
    }

    setHistory(prev => {
      // 检查状态是否真的发生了变化
      if (JSON.stringify(prev.present) === JSON.stringify(newState)) {
        return prev;
      }

      const newPast = [...prev.past, prev.present];
      const trimmedPast = newPast.length > maxHistorySize
        ? newPast.slice(newPast.length - maxHistorySize)
        : newPast;

      return {
        past: trimmedPast,
        present: newState,
        future: [], // 新操作会清空 future
      };
    });
  }, [maxHistorySize]);

  // 撤销
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      isUndoRedoRef.current = true;
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
  }, []);

  // 重做
  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      isUndoRedoRef.current = true;
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
  }, []);

  return {
    present: history.present,
    past: history.past,
    future: history.future,
    set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory: () => setHistory({
      past: [],
      present: history.present,
      future: [],
    }),
  };
}
```

#### 2. 集成到 Workflow 组件

在 `Workflow.tsx` 中集成 undo/redo 功能：

```typescript
const WorkflowContent: React.FC<WorkflowProps> = (props) => {
  const { enabled: undoRedoEnabled = true, maxHistorySize = 50 } = undoRedoOptions || {};

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 使用统一的历史管理（nodes 和 edges 作为一个整体）
  const workflowHistory = useUndoRedo<{ nodes: WorkflowNode[]; edges: typeof initialEdges }>(
    { nodes: initialNodes, edges: initialEdges },
    { maxHistorySize }
  );

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

  // 记录初始状态（只在组件挂载时执行一次）
  const isInitializedRef = React.useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current && undoRedoEnabled && !readonly) {
      workflowHistory.set({ nodes, edges }, true);
      isInitializedRef.current = true;
    }
  }, [undoRedoEnabled, readonly, nodes, edges, workflowHistory]);

  // 辅助函数：记录当前状态到历史
  const takeSnapshot = useCallback(() => {
    if (!undoRedoEnabled || readonly || isUndoingRef.current) return;

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    // 过滤掉 UI 状态属性（selected, dragging 等），只比较实质性属性
    const cleanNodes = currentNodes.map(node => {
      const { selected, dragging, ...rest } = node as any;
      return rest;
    });

    // 检查是否与当前历史状态相同（只比较实质性属性）
    const lastState = workflowHistory.present;
    if (lastState) {
      const lastCleanNodes = lastState.nodes.map(node => {
        const { selected, dragging, ...rest } = node as any;
        return rest;
      });

      // 使用 lodash.isEqual 进行深度比较
      if (isEqual(cleanNodes, lastCleanNodes) && isEqual(currentEdges, lastState.edges)) {
        return;
      }
    }

    workflowHistory.set({ nodes: currentNodes, edges: currentEdges });
  }, [undoRedoEnabled, readonly, workflowHistory]);

  // 在操作完成时记录历史
  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges(eds => addEdge(params, eds));
    setTimeout(() => takeSnapshot(), 0);
  }, [setEdges, takeSnapshot]);

  const onNodesDelete = useCallback(() => {
    setTimeout(() => takeSnapshot(), 0);
  }, [takeSnapshot]);

  const onEdgesDelete = useCallback(() => {
    setTimeout(() => takeSnapshot(), 0);
  }, [takeSnapshot]);

  const onNodeDragStop = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const handleSaveNodeConfig = (nodeId: string, data: any) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
    setTimeout(() => takeSnapshot(), 0);
  };

  const onDrop = useCallback((event: React.DragEvent) => {
    // ... 添加新节点逻辑
    setNodes(nds => nds.concat(newNode));
    setTimeout(() => takeSnapshot(), 0);
  }, [screenToFlowPosition, setNodes, takeSnapshot]);

  // 撤销和重做
  const undo = useCallback(() => {
    if (!undoRedoEnabled || readonly || !workflowHistory.canUndo) return;

    const prevState = workflowHistory.past[workflowHistory.past.length - 1];
    isUndoingRef.current = true;

    workflowHistory.undo();

    if (prevState) {
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
    }

    setTimeout(() => {
      isUndoingRef.current = false;
    }, 300);
  }, [undoRedoEnabled, readonly, workflowHistory, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!undoRedoEnabled || readonly || !workflowHistory.canRedo) return;

    const nextState = workflowHistory.future[0];
    isUndoingRef.current = true;

    workflowHistory.redo();

    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }

    setTimeout(() => {
      isUndoingRef.current = false;
    }, 300);
  }, [undoRedoEnabled, readonly, workflowHistory, setNodes, setEdges]);

  const canUndo = undoRedoEnabled && !readonly && workflowHistory.canUndo;
  const canRedo = undoRedoEnabled && !readonly && workflowHistory.canRedo;

  // 键盘快捷键
  useEffect(() => {
    if (!undoRedoEnabled || readonly) return;

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
  }, [undo, redo, undoRedoEnabled, readonly]);

  // ...
};
```

#### 3. UI 控制按钮

在 React Flow 的 Controls 面板中添加 Undo/Redo 按钮：

```typescript
import { Controls, ControlButton } from 'reactflow';
import { Undo, Redo } from 'lucide-react';

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={handleNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={readonly ? undefined : onConnect}
  onNodesDelete={readonly ? undefined : onNodesDelete}
  onEdgesDelete={readonly ? undefined : onEdgesDelete}
  onNodeDragStop={readonly ? undefined : onNodeDragStop}
  // ...
>
  <Controls>
    {undoRedoEnabled && !readonly && (
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
```

### 支持的操作

以下操作会被记录到历史中，支持 undo/redo：

- **添加节点**：通过拖拽面板节点到画布（`onDrop` 事件）
- **删除节点**：选中节点后按 Delete 键或通过其他方式删除（`onNodesDelete` 事件）
- **移动节点位置**：拖拽节点到新位置（`onNodeDragStop` 事件）
- **添加连线**：连接两个节点的 Handle（`onConnect` 事件）
- **删除连线**：选中连线后按 Delete 键或通过其他方式删除（`onEdgesDelete` 事件）
- **修改节点配置**：双击节点打开配置弹窗并保存（`handleSaveNodeConfig` 函数）

### 键盘快捷键

- **Undo（撤销）**: `Ctrl+Z` (Windows/Linux) 或 `Cmd+Z` (macOS)
- **Redo（重做）**: `Ctrl+R` (Windows/Linux) 或 `Cmd+R` (macOS)

### 配置选项

可以通过 `WorkflowProps` 扩展配置 undo/redo 行为：

```typescript
interface WorkflowProps {
  // ... 现有属性
  undoRedoOptions?: {
    enabled?: boolean;        // 是否启用，默认 true
    maxHistorySize?: number;  // 最大历史记录数，默认 50
  };
}
```

**使用示例**：

```tsx
<Workflow
  initialNodes={nodes}
  initialEdges={edges}
  undoRedoOptions={{
    enabled: true,
    maxHistorySize: 100,  // 增加历史记录容量
  }}
/>
```

### 注意事项

1. **只读模式**：当 `readonly={true}` 时，undo/redo 功能自动禁用
2. **性能考虑**：对于大型工作流（节点数 > 100），建议减少 `maxHistorySize` 以降低内存占用
3. **状态同步**：undo/redo 会同时回退 nodes 和 edges，保持状态一致性
4. **UI 状态过滤**：选中节点、拖拽等 UI 状态变化不会触发历史记录
5. **深度比较**：使用 `lodash.isEqual` 进行状态比较，确保只有实质性修改才会记录历史
6. **副作用处理**：节点配置的修改如果涉及外部 API 调用，需要在业务层面处理撤销逻辑
7. **初始状态**：组件挂载时会自动记录初始状态，确保第一次操作后可以撤销
