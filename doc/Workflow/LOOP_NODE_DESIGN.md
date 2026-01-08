# Loop 节点深度设计方案

## 1. 设计目标

目前的 `LoopNode` 功能较为单一。为了支持复杂的业务流转，我们需要将其升级为一个功能完备的循环控制器。设计核心在于明确**三种主流循环模式**的配置参数、输入输出结构以及循环体内的上下文透传机制。

## 2. 循环模式 (Loop Modes)

建议支持以下三种模式，通过 `mode` 参数切换：

### 2.1 遍历循环 (ForEach) - _最常用_

适用于处理列表数据，如“遍历用户列表发送邮件”。

- **配置参数**:
  - `items`: **(必填)** 待遍历的数组源。通常是一个表达式，引用上游节点的输出 (e.g., `{{Step1.users}}`)。
  - `batchSize`: **(可选)** 并发度控制。默认 `1` (串行)。设置为 `>1` 时并行处理。
  - `itemVar`: **(可选)** 循环体内引用当前元素的变量名，默认为 `item`。
  - `indexVar`: **(可选)** 循环体内引用当前索引的变量名，默认为 `index`。

- **输入 (Inputs)**:
  - 必须包含 `items` 指定的数组数据。

### 2.2 条件循环 (While / Do-While)

适用于未知次数的循环，直到满足特定条件，如“轮询 API 直到状态为 Success”。

- **配置参数**:
  - `condition`: **(必填)** 循环继续的条件表达式 (e.g., `{{Step2.status}} != 'completed'`)。
  - `maxIterations`: **(可选)** 最大循环次数保护，防止死循环 (默认 e.g., 100)。
  - `checkType`: `While` (先判断后执行) 或 `Do-While` (先执行后判断)。

### 2.3 次数循环 (Count Loop)

简单地重复执行固定次数。

- **配置参数**:
  - `count`: **(必填)** 循环次数 (可以是固定值或表达式)。

## 3. 输入与输出设计 (I/O)

### 3.1 Loop 节点自身的输入

Loop 节点作为一个整体，其输入即为触发循环所需的数据。

- 对于 `ForEach`，输入主要是数组。
- 对于 `While`，可能是初始状态变量。

### 3.2 Loop 节点自身的输出 (Aggregation)

当循环结束后，Loop 节点应该输出什么？建议提供几种聚合策略：

1.  **Aggregate All (默认)**: 输出一个数组，包含每次迭代中**循环体内最后一个节点**的输出结果。
    - 输出结构: `[Result1, Result2, Result3, ...]`
2.  **Last Result**: 只输出最后一次迭代的结果。
3.  **None**: 不输出数据，只代表流程结束。

此外，Loop 节点还应输出元数据：

- `total`: 总迭代次数。
- `succeeded`: 成功次数。
- `failed`: 失败次数。

### 3.3 循环体内的上下文 (Context)

这是 Loop 设计中最关键的部分。循环体内的节点（Start -> ... -> End）必须能访问到当前迭代的上下文。

当节点在 Loop 内部运行时，其可访问变量域应自动注入：

- **ForEach 模式**:
  - `loop.item`: 当前遍历到的元素。
  - `loop.index`: 当前索引 (0-based)。
- **While/Count 模式**:
  - `loop.index`: 当前第几次循环。
  - `loop.prevResult`: 上一次迭代的结果 (用于累加或状态传递)。

## 4. UI 配置面板设计 (Schema 建议)

针对 `NodeConfigSchema` 的建议结构：

```json
{
  "type": "object",
  "properties": {
    "label": { "type": "string", "title": "节点名称" },
    "mode": {
      "type": "string",
      "title": "循环模式",
      "enum": ["forEach", "while", "count"],
      "default": "forEach"
    },
    // ForEach 配置
    "items": {
      "type": "string",
      "title": "待遍历数组 (Items)",
      "description": "引用上游数组，如 {{Start.data.list}}",
      "widget": "expressionInput" // 假设有支持变量选择的组件
    },
    "batchSize": {
      "type": "number",
      "title": "并发数",
      "default": 1,
      "minimum": 1
    },
    // While 配置
    "condition": {
      "type": "string",
      "title": "循环条件",
      "description": "当表达式为真时继续循环"
    },
    // 通用配置
    "continueOnError": {
      "type": "boolean",
      "title": "错误时继续",
      "description": "如果某次迭代失败，是否继续执行剩余迭代",
      "default": false
    }
  },
  "dependencies": {
    "mode": {
      "oneOf": [
        {
          "properties": { "mode": { "enum": ["forEach"] } },
          "required": ["items"]
        },
        {
          "properties": { "mode": { "enum": ["while"] } },
          "required": ["condition"]
        },
        {
          "properties": { "mode": { "enum": ["count"] } },
          "required": ["count"]
        }
      ]
    }
  }
}
```

## 5. 运行时执行逻辑 (伪代码)

```javascript
async function executeLoopNode(node, context) {
  const { mode, items, condition, count } = node.config;
  const results = [];

  if (mode === 'forEach') {
    const list = evaluate(items, context); // 解析数组
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      // 注入循环上下文
      const iterationContext = {
        ...context,
        loop: { item: item, index: i },
      };

      try {
        const res = await executeLoopBody(node.bodyGraph, iterationContext);
        results.push(res);
      } catch (err) {
        if (!node.config.continueOnError) throw err;
        results.push({ error: err.message });
      }
    }
  }

  // ... 处理其他模式

  return {
    output: results, // 聚合结果
    stats: { total: results.length },
  };
}
```

## 6. 总结

新的 LoopNode 设计将从单纯的“连线容器”转变为具备**数据处理能力**的控制节点。关键点在于：

1.  **显式的数据输入**（指定遍历哪个数组）。
2.  **明确的迭代上下文**（内部节点如何获取当前 item）。
3.  **可控的聚合输出**（循环结束后产出什么）。
