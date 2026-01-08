# ExpressionInput 组件设计方案

## 1. 背景与目标

在 Workflow 的节点配置中，用户经常需要引用上游节点的输出数据（例如：将“HTTP 请求”节点的返回结果作为“邮件发送”节点的内容）。为了简化这一操作，我们需要开发一个支持**变量插值**的输入组件 `ExpressionInput`。

**核心目标**：

1.  提供文本输入能力。
2.  支持通过 `${` 语法快捷选择并插入变量。
3.  提供可视化的变量选择器。
4.  提供变量的原子性操作体验（光标不能停留在变量内部）。

## 2. 交互设计

### 2.1 触发方式

组件支持两种方式触发变量选择面板：

1.  **键盘触发**：当用户在输入框中输入 `${` 时，自动弹出变量选择下拉框。
2.  **按钮触发**：输入框右侧（或工具栏）提供一个 `{}` 图标按钮，点击后弹出变量选择下拉框。

### 2.2 变量选择面板

- **分组展示**：变量应按来源节点分组（例如：`Start Node`, `HTTP Request`, `Loop Context`）。
- **类型提示**：展示变量的数据类型（String, Number, Object 等）。
- **搜索过滤**：支持输入关键词快速筛选变量。

### 2.3 插入行为

- 用户选择变量后，编辑器自动补全为 `${变量名}` 格式，例如 `${Start.data.userId}`。
- 如果是通过输入 `${` 触发的，补全时应避免重复括号。

### 2.4 变量导航与编辑

为了保持变量的原子性操作体验，实现了以下交互规则：

1.  **光标导航**：
    - 当光标在变量内部或右侧时，按 **左方向键** 直接跳转到变量左侧。
    - 当光标在变量内部或左侧时，按 **右方向键** 直接跳转到变量右侧。
    - 光标不会停留在变量内部。

2.  **变量删除**：
    - 当光标在变量右侧时，按 **Backspace** 键删除整个变量。
    - 当光标在变量左侧时，按 **Delete** 键删除整个变量。

3.  **鼠标点击**：
    - 当用户点击变量内部时，光标自动移动到变量右侧。
    - 确保用户无法通过点击将光标放置在变量内部。

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
    - **Tokenize 规则**: 识别 `${ ... }` 块，将其包裹在 `<span class="token-variable">` 中给予特定颜色（紫色 #7c3aed）。

3.  **滚动同步**:
    - `.backdrop` 设置 `overflow: auto` 以支持滚动。
    - `.highlights` 必须与 `textarea` 具有完全相同的样式（padding、font-family、font-size、line-height、white-space 等）。
    - 通过 `onScroll` 事件监听 textarea 的滚动，实时同步 `backdrop.scrollTop` 和 `backdrop.scrollLeft`。
    - `.backdrop` 的滚动条通过 CSS 隐藏（`scrollbar-width: none` 和 `::-webkit-scrollbar`）。

4.  **关键实现细节**:
    - `.backdrop` 不应有 padding，padding 应该设置在 `.highlights` 上。
    - `.highlights` 需要继承所有影响文本布局的样式，确保与 textarea 完美对齐。

### 5.2 级联自动补全 (Cascading Autocomplete)

支持属性访问符 `.` 的触发：

1.  **触发逻辑**:
    - 当用户在 `${` 内部输入 `.` 时触发。
    - 解析光标前的 Token（例如 `Start.data`）。
2.  **Schema 解析**:
    - 系统需要提供变量的层级 Schema (Tree Structure)。
    - 根据前缀路径查找子属性列表。
    - 示例：输入 `Start.` -> 提示 `data`, `userId`；输入 `Start.data.` -> 提示 `body`, `headers`。

### 5.3 表达式支持

允许在 `${ }` 内输入复杂表达式（如 `a + b`）：

- 自动补全仅针对变量名生效。
- 高亮逻辑需识别 `${ }` 边界，内部内容统一高亮，或者进一步进行 JS 语法分析（成本较高，初期可暂不实现完整的 JS 高亮）。

### 5.4 变量原子性操作

为了提供更好的用户体验，实现了变量的原子性操作：

1.  **findVariableAtCursor 辅助函数**:
    - 使用正则表达式 `/\$\{[^}]+\}/g` 查找所有变量。
    - 检测光标位置是否在某个变量的边界内。
    - 返回变量的 `start` 和 `end` 位置。

2.  **键盘导航处理**:
    - 在 `handleKeyDown` 中检测方向键事件。
    - 如果光标在变量内部，自动跳转到变量边界。
    - 如果是删除键（Backspace/Delete），删除整个变量。

3.  **鼠标点击处理**:
    - 在 `handleClick` 中检测点击位置。
    - 如果点击在变量内部（不包括边界），自动将光标移动到变量右侧。

## 6. 总结

本设计采用轻量级实现方案，优先解决"变量插入"的核心痛点。通过解耦 UI 与数据解析逻辑，确保组件的可复用性，同时为未来支持更复杂的变量推导机制预留接口。

### 6.1 已实现的核心功能

1. **变量语法**: 使用 `${变量名}` 格式，符合 JavaScript 模板字符串习惯。
2. **语法高亮**: 通过 Backdrop Overlay 技术实现，保持原生 textarea 体验。
3. **自动补全**: 支持 `${` 和 `.` 触发，提供级联变量选择。
4. **变量原子性**: 光标无法停留在变量内部，提供一致的编辑体验。
5. **滚动同步**: 完美同步 backdrop 和 textarea 的滚动状态。

### 6.2 技术亮点

- **轻量级实现**: 不依赖重型编辑器，使用原生 textarea + CSS overlay。
- **完美对齐**: 通过精确的样式配置确保高亮层与文本层完全重合。
- **用户体验**: 变量作为原子单元操作，避免误编辑。
- **可扩展性**: 组件接口清晰，易于集成到 SchemaForm 系统。

---

**文档版本**: v2.0
**最后更新**: 2026-01-08
**变更说明**: 更新变量语法为 `${}`，新增变量原子性操作、滚动同步等实现细节
