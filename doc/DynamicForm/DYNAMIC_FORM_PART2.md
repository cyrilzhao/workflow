# 动态表单组件技术方案 - Part 2

## JSON Schema 规范详解

### 5.1 基础类型定义

#### 5.1.1 字符串类型 (string)

```json
{
  "type": "string",
  "title": "用户名",
  "description": "请输入用户名",
  "minLength": 2,
  "maxLength": 20,
  "pattern": "^[a-zA-Z0-9_]+$",
  "default": "",
  "examples": ["john_doe", "user123"]
}
```

**支持的验证规则**:

- `minLength`: 最小长度
- `maxLength`: 最大长度
- `pattern`: 正则表达式
- `format`: 预定义格式（email, uri, date-time 等）
- `enum`: 枚举值

**UI 扩展属性**:

```json
{
  "type": "string",
  "ui": {
    "widget": "textarea",
    "placeholder": "请输入描述",
    "rows": 4
  }
}
```

#### 5.1.2 数字类型 (number/integer)

```json
{
  "type": "integer",
  "title": "年龄",
  "minimum": 0,
  "maximum": 120,
  "multipleOf": 1,
  "default": 18
}
```

**支持的验证规则**:

- `minimum`: 最小值
- `maximum`: 最大值
- `exclusiveMinimum`: 排他最小值
- `exclusiveMaximum`: 排他最大值
- `multipleOf`: 倍数

**UI 扩展属性**:

```json
{
  "type": "number",
  "ui": {
    "widget": "range",
    "step": 0.1,
    "unit": "元"
  }
}
```

#### 5.1.3 布尔类型 (boolean)

```json
{
  "type": "boolean",
  "title": "是否同意协议",
  "default": false
}
```

**UI 扩展属性**:

```json
{
  "type": "boolean",
  "ui": {
    "widget": "switch",
    "checkedText": "是",
    "uncheckedText": "否"
  }
}
```

#### 5.1.4 数组类型 (array)

> **详细文档**：完整的数组字段设计请参考 [ArrayFieldWidget 设计文档](./ARRAY_FIELD_WIDGET.md)

**支持的验证规则**:

- `minItems`: 最小项数
- `maxItems`: 最大项数
- `uniqueItems`: 是否要求唯一值
- `items`: 数组项的 schema 定义

**渲染逻辑**:

所有数组字段统一使用 `ArrayFieldWidget` 处理，内部根据 `items` 配置自动选择渲染方式：

1. **枚举数组（items.enum 存在）** → 多选框组（checkboxes）
2. **对象数组（items.type === 'object'）** → 嵌套表单（nested-form）
3. **基本类型数组** → 对应的基础 widget（如 text、number）

> **重要提示**：基本类型数组（如字符串数组）在内部会被包装成对象格式 `[{value: 'x'}]`，提交时需要转换。详见 [ArrayFieldWidget 文档](./ARRAY_FIELD_WIDGET.md)。

**快速示例**:

```json
{
  "type": "array",
  "title": "兴趣爱好",
  "items": {
    "type": "string",
    "enum": ["reading", "sports", "music"],
    "enumNames": ["阅读", "运动", "音乐"]
  },
  "uniqueItems": true
}
```

**对象数组示例**:

```json
{
  "type": "array",
  "title": "联系人列表",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "title": "姓名" },
      "phone": { "type": "string", "title": "电话" },
      "email": { "type": "string", "title": "邮箱" }
    },
    "required": ["name", "phone"]
  },
  "minItems": 1,
  "ui": {
    "addButtonText": "添加联系人"
  }
}
```

> **说明**: 对象数组会自动为每个数组项渲染独立的嵌套表单卡片，支持动态添加/删除。

**数组特定的 UI 配置**:

| 属性 | 类型 | 说明 |
|------|------|------|
| `addButtonText` | `string` | 添加按钮的文本 |
| `arrayMode` | `'dynamic' \| 'static'` | 渲染模式（dynamic: 可增删，static: 固定） |
| `showAddButton` | `boolean` | 是否显示添加按钮 |
| `showRemoveButton` | `boolean` | 是否显示删除按钮 |

