# ExpressionInput 组件设计方案

## 1. 背景与目标

在 Workflow 的节点配置中，用户经常需要引用上游节点的输出数据（例如：将"HTTP 请求"节点的返回结果作为"邮件发送"节点的内容）。为了简化这一操作，我们需要开发一个支持**变量插值**的输入组件 `ExpressionInput`。

**核心目标**：

1.  提供文本输入能力。
2.  支持双模式切换：文本模式和表达式模式。
3.  表达式模式下提供实时变量匹配和可视化选择器。
4.  提供语法高亮，增强可读性。

## 2. 交互设计

### 2.1 双模式设计

组件支持两种输入模式，通过右侧的 `{}` 图标按钮切换：

1.  **文本模式 (Text Mode)**：
    - 默认模式，用于输入普通文本。
    - 输入内容直接作为字符串值。
    - 不显示变量选择器。

2.  **表达式模式 (Expression Mode)**：
    - 用于输入变量引用或表达式。
    - 输入框两侧显示 `${` 和 `}` 装饰符，表明当前处于表达式上下文。
    - 实时匹配用户输入，显示变量建议列表。
    - 输出值自动包装为 `${...}` 格式。

### 2.2 变量选择面板

- **实时匹配**：根据用户输入的 token 实时过滤变量列表。
- **分组展示**：变量按来源节点分组（例如：`Start Node`, `HTTP Request`, `Loop Context`）。
- **类型提示**：展示变量的数据类型（String, Number, Object 等）。
- **键盘导航**：支持上下箭头选择、Enter 确认、Escape 关闭。

### 2.3 插入行为

- 用户选择变量后，替换当前正在输入的 token。
- 选择完成后自动聚焦输入框，光标移至末尾。

### 2.4 模式切换行为

1.  **文本 → 表达式**：当前文本内容自动包装为 `${当前内容}`。
2.  **表达式 → 文本**：去除外层的 `${}`，保留内部内容。

## 3. 技术架构设计

### 3.1 组件接口 (Props)

```typescript
export interface Variable {
  label: string; // 显示名称 (e.g. "User ID")
  value: string; // 实际值/路径 (e.g. "Start.userId")
  type?: string; // 数据类型 (e.g. "string", "number")
  group?: string; // 分组名称 (e.g. "Start Node")
}

interface ExpressionInputProps {
  value?: string;
  onChange: (value: string) => void;
  // 核心依赖：可用的变量列表
  variables?: Variable[];
  placeholder?: string;
}
```

### 3.2 变量解析策略 (Variable Resolution)

这是该组件最复杂的部分：**如何获取当前节点可用的所有变量？**

组件本身应保持“哑组件”(Dumb Component) 的特性，只负责展示传入的 `variables`。数据的获取逻辑应由上层容器（如 `NodeConfigModal` 或 `SchemaForm`）负责。

**数据流向建议**：

1.  **Workflow Context**: `Workflow` 组件维护 `nodes` 和 `edges` 状态。
2.  **Upstream Traversal**: 当打开某个节点配置时，系统应根据 DAG (有向无环图) 拓扑结构，**向上遍历**所有前置节点。
3.  **Variable Collection**: 收集所有前置节点的 Output Schema（这需要每个节点类型定义其输出结构）。
4.  **Injection**: 将收集到的变量列表注入到 `SchemaForm`，再透传给 `ExpressionInput`。

### 3.3 UI 实现细节

鉴于引入 Monaco Editor 等重型编辑器成本较高，建议采用 **Textarea + Overlay** 的轻量化方案：

1.  **输入控件**: 使用标准 `<textarea>`，通过 `ref` 获取光标位置 (`selectionStart`)。
2.  **弹出层定位**:
    - 简单方案：在 Textarea 底部或顶部固定弹出。
    - 高级方案：使用隐藏的 `div` 镜像 Textarea 内容，计算光标的像素坐标，实现跟随光标的弹出菜单（类似 GitHub 的 @mention）。
3.  **状态管理**: 使用 React `useState` 管理 `isOpen`, `filterText`, `cursorPosition`。

