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