更多数组字段的配置选项、渲染模式、数据包装机制和最佳实践，请查看 [ArrayFieldWidget 完整文档](./ARRAY_FIELD_WIDGET.md)。

#### 5.1.5 对象类型 (object)

```json
{
  "type": "object",
  "title": "地址信息",
  "properties": {
    "province": { "type": "string", "title": "省份" },
    "city": { "type": "string", "title": "城市" },
    "detail": { "type": "string", "title": "详细地址" }
  },
  "required": ["province", "city"]
}
```

### 5.2 完整表单 Schema 示例

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "用户注册表单",
  "description": "新用户注册信息",
  "properties": {
    "username": {
      "type": "string",
      "title": "用户名",
      "minLength": 3,
      "maxLength": 20,
      "pattern": "^[a-zA-Z0-9_]+$",
      "ui": {
        "placeholder": "请输入用户名"
      }
    },
    "email": {
      "type": "string",
      "title": "邮箱",
      "format": "email",
      "ui": {
        "placeholder": "example@email.com"
      }
    },
    "password": {
      "type": "string",
      "title": "密码",
      "minLength": 6,
      "ui": {
        "widget": "password",
        "placeholder": "至少6位字符"
      }
    },
    "age": {
      "type": "integer",
      "title": "年龄",
      "minimum": 18,
      "maximum": 100
    },
    "gender": {
      "type": "string",
      "title": "性别",
      "enum": ["male", "female", "other"],
      "enumNames": ["男", "女", "其他"],
      "ui": {
        "widget": "radio"
      }
    },
    "interests": {
      "type": "array",
      "title": "兴趣爱好",
      "items": {
        "type": "string",
        "enum": ["reading", "sports", "music", "travel"],
        "enumNames": ["阅读", "运动", "音乐", "旅行"]
      },
      "uniqueItems": true,
      "ui": {
        "widget": "checkboxes"
      }
    },
    "bio": {
      "type": "string",
      "title": "个人简介",
      "maxLength": 500,
      "ui": {
        "widget": "textarea",
        "rows": 4
      }
    },
    "agreeTerms": {
      "type": "boolean",
      "title": "同意用户协议",
      "const": true
    }
  },
  "required": ["username", "email", "password", "agreeTerms"]
}
```

### 5.3 UI 扩展规范

#### 5.3.1 通用 UI 属性

UI 配置通过 `ui` 字段扩展，支持以下属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `widget` | `string` | 组件类型（text、select、radio 等） |
| `placeholder` | `string` | 占位符文本 |
| `disabled` | `boolean` | 是否禁用 |
| `readonly` | `boolean` | 是否只读 |
| `hidden` | `boolean` | 是否隐藏 |
| `help` | `string` | 帮助文本 |
| `className` | `string` | CSS 类名 |
| `style` | `React.CSSProperties` | 内联样式 |
| `order` | `string[]` | 字段顺序 |
| `errorMessages` | `ErrorMessages` | 自定义错误信息 |
| `linkage` | `LinkageConfig` | UI 联动配置（详见 [UI_LINKAGE_DESIGN.md](./UI_LINKAGE_DESIGN.md)） |
| `layout` | `'vertical' \| 'horizontal' \| 'inline'` | 布局方式（优先级高于全局配置，层级越深优先级越高） |
| `labelWidth` | `number \| string` | 标签宽度（仅在 horizontal layout 下生效） |
| `flattenPath` | `boolean` | 路径透明化：是否跳过该对象层级（详见 [FIELD_PATH_FLATTENING.md](./FIELD_PATH_FLATTENING.md)） |
| `flattenPrefix` | `boolean` | 路径透明化：是否添加当前字段 title 作为前缀 |
| `schemaKey` | `string` | 动态嵌套表单：依赖字段（详见 [NESTED_FORM.md](./NESTED_FORM.md)） |
| `schemas` | `Record<string, {...}>` | 动态嵌套表单：多个子表单 schema 片段 |
| `schemaLoader` | `Function` | 动态嵌套表单：异步加载 schema |

> **完整类型定义**：详见 [PART3 - 组件架构设计](./DYNAMIC_FORM_PART3.md#核心类型定义)

**ErrorMessages 错误信息配置**：

| 属性 | 类型 | 说明 |
|------|------|------|
| `required` | `string` | 必填错误信息 |
| `minLength` | `string` | 最小长度错误信息 |
| `maxLength` | `string` | 最大长度错误信息 |
| `min` | `string` | 最小值错误信息 |
| `max` | `string` | 最大值错误信息 |
| `pattern` | `string` | 格式错误信息 |

#### 5.3.2 Readonly vs Disabled 详解

`readonly` 和 `disabled` 是两个容易混淆但有重要区别的属性：

**核心区别对比表**：

| 特性 | Readonly | Disabled |
|------|----------|----------|
| **值是否可修改** | ❌ 不可修改 | ❌ 不可修改 |
| **表单提交时是否包含** | ✅ 包含在表单数据中 | ❌ 不包含在表单数据中 |
| **是否可聚焦** | ✅ 可以聚焦（可选中、复制） | ❌ 不可聚焦 |
| **是否可交互** | ✅ 部分交互（如滚动、选择文本） | ❌ 完全不可交互 |
| **视觉样式** | 正常样式（可能有只读标识） | 灰色/禁用样式 |
| **Tab 键导航** | ✅ 可以通过 Tab 键访问 | ❌ 跳过该字段 |
| **语义含义** | 数据只读，但有效 | 字段不可用/不适用 |

**使用场景**：

**使用 Readonly 的场景**：
1. **显示已确认的数据**：订单已提交，显示订单详情但不允许修改
2. **权限限制**：用户只有查看权限，没有编辑权限
3. **审核/审批流程**：审核人员查看申请内容，但不能修改
4. **历史记录查看**：查看历史版本，不允许修改

**使用 Disabled 的场景**：
1. **条件性禁用**：依赖其他字段的值，某些字段暂时不可用
2. **加载状态**：数据加载中，禁用表单
3. **表单提交中**：提交中，防止重复提交
4. **不适用的字段**：根据用户类型，某些字段不适用

**示例**：

```typescript
// Readonly 示例：查看已提交的订单
<DynamicForm
  schema={orderSchema}
  defaultValues={submittedOrder}
  readonly={true}  // 只读模式，数据会包含在表单中
