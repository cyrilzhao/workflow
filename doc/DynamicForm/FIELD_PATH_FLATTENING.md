# 字段路径透明化设计方案

## 1. 概述

字段路径透明化（Field Path Flattening）是一个用于解决深层嵌套参数显示冗余问题的特性。当后端接口参数嵌套较深时（如 `{auth: {content: {key: ''}}}`），用户可能只需要填写最内层的 `key` 字段，但如果按照标准的嵌套表单方式展示所有层级会显得过于冗余，并且会产生多余的 Card 边框和 padding。

通过在 `ui` 配置中添加 `flattenPath` 属性，DynamicForm 可以在渲染时跳过中间层级，直接展示目标字段，但在数据提交时自动构建完整的嵌套结构。

**核心特点**：
- 设置了 `flattenPath: true` 的对象字段不会渲染成 NestedFormWidget 和 Card 组件
- 这些中间层级在 UI 上完全"消失"，只保留最终的叶子节点字段
- 数据在表单内部使用扁平路径（如 `auth.content.key`），提交时自动转换为嵌套结构

---

## 2. 应用场景

### 2.1 场景 1：深层嵌套的 API 配置

```typescript
// 后端接口要求的数据结构
{
  auth: {
    content: {
      key: 'api-key-123'
    }
  }
}

// 用户实际只需要填写 key 字段
// 使用路径透明化后，表单只显示一个 "API Key" 输入框
```

### 2.2 场景 2：复杂的配置对象

```typescript
// 后端接口要求的数据结构
{
  service: {
    database: {
      connection: {
        host: 'localhost',
        port: 3306,
        username: 'admin',
        password: 'secret'
      }
    }
  }
}

// 使用路径透明化后，表单直接显示：
// - 数据库 - 主机地址
// - 数据库 - 端口
// - 数据库 - 用户名
// - 数据库 - 密码
```

---

## 3. 核心特性

1. **自动跳过中间层级**：设置了 `flattenPath: true` 的对象字段不会渲染成 NestedFormWidget 和 Card 组件
2. **自动路径映射**：表单字段使用完整路径（如 `auth.content.key`）作为字段名
3. **数据自动转换**：提交时自动将扁平数据转换为嵌套结构
4. **可选前缀**：支持在字段标签前添加父级标题作为前缀
5. **向后兼容**：不影响现有的嵌套表单功能
6. **验证保留**：保留原有的验证规则，路径自动映射

---

## 4. 类型定义

### 4.1 扩展的 UIConfig 类型

```typescript
// src/types/schema.ts

export interface UIConfig {
  widget?: WidgetType;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  help?: string;
  className?: string;
  style?: React.CSSProperties;
  order?: string[];
  errorMessages?: ErrorMessages;
  linkage?: LinkageConfig;

  // 路径透明化配置
  flattenPath?: boolean;        // 是否对该对象字段进行路径扁平化
  flattenPrefix?: boolean;      // 是否在扁平化后的字段标签前添加当前字段的 title

  [key: string]: any;
}
```

### 4.2 配置说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `flattenPath` | `boolean` | `false` | 是否对该对象字段进行路径扁平化。设置为 `true` 时，该对象的子字段会被提升到父级显示 |
| `flattenPrefix` | `boolean` | `false` | 是否在扁平化后的字段标签前添加当前字段的 `title`。设置为 `true` 时，会自动使用当前字段的 `title` 作为前缀 |

---

## 5. Schema 配置示例

### 5.1 基础用法：不带前缀的透明化

```json
{
  "type": "object",
  "properties": {
    "auth": {
      "type": "object",
      "title": "认证信息",
      "ui": {
        "flattenPath": true
      },
      "properties": {
        "content": {
          "type": "object",
          "ui": {
            "flattenPath": true
          },
          "properties": {
            "key": {
              "type": "string",
              "title": "API Key",
              "minLength": 10
            }
          }
        }
      }
    }
  }
}
```

**渲染效果**：
- 表单只显示一个字段：`API Key`
- 用户输入：`abc123456789`
- 提交数据：`{ auth: { content: { key: 'abc123456789' } } }`

### 5.2 带前缀的透明化