## 4. 集成方案

### 4.1 在 SchemaForm 中注册

`ExpressionInput` 作为一个 Widget 注册到 `SchemaForm` 的组件映射中。

```tsx
const formComponents = {
  'expression-input': ExpressionInput,
  // ...
};
```

### 4.2 配置 Schema 定义

在节点定义的 JSON Schema 中指定 widget 类型：

```json
{
  "properties": {
    "url": {
      "type": "string",
      "title": "URL",
      "widget": "expression-input", // 指定使用该组件
      "description": "输入 URL，支持使用 ${变量}"
    }
  }
}
```

## 5. 高级功能设计 (Advanced Features)

### 5.1 语法高亮实现 (Syntax Highlighting)

为了在保持 `textarea` 编辑体验（原生光标、输入法支持）的同时实现高亮，采用 **Backdrop Overlay** 技术：

1.  **结构**:
    ```html
    <div class="editor-wrapper">
      <div class="backdrop">
        <div class="highlights"><!-- 高亮渲染的内容 --></div>
      </div>
      <textarea class="editor"></textarea>
    </div>
    ```
2.  **原理**:
    - `textarea` 背景透明，文字颜色透明，使用 `caret-color` 保持光标可见。
    - `highlights` 层完全重叠在 `textarea` 下方。
    - 实时将 `textarea` 的值经过 Tokenize 处理后渲染到 `highlights`。
    - **表达式模式高亮**: 将输入内容按 token 分割，匹配变量名的 token 高亮显示。

3.  **滚动同步**:
    - 通过 `onScroll` 事件监听 textarea 的滚动。
    - 使用 CSS transform 同步 highlights 层的位置。
    - `.backdrop` 的滚动条通过 CSS 隐藏。

4.  **关键实现细节**:
    - `.highlights` 需要继承所有影响文本布局的样式，确保与 textarea 完美对齐。
    - 文本模式下不进行高亮处理。

### 5.2 实时变量匹配 (Real-time Variable Matching)

表达式模式下的变量匹配逻辑：

1.  **Token 提取**:
    - 从输入内容中提取最后一个正在输入的 token。
    - 使用正则 `/[a-zA-Z_][a-zA-Z0-9_.]*$/` 匹配标识符。

2.  **变量过滤**:
    - 将 token 与变量列表进行前缀匹配。
    - 按匹配长度排序，优先显示更精确的匹配。

3.  **精确匹配处理**:
    - 当 token 完全匹配某个变量时，不显示下拉菜单。
    - 避免用户已输入完整变量名后仍显示建议。

### 5.3 表达式支持

表达式模式支持输入复杂表达式（如 `a + b`）：

- 自动补全仅针对变量名生效。
- 高亮逻辑识别变量名 token 并高亮显示。

## 6. 总结

本设计采用轻量级实现方案，优先解决"变量插入"的核心痛点。通过解耦 UI 与数据解析逻辑，确保组件的可复用性，同时为未来支持更复杂的变量推导机制预留接口。

### 6.1 已实现的核心功能

1. **双模式设计**: 文本模式用于普通输入，表达式模式用于变量引用。
2. **变量语法**: 使用 `${变量名}` 格式，符合 JavaScript 模板字符串习惯。
3. **语法高亮**: 通过 Backdrop Overlay 技术实现，保持原生 textarea 体验。
4. **实时匹配**: 表达式模式下根据输入实时过滤变量建议。
5. **滚动同步**: 完美同步 backdrop 和 textarea 的滚动状态。

### 6.2 技术亮点

- **轻量级实现**: 不依赖重型编辑器，使用原生 textarea + CSS overlay。
- **完美对齐**: 通过精确的样式配置确保高亮层与文本层完全重合。
- **模式分离**: 文本和表达式模式清晰分离，各司其职。
- **可扩展性**: 组件接口清晰，易于集成到 SchemaForm 系统。

---

**文档版本**: v3.0
**最后更新**: 2026-01-28
**变更说明**: 重构为双模式设计，移除变量原子性操作，改用实时变量匹配