/>

// Disabled 示例：表单提交中
const [isSubmitting, setIsSubmitting] = useState(false);

<DynamicForm
  schema={schema}
  disabled={isSubmitting}  // 禁用模式，防止重复提交
  onSubmit={async (data) => {
    setIsSubmitting(true);
    await submitData(data);
    setIsSubmitting(false);
  }}
/>
```

**最佳实践**：
- ✅ 根据实际场景选择合适的属性
- ✅ 需要提交数据时使用 `readonly`
- ✅ 字段不适用或临时禁用时使用 `disabled`
- ❌ 避免同时使用两者（语义重复）

#### 5.3.3 布局方式配置 (layout)

`layout` 用于控制表单字段的布局方式，支持层级继承。

**配置方式**：

1. **全局配置**（通过 DynamicForm 组件属性）：
```typescript
<DynamicForm
  schema={schema}
  layout="horizontal"  // 全局默认布局
/>
```

2. **字段级配置**（通过 ui.layout）：
```json
{
  "type": "object",
  "ui": {
    "layout": "horizontal"
  },
  "properties": {
    "username": {
      "type": "string",
      "title": "用户名"
    }
  }
}
```

**优先级规则**：层级越深优先级越高
- 当前字段的 `ui.layout`（最高优先级）
- 父级字段的 `ui.layout`
- 全局 `DynamicFormProps.layout`（最低优先级）

**支持的值**：
- `vertical`：垂直布局（标签在上，输入框在下）
- `horizontal`：水平布局（标签在左，输入框在右）
- `inline`：内联布局

#### 5.3.4 标签宽度配置 (labelWidth)

`labelWidth` 用于控制表单标签的宽度，仅在 `layout="horizontal"` 时生效。

**配置方式**：

1. **全局配置**（通过 DynamicForm 组件属性）：
```typescript
<DynamicForm
  schema={schema}
  layout="horizontal"
  labelWidth={120}  // 全局默认标签宽度
