# Loop 节点设计优化方案

## 1. 问题背景

当前的 `LoopNode` 实现方式是通过 `start` (Bottom) 和 `end` (Bottom) 两个 Handle 来连接循环体内的节点。这种方式将循环体内的节点与外部节点置于同一层级（Canvas Level），仅通过连线逻辑来表示所属关系。

**存在的问题：**

- **连线混乱（Spaghetti Code）**：当循环嵌套层数较多时，内层循环的回环连线（End -> Start）以及外层循环的连线会相互穿插，导致视觉上非常混乱，难以理清逻辑流向。

## 2. 方案一：容器化节点 (Container/Group Node) - _已废弃_

_此前提出将 Loop 节点改为容器，包含内部节点。但用户反馈此方案在多层嵌套时需频繁手动调整容器大小，操作繁琐，故不采用。_

## 3. 方案二：交互式连线高亮 (Interactive Highlight) - _推荐方案_

**核心思路**：保持现有的扁平化连线结构不变，通过**交互增强**来解决视觉混乱问题。当用户**选中**某个 Loop 节点时，系统自动计算并**高亮显示**该循环体内的所有**直接相关**连线和节点，同时降低背景中无关元素的透明度（Dimming）。

### 3.1 方案优势

- **零布局成本**：用户无需手动调整节点大小或容器边界，延续现有的自由布局习惯。
- **聚焦上下文**：通过高亮机制，让用户在关注某个循环时，能够从复杂的网状结构中瞬间识别出该循环的逻辑流向。
- **解决嵌套干扰**：明确“内层嵌套循环的连线无需高亮”，避免多层嵌套带来的视觉噪音，只关注当前层级的流程。

### 3.2 交互逻辑细节

1.  **触发条件**：
    - 用户点击选中 `LoopNode`。
    - 或者鼠标悬停（Hover）在 `LoopNode` 上（可选，视性能而定，点击选中通常更稳定）。

2.  **高亮范围算法 (Traversing Algorithm)**：
    - **起点**：Loop 节点的 `loop-start` handle。
    - **终点**：Loop 节点的 `loop-end` handle。
    - **遍历规则**：
      - 从 `loop-start` 出发的 Edge 开始遍历。
      - **遇到普通节点**：继续追踪其输出 Edge，加入高亮集合。
      - **遇到子 Loop 节点**：
        - **关键处理**：将其视为一个黑盒。
        - **高亮**：指向子 Loop `entry` 的 Edge，以及从子 Loop `next` 出来的 Edge。
        - **忽略**：子 Loop 自身的 `loop-start` 和 `loop-end` 及其内部的所有连线。**不**进入子 Loop 内部递归。
    - **终止**：直到所有路径最终汇聚到当前 Loop 节点的 `loop-end` handle。

3.  **视觉样式**：
    - **Active Edges**：颜色加深（如深蓝色/主色调），线宽增加，添加流动动画（Animated）。
    - **Active Nodes**：保持原样或添加微弱的发光/描边效果。
    - **Inactive Elements**：透明度降低（如 `opacity: 0.3`），使高亮路径更加醒目。

### 3.3 技术实现路径

在 `Workflow` 组件中监听 `selectionChange` 事件。

```typescript
// 伪代码逻辑
const onSelectionChange = ({ nodes }) => {
  const selectedNode = nodes[0];
  if (selectedNode?.type === 'loop') {
    const loopFlow = findLoopFlow(selectedNode, allNodes, allEdges);
    setHighlightIds(loopFlow); // 包含需要高亮的 nodeIds 和 edgeIds
  } else {
    setHighlightIds(null); // 清除高亮
  }
};

// 遍历查找逻辑
function findLoopFlow(loopNode, nodes, edges) {
  const activeEdges = new Set();
  const activeNodes = new Set();
  const queue = [loopNode];

  // 需实现一个仅针对当前层级的 BFS/DFS
  // 特殊处理：遇到 type === 'loop' 的节点，不追踪其 loop-start/loop-end 连线
}
```

### 3.4 补充优化

为了配合该方案，建议在 UI 上做如下辅助优化：

- **Auto-Layout 按钮**：提供一个一键整理布局的功能（如使用 Dagre 算法），帮助用户将混乱的连线理顺，至少减少交叉。
- **折叠/展开**：虽然不采用容器，但可以考虑给 Loop 节点增加“折叠”功能，折叠时隐藏循环体内的所有节点和连线，只保留 Loop 节点本身，进一步简化视觉。

## 4. 结论

采用**交互式连线高亮**方案。它在不增加用户操作负担（如调整大小）的前提下，有效解决了“视觉混乱”的痛点，是一个轻量且高效的优化方向。
