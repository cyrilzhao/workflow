# Schema Builder 组件设计文档

## 1. 概述

`SchemaBuilder` 是一个可视化编辑器组件，旨在创建和修改 `ExtendedJSONSchema` 对象。它允许用户直观地构建复杂的表单 Schema，无需编写原始 JSON，涵盖了标准 JSON Schema 验证规则以及项目特有的 UI 扩展（Widget、布局、路径扁平化等）。

## 2. 组件接口

```typescript
import { ExtendedJSONSchema } from '../../src/components/DynamicForm/types/schema';

interface SchemaBuilderProps {
  /**
   * 初始编辑的 Schema
   */
  defaultValue?: ExtendedJSONSchema;

  /**
   * Schema 变更时的回调函数
   */
  onChange?: (schema: ExtendedJSONSchema) => void;

  /**
   * 可选的自定义类名
   */
  className?: string;

  /**
   * 可选的自定义样式
   */
  style?: React.CSSProperties;
}
```

## 3. 架构设计

组件将采用**分屏布局**：

1.  **左侧面板（Schema 树）**：
    - 可视化 Schema 的层级结构。
    - 处理节点的添加、删除和选择。
    - 支持嵌套结构（对象、数组）。
2.  **右侧面板（属性编辑器）**：
    - 提供表单以编辑当前选中节点的属性。
    - 更新全局 Schema 状态中选中节点的数据。
3.  **预览/输出区域**：
    - 显示生成的 JSON。
    - （可选）实时预览渲染后的 `DynamicForm`。

## 4. 状态管理

组件将维护 Schema 的内部状态。

- **`schema`**：根 `ExtendedJSONSchema` 对象。
- **`selectedPath`**：表示当前选中节点路径的字符串或字符串数组（例如 `properties.user.properties.name`）。
- **`expandedPaths`**：在树状视图中展开的路径集合。

## 5. 详细组件设计

### 5.1 SchemaTree（左侧面板）

- **结构可视化**：
  - **Root**：主对象。
  - **对象属性**：对象节点的子节点（源自 `properties`）。
  - **数组项**：数组节点的子节点（源自 `items`）。
- **交互**：
  - **选择**：点击节点以填充右侧面板。
  - **添加字段**：在对象节点上点击按钮添加新属性。
  - **删除**：点击按钮删除节点（Root 除外）。
- **展示**：
  - 显示 `title`（如果缺失则显示 `key`）。
  - 显示 `type`（图标或文本）。
  - 标识 `required` 必填状态。

### 5.2 PropertyEditor（右侧面板）

编辑器根据选中节点的 `type` 动态变化。内容组织为标签页：

#### Tab 1: 基础信息 (Basic)

- **字段键名 (Field Key)**：（仅当父级为对象时可编辑）属性名称。
- **标题 (Title)**：`title` 输入框。
- **描述 (Description)**：`description` 文本域。
- **类型 (Type)**：下拉选择（`string`, `number`, `integer`, `boolean`, `object`, `array`）。更改类型会重置特定类型的验证规则。
- **默认值 (Default Value)**：`default` 输入框（感知类型）。
- **必填 (Required)**：开关（切换在父级 `required` 数组中的存在状态）。

#### Tab 2: 验证规则 (Validation) - 特定类型

- **String**:
  - `minLength`, `maxLength`（数字输入）
  - `pattern`（正则字符串输入）
  - `format`（下拉选择：email, date, uri 等）
- **Number/Integer**:
  - `minimum`, `maximum`（数字输入）
  - `multipleOf`（数字输入）
- **Array**:
  - `minItems`, `maxItems`（数字输入）
  - `uniqueItems`（开关）
- **Object**:
  - `minProperties`, `maxProperties`（数字输入）

#### Tab 3: UI 配置 (UI Configuration)

对应 `src/components/DynamicForm/types/schema.ts` -> `UIConfig`。

- **组件选择 (Widget)**：基于 `type` 的下拉选择。
  - _String_: text, textarea, password, email, url, date, time, color, file...
  - _Boolean_: switch, checkbox.
  - _Number_: number, range.
  - _Array_: checkboxes (如果是枚举), nested-form (如果是对象).
- **显示选项**:
  - `placeholder`（输入框）
  - `help`（输入框）
  - `hidden`, `disabled`, `readonly`（开关）
- **布局 (Layout)**:
  - `width`（栅格列跨度，如果布局系统支持）
  - `layout`: `vertical` | `horizontal` | `inline`
  - `labelWidth`: 输入框
- **高级 UI**:
  - `flattenPath`（开关） - 参见 `FIELD_PATH_FLATTENING.md`
  - `flattenPrefix`（开关）

#### Tab 4: 数据选项 (Data Options) - 仅枚举/数组

- **枚举配置**:
  - 值/标签对列表。填充 `enum` 和 `enumNames`。
- **数组配置**:
  - `arrayMode`: `dynamic` | `static`
  - 按钮文本 (`addButtonText`, `removeButtonText`)。

## 6. 实现策略

### 6.1 工具库

- **React Hook Form**：用于管理属性编辑器表单。
- **BlueprintJS**：用于 Tree 组件、Tabs 和基础输入组件。
- **Lodash**：使用 `get`, `set`, `cloneDeep`, `unset` 进行类不可变 Schema 更新。

### 6.2 关键挑战与解决方案

1.  **重命名键名**：当用户更改对象中属性的“字段键名”时，必须更新父级的 `properties` 对象。
    - _解决方案_：PropertyEditor 中的“字段键名”输入框将触发特殊操作：创建一个具有新键名的新属性，复制原值，并删除旧键名，尽可能保持顺序。
2.  **更改类型**：从“String”切换到“Object”。
    - _解决方案_：警告用户验证规则将丢失。使用安全默认值初始化新类型（例如，Object 初始化为空 `properties`）。

## 7. 交付物

- `src/components/DynamicForm/SchemaBuilder/SchemaBuilder.tsx`：主组件。
- `src/components/DynamicForm/SchemaBuilder/SchemaTree.tsx`：左侧面板。
- `src/components/DynamicForm/SchemaBuilder/PropertyEditor.tsx`：右侧面板。
- `src/components/DynamicForm/SchemaBuilder/types.ts`：内部类型定义。