```json
{
  "type": "object",
  "properties": {
    "auth": {
      "type": "object",
      "title": "认证配置",
      "ui": {
        "flattenPath": true,
        "flattenPrefix": true
      },
      "properties": {
        "content": {
          "type": "object",
          "ui": {
            "flattenPath": true
          },
          "properties": {
            "key": {
              "type": "string",
              "title": "密钥"
            },
            "secret": {
              "type": "string",
              "title": "密文",
              "ui": {
                "widget": "password"
              }
            }
          }
        }
      }
    }
  }
}
```

**渲染效果**：
- 表单显示：
  - `认证配置 - 密钥`
  - `认证配置 - 密文`
- 提交数据：`{ auth: { content: { key: '...', secret: '...' } } }`

### 5.3 多层前缀叠加

```json
{
  "type": "object",
  "properties": {
    "service": {
      "type": "object",
      "title": "服务",
      "ui": {
        "flattenPath": true,
        "flattenPrefix": true
      },
      "properties": {
        "auth": {
          "type": "object",
          "title": "认证",
          "ui": {
            "flattenPath": true,
            "flattenPrefix": true
          },
          "properties": {
            "credentials": {
              "type": "object",
              "ui": {
                "flattenPath": true
              },
              "properties": {
                "username": {
                  "type": "string",
                  "title": "用户名"
                },
                "password": {
                  "type": "string",
                  "title": "密码",
                  "ui": { "widget": "password" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**渲染效果**：
- 表单显示：
  - `服务 - 认证 - 用户名`
  - `服务 - 认证 - 密码`
- 提交数据：`{ service: { auth: { credentials: { username: 'admin', password: '***' } } } }`

### 5.4 混合使用：部分透明化 + 部分正常嵌套

```json
{
  "type": "object",
  "properties": {
    "basicInfo": {
      "type": "object",
      "title": "基本信息",
      "properties": {
        "name": { "type": "string", "title": "名称" },
        "description": { "type": "string", "title": "描述" }
      }
    },
    "advancedConfig": {
      "type": "object",
      "title": "高级配置",
      "ui": {
        "flattenPath": true,
        "flattenPrefix": true
      },
      "properties": {
        "performance": {
          "type": "object",
          "ui": {
            "flattenPath": true
          },
          "properties": {
            "timeout": {
              "type": "integer",
              "title": "超时时间"
            },
            "retries": {
              "type": "integer",
              "title": "重试次数"
            }
          }
        }
      }
    }
  }
}
```

**渲染效果**：
```
基本信息（嵌套表单）
  ├─ 名称
  └─ 描述
高级配置 - 超时时间
高级配置 - 重试次数
```

---

## 6. 实现方案

### 6.1 核心实现原理

路径透明化的核心实现分为三个部分：

1. **Schema 解析阶段**（SchemaParser）：
   - 检测到 `flattenPath: true` 时，跳过该对象字段，直接递归解析其子字段
   - 使用完整路径作为字段名（如 `auth.content.key`）
   - 支持 `flattenPrefix` 来添加标签前缀

2. **数据转换阶段**（PathTransformer）：
   - 初始化时：将嵌套的 `defaultValues` 转换为扁平格式
   - 提交时：将扁平数据转换回嵌套结构

3. **表单渲染阶段**（DynamicForm）：
   - 只渲染解析后的字段配置
   - 设置了 `flattenPath: true` 的对象字段不会生成 NestedFormWidget

### 6.2 SchemaParser 实现

```typescript
// src/components/DynamicForm/core/SchemaParser.ts

