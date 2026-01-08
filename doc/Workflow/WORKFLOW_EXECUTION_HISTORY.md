# Workflow 执行历史回溯方案设计文档

## 1. 背景与目标

当前 Workflow 组件主要用于流程的**编辑**与**编排**。为了满足业务场景中对“运行后状态”的监控与调试需求，需要扩展组件能力，支持**执行历史回溯 (Execution History Playback)**。

**核心需求：**

1.  **历史记录快照**：查看 Workflow 的历史运行记录。
2.  **节点状态可视化**：直观展示每个节点的运行状态（成功、失败、跳过、运行中）。
3.  **异常定位**：若运行失败，能快速识别失败节点及原因。
4.  **运行数据透视**：查看每个节点的上下文数据（输入/输出/日志）。
5.  **循环执行详情**：支持查看 Loop 节点及其内部节点的多次运行记录（运行次数、每次迭代的数据）。

## 2. 核心交互设计 (UI/UX)

### 2.1 整体布局架构 (Layout Structure)

参考 n8n 的界面布局，采用 **Tabs + Master-Detail** 的设计模式：

1.  **顶部导航栏 (Top Bar)**:
    - 居中显示视图切换 Tabs: **[ Editor | Executions ]**。
    - **Editor**: 编辑器视图，用于流程编排。
    - **Executions**: 执行记录视图，用于历史回溯与调试。

2.  **Executions 视图布局**:
    - **左侧侧边栏 (Executions List)**: 展示历史执行记录列表。
    - **右侧画布 (Canvas)**: 展示选中的执行记录详情（回溯模式）。
    - **功能区**: 右上角提供 "Copy to Editor" 按钮。

### 2.2 视图交互详情

#### A. Editor 视图

保持现有行为，支持拖拽、连线、配置。

#### B. Executions 视图

- **左侧列表**:
  - 显示执行记录摘要（状态图标、开始时间、耗时、ID）。
  - 支持自动刷新 (Auto-refresh) 和筛选 (Filter)。
  - 点击某条记录，右侧画布刷新为该记录的状态。
- **右侧画布 (回溯模式)**:
  - **只读**：禁止添加/删除节点、连线。
  - **状态注入**：根据选中记录的数据，渲染节点的颜色、徽标。
  - **点击交互**：点击节点打开“执行详情”弹窗 (Modal)，展示输入输出数据与状态。
- **Copy to Editor**:
  - 允许用户将当前查看到的这次执行的 Workflow 配置（可能是历史版本）复制回 Editor。
  - 场景：Debug 时发现旧版本的某个参数配置有问题，可以直接 Copy 回 Editor 进行修改并重新运行。

### 2.3 节点状态展示

在 `history` 模式下，节点 UI 将发生以下变化：

- **状态颜色编码**：
  - ✅ **Success**: 绿色边框/标题栏 (或绿色对勾图标)。
  - ❌ **Failure**: 红色边框/标题栏 (或红色警示图标)，并带有波动动画效果吸引注意。
  - ⏳ **Running**: 蓝色呼吸效果。
  - ⏭️ **Skipped**: 灰色/虚线样式，表示未执行。
- **执行次数徽标 (Badges)**：
  - 对于被执行多次的节点（如 Loop 内部节点），在右上角显示徽标，如 `x5`，表示运行了 5 次。
- **耗时显示**：
  - 可选显示节点的执行耗时（如 `200ms`）。

### 2.4 执行详情弹窗 (Execution Detail Modal)

点击节点时，弹出模态框 (Modal) 展示该节点的运行详情（保持与编辑模式下配置弹窗类似的交互体验，但内容为只读的执行数据）：

- **基础信息**：节点名称、ID、状态、开始时间、结束时间、耗时。
- **数据面板**：
  - **Inputs**: 该节点接收到的输入数据 (JSON View)。
  - **Outputs**: 该节点产生的输出数据 (JSON View)。
  - **Error**: 如果失败，展示详细的错误堆栈信息。
- **多轮迭代支持 (Loop Context)**：
  - 如果节点在 Loop 中运行了多次，面板顶部提供**迭代切换器** (Pagination 或 Dropdown)。
  - 用户切换迭代（如 `Iteration 1`, `Iteration 2`...），下方的数据面板随之更新为该轮次的数据。

## 3. 数据模型设计

为了解耦 UI 与运行时数据，建议设计一套标准的 **Execution Log Protocol**。

### 3.1 基础类型定义

```typescript
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
  // 键为 nodeId，值为该节点的执行摘要
  nodeExecutions: Record<string, NodeExecutionSummary>;
}
```

## 4. 组件接口设计

建议将 `Workflow` 组件保持为纯粹的 Canvas 编辑器/展示器，而在外层封装一个新的页面级组件（如 `WorkflowIDE`）来管理 Tabs 和列表状态。

### 4.1 WorkflowCanvas Props 扩展 (原 Workflow 组件)

```typescript
export interface WorkflowProps {
  // ... 现有 Props

  /**
   * 当前模式
   * default: 'edit'
   */
  mode?: 'edit' | 'history' | 'readonly';

  /**
   * 执行数据（仅 history 模式需要）
   * 传入后，组件自动渲染节点状态
   */
  executionData?: Record<string, NodeExecutionSummary>;

  /**
   * 点击节点查看详情时的回调
   * 可以由外部控制侧边栏展示，或者组件内部内置侧边栏
   */
  onNodeClick?: (
    event: React.MouseEvent,
    node: WorkflowNode,
    executionSummary?: NodeExecutionSummary
  ) => void;
}
```