/>
```

2. **字段级配置**（通过 ui.labelWidth）：
```json
{
  "type": "object",
  "properties": {
    "username": {
      "type": "string",
      "title": "用户名",
      "ui": {
        "labelWidth": 100
      }
    },
    "email": {
      "type": "string",
      "title": "电子邮箱地址",
      "ui": {
        "labelWidth": 150
      }
    }
  }
}
```

**优先级**：字段级 `ui.labelWidth` > 全局 `labelWidth`

**支持的值类型**：
- 数字：如 `120`（表示 120px）
- 字符串：如 `"120px"`、`"10rem"`、`"20%"`

#### 5.3.5 字段级 UI 配置

```json
{
  "properties": {
    "email": {
      "type": "string",
      "title": "Email",
      "ui": {
        "widget": "email",
        "placeholder": "Enter your email",
        "help": "We will never share your email",
        "className": "custom-email-field"
      }
    }
  }
}
```

#### 5.3.6 自定义错误信息

```json
{
  "properties": {
    "username": {
      "type": "string",
      "title": "Username",
      "minLength": 3,
      "maxLength": 20,
      "pattern": "^[a-zA-Z0-9_]+$",
      "ui": {
        "placeholder": "Enter username",
        "errorMessages": {
          "required": "Username is required",
          "minLength": "Username must be at least 3 characters",
          "maxLength": "Username cannot exceed 20 characters",
          "pattern": "Username can only contain letters, numbers and underscores"
        }
      }
    },
    "age": {
      "type": "integer",
      "title": "Age",
      "minimum": 18,
      "maximum": 100,
      "ui": {
        "errorMessages": {
          "required": "Please enter your age",
          "min": "You must be at least 18 years old",
          "max": "Age cannot exceed 100"
        }
      }
    }
  },
  "required": ["username", "age"]
}
```

#### 5.3.7 支持的 Widget 类型

| Widget 类型    | 适用字段类型   | 说明                                       |
| -------------- | -------------- | ------------------------------------------ |
| `text`         | string         | 单行文本输入                               |
| `textarea`     | string         | 多行文本输入                               |
| `password`     | string         | 密码输入                                   |
| `email`        | string         | 邮箱输入                                   |
| `url`          | string         | URL 输入                                   |
| `number`       | number/integer | 数字输入                                   |
| `range`        | number/integer | 滑块                                       |
| `select`       | string/number/array | 下拉选择（array 类型的默认 widget）   |
| `radio`        | string/number  | 单选按钮                                   |
| `checkboxes`   | array          | 多选框组（当 items.enum 存在时自动使用）   |
| `checkbox`     | boolean        | 单个复选框                                 |
| `switch`       | boolean        | 开关                                       |
| `date`         | string         | 日期选择                                   |
| `datetime`     | string         | 日期时间选择                               |
| `time`         | string         | 时间选择                                   |
| `color`        | string         | 颜色选择                                   |
| `file`         | string         | 文件上传                                   |
| `nested-form`  | object/array   | 嵌套表单（详见 NESTED_FORM.md）            |

> **注意**：
> - **array 类型字段的 widget 选择规则**：
>   - 如果 `items.enum` 存在 → 自动使用 `checkboxes`（多选框组）
>   - 如果 `items.type === 'object'` → 自动使用 `nested-form`（无需显式指定）
>   - 其他情况 → 默认使用 `select`（下拉选择）
> - **object 类型字段**自动使用 `nested-form` widget，无需显式指定
> - `nested-form` widget 用于渲染嵌套对象和对象数组，支持静态和动态 schema
> - 对象数组使用 `nested-form` 时，每个数组项都会渲染为独立的嵌套表单卡片

#### 5.3.8 字段路径透明化（Field Path Flattening）

> **详细文档**：完整的设计和实现请参考 [字段路径透明化设计文档](./FIELD_PATH_FLATTENING.md)

字段路径透明化用于解决深层嵌套参数显示冗余的问题。当后端接口参数嵌套较深时，可以通过配置跳过中间层级，直接展示目标字段。

**核心特点**：
- 设置了 `flattenPath: true` 的对象字段**不会渲染 Card 组件**，避免多余的边框和 padding
- 使用 `~~` 分隔符构建逻辑路径（如 `auth~~content~~key`）
- 提交时自动将扁平数据转换为嵌套结构

**配置属性**：

| 属性            | 类型      | 说明                                                      |
| --------------- | --------- | --------------------------------------------------------- |
| `flattenPath`   | `boolean` | 是否对该对象字段进行路径扁平化，跳过该层级直接展示子字段  |
| `flattenPrefix` | `boolean` | 是否在扁平化后的字段标签前添加当前字段的 `title` 作为前缀 |

**快速示例**：

```json
{
  "auth": {
    "type": "object",
    "title": "认证配置",
    "ui": { "flattenPath": true, "flattenPrefix": true },
    "properties": {
      "content": {
        "type": "object",
        "ui": { "flattenPath": true },
        "properties": {
          "key": { "type": "string", "title": "密钥" }
        }
      }
    }
  }
}
```

**效果**：表单显示 `认证配置 - 密钥`，提交数据 `{ auth: { content: { key: 'xxx' } } }`

更多使用场景、实现原理和最佳实践，请查看 [完整文档](./FIELD_PATH_FLATTENING.md)。

### 5.4 条件验证（Conditional Validation）

> **重要说明**：本节内容属于 **JSON Schema 标准的数据验证机制**，用于定义"在什么条件下，数据需要满足什么验证规则"。
>
> **这不是 UI 联动逻辑**！如果你需要实现字段的显示/隐藏、禁用/启用等 UI 行为，请参考 [UI 联动设计文档](./UI_LINKAGE_DESIGN.md)。

JSON Schema 提供了多种条件验证机制，主要分为两大类：

1. **dependencies（字段依赖）**：定义在 schema 根级别的 `dependencies` 属性中，用于表达字段之间的依赖验证关系
2. **逻辑组合（allOf/anyOf/oneOf/if-then-else）**：也定义在 schema 根级别，用于表达复杂的逻辑验证条件

**关键区别**：

- `dependencies` 是 JSON Schema 的专用属性，专门用于字段依赖验证场景
- `allOf/anyOf/oneOf` 是 JSON Schema 的逻辑组合关键字，可以组合多个验证 schema
- `if/then/else` 是 JSON Schema Draft-07+ 引入的条件验证逻辑关键字

**用途**：这些机制用于**数据验证**，确保提交的数据符合业务规则。

#### 5.4.1 使用 dependencies（字段依赖）

`dependencies` 用于表达"当某个字段存在或有特定值时，其他字段的约束条件"。

**简单依赖（数组形式）**：

```json
{
  "type": "object",
  "properties": {
    "creditCard": {
      "type": "string",
      "title": "信用卡号"
    },
    "billingAddress": {
      "type": "string",
      "title": "账单地址"
    }
  },
  "dependencies": {
    "creditCard": ["billingAddress"]
  }
}
```

**含义**：如果填写了 `creditCard`，则 `billingAddress` 变为必填。

**复杂依赖（Schema 依赖）**：

```json
{
  "type": "object",
  "properties": {
    "hasAddress": {
      "type": "boolean",
      "title": "是否填写地址"
    },
    "address": {
      "type": "string",
      "title": "详细地址"
    }
  },
  "dependencies": {
    "hasAddress": {
      "oneOf": [
        {
          "properties": {
            "hasAddress": { "const": true },
            "address": { "minLength": 1 }
          },
          "required": ["address"]
        }
      ]
    }
  }
}
```

**含义**：当 `hasAddress` 为 `true` 时，`address` 变为必填且至少1个字符。

**注意**：`dependencies` 中的 `oneOf` 是在依赖关系内部使用的，不是顶层的逻辑组合。

#### 5.4.2 使用 if/then/else (Draft-07+)

```json
{
  "type": "object",
  "properties": {
    "country": {
      "type": "string",
      "enum": ["china", "usa"]
    },
    "idCard": { "type": "string" },
    "ssn": { "type": "string" }
  },
  "if": {
    "properties": { "country": { "const": "china" } }
  },
  "then": {
    "required": ["idCard"]
  },
  "else": {
    "required": ["ssn"]
  }
}
```

#### 5.4.3 使用 allOf (所有条件都满足)

`allOf` 是顶层的逻辑组合关键字，用于组合多个 schema，要求数据同时满足所有子 schema。

**与 dependencies 的区别**：

- `dependencies` 关注的是"字段 A 存在时，字段 B 的约束"（字段间的依赖关系）
- `allOf` 关注的是"数据必须同时满足多个条件"（逻辑组合）

**使用场景**：当需要同时应用多个独立的条件规则时使用 `allOf`。

```json
{
  "type": "object",
  "properties": {
    "isStudent": {
      "type": "boolean",
      "title": "是否学生"
    },
    "age": {
      "type": "integer",
      "title": "年龄"
    },
    "studentId": {
      "type": "string",
      "title": "学号"
    },
    "school": {
      "type": "string",
      "title": "学校"
    },
    "guardianPhone": {
      "type": "string",
      "title": "监护人电话"
    }
  },
  "allOf": [
    {
      "if": {
        "properties": { "isStudent": { "const": true } }
      },
      "then": {
        "required": ["studentId", "school"]
      }
    },
    {
      "if": {
        "properties": { "age": { "maximum": 17 } }
      },
      "then": {
        "required": ["guardianPhone"]
      }
    }
  ]
}
```

**含义**：

1. 第一个条件：如果是学生，则学号和学校必填
2. 第二个条件：如果年龄小于18岁，则监护人电话必填
3. 这两个条件是**独立的**，可以同时生效（例如：17岁的学生需要填写学号、学校和监护人电话）

**对比 dependencies 的实现方式**：

```json
{
  "dependencies": {
    "isStudent": {
      "properties": { "isStudent": { "const": true } },
      "required": ["studentId", "school"]
    },
    "age": {
      "if": { "properties": { "age": { "maximum": 17 } } },
      "then": { "required": ["guardianPhone"] }
    }
  }
}
```

这种方式虽然也能实现，但语义上不如 `allOf` 清晰，因为这不是典型的"字段依赖"场景。

#### 5.4.4 使用 anyOf (任一条件满足)

`anyOf` 是顶层的逻辑组合关键字，要求数据至少满足其中一个子 schema。

**使用场景**：当需要"至少满足一个条件"时使用 `anyOf`，常用于"多选一"的验证场景。

```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "title": "邮箱",
      "format": "email"
    },
    "phone": {
      "type": "string",
      "title": "手机号"
    },
    "wechat": {
      "type": "string",
      "title": "微信号"
    }
  },
  "anyOf": [{ "required": ["email"] }, { "required": ["phone"] }, { "required": ["wechat"] }]
}
```

**含义**：用户必须至少填写邮箱、手机号、微信号中的一个。可以填写多个，但不能一个都不填。

**实际应用示例**：

```json
{
  "type": "object",
  "properties": {
    "contactMethod": {
      "type": "string",
      "title": "首选联系方式",
      "enum": ["email", "phone", "wechat"]
    },
    "email": { "type": "string", "title": "邮箱" },
    "phone": { "type": "string", "title": "手机号" },
    "wechat": { "type": "string", "title": "微信号" }
  },
  "anyOf": [{ "required": ["email"] }, { "required": ["phone"] }, { "required": ["wechat"] }],
  "if": {
    "properties": { "contactMethod": { "const": "email" } }
  },
  "then": {
    "required": ["email"]
  }
}
```

**含义**：至少填写一种联系方式，如果选择了邮箱作为首选，则邮箱必填。

#### 5.4.5 使用 oneOf (仅一个条件满足)

`oneOf` 是顶层的逻辑组合关键字，要求数据**有且仅有**一个子 schema 被满足。

**使用场景**：当需要"互斥选择"时使用 `oneOf`，确保只能选择一种情况。

**与 anyOf 的区别**：

- `anyOf`：至少满足一个（可以满足多个）
- `oneOf`：有且仅有一个（不能同时满足多个）

```json
{
  "type": "object",
  "properties": {
    "accountType": {
      "type": "string",
      "title": "账户类型",
      "enum": ["personal", "business"]
    },
    "idCard": {
      "type": "string",
      "title": "身份证号"
    },
    "businessLicense": {
      "type": "string",
      "title": "营业执照号"
    }
  },
  "oneOf": [
    {
      "properties": {
        "accountType": { "const": "personal" }
      },
      "required": ["idCard"]
    },
    {
      "properties": {
        "accountType": { "const": "business" }
      },
      "required": ["businessLicense"]
    }
  ]
}
```

**含义**：

- 如果是个人账户，必须填写身份证号（不能填写营业执照）
- 如果是企业账户，必须填写营业执照号（不能填写身份证）
- 不能同时满足两个条件

#### 5.4.6 嵌套条件判断

```json
{
  "type": "object",
  "properties": {
    "userType": {
      "type": "string",
      "title": "用户类型",
      "enum": ["individual", "company"]
    },
    "country": {
      "type": "string",
      "title": "国家",
      "enum": ["china", "usa", "other"]
    },
    "chinaIdCard": { "type": "string", "title": "中国身份证" },
    "usaSsn": { "type": "string", "title": "美国SSN" },
    "passport": { "type": "string", "title": "护照号" },
    "companyName": { "type": "string", "title": "公司名称" },
    "businessLicense": { "type": "string", "title": "营业执照" }
  },
  "if": {
    "properties": { "userType": { "const": "individual" } }
  },
  "then": {
    "allOf": [
      {
        "if": {
          "properties": { "country": { "const": "china" } }
        },
        "then": {
          "required": ["chinaIdCard"]
        }
      },
      {
        "if": {
          "properties": { "country": { "const": "usa" } }
        },
        "then": {
          "required": ["usaSsn"]
        }
      },
      {
        "if": {
          "properties": { "country": { "const": "other" } }
        },
        "then": {
          "required": ["passport"]
        }
      }
    ]
  },
  "else": {
    "required": ["companyName", "businessLicense"]
  }
}
```

#### 5.4.7 多字段联合判断

```json
{
  "type": "object",
  "properties": {
    "hasDiscount": {
      "type": "boolean",
      "title": "是否有优惠"
    },
    "discountType": {
      "type": "string",
      "title": "优惠类型",
      "enum": ["coupon", "points", "vip"]
    },
    "couponCode": { "type": "string", "title": "优惠券码" },
    "pointsAmount": { "type": "integer", "title": "积分数量" },
    "vipLevel": { "type": "string", "title": "VIP等级" }
  },
  "if": {
    "properties": {
      "hasDiscount": { "const": true }
    },
    "required": ["hasDiscount"]
  },
  "then": {
    "required": ["discountType"],
    "allOf": [
      {
        "if": {
          "properties": { "discountType": { "const": "coupon" } }
        },
        "then": {
          "required": ["couponCode"],
          "properties": {
            "couponCode": {
              "minLength": 6,
              "maxLength": 20
            }
          }
        }
      },
      {
        "if": {
          "properties": { "discountType": { "const": "points" } }
        },
        "then": {
          "required": ["pointsAmount"],
          "properties": {
            "pointsAmount": {
              "minimum": 100
            }
          }
        }
      },
      {
        "if": {
          "properties": { "discountType": { "const": "vip" } }
        },
        "then": {
          "required": ["vipLevel"]
        }
      }
    ]
  }
}
```

#### 5.4.8 条件渲染机制对比总结

| 机制             | 位置   | 语义               | 使用场景                        | 示例                               |
| ---------------- | ------ | ------------------ | ------------------------------- | ---------------------------------- |
| **dependencies** | 根级别 | 字段间依赖关系     | 当字段A存在/有值时，字段B的约束 | 填写信用卡时必须填写账单地址       |
| **if/then/else** | 根级别 | 条件分支           | 根据条件选择不同的验证规则      | 中国用户填身份证，美国用户填SSN    |
| **allOf**        | 根级别 | 逻辑与（全部满足） | 同时应用多个独立条件            | 学生要填学号，未成年要填监护人电话 |
| **anyOf**        | 根级别 | 逻辑或（至少一个） | 至少满足一个条件                | 至少填写邮箱、手机、微信之一       |
| **oneOf**        | 根级别 | 逻辑异或（仅一个） | 互斥选择，只能满足一个          | 个人账户或企业账户（二选一）       |

**选择建议**：

1. 简单的字段依赖 → 使用 `dependencies`
2. 条件分支逻辑 → 使用 `if/then/else`
3. 多个独立条件同时生效 → 使用 `allOf`
4. 至少满足一个条件 → 使用 `anyOf`
5. 互斥选择 → 使用 `oneOf`

### 5.5 自定义验证

#### 5.5.1 自定义格式验证

```json
{
  "type": "string",
  "format": "phone",
  "title": "手机号"
}
```

对应的验证器注册：

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

// 自定义手机号格式
ajv.addFormat('phone', {
  validate: (data: string) => /^1[3-9]\d{9}$/.test(data)
});

// 在 DynamicForm 中使用
<DynamicForm
  schema={schema}
  customFormats={{
    phone: (value: string) => /^1[3-9]\d{9}$/.test(value)
  }}
/>
```