export class SchemaParser {
  /**
   * 检查 schema 中是否使用了路径扁平化
   */
  static hasFlattenPath(schema: ExtendedJSONSchema): boolean {
    if (schema.type !== 'object' || !schema.properties) {
      return false;
    }

    const properties = schema.properties;

    for (const key of Object.keys(properties)) {
      const property = properties[key];
      if (!property || typeof property === 'boolean') continue;

      const fieldSchema = property as ExtendedJSONSchema;

      // 如果当前字段使用了 flattenPath
      if (fieldSchema.type === 'object' && fieldSchema.ui?.flattenPath) {
        return true;
      }

      // 递归检查子字段
      if (fieldSchema.type === 'object' && this.hasFlattenPath(fieldSchema)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 解析 Schema 生成字段配置（支持路径扁平化）
   */
  static parse(
    schema: ExtendedJSONSchema,
    parentPath: string = '',
    prefixLabel: string = ''
  ): FieldConfig[] {
    const fields: FieldConfig[] = [];

    if (schema.type !== 'object' || !schema.properties) {
      return fields;
    }

    const properties = schema.properties;
    const required = schema.required || [];
    const order = schema.ui?.order || Object.keys(properties);

    for (const key of order) {
      const property = properties[key];
      if (!property || typeof property === 'boolean') continue;

      const fieldSchema = property as ExtendedJSONSchema;
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      // 检查是否需要路径扁平化
      if (fieldSchema.type === 'object' && fieldSchema.ui?.flattenPath) {
        // 确定是否需要添加前缀
        const newPrefixLabel = fieldSchema.ui.flattenPrefix && fieldSchema.title
          ? (prefixLabel ? `${prefixLabel} - ${fieldSchema.title}` : fieldSchema.title)
          : prefixLabel;

        // 递归解析子字段，跳过当前层级（不生成 NestedFormWidget）
        const nestedFields = this.parse(fieldSchema, currentPath, newPrefixLabel);
        fields.push(...nestedFields);
      } else {
        // 正常解析字段
        const fieldConfig = this.parseField(
          currentPath,
          fieldSchema,
          required.includes(key),
          prefixLabel
        );

        if (!fieldConfig.hidden) {
          fields.push(fieldConfig);
        }
      }
    }

    return fields;
  }
```

**关键点**：
- 当检测到 `flattenPath: true` 时，不会为该对象字段生成 `widget: 'nested-form'` 的配置
- 而是直接递归解析其子字段，将子字段"提升"到当前层级
- 使用完整路径（如 `auth.content.key`）作为字段名

### 6.3 路径转换工具

PathTransformer 工具类负责在扁平路径和嵌套对象之间进行转换：

```typescript
// src/utils/pathTransformer.ts

export class PathTransformer {
  /**
   * 将扁平化的表单数据转换为嵌套结构
   * @example
   * flatToNested({ 'auth.content.key': 'value' })
   * // => { auth: { content: { key: 'value' } } }
   */
  static flatToNested(flatData: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(flatData).forEach(([path, value]) => {
      this.setNestedValue(result, path, value);
    });
    return result;
  }

  /**
   * 将嵌套结构的数据转换为扁平化格式
   * @example
   * nestedToFlat({ auth: { content: { key: 'value' } } })
   * // => { 'auth.content.key': 'value' }
   */
  static nestedToFlat(
    nestedData: Record<string, any>,
    prefix: string = ''
  ): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(nestedData).forEach(([key, value]) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.nestedToFlat(value, fullPath));
      } else {
        result[fullPath] = value;
      }
    });
    return result;
  }
}
```

### 6.4 DynamicForm 组件集成

DynamicForm 组件负责协调整个流程：

```typescript
// src/components/DynamicForm/DynamicForm.tsx