### 4.2 外层容器组件设计 (WorkflowIDE / WorkflowPage)

这是一个新的容器组件，负责管理布局和状态切换。

```typescript
// 伪代码示例
const WorkflowIDE = () => {
  const [viewMode, setViewMode] = useState<'editor' | 'executions'>('editor');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string>(null);

  // Editor 模式下的数据
  const [editorNodes, setEditorNodes] = useNodesState([]);
  const [editorEdges, setEditorEdges] = useEdgesState([]);

  // Executions 模式下的数据 (通常从 API 获取)
  const executionList = useExecutionsQuery();
  const currentExecution = useExecutionDetail(selectedExecutionId);

  const handleCopyToEditor = () => {
    // 将 currentExecution 的 workflowSnapshot 覆盖到 editorNodes/Edges
  };

  return (
    <div className="workflow-ide">
      <div className="ide-header">
        <Tabs value={viewMode} onChange={setViewMode}>
          <Tab value="editor">Editor</Tab>
          <Tab value="executions">Executions</Tab>
        </Tabs>
        {viewMode === 'executions' && (
           <Button onClick={handleCopyToEditor}>Copy to Editor</Button>
        )}
      </div>

      <div className="ide-body">
        {viewMode === 'editor' ? (
           <Workflow
             mode="edit"
             nodes={editorNodes}
             edges={editorEdges}
             // ...
           />
        ) : (
           <div className="executions-view">
             <div className="executions-list">
               {/* 渲染 executionList, 点击切换 selectedExecutionId */}
             </div>
             <div className="executions-canvas">
               {currentExecution ? (
                 <Workflow
                   mode="history"
                   nodes={currentExecution.snapshot.nodes}
                   edges={currentExecution.snapshot.edges}
                   executionData={currentExecution.executionData}
                   // ...
                 />
               ) : <EmptyState />}
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
```

### 4.2 节点组件扩展 (BaseNode)

需要修改 `BaseNode` 或创建一个 `StatusNodeWrapper`，接收状态 props。

```typescript
export interface BaseNodeProps {
  // ... 现有 Props

  // 新增状态属性
  executionStatus?: ExecutionStatus;
  executionCount?: number;
  executionDuration?: number;
}
```

## 5. 实现方案细节

### 5.1 状态注入逻辑

1.  **数据映射**：在 `Workflow` 组件内部，将 `executionData` 映射到 `nodes` 状态中。
    - React Flow 的 `nodes` 对象包含 `data` 字段。我们不应该直接修改原始 `data`（那是业务配置），而是利用 `data` 中的保留字段（如 `_status`）或者使用 React Flow 的 `updateNode` 方法动态更新节点的样式类名。
    - **推荐方案**：更新 `nodes` 的 `className` 和 `data`。
    - 将 `executionStatus` 转换为对应的 CSS class（如 `status-success`, `status-failure`）。
    - 将 `executionCount` 放入 `data` 中，供自定义节点渲染徽标。

### 5.2 Loop 节点的特殊处理

Loop 节点本身是一个节点，它也有输入输出。

- Loop 节点的 `Inputs` 是进入循环前的初始数据。
- Loop 节点的 `Outputs` 是循环结束后的聚合数据。
- Loop 内部的节点：需正确识别其属于 Loop 内部，并在 UI 上展示多次运行的记录。

### 5.3 错误路径高亮 (可选高级特性)

如果 workflow 失败，可以高亮从 Start 到 Error Node 的路径。

- 利用 `getLoopFlowElements` 类似的逻辑，反向回溯或根据执行记录中的 `startTime` 顺序连接高亮线。

## 6. 开发计划

1.  **Type Definitions**: 定义 `ExecutionStatus`, `NodeExecutionRecord` 等类型。
2.  **BaseNode Update**:
    - 修改 `BaseNode.tsx` 及其样式，支持不同状态的边框颜色、背景色。
    - 添加右上角 Badge 组件用于显示 `runCount`。
3.  **Workflow Component Update**:
    - 处理 `mode='history'` 逻辑。
    - 实现 `executionData` 到 Node props 的映射。
    - 禁用编辑交互（连线、拖拽、删除）。
4.  **Layout Components**:
    - 开发 `WorkflowIDE` 容器组件，实现 Editor/Executions Tab 切换。
    - 开发 Executions 左侧列表组件。
5.  **Execution Detail Modal**:
    - 复用或新建 NodeConfigModal 组件，适配只读模式，展示 JSON 树状视图和迭代切换器。
6.  **Integration Example**:
    - 在 Example 页面模拟一份运行数据，验证回溯效果。

## 7. 示例数据结构 (JSON)

```json
{
  "start-node": {
    "nodeId": "start-node",
    "status": "success",
    "runCount": 1,
    "records": [{ "startTime": 1000, "endTime": 1005, "status": "success" }]
  },
  "process-node": {
    "nodeId": "process-node",
    "status": "success",
    "runCount": 1,
    "records": [{ "startTime": 1005, "endTime": 1050, "status": "success" }]
  },
  "loop-node": {
    "nodeId": "loop-node",
    "status": "failure",
    "runCount": 1,
    "records": [{ "startTime": 1050, "endTime": 2000, "status": "failure" }]
  },
  "inside-loop-node": {
    "nodeId": "inside-loop-node",
    "status": "failure",
    "runCount": 3,
    "records": [
      { "iterationIndex": 0, "status": "success", "outputs": { "val": 1 } },
      { "iterationIndex": 1, "status": "success", "outputs": { "val": 2 } },
      { "iterationIndex": 2, "status": "failure", "error": { "message": "Invalid value" } }
    ]
  }
}
```