#### 5.5.2 自定义关键字验证

```typescript
ajv.addKeyword({
  keyword: 'isAdult',
  validate: (schema: boolean, data: number) => {
    return schema ? data >= 18 : true;
  },
});
```

使用：

```json
{
  "type": "integer",
  "title": "年龄",
  "isAdult": true
}
```

#### 5.5.3 跨字段验证

```json
{
  "type": "object",
  "properties": {
    "password": {
      "type": "string",
      "title": "密码",
      "minLength": 6
    },
    "confirmPassword": {
      "type": "string",
      "title": "确认密码",
      "ui": {
        "widget": "password",
        "validation": {
          "function": "matchPassword",
          "dependencies": ["password"]
        }
      }
    }
  }
}
```

对应的验证函数：

```typescript
const customValidators = {
  matchPassword: (value: string, formData: any) => {
    if (value !== formData.password) {
      return '两次密码输入不一致';
    }
    return true;
  }
};

<DynamicForm
  schema={schema}
  customValidators={customValidators}
/>
```

---

## 6. UI 联动逻辑

> **重要提示**：本文档主要介绍 JSON Schema 的数据验证机制。
>
> 如果你需要实现 **UI 层面的字段联动**（如字段显示/隐藏、禁用/启用、值的自动计算等），请参考：
>
> **[UI 联动设计文档 (UI_LINKAGE_DESIGN.md)](./UI_LINKAGE_DESIGN.md)**
>
> 该文档详细介绍了如何通过 `ui.linkage` 扩展字段实现 UI 联动逻辑，并与 react-hook-form 深度集成。

---

**下一部分**: 组件架构设计