const DynamicFormInner: React.FC<DynamicFormProps> = ({
  schema,
  defaultValues = {},
  onSubmit,
  onChange,
  ...props
}) => {
  // 检查是否使用了路径扁平化
  const useFlattenPath = useMemo(() => SchemaParser.hasFlattenPath(schema), [schema]);

  // 解析字段配置（支持路径扁平化）
  const fields = useMemo(() => SchemaParser.parse(schema), [schema]);

  // 将嵌套的 defaultValues 转换为扁平格式（如果使用了路径扁平化）
  const processedDefaultValues = useMemo(() => {
    if (!defaultValues) return undefined;
    if (!useFlattenPath) return defaultValues;
    return PathTransformer.nestedToFlat(defaultValues);
  }, [defaultValues, useFlattenPath]);

  const methods = useForm({
    defaultValues: processedDefaultValues,
    mode: validateMode,
  });

  // 处理表单变化
  React.useEffect(() => {
    if (onChange) {
      const subscription = watch(data => {
        // 如果使用了路径扁平化，将扁平数据转换回嵌套结构
        const processedData = useFlattenPath ? PathTransformer.flatToNested(data) : data;
        onChange(processedData);
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange, useFlattenPath]);

  // 处理表单提交
  const onSubmitHandler = async (data: Record<string, any>) => {
    if (onSubmit) {
      // 如果使用了路径扁平化，将扁平数据转换回嵌套结构
      const processedData = useFlattenPath ? PathTransformer.flatToNested(data) : data;
      await onSubmit(processedData);
    }
  };

  // ... 渲染逻辑
};
```

**关键点**：
- 使用 `hasFlattenPath()` 检查是否需要路径转换
- 初始化时将嵌套的 `defaultValues` 转换为扁平格式
- 在 `onChange` 和 `onSubmit` 时将扁平数据转换回嵌套结构
- 对于没有使用 `flattenPath` 的表单，不进行任何转换，保持向后兼容

---

## 7. 完整使用示例

### 7.1 示例 1：深层嵌套的 API 配置

```typescript
const schema = {
  type: 'object',
  properties: {
    apiConfig: {
      type: 'object',
      title: 'API 配置',
      ui: {
        flattenPath: true,
        flattenPrefix: true
      },
      properties: {
        authentication: {
          type: 'object',
          ui: {
            flattenPath: true
          },
          properties: {
            credentials: {
              type: 'object',
              ui: {
                flattenPath: true
              },
              properties: {
                apiKey: {
                  type: 'string',
                  title: '密钥',
                  minLength: 10
                },
                apiSecret: {
                  type: 'string',
                  title: '密文',
                  ui: {
                    widget: 'password'
                  }
                }
              },
              required: ['apiKey']
            }
          }
        }
      }
    },
    endpoint: {
      type: 'string',
      title: '接口地址',
      format: 'uri'
    }
  }
};

// 使用
<DynamicForm
  schema={schema}
  defaultValues={{
    apiConfig: {
      authentication: {
        credentials: {
          apiKey: 'existing-key-123'
        }
      }
    },
    endpoint: 'https://api.example.com'
  }}
  onSubmit={(data) => {
    console.log('提交数据:', data);
    // 输出：
    // {
    //   apiConfig: {
    //     authentication: {
    //       credentials: {
    //         apiKey: 'new-key-456',
    //         apiSecret: 'secret'
    //       }
    //     }
    //   },
    //   endpoint: 'https://api.example.com'
    // }
  }}
/>
```

### 7.2 示例 2：数据库配置

```typescript
const databaseSchema = {
  type: 'object',
  properties: {
    database: {
      type: 'object',
      title: '数据库',
      ui: {
        flattenPath: true,
        flattenPrefix: true
      },
      properties: {
        connection: {
          type: 'object',
          ui: {
            flattenPath: true
          },
          properties: {
            host: {
              type: 'string',
              title: '主机地址',
              default: 'localhost'
            },
            port: {
              type: 'integer',
              title: '端口',
              default: 3306,
              minimum: 1,
              maximum: 65535
            },
            username: {
              type: 'string',
              title: '用户名'
            },
            password: {
              type: 'string',
              title: '密码',
              ui: {
                widget: 'password'
              }
            }
          },
          required: ['host', 'port', 'username', 'password']
        }
      }
    }
  }
};

// 渲染效果：
// - 数据库 - 主机地址
// - 数据库 - 端口
// - 数据库 - 用户名
// - 数据库 - 密码
```

### 7.3 示例 3：嵌套表单 + 路径透明化混合使用

这个示例展示了如何在多层嵌套表单中混合使用正常嵌套和路径透明化：

```typescript
const schema = {
  type: 'object',
  properties: {
    // 正常的嵌套表单（会显示 Card）
    basicInfo: {
      type: 'object',
      title: '基本信息',
      properties: {
        name: { type: 'string', title: '服务名称' },
        description: { type: 'string', title: '服务描述' }
      }
    },

    // 正常的嵌套表单，但内部使用路径透明化
    apiConfig: {
      type: 'object',
      title: 'API 配置',
      properties: {
        endpoint: { type: 'string', title: '接口地址' },

        // 这里开始使用路径透明化（不会显示 Card）
        authentication: {
          type: 'object',
          title: '认证配置',
          ui: { flattenPath: true, flattenPrefix: true },
          properties: {
            credentials: {
              type: 'object',
              ui: { flattenPath: true },
              properties: {
                apiKey: { type: 'string', title: 'API 密钥' },
                apiSecret: { type: 'string', title: 'API 密文' }
              }
            }
          }
        }
      }
    }
  }
};
```

**渲染效果**：
```
┌─ 基本信息 ────────────────┐  ← Card 边框
│ 服务名称: [________]      │
│ 服务描述: [________]      │
└───────────────────────────┘

┌─ API 配置 ────────────────┐  ← Card 边框
│ 接口地址: [________]      │
│ 认证配置 - API 密钥: [__] │  ← 无额外 Card，直接显示
│ 认证配置 - API 密文: [__] │  ← 无额外 Card，直接显示
└───────────────────────────┘
```

**关键点**：
- `basicInfo` 和 `apiConfig` 是正常的嵌套表单，会渲染成 Card
- `authentication` 和 `credentials` 设置了 `flattenPath: true`，不会渲染成 Card
- 避免了多余的 Card 嵌套和 padding

---

## 8. 与其他特性的配合

### 8.1 与验证规则配合

```json
{
  "type": "object",
  "properties": {
    "config": {
      "type": "object",
      "title": "配置",
      "ui": {
        "flattenPath": true,
        "flattenPrefix": true
      },
      "properties": {
        "settings": {
          "type": "object",
          "ui": {
            "flattenPath": true
          },
          "properties": {
            "apiKey": {
              "type": "string",
              "title": "API 密钥",
              "minLength": 10,
              "maxLength": 50,
              "pattern": "^[A-Za-z0-9_-]+$",
              "ui": {
                "errorMessages": {
                  "required": "API 密钥不能为空",
                  "minLength": "API 密钥至少需要 10 个字符",
                  "pattern": "API 密钥只能包含字母、数字、下划线和连字符"
                }
              }
            }
          },
          "required": ["apiKey"]
        }
      }
    }
  }
}
```

**说明**：验证规则会自动应用到扁平化后的字段上，路径会自动映射。

### 8.2 与 UI 联动配合

```json
{
  "type": "object",
  "properties": {
    "enableAuth": {
      "type": "boolean",
      "title": "启用认证"
    },
    "auth": {
      "type": "object",
      "title": "认证",
      "ui": {
        "flattenPath": true,
        "flattenPrefix": true,
        "linkage": {
          "type": "visibility",
          "dependencies": ["enableAuth"],
          "condition": {
            "field": "enableAuth",
            "operator": "==",
            "value": true
          }
        }
      },
      "properties": {
        "credentials": {
          "type": "object",
          "ui": {
            "flattenPath": true
          },
          "properties": {
            "username": {
              "type": "string",
              "title": "用户名"
            },
            "password": {
              "type": "string",
              "title": "密码",
              "ui": {
                "widget": "password"
              }
            }
          }
        }
      }
    }
  }
}
```

**说明**：当 `enableAuth` 为 `true` 时，显示 `认证 - 用户名` 和 `认证 - 密码` 字段。

---

## 9. 最佳实践

### 9.1 何时使用路径透明化

**适合使用的场景**：
- ✅ 后端接口参数嵌套深度超过 2 层
- ✅ 中间层级没有实际业务意义，只是数据结构的组织方式
- ✅ 用户只需要关注最内层的实际字段
- ✅ 表单字段数量较少（< 10 个）

**不适合使用的场景**：
- ❌ 嵌套层级有明确的业务分组意义
- ❌ 需要展示层级结构帮助用户理解
- ❌ 字段数量很多，需要分组管理
- ❌ 不同层级的字段有不同的权限控制

### 9.2 前缀使用建议

**使用前缀的场景**：
- 多个透明化对象的字段可能产生命名冲突
- 需要保留一定的上下文信息帮助用户理解
- 表单字段较多，需要通过前缀进行逻辑分组

**不使用前缀的场景**：
- 只有一个透明化对象
- 字段名称已经足够清晰，不需要额外上下文
- 追求最简洁的表单展示

### 9.3 性能考虑

1. **路径转换开销**：
   - 扁平化和嵌套化转换有一定性能开销
   - 建议在字段数量 < 50 时使用
   - 大量字段时考虑分页或分步表单

2. **缓存优化**：
   ```typescript
   // 使用 useMemo 缓存转换结果
   const flatDefaultValues = useMemo(() => {
     if (!defaultValues) return undefined;
     return PathTransformer.nestedToFlat(defaultValues);
   }, [defaultValues]);
   ```

3. **避免过度嵌套**：
   - 建议透明化深度不超过 4 层
   - 过深的嵌套会导致字段名过长

---

## 10. 注意事项

### 10.1 字段名冲突

当多个透明化对象的子字段名称相同时，会产生冲突：

```json
{
  "type": "object",
  "properties": {
    "config1": {
      "type": "object",
      "ui": { "flattenPath": true },
      "properties": {
        "name": { "type": "string", "title": "名称1" }
      }
    },
    "config2": {
      "type": "object",
      "ui": { "flattenPath": true },
      "properties": {
        "name": { "type": "string", "title": "名称2" }
      }
    }
  }
}
```

**解决方案**：使用 `flattenPrefix: true` 添加前缀区分。

### 10.2 Card 渲染行为

**重要**：设置了 `flattenPath: true` 的对象字段不会渲染成 NestedFormWidget 和 Card 组件。

```typescript
// ❌ 错误理解：以为会渲染多层 Card
{
  api: {                    // 设置 flattenPath: true
    auth: {                 // 设置 flattenPath: true
      content: {            // 设置 flattenPath: true
        name: 'value'       // 实际字段
      }
    }
  }
}

// ✅ 实际渲染：只渲染一个输入框，没有任何 Card
// 字段名：api.auth.content.name
// 标签：name（或带前缀）
```

**说明**：
- 路径透明化的核心目的就是跳过中间层级，避免多余的 Card 嵌套
- 只有没有设置 `flattenPath: true` 的对象字段才会渲染成 NestedFormWidget（带 Card）
- 这样可以避免深层嵌套时产生的多余边框和 padding

### 10.3 数组字段的处理

路径透明化不适用于数组类型的字段：

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "ui": {
        "flattenPath": true  // ❌ 对数组无效
      },
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" }
        }
      }
    }
  }
}
```

**说明**：数组字段应该使用标准的数组组件或嵌套表单组件。

### 10.4 与嵌套表单的区别

| 特性 | 路径透明化 | 嵌套表单 |
|------|-----------|---------|
| 渲染方式 | 扁平展示，跳过中间层级 | 保留层级结构 |
| Card 组件 | **不渲染** Card 和 NestedFormWidget | 渲染 Card 和 NestedFormWidget |
| 适用场景 | 中间层级无业务意义 | 层级有明确业务分组 |
| 字段名 | 使用完整路径（`auth.content.key`） | 使用相对路径（`key`） |
| 数据结构 | 自动转换为嵌套结构 | 直接使用嵌套结构 |
| UI 展示 | 所有字段在同一层级，无边框 | 字段按层级分组展示，有 Card 边框 |

---

## 11. 总结

字段路径透明化是一个强大的特性，可以有效解决深层嵌套参数显示冗余的问题。通过合理使用 `flattenPath` 和 `flattenPrefix` 配置，可以在保持数据结构完整性的同时，为用户提供简洁清晰的表单界面。

**核心优势**：
- ✅ 配置简单，只需添加 `ui.flattenPath: true`
- ✅ 自动跳过中间层级，不渲染 Card 和 NestedFormWidget，避免多余的边框和 padding
- ✅ 自动处理数据转换，无需手动编写转换逻辑
- ✅ 向后兼容，不影响现有功能
- ✅ 支持与验证、联动等其他特性配合使用
- ✅ 可以与正常嵌套表单混合使用，灵活控制 UI 展示

**使用建议**：
- 优先考虑业务场景，确认是否真的需要透明化
- 合理使用前缀，平衡简洁性和可读性
- 注意性能影响，避免过度嵌套
- 需要 Card 边框分组时使用正常嵌套表单，不需要时使用路径透明化
- 可以在同一个表单中混合使用两种方式，灵活控制 UI 展示

---

**创建日期**: 2025-12-26
**版本**: 2.0
**文档状态**: 已更新
**更新内容**:
- 更新了实现方案，明确了路径透明化不会渲染 Card 和 NestedFormWidget
- 添加了 SchemaParser.hasFlattenPath() 方法说明
- 更新了 DynamicForm 组件集成方式，支持自动检测和数据转换
- 添加了嵌套表单和路径透明化混合使用的示例
- 补充了 Card 渲染行为的说明
