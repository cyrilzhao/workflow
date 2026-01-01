# 动态表单组件技术方案 - Part 2

## JSON Schema 规范详解

> **标准 JSON Schema 规范**：关于 JSON Schema 的标准定义、基础类型、验证规则和条件验证机制，请参考 [JSON Schema 定义规范文档](./JSON_SCHEMA_DEFINITION.md)。
>
> 本文档主要介绍**项目特有的 UI 扩展规范**，包括 `ui` 字段的配置、Widget 类型、字段路径透明化等内容。

---

## 5. UI 扩展规范

### 5.1 基础类型的 UI 扩展

本节介绍各基础类型字段如何通过 `ui` 字段进行 UI 层面的扩展配置。

> **前置知识**：关于各基础类型的标准验证规则（如 `minLength`、`maximum`、`pattern` 等），请参考 [JSON Schema 定义规范 - 基础类型详解](./JSON_SCHEMA_DEFINITION.md#基础类型详解)。

#### 5.1.1 字符串类型的 UI 扩展

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

| 属性               | 类型                    | 说明                                      |
| ------------------ | ----------------------- | ----------------------------------------- |
| `addButtonText`    | `string`                | 添加按钮的文本                            |
| `arrayMode`        | `'dynamic' \| 'static'` | 渲染模式（dynamic: 可增删，static: 固定） |
| `showAddButton`    | `boolean`               | 是否显示添加按钮                          |
| `showRemoveButton` | `boolean`               | 是否显示删除按钮                          |

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

| 属性            | 类型                                     | 说明                                                                                          |
| --------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `widget`        | `string`                                 | 组件类型（text、select、radio 等）                                                            |
| `placeholder`   | `string`                                 | 占位符文本                                                                                    |
| `disabled`      | `boolean`                                | 是否禁用                                                                                      |
| `readonly`      | `boolean`                                | 是否只读                                                                                      |
| `hidden`        | `boolean`                                | 是否隐藏                                                                                      |
| `help`          | `string`                                 | 帮助文本                                                                                      |
| `className`     | `string`                                 | CSS 类名                                                                                      |
| `style`         | `React.CSSProperties`                    | 内联样式                                                                                      |
| `order`         | `string[]`                               | 字段顺序                                                                                      |
| `errorMessages` | `ErrorMessages`                          | 自定义错误信息                                                                                |
| `linkage`       | `LinkageConfig`                          | UI 联动配置（详见 [UI_LINKAGE_DESIGN.md](./UI_LINKAGE_DESIGN.md)）                            |
| `layout`        | `'vertical' \| 'horizontal' \| 'inline'` | 布局方式（优先级高于全局配置，层级越深优先级越高）                                            |
| `labelWidth`    | `number \| string`                       | 标签宽度（仅在 horizontal layout 下生效）                                                     |
| `flattenPath`   | `boolean`                                | 路径透明化：是否跳过该对象层级（详见 [FIELD_PATH_FLATTENING.md](./FIELD_PATH_FLATTENING.md)） |
| `flattenPrefix` | `boolean`                                | 路径透明化：是否添加当前字段 title 作为前缀                                                   |
| `schemaKey`     | `string`                                 | 动态嵌套表单：依赖字段（详见 [NESTED_FORM.md](./NESTED_FORM.md)）                             |
| `schemas`       | `Record<string, {...}>`                  | 动态嵌套表单：多个子表单 schema 片段                                                          |
| `schemaLoader`  | `Function`                               | 动态嵌套表单：异步加载 schema                                                                 |

> **完整类型定义**：详见 [PART3 - 组件架构设计](./DYNAMIC_FORM_PART3.md#核心类型定义)

**ErrorMessages 错误信息配置**：

| 属性        | 类型     | 说明             |
| ----------- | -------- | ---------------- |
| `required`  | `string` | 必填错误信息     |
| `minLength` | `string` | 最小长度错误信息 |
| `maxLength` | `string` | 最大长度错误信息 |
| `min`       | `string` | 最小值错误信息   |
| `max`       | `string` | 最大值错误信息   |
| `pattern`   | `string` | 格式错误信息     |

#### 5.3.2 Readonly vs Disabled 详解

`readonly` 和 `disabled` 是两个容易混淆但有重要区别的属性：

**核心区别对比表**：

| 特性                   | Readonly                        | Disabled              |
| ---------------------- | ------------------------------- | --------------------- |
| **值是否可修改**       | ❌ 不可修改                     | ❌ 不可修改           |
| **表单提交时是否包含** | ✅ 包含在表单数据中             | ❌ 不包含在表单数据中 |
| **是否可聚焦**         | ✅ 可以聚焦（可选中、复制）     | ❌ 不可聚焦           |
| **是否可交互**         | ✅ 部分交互（如滚动、选择文本） | ❌ 完全不可交互       |
| **视觉样式**           | 正常样式（可能有只读标识）      | 灰色/禁用样式         |
| **Tab 键导航**         | ✅ 可以通过 Tab 键访问          | ❌ 跳过该字段         |
| **语义含义**           | 数据只读，但有效                | 字段不可用/不适用     |

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

| Widget 类型   | 适用字段类型        | 说明                                     |
| ------------- | ------------------- | ---------------------------------------- |
| `text`        | string              | 单行文本输入                             |
| `textarea`    | string              | 多行文本输入                             |
| `password`    | string              | 密码输入                                 |
| `email`       | string              | 邮箱输入                                 |
| `url`         | string              | URL 输入                                 |
| `number`      | number/integer      | 数字输入                                 |
| `range`       | number/integer      | 滑块                                     |
| `select`      | string/number/array | 下拉选择（array 类型的默认 widget）      |
| `radio`       | string/number       | 单选按钮                                 |
| `checkboxes`  | array               | 多选框组（当 items.enum 存在时自动使用） |
| `checkbox`    | boolean             | 单个复选框                               |
| `switch`      | boolean             | 开关                                     |
| `date`        | string              | 日期选择                                 |
| `datetime`    | string              | 日期时间选择                             |
| `time`        | string              | 时间选择                                 |
| `color`       | string              | 颜色选择                                 |
| `file`        | string              | 文件上传                                 |
| `nested-form` | object/array        | 嵌套表单（详见 NESTED_FORM.md）          |

> **注意**：
>
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

##### 简单依赖（数组形式）- 仅支持必填校验

简单依赖使用数组形式，只能表达"当字段 A 有值时，数据提交时必须同时包含字段 B、C、D... 的值"。

> **注意**：这是**数据验证规则**，不是 UI 联动。字段不会在界面上动态显示/隐藏或改变状态，只是在提交时进行校验。

**示例 1：单个依赖字段**

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

**含义**：当 `creditCard` 有值时，提交数据时必须同时校验 `billingAddress` 的必填状态。

**示例 2：多个依赖字段**

```json
{
  "type": "object",
  "properties": {
    "enableNotification": {
      "type": "boolean",
      "title": "启用通知"
    },
    "email": {
      "type": "string",
      "title": "邮箱"
    },
    "phone": {
      "type": "string",
      "title": "手机号"
    }
  },
  "dependencies": {
    "enableNotification": ["email", "phone"]
  }
}
```

**含义**：当 `enableNotification` 有值时，提交数据必须同时包含 `email` 和 `phone` 的值。

**示例 3：多个字段的依赖关系**

```json
{
  "type": "object",
  "properties": {
    "firstName": { "type": "string", "title": "名" },
    "lastName": { "type": "string", "title": "姓" },
    "middleName": { "type": "string", "title": "中间名" }
  },
  "dependencies": {
    "firstName": ["lastName"],
    "lastName": ["firstName"]
  }
}
```

**含义**：`firstName` 和 `lastName` 互相依赖，提交时如果其中一个有值，另一个也必须有值。

##### 复杂依赖（Schema 依赖）- 支持任意验证规则

Schema 依赖使用对象形式，可以配置任意 JSON Schema 验证规则，包括必填、长度、格式、数值范围等。

> **注意**：这同样是**数据验证规则**，不会改变 UI 的显示状态。

**示例 1：基础 Schema 依赖 - 必填 + 长度校验**

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
            "address": { "minLength": 10, "maxLength": 200 }
          },
          "required": ["address"]
        }
      ]
    }
  }
}
```

**含义**：当 `hasAddress` 为 `true` 时，提交数据必须包含 `address` 且长度在 10-200 字符之间。

**示例 2：格式校验 - 支付方式依赖**

```json
{
  "type": "object",
  "properties": {
    "paymentMethod": {
      "type": "string",
      "title": "支付方式",
      "enum": ["credit_card", "bank_transfer", "alipay"]
    },
    "cardNumber": { "type": "string", "title": "信用卡号" },
    "bankAccount": { "type": "string", "title": "银行账号" },
    "alipayAccount": { "type": "string", "title": "支付宝账号" }
  },
  "dependencies": {
    "paymentMethod": {
      "oneOf": [
        {
          "properties": {
            "paymentMethod": { "const": "credit_card" },
            "cardNumber": {
              "pattern": "^[0-9]{16}$"
            }
          },
          "required": ["cardNumber"]
        },
        {
          "properties": {
            "paymentMethod": { "const": "bank_transfer" },
            "bankAccount": {
              "pattern": "^[0-9]{10,20}$"
            }
          },
          "required": ["bankAccount"]
        },
        {
          "properties": {
            "paymentMethod": { "const": "alipay" },
            "alipayAccount": {
              "format": "email"
            }
          },
          "required": ["alipayAccount"]
        }
      ]
    }
  }
}
```

**含义**：根据选择的支付方式，对应的账号字段必填且需满足特定格式要求。

> **生产环境建议**：信用卡号实际长度为 13-19 位，建议使用 Luhn 算法进行校验；银行账号格式因国家和银行而异，需根据实际业务调整。

**示例 3：数值范围校验 - 会员等级依赖**

```json
{
  "type": "object",
  "properties": {
    "membershipLevel": {
      "type": "string",
      "title": "会员等级",
      "enum": ["basic", "premium", "vip"]
    },
    "discountRate": {
      "type": "number",
      "title": "折扣率"
    }
  },
  "dependencies": {
    "membershipLevel": {
      "oneOf": [
        {
          "properties": {
            "membershipLevel": { "const": "basic" },
            "discountRate": {
              "minimum": 0.9,
              "maximum": 0.95
            }
          },
          "required": ["discountRate"]
        },
        {
          "properties": {
            "membershipLevel": { "const": "premium" },
            "discountRate": {
              "minimum": 0.8,
              "maximum": 0.9
            }
          },
          "required": ["discountRate"]
        },
        {
          "properties": {
            "membershipLevel": { "const": "vip" },
            "discountRate": {
              "minimum": 0.5,
              "maximum": 0.8
            }
          },
          "required": ["discountRate"]
        }
      ]
    }
  }
}
```

**含义**：根据会员等级，折扣率必须在对应的范围内（基础会员 90-95%，高级会员 80-90%，VIP 会员 50-80%）。

**示例 4：多字段联合校验 - 发票信息依赖**

```json
{
  "type": "object",
  "properties": {
    "needInvoice": {
      "type": "boolean",
      "title": "是否需要发票"
    },
    "invoiceType": {
      "type": "string",
      "title": "发票类型",
      "enum": ["personal", "company"]
    },
    "invoiceTitle": { "type": "string", "title": "发票抬头" },
    "taxNumber": { "type": "string", "title": "税号" }
  },
  "dependencies": {
    "needInvoice": {
      "oneOf": [
        {
          "properties": {
            "needInvoice": { "const": true },
            "invoiceTitle": { "minLength": 2, "maxLength": 100 }
          },
          "required": ["invoiceType", "invoiceTitle"]
        }
      ]
    },
    "invoiceType": {
      "oneOf": [
        {
          "properties": {
            "invoiceType": { "const": "company" },
            "taxNumber": {
              "pattern": "^[A-Z0-9]{15,20}$"
            }
          },
          "required": ["taxNumber"]
        }
      ]
    }
  }
}
```

**含义**：

- 当 `needInvoice` 为 `true` 时，必须填写发票类型和发票抬头（2-100字符）
- 当 `invoiceType` 为 `company` 时，必须填写税号（15-20位字母或数字）

**示例 5：嵌套对象校验 - 配送信息依赖**

```json
{
  "type": "object",
  "properties": {
    "deliveryMethod": {
      "type": "string",
      "title": "配送方式",
      "enum": ["express", "self_pickup"]
    },
    "shippingAddress": {
      "type": "object",
      "title": "配送地址",
      "properties": {
        "province": { "type": "string", "title": "省份" },
        "city": { "type": "string", "title": "城市" },
        "detail": { "type": "string", "title": "详细地址" }
      }
    },
    "pickupStore": { "type": "string", "title": "自提门店" }
  },
  "dependencies": {
    "deliveryMethod": {
      "oneOf": [
        {
          "properties": {
            "deliveryMethod": { "const": "express" },
            "shippingAddress": {
              "type": "object",
              "properties": {
                "province": { "minLength": 2 },
                "city": { "minLength": 2 },
                "detail": { "minLength": 5, "maxLength": 200 }
              },
              "required": ["province", "city", "detail"]
            }
          },
          "required": ["shippingAddress"]
        },
        {
          "properties": {
            "deliveryMethod": { "const": "self_pickup" },
            "pickupStore": {
              "minLength": 1
            }
          },
          "required": ["pickupStore"]
        }
      ]
    }
  }
}
```

**含义**：

- 当选择快递配送时，必须填写完整的配送地址（省份、城市至少2字符，详细地址5-200字符）
- 当选择自提时，必须选择自提门店

##### Schema 依赖的结构解析

为了更好地理解 Schema 依赖的工作原理，我们以示例 1 为例进行详细解析：

**整体结构**：

```json
"dependencies": {
  "hasAddress": {  // ← 第一层：触发字段
    "oneOf": [     // ← 第二层：逻辑组合
      {            // ← 第三层：具体的校验规则
        "properties": { ... },
        "required": [ ... ]
      }
    ]
  }
}
```

**第一层：触发字段**

```json
"dependencies": {
  "hasAddress": { ... }
}
```

**含义**：当表单数据中存在 `hasAddress` 字段（无论值是什么）时，就会触发内部的校验规则。

**第二层：oneOf 逻辑组合**

```json
"hasAddress": {
  "oneOf": [ ... ]
}
```

**含义**：表单数据必须**有且仅有一个** `oneOf` 数组中的 schema 被满足。

> **为什么需要 oneOf？**
>
> - 在示例 1 中，`oneOf` 数组只有一个元素，看起来有点多余
> - 但这是为了处理"当 `hasAddress` 为 `true` 时才校验"的场景
> - 如果 `hasAddress` 为 `false` 或不存在，这个 schema 就不会被满足，校验会通过
> - 如果不使用 `oneOf`，只要 `hasAddress` 字段存在（无论值是什么），校验规则都会生效

**第三层：具体的校验规则**

```json
{
  "properties": {
    "hasAddress": { "const": true },
    "address": { "minLength": 10, "maxLength": 200 }
  },
  "required": ["address"]
}
```

这是一个完整的 JSON Schema 对象，包含两个部分：

**1. `properties` - 字段约束**

```json
"properties": {
  "hasAddress": { "const": true },  // ← 触发条件
  "address": {
    "minLength": 10,                // ← 验证规则
    "maxLength": 200
  }
}
```

- `hasAddress: { "const": true }` - 这是**触发条件**，只有当 `hasAddress` 的值为 `true` 时，这个 schema 才会被满足
- `address: { "minLength": 10, "maxLength": 200 }` - 这是**验证规则**，对 `address` 字段的长度进行约束

**2. `required` - 必填字段**

```json
"required": ["address"]
```

当这个 schema 生效时（即 `hasAddress` 为 `true`），`address` 字段必须存在且有值。

**完整的校验逻辑**

下表展示了不同情况下的校验结果：

| hasAddress 值 | address 值              | 校验结果 | 原因                                 |
| ------------- | ----------------------- | -------- | ------------------------------------ |
| `true`        | 未填写                  | ❌ 失败  | `required: ["address"]` 要求必填     |
| `true`        | `"abc"` (3字符)         | ❌ 失败  | 不满足 `minLength: 10`               |
| `true`        | `"1234567890"` (10字符) | ✅ 通过  | 满足所有条件                         |
| `true`        | `"abc..."` (201字符)    | ❌ 失败  | 超过 `maxLength: 200`                |
| `false`       | 未填写                  | ✅ 通过  | `hasAddress` 不为 `true`，依赖不生效 |
| `false`       | `"abc"`                 | ✅ 通过  | `hasAddress` 不为 `true`，依赖不生效 |
| 未填写        | 未填写                  | ✅ 通过  | `hasAddress` 不存在，依赖不生效      |

##### Schema 依赖的关键要点

1. **触发字段**：`dependencies` 的键（如 `hasAddress`）是触发字段，当该字段存在时触发校验
2. **oneOf 的作用**：用于实现"只在特定值时生效"的逻辑，配合 `const` 实现条件判断
3. **properties 中的 const**：定义触发条件（如 `hasAddress: { "const": true }`）
4. **properties 中的其他字段**：定义验证规则（如长度、格式、范围等）
5. **required 数组**：定义在条件满足时哪些字段必填
6. **验证规则合并**：`dependencies` 中的验证规则会与基础 schema 定义合并
7. **多层级依赖**：可以同时定义多个字段的依赖关系，它们会独立生效
8. **嵌套对象支持**：可以对嵌套对象的内部字段进行校验

**适用场景**：这种模式非常适合"当某个开关字段为特定值时，其他字段才需要校验"的场景。

#### 5.4.2 使用 if/then/else (Draft-07+)

`if/then/else` 是 JSON Schema Draft-07+ 引入的条件验证关键字，提供了更清晰的条件分支语义。

**示例 1：基础条件分支 - 必填校验**

```json
{
  "type": "object",
  "properties": {
    "country": {
      "type": "string",
      "enum": ["china", "usa"]
    },
    "idCard": { "type": "string", "title": "身份证号" },
    "ssn": { "type": "string", "title": "社会安全号" }
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

**含义**：如果国家是中国，身份证号必填；否则社会安全号必填。

**示例 2：格式校验 - 根据年龄段校验手机号格式**

```json
{
  "type": "object",
  "properties": {
    "ageGroup": {
      "type": "string",
      "title": "年龄段",
      "enum": ["child", "adult"]
    },
    "phone": {
      "type": "string",
      "title": "联系电话"
    }
  },
  "if": {
    "properties": { "ageGroup": { "const": "child" } }
  },
  "then": {
    "properties": {
      "phone": {
        "pattern": "^1[3-9]\\d{9}$",
        "description": "儿童需填写监护人手机号"
      }
    },
    "required": ["phone"]
  },
  "else": {
    "properties": {
      "phone": {
        "pattern": "^(1[3-9]\\d{9}|\\d{3,4}-\\d{7,8})$",
        "description": "成人可填写手机号或座机号"
      }
    }
  }
}
```

**含义**：儿童必须填写监护人手机号（11位），成人可以填写手机号或座机号。

**示例 3：数值范围校验 - 根据会员类型限制购买数量**

```json
{
  "type": "object",
  "properties": {
    "memberType": {
      "type": "string",
      "title": "会员类型",
      "enum": ["regular", "vip"]
    },
    "quantity": {
      "type": "integer",
      "title": "购买数量"
    }
  },
  "if": {
    "properties": { "memberType": { "const": "vip" } }
  },
  "then": {
    "properties": {
      "quantity": {
        "minimum": 1,
        "maximum": 100
      }
    }
  },
  "else": {
    "properties": {
      "quantity": {
        "minimum": 1,
        "maximum": 10
      }
    }
  }
}
```

**含义**：VIP 会员可购买 1-100 件，普通会员只能购买 1-10 件。

**示例 4：枚举值限制 - 根据用户角色限制可选操作**

```json
{
  "type": "object",
  "properties": {
    "userRole": {
      "type": "string",
      "title": "用户角色",
      "enum": ["admin", "editor", "viewer"]
    },
    "operation": {
      "type": "string",
      "title": "操作类型"
    }
  },
  "if": {
    "properties": { "userRole": { "const": "admin" } }
  },
  "then": {
    "properties": {
      "operation": {
        "enum": ["create", "edit", "delete", "view"]
      }
    }
  },
  "else": {
    "if": {
      "properties": { "userRole": { "const": "editor" } }
    },
    "then": {
      "properties": {
        "operation": {
          "enum": ["create", "edit", "view"]
        }
      }
    },
    "else": {
      "properties": {
        "operation": {
          "enum": ["view"]
        }
      }
    }
  }
}
```

**含义**：根据用户角色限制可选操作（管理员可执行所有操作，编辑者可创建/编辑/查看，查看者只能查看）。

#### 5.4.3 使用 allOf (所有条件都满足)

`allOf` 是顶层的逻辑组合关键字，用于组合多个 schema，要求数据同时满足所有子 schema。

**与 dependencies 的区别**：

- `dependencies` 关注的是"字段 A 存在时，字段 B 的约束"（字段间的依赖关系）
- `allOf` 关注的是"数据必须同时满足多个条件"（逻辑组合）

**使用场景**：当需要同时应用多个独立的条件规则时使用 `allOf`。

**示例 1：多条件必填校验**

```json
{
  "type": "object",
  "properties": {
    "isStudent": { "type": "boolean", "title": "是否学生" },
    "age": { "type": "integer", "title": "年龄" },
    "studentId": { "type": "string", "title": "学号" },
    "school": { "type": "string", "title": "学校" },
    "guardianPhone": { "type": "string", "title": "监护人电话" }
  },
  "allOf": [
    {
      "if": { "properties": { "isStudent": { "const": true } } },
      "then": { "required": ["studentId", "school"] }
    },
    {
      "if": { "properties": { "age": { "maximum": 17 } } },
      "then": { "required": ["guardianPhone"] }
    }
  ]
}
```

**含义**：

1. 如果是学生，学号和学校必填
2. 如果年龄小于18岁，监护人电话必填
3. 这两个条件**独立生效**（17岁的学生需要填写学号、学校和监护人电话）

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

**示例 2：多条件格式和范围校验**

```json
{
  "type": "object",
  "properties": {
    "hasPromotion": { "type": "boolean", "title": "是否参与促销" },
    "productType": { "type": "string", "title": "商品类型", "enum": ["digital", "physical"] },
    "promoCode": { "type": "string", "title": "促销码" },
    "shippingAddress": { "type": "string", "title": "配送地址" },
    "price": { "type": "number", "title": "价格" }
  },
  "allOf": [
    {
      "if": { "properties": { "hasPromotion": { "const": true } } },
      "then": {
        "required": ["promoCode"],
        "properties": {
          "promoCode": { "pattern": "^[A-Z0-9]{8}$" }
        }
      }
    },
    {
      "if": { "properties": { "productType": { "const": "physical" } } },
      "then": {
        "required": ["shippingAddress"],
        "properties": {
          "shippingAddress": { "minLength": 10 }
        }
      }
    },
    {
      "properties": {
        "price": { "minimum": 0.01, "maximum": 99999 }
      }
    }
  ]
}
```

**含义**：

1. 如果参与促销，必须填写8位促销码（大写字母或数字）
2. 如果是实体商品，必须填写配送地址（至少10字符）
3. 价格必须在 0.01-99999 之间（这是无条件的约束）

**示例 3：数组长度限制 - 根据多个条件限制数组大小**

```json
{
  "type": "object",
  "properties": {
    "isPremium": { "type": "boolean", "title": "是否高级用户" },
    "hasStorage": { "type": "boolean", "title": "是否购买存储空间" },
    "attachments": {
      "type": "array",
      "title": "附件列表",
      "items": { "type": "string" }
    }
  },
  "allOf": [
    {
      "if": { "properties": { "isPremium": { "const": true } } },
      "then": {
        "properties": {
          "attachments": { "maxItems": 50 }
        }
      },
      "else": {
        "properties": {
          "attachments": { "maxItems": 5 }
        }
      }
    },
    {
      "if": { "properties": { "hasStorage": { "const": true } } },
      "then": {
        "properties": {
          "attachments": {
            "items": { "maxLength": 10485760 }
          }
        }
      },
      "else": {
        "properties": {
          "attachments": {
            "items": { "maxLength": 1048576 }
          }
        }
      }
    }
  ]
}
```

**含义**：

1. 高级用户最多上传 50 个附件，普通用户最多 5 个
2. 购买存储空间的用户每个文件最大 10MB，否则最大 1MB
3. 这两个条件独立生效

#### 5.4.4 使用 anyOf (任一条件满足)

`anyOf` 是顶层的逻辑组合关键字，要求数据至少满足其中一个子 schema。

**使用场景**：当需要"至少满足一个条件"时使用 `anyOf`，常用于"多选一"的验证场景。

**示例 1：基础必填校验 - 至少填写一种联系方式**

```json
{
  "type": "object",
  "properties": {
    "email": { "type": "string", "title": "邮箱", "format": "email" },
    "phone": { "type": "string", "title": "手机号" },
    "wechat": { "type": "string", "title": "微信号" }
  },
  "anyOf": [{ "required": ["email"] }, { "required": ["phone"] }, { "required": ["wechat"] }]
}
```

**含义**：用户必须至少填写邮箱、手机号、微信号中的一个。可以填写多个，但不能一个都不填。

**示例 2：格式校验 - 至少提供一种有效的身份证明**

```json
{
  "type": "object",
  "properties": {
    "idCard": { "type": "string", "title": "身份证号" },
    "passport": { "type": "string", "title": "护照号" },
    "driverLicense": { "type": "string", "title": "驾驶证号" }
  },
  "anyOf": [
    {
      "properties": {
        "idCard": { "pattern": "^[1-9]\\d{17}$" }
      },
      "required": ["idCard"]
    },
    {
      "properties": {
        "passport": { "pattern": "^[A-Z]\\d{8}$" }
      },
      "required": ["passport"]
    },
    {
      "properties": {
        "driverLicense": { "pattern": "^\\d{12}$" }
      },
      "required": ["driverLicense"]
    }
  ]
}
```

**含义**：至少提供一种有效的身份证明，且必须符合对应的格式要求（身份证18位、护照1字母+8数字、驾驶证12位数字）。

**示例 3：数值范围校验 - 至少满足一种折扣条件**

```json
{
  "type": "object",
  "properties": {
    "totalAmount": { "type": "number", "title": "订单总额" },
    "itemCount": { "type": "integer", "title": "商品数量" },
    "memberYears": { "type": "integer", "title": "会员年限" }
  },
  "anyOf": [
    {
      "properties": {
        "totalAmount": { "minimum": 1000 }
      }
    },
    {
      "properties": {
        "itemCount": { "minimum": 10 }
      }
    },
    {
      "properties": {
        "memberYears": { "minimum": 3 }
      }
    }
  ]
}
```

**含义**：至少满足一个条件才能享受折扣（订单总额≥1000 或 商品数量≥10 或 会员年限≥3年）。

#### 5.4.5 使用 oneOf (仅一个条件满足)

`oneOf` 是顶层的逻辑组合关键字，要求数据**有且仅有**一个子 schema 被满足。

**使用场景**：当需要"互斥选择"时使用 `oneOf`，确保只能选择一种情况。

**与 anyOf 的区别**：

- `anyOf`：至少满足一个（可以满足多个）
- `oneOf`：有且仅有一个（不能同时满足多个）

**示例 1：基础互斥选择 - 账户类型**

```json
{
  "type": "object",
  "properties": {
    "accountType": { "type": "string", "title": "账户类型", "enum": ["personal", "business"] },
    "idCard": { "type": "string", "title": "身份证号" },
    "businessLicense": { "type": "string", "title": "营业执照号" }
  },
  "oneOf": [
    {
      "properties": { "accountType": { "const": "personal" } },
      "required": ["idCard"]
    },
    {
      "properties": { "accountType": { "const": "business" } },
      "required": ["businessLicense"]
    }
  ]
}
```

**含义**：

- 如果是个人账户，必须填写身份证号（不能填写营业执照）
- 如果是企业账户，必须填写营业执照号（不能填写身份证）
- 不能同时满足两个条件

**示例 2：格式校验 - 支付方式互斥选择**

```json
{
  "type": "object",
  "properties": {
    "paymentType": { "type": "string", "title": "支付类型", "enum": ["card", "bank", "wallet"] },
    "cardNumber": { "type": "string", "title": "银行卡号" },
    "bankAccount": { "type": "string", "title": "银行账号" },
    "walletId": { "type": "string", "title": "钱包ID" }
  },
  "oneOf": [
    {
      "properties": {
        "paymentType": { "const": "card" },
        "cardNumber": { "pattern": "^[0-9]{16,19}$" }
      },
      "required": ["cardNumber"]
    },
    {
      "properties": {
        "paymentType": { "const": "bank" },
        "bankAccount": { "pattern": "^[0-9]{10,20}$" }
      },
      "required": ["bankAccount"]
    },
    {
      "properties": {
        "paymentType": { "const": "wallet" },
        "walletId": { "minLength": 8, "maxLength": 32 }
      },
      "required": ["walletId"]
    }
  ]
}
```

**含义**：根据支付类型，只能填写对应的支付账号，且必须符合格式要求。不能同时填写多种支付方式。

**示例 3：对象属性互斥 - 配送方式的互斥约束**

```json
{
  "type": "object",
  "properties": {
    "deliveryType": { "type": "string", "enum": ["express", "pickup", "digital"] },
    "address": {
      "type": "object",
      "properties": { "city": { "type": "string" }, "street": { "type": "string" } }
    },
    "storeId": { "type": "string" },
    "email": { "type": "string" }
  },
  "oneOf": [
    {
      "properties": {
        "deliveryType": { "const": "express" },
        "address": {
          "required": ["city", "street"],
          "properties": {
            "city": { "minLength": 2 },
            "street": { "minLength": 5 }
          }
        }
      },
      "required": ["address"]
    },
    {
      "properties": {
        "deliveryType": { "const": "pickup" },
        "storeId": { "pattern": "^STORE-\\d{4}$" }
      },
      "required": ["storeId"]
    },
    {
      "properties": {
        "deliveryType": { "const": "digital" },
        "email": { "format": "email" }
      },
      "required": ["email"]
    }
  ]
}
```

**含义**：根据配送方式，只能填写对应的信息（快递需地址、自提需门店ID、数字商品需邮箱），且格式必须正确。

#### 5.4.6 嵌套条件判断

嵌套条件判断用于处理多层级的条件逻辑，适用于"先判断 A，再根据 A 的值判断 B"的场景。

**示例 1：基础嵌套必填校验 - 用户类型和国家**

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

**含义**：

- 如果是个人用户，根据国家填写对应证件（中国填身份证、美国填SSN、其他填护照）
- 如果是企业用户，必须填写公司名称和营业执照

**示例 2：嵌套格式和范围校验 - 产品类型和规格**

```json
{
  "type": "object",
  "properties": {
    "productType": { "type": "string", "enum": ["physical", "digital"] },
    "category": { "type": "string", "enum": ["book", "software", "music"] },
    "weight": { "type": "number" },
    "fileSize": { "type": "number" },
    "pages": { "type": "integer" },
    "version": { "type": "string" },
    "duration": { "type": "integer" }
  },
  "if": {
    "properties": { "productType": { "const": "physical" } }
  },
  "then": {
    "if": {
      "properties": { "category": { "const": "book" } }
    },
    "then": {
      "properties": {
        "weight": { "minimum": 0.1, "maximum": 5 },
        "pages": { "minimum": 10, "maximum": 2000 }
      }
    }
  },
  "else": {
    "allOf": [
      {
        "if": { "properties": { "category": { "const": "software" } } },
        "then": {
          "properties": {
            "fileSize": { "minimum": 1, "maximum": 10240 },
            "version": { "pattern": "^\\d+\\.\\d+\\.\\d+$" }
          }
        }
      },
      {
        "if": { "properties": { "category": { "const": "music" } } },
        "then": {
          "properties": {
            "fileSize": { "minimum": 1, "maximum": 500 },
            "duration": { "minimum": 30, "maximum": 3600 }
          }
        }
      }
    ]
  }
}
```

**含义**：

- 实体商品：书籍需校验重量（0.1-5kg）和页数（10-2000页）
- 数字商品：软件需校验文件大小（1-10240MB）和版本号格式，音乐需校验文件大小（1-500MB）和时长（30-3600秒）

#### 5.4.7 多字段联合判断

多字段联合判断用于处理"先判断开关字段，再根据类型字段应用不同的验证规则"的复杂场景。

**示例 1：优惠信息的多层级校验**

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

**含义**：

- 如果启用优惠（`hasDiscount` 为 `true`），必须选择优惠类型
- 根据优惠类型应用不同的验证规则：
  - 优惠券：必填优惠券码（6-20字符）
  - 积分：必填积分数量（至少100）
  - VIP：必填VIP等级

**示例 2：订阅配置的多层级格式和枚举校验**

```json
{
  "type": "object",
  "properties": {
    "enableSubscription": { "type": "boolean", "title": "启用订阅" },
    "subscriptionType": {
      "type": "string",
      "title": "订阅类型",
      "enum": ["monthly", "yearly", "lifetime"]
    },
    "billingCycle": { "type": "integer", "title": "账单周期（天）" },
    "autoRenew": { "type": "boolean", "title": "自动续费" },
    "paymentMethod": { "type": "string", "title": "支付方式" }
  },
  "if": {
    "properties": { "enableSubscription": { "const": true } }
  },
  "then": {
    "required": ["subscriptionType"],
    "allOf": [
      {
        "if": { "properties": { "subscriptionType": { "const": "monthly" } } },
        "then": {
          "properties": {
            "billingCycle": { "const": 30 },
            "paymentMethod": { "enum": ["credit_card", "paypal", "alipay"] }
          }
        }
      },
      {
        "if": { "properties": { "subscriptionType": { "const": "yearly" } } },
        "then": {
          "properties": {
            "billingCycle": { "const": 365 },
            "paymentMethod": { "enum": ["credit_card", "paypal", "bank_transfer"] }
          }
        }
      },
      {
        "if": { "properties": { "subscriptionType": { "const": "lifetime" } } },
        "then": {
          "properties": {
            "autoRenew": { "const": false },
            "paymentMethod": { "enum": ["credit_card", "bank_transfer"] }
          }
        }
      }
    ]
  }
}
```

**含义**：

- 如果启用订阅，必须选择订阅类型
- 根据订阅类型应用不同的约束：
  - 月度订阅：账单周期固定为30天，支持信用卡/PayPal/支付宝
  - 年度订阅：账单周期固定为365天，支持信用卡/PayPal/银行转账
  - 终身订阅：自动续费必须为false，仅支持信用卡/银行转账

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

#### 5.4.9 最佳实践和注意事项

**1. 数据验证 vs UI 联动**

> **重要**：本章节所有示例都是**数据验证规则**，不是 UI 联动逻辑。
>
> - ✅ 验证规则：在表单提交时校验数据是否符合要求
> - ❌ UI 联动：字段不会根据条件自动显示/隐藏或改变状态
> - 如需 UI 联动，请参考第 6 章"UI Schema 配置"

**2. 正则表达式转义**

在 JSON 中使用正则表达式时，需要双重转义反斜杠：

```json
{
  "pattern": "^\\d{3}-\\d{4}$" // JSON 中需要 \\d，实际正则为 \d
}
```

**3. 格式校验的局限性**

示例中的格式校验（如信用卡号、手机号）仅用于演示，生产环境建议：

- 信用卡号：使用 Luhn 算法校验
- 手机号：根据国家/地区使用不同的正则
- 邮箱：使用 `format: "email"` 而非自定义正则
- 身份证号：需要校验校验位算法

**4. 条件验证的性能考虑**

复杂的嵌套条件会影响验证性能，建议：

- 避免过深的嵌套（建议不超过 3 层）
- 优先使用简单的 `dependencies` 而非复杂的 `if/then/else`
- 对于复杂业务逻辑，考虑在后端进行验证

**5. 错误提示的友好性**

JSON Schema 的默认错误提示可能不够友好，建议：

- 使用 `description` 字段提供字段说明
- 使用 `errorMessage` 扩展（如 ajv-errors）自定义错误提示
- 在 UI Schema 中配置更友好的错误信息

**6. 常见陷阱**

- ❌ **错误**：在 `dependencies` 中使用 `if` 判断字段是否存在

  ```json
  "dependencies": {
    "field": {
      "if": { "required": ["field"] }  // 错误：dependencies 已经隐含了字段存在
    }
  }
  ```

- ✅ **正确**：直接使用 `const` 判断字段值
  ```json
  "dependencies": {
    "field": {
      "oneOf": [
        { "properties": { "field": { "const": true } } }
      ]
    }
  }
  ```

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
