# 嵌套动态表单技术方案

## 目录

1. [概述](#1-概述)
2. [应用场景](#2-应用场景)
3. [核心特性](#3-核心特性)
4. [类型定义和接口设计](#4-类型定义和接口设计)
5. [组件实现](#5-组件实现)
6. [使用示例](#6-使用示例)
7. [SchemaKey 路径格式与数据过滤机制](#7-schemakey-路径格式与数据过滤机制)
8. [高级特性](#8-高级特性)
9. [最佳实践](#9-最佳实践)
10. [注意事项](#10-注意事项)

---

## 1. 概述

本文档描述了如何在动态表单中支持嵌套表单场景，即某个字段的值是一个对象，该字段使用自定义 Widget（内层动态表单）来编辑这个对象。

> **💡 重要提示**
>
> `type: 'object'` 的字段会**自动使用** `nested-form` widget 渲染为嵌套表单。
>
> 无需显式指定 `ui.widget: 'nested-form'`，只有在需要使用自定义 widget 时才需要显式指定。

---

## 2. 应用场景

### 2.1 场景 1: 复杂对象编辑

```typescript
// 外层表单 Schema
{
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
        zipCode: { type: 'string', title: 'Zip Code' }
      },
      required: ['city']
      // ui.widget: 'nested-form' 是可选的（object 类型的默认值）
    }
  }
}
```

### 2.2 场景 2: 可配置的子表单（同级字段依赖）

```typescript
// 根据类型动态加载不同的子表单
{
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['personal', 'company'],
      title: 'Type'
    },
    details: {
      type: 'object',
      title: 'Details',
      ui: {
        widget: 'nested-form',
        schemaKey: 'type', // 简单字段名：依赖同级的 type 字段
        schemas: {
          personal: {
            properties: {
              firstName: { type: 'string', title: 'First Name' },
              lastName: { type: 'string', title: 'Last Name' }
            }
          },
          company: {
            properties: {
              companyName: { type: 'string', title: 'Company Name' },
              taxId: { type: 'string', title: 'Tax ID' }
            }
          }
        }
      }
    }
  }
}
```

**数据保留机制**：当 `type` 从 `personal` 切换到 `company` 时，`details` 字段的数据会被保留。在表单提交时，会根据当前 schema 自动过滤掉不需要的字段。

> **📖 相关文档**
>
> 嵌套表单中的联动配置遵循标准的 UI 联动规范。详细的联动配置说明请参考：[UI 联动设计方案](./UI_LINKAGE_DESIGN.md)

### 2.3 场景 3: 跨层级字段依赖（JSON Pointer）

```typescript
// 使用 JSON Pointer 依赖嵌套字段
{
  type: 'object',
  properties: {
    company: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['startup', 'enterprise'],
          title: 'Company Type'
        },
        details: {
          type: 'object',
          title: 'Company Details',
          ui: {
            widget: 'nested-form',
            // 使用 JSON Pointer 依赖 company.type
            schemaKey: '#/properties/company/type',
            schemas: {
              startup: {
                properties: {
                  foundedYear: { type: 'number', title: 'Founded Year' },
                  funding: { type: 'string', title: 'Funding Stage' }
                }
              },
              enterprise: {
                properties: {
                  employeeCount: { type: 'number', title: 'Employee Count' },
                  revenue: { type: 'number', title: 'Annual Revenue' }
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

**说明**：
- `schemaKey: '#/properties/company/type'` 使用 JSON Pointer 格式
- 可以依赖任意层级的字段，不限于同级
- 同样支持自动数据清除机制

### 2.4 场景 4: 数组中的嵌套表单

```typescript
{
  type: 'object',
  properties: {
    contacts: {
      type: 'array',
      title: 'Contacts',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          phone: { type: 'string', title: 'Phone' },
          email: { type: 'string', title: 'Email', format: 'email' }
        }
        // ui.widget: 'nested-form' 是可选的（object 类型的默认值）
      }
    }
  }
}
```

> **📖 相关文档**
>
> 数组元素内部的嵌套表单联动涉及复杂的路径解析。详细说明请参考：[数组字段联动设计方案](./ARRAY_FIELD_LINKAGE.md)

---

## 3. 核心特性

1. **值传递**: 外层表单将对象值传递给内层表单
2. **值回传**: 内层表单变化时，将新对象值回传给外层表单
3. **验证独立**: 内层表单有自己的验证规则
4. **样式隔离**: 内层表单可以有独立的样式配置
5. **跨层级依赖**: 支持 JSON Pointer 格式依赖任意层级的字段
6. **智能数据过滤**: 类型切换时保留所有数据，提交时根据当前 schema 自动过滤

---

## 4. 类型定义和接口设计

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

  // 嵌套表单配置（用于动态场景）
  schemaKey?: string; // 动态 schema 的依赖字段（支持简单字段名或 JSON Pointer 格式）
                      // 示例: 'type' 或 '#/properties/company/type'
  schemas?: Record<
    string,
    {
      // 多个子表单 schema 片段
      properties?: Record<string, ExtendedJSONSchema>;
      required?: string[];
    }
  >;
  schemaLoader?: (value: any) => Promise<ExtendedJSONSchema>; // 异步加载 schema

  [key: string]: any;
}
```

### 4.2 NestedFormWidget 组件属性

```typescript
// src/components/DynamicForm/widgets/NestedFormWidget.tsx

export interface NestedFormWidgetProps extends FieldWidgetProps {
  // 当前字段的 schema（包含 properties）
  schema: ExtendedJSONSchema;

  // 动态 Schema 配置（可选）
  schemaKey?: string;
  schemas?: Record<
    string,
    {
      properties?: Record<string, ExtendedJSONSchema>;
      required?: string[];
    }
  >;
  schemaLoader?: (value: any) => Promise<ExtendedJSONSchema>;

  // 其他配置
  disabled?: boolean;
  readonly?: boolean;
  layout?: 'vertical' | 'horizontal' | 'inline';  // 布局方式
  labelWidth?: number | string;  // 标签宽度
}
```

**重要说明**：
- NestedFormWidget 使用 `asNestedForm` 模式，不需要 `value` 和 `onChange` props
- 数据通过父表单的 FormContext 自动管理
- 字段名通过 `pathPrefix` 参数自动添加前缀

---

## 5. 组件实现

### 5.1 完整的 NestedFormWidget 实现

```typescript
// src/components/DynamicForm/widgets/NestedFormWidget.tsx

import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card } from '@blueprintjs/core';
import { DynamicForm } from '../DynamicForm';
import type { FieldWidgetProps } from '../types';
import type { ExtendedJSONSchema } from '@/types/schema';
import { PathResolver } from '@/utils/pathResolver';
import { useNestedSchemaRegistry } from '../context/NestedSchemaContext';
import { usePathPrefix, joinPath, removePrefix } from '../context/PathPrefixContext';

export const NestedFormWidget = forwardRef<HTMLDivElement, NestedFormWidgetProps>(
  ({ name, value = {}, schema, disabled, readonly, layout, labelWidth }, ref) => {
    const [currentSchema, setCurrentSchema] = useState(schema);
    const [loading, setLoading] = useState(false);

    // 保存外层表单的 context
    const parentFormContext = useFormContext();
    const { watch, getValues } = parentFormContext;

    // 获取父级路径前缀和嵌套 schema 注册表
    const parentPathPrefix = usePathPrefix();
    const fullPath = joinPath(parentPathPrefix, name);
    const nestedSchemaRegistry = useNestedSchemaRegistry();

    // 从 schema.ui 中获取嵌套表单配置
    const schemaKey = schema.ui?.schemaKey;
    const schemas = schema.ui?.schemas;
    const schemaLoader = schema.ui?.schemaLoader;

    // 保存当前的 schema key 值，用于检测切换
    const previousKeyRef = useRef<string | undefined>();

    // 【关键】注册当前 schema 到 Context（当 currentSchema 变化时更新）
    useEffect(() => {
      nestedSchemaRegistry.register(fullPath, currentSchema);
      console.info(`[NestedFormWidget] 注册字段 "${fullPath}" 的 schema 到 Context`);

      return () => {
        nestedSchemaRegistry.unregister(fullPath);
        console.info(`[NestedFormWidget] 注销字段 "${fullPath}" 的 schema`);
      };
    }, [fullPath, currentSchema, nestedSchemaRegistry]);

    // 处理动态 schema 加载
    useEffect(() => {
      if (!schemaKey || !schemas) return;

      // 转换为 react-hook-form 的字段路径用于监听
      const watchFieldPath = PathResolver.toFieldPath(schemaKey);

      // 获取依赖字段的值（支持 JSON Pointer）
      const getSchemaKeyValue = () => {
        const currentFormValues = getValues();
        const fullFieldPath = PathResolver.toFieldPath(schemaKey);
        const value = PathResolver.getNestedValue(
          currentFormValues,
          removePrefix(fullFieldPath, parentPathPrefix)
        );
        return value;
      };

      // 初始化时检查当前值
      const currentKey = getSchemaKeyValue();
      if (currentKey && schemas[currentKey]) {
        setCurrentSchema({
          ...schema,
          properties: schemas[currentKey].properties,
          required: schemas[currentKey].required,
        });
        previousKeyRef.current = currentKey;
      }

      // 监听依赖字段变化
      const subscription = watch((formValues, { name: changedField }) => {
        const fullChangedField = parentPathPrefix
          ? joinPath(parentPathPrefix, changedField || '')
          : changedField;

        if (fullChangedField === watchFieldPath) {
          const key = getSchemaKeyValue();
          const dynamicSchema = schemas[key];

          if (dynamicSchema) {
            // 检测到类型切换，保留旧数据（不清除）
            if (previousKeyRef.current && previousKeyRef.current !== key) {
              console.info(
                `[NestedFormWidget] 类型从 "${previousKeyRef.current}" 切换到 "${key}"，保留字段 "${name}" 的数据`
              );
            }

            // 更新 schema（会触发重新注册）
            setCurrentSchema({
              ...schema,
              properties: dynamicSchema.properties,
              required: dynamicSchema.required,
            });

            previousKeyRef.current = key;
          }
        }
      });

      return () => subscription.unsubscribe();
    }, [schemaKey, schemas, watch, schema, getValues, name, parentPathPrefix]);

    // 处理异步 schema 加载
    useEffect(() => {
      if (schemaLoader && value) {
        setLoading(true);
        schemaLoader(value)
          .then(setCurrentSchema)
          .finally(() => setLoading(false));
      }
    }, [schemaLoader, value]);

    if (loading) {
      return (
        <div ref={ref} className="nested-form-loading">
          加载中...
        </div>
      );
    }

    if (!currentSchema || !currentSchema.properties) {
      return null;
    }

    return (
      <Card
        ref={ref}
        className="nested-form-widget"
        data-name={name}
        elevation={1}
        style={{ padding: '15px' }}
      >
        <DynamicForm
          schema={currentSchema}
          disabled={disabled}
          readonly={readonly}
          layout={layout}
          labelWidth={labelWidth}
          showSubmitButton={false}
          renderAsForm={false}
          onSubmit={() => {}}
          pathPrefix={fullPath}
          asNestedForm={true}
        />
      </Card>
    );
  }
);

NestedFormWidget.displayName = 'NestedFormWidget';
```

**关键变化说明**：

1. **移除了 Controller 组件**：不再使用 `react-hook-form` 的 `Controller` 包裹
2. **使用 asNestedForm 模式**：通过 `asNestedForm={true}` 让内层 DynamicForm 复用父表单的 FormContext
3. **移除了 defaultValues 和 onChange**：数据通过父表单的 FormContext 自动管理
4. **添加了 layout 和 labelWidth**：支持布局配置的传递
5. **使用 pathPrefix**：字段名会自动添加完整路径前缀（如 `company.details.name`）

### 5.2 关键实现要点

#### 5.2.1 Schema 注册机制

```typescript
// 每次 currentSchema 变化时，重新注册到 Context
useEffect(() => {
  nestedSchemaRegistry.register(fullPath, currentSchema);
  return () => {
    nestedSchemaRegistry.unregister(fullPath);
  };
}, [fullPath, currentSchema, nestedSchemaRegistry]);
```

**说明**：
- 当 `schemaKey` 依赖字段变化时，`currentSchema` 会更新
- `useEffect` 会自动重新注册新的 schema
- 这确保注册表中始终是最新的 schema

#### 5.2.2 路径计算

```typescript
const parentPathPrefix = usePathPrefix();
const fullPath = joinPath(parentPathPrefix, name);
```

**说明**：
- 支持多层嵌套表单的路径计算
- 例如：`company.details` 表示 `company` 字段下的 `details` 嵌套表单

#### 5.2.3 嵌套表单模式（asNestedForm）

NestedFormWidget 使用 `asNestedForm={true}` 参数让内层 DynamicForm 复用父表单的 FormContext：

```typescript
<DynamicForm
  schema={currentSchema}
  pathPrefix={fullPath}
  asNestedForm={true}
  // ...其他配置
/>
```

**工作原理**：

1. **FormContext 复用**：
   - 内层 DynamicForm 检测到 `asNestedForm={true}` 时，不会创建新的 `useForm` 实例
   - 而是通过 `useFormContext()` 获取并复用父表单的 FormContext
   - 所有字段直接注册到父表单中

2. **字段路径前缀**：
   - 通过 `pathPrefix={fullPath}` 参数传递完整路径（如 `company.details`）
   - 内层表单的字段名会自动添加前缀（如 `name` → `company.details.name`）
   - 这样可以避免字段名冲突，并保持正确的数据结构

3. **数据自动管理**：
   - 不需要手动传递 `defaultValues` 和 `onChange`
   - 字段值通过父表单的 FormContext 自动读取和更新
   - 验证规则也会自动注册到父表单中

**优势**：
- ✅ 简化了数据传递逻辑，无需手动同步值
- ✅ 避免了 Controller 的额外包裹层
- ✅ 统一的验证和提交流程
- ✅ 更好的性能，减少了不必要的重渲染

---

## 6. 使用示例

### 6.1 示例 1: 静态嵌套表单

```typescript
const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Name'
    },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
        zipCode: { type: 'string', title: 'Zip Code' }
      },
      required: ['city']
      // ui.widget: 'nested-form' 是可选的（object 类型的默认值）
    }
  }
};

// 使用
<DynamicForm schema={schema} onSubmit={handleSubmit} />

// 提交的数据结构
{
  name: 'John Doe',
  address: {
    street: '123 Main St',
    city: 'New York',
    zipCode: '10001'
  }
}

// 说明：
// - address 字段会自动渲染为 NestedFormWidget（因为 type: 'object' 默认使用 nested-form widget）
// - 内层字段（street, city, zipCode）会自动添加路径前缀（address.street, address.city, address.zipCode）
// - 数据通过父表单的 FormContext 自动管理，无需手动传递 value 和 onChange
```

### 6.2 示例 2: 动态嵌套表单（根据字段值切换）

```typescript
const schema = {
  type: 'object',
  properties: {
    userType: {
      type: 'string',
      title: 'User Type',
      enum: ['personal', 'company'],
      enumNames: ['Personal', 'Company'],
    },
    details: {
      type: 'object',
      title: 'Details',
      ui: {
        widget: 'nested-form',
        schemaKey: 'userType',
        schemas: {
          personal: {
            type: 'object',
            properties: {
              firstName: { type: 'string', title: 'First Name' },
              lastName: { type: 'string', title: 'Last Name' },
              birthDate: { type: 'string', title: 'Birth Date', ui: { widget: 'date' } },
            },
          },
          company: {
            type: 'object',
            properties: {
              companyName: { type: 'string', title: 'Company Name' },
              taxId: { type: 'string', title: 'Tax ID' },
              industry: { type: 'string', title: 'Industry' },
            },
          },
        },
      },
    },
  },
};
```

---

## 7. 数据过滤机制

### 7.1 SchemaKey 路径格式

嵌套表单的 `schemaKey` 支持两种路径格式来引用依赖字段：

- **简单字段名**：用于同级字段依赖（如 `'userType'`）
- **JSON Pointer**：用于跨层级字段依赖（如 `'#/properties/company/type'`）

**示例：**

```typescript
// 简单字段名（同级依赖）
{
  userType: { type: 'string', enum: ['personal', 'company'] },
  details: {
    type: 'object',
    ui: {
      schemaKey: 'userType',  // 依赖同级的 userType 字段
      schemas: { /* ... */ }
    }
  }
}

// JSON Pointer（跨层级依赖）
{
  company: {
    type: 'object',
    properties: {
      type: { type: 'string' },
      info: {
        details: {
          ui: {
            schemaKey: '#/properties/company/type',  // 依赖 company.type
            schemas: { /* ... */ }
          }
        }
      }
    }
  }
}
```

详细的路径格式说明、使用规范和转换规则，请参考：[字段路径完全指南](./FIELD_PATH_GUIDE.md#4-联动依赖路径)

### 7.2 智能数据过滤机制

当 `schemaKey` 指向的字段值发生变化时，嵌套表单会保留所有历史数据，在表单提交时根据当前 schema 自动过滤掉不需要的字段。

#### 7.2.1 数据保留行为

```typescript
// 初始状态
{
  userType: 'personal',
  details: {
    firstName: 'John',
    lastName: 'Doe'
  }
}

// 用户将 userType 从 'personal' 切换到 'company'，填写新数据
// ↓ 保留所有数据

{
  userType: 'company',
  details: {
    firstName: 'John',      // ✅ 保留旧数据
    lastName: 'Doe',        // ✅ 保留旧数据
    companyName: 'Acme Inc',
    taxId: '123456'
  }
}

// 提交时根据当前 schema (company) 自动过滤
{
  userType: 'company',
  details: {
    companyName: 'Acme Inc',  // ✅ 只保留 company schema 中的字段
    taxId: '123456'
  }
}

// 如果用户又切回 'personal'，数据还在
{
  userType: 'personal',
  details: {
    firstName: 'John',  // ✅ 数据恢复了
    lastName: 'Doe'
  }
}
```

#### 7.2.2 数据过滤的优势

**用户体验优势**：

1. ✅ **容错性好**：用户误操作切换类型后，可以切回来，数据还在
2. ✅ **避免数据丢失**：不会因为误操作而丢失已填写的数据
3. ✅ **支持试错**：用户可以自由切换类型查看不同表单，不用担心数据丢失

**数据安全性**：

1. ✅ **提交时自动过滤**：只提交当前 schema 需要的字段
2. ✅ **避免数据污染**：后端不会收到无效字段
3. ✅ **类型安全**：确保提交的数据结构与 schema 一致

#### 7.2.3 实现原理

使用 `filterValueWithNestedSchemas` 工具函数在表单提交时过滤数据：

```typescript
import { filterValueWithNestedSchemas } from '@/components/DynamicForm/utils/filterValueWithNestedSchemas';

// 在 DynamicForm 的 onSubmit 中使用
const handleSubmit = (data: Record<string, any>) => {
  // 获取嵌套 schema 注册表（由 NestedSchemaContext 提供）
  const nestedSchemaRegistry = useNestedSchemaRegistry();

  // 根据当前 schema 和注册的嵌套 schema 过滤数据
  const filteredData = nestedSchemaRegistry
    ? filterValueWithNestedSchemas(data, schema, nestedSchemaRegistry.getAllSchemas())
    : filterValueWithNestedSchemas(data, schema, new Map());

  // 提交过滤后的数据
  onSubmit?.(filteredData);
};
```

**关键点**：
- `filterValueWithNestedSchemas` 函数会递归处理嵌套对象和数组
- 对于动态嵌套表单字段，使用注册表中的当前 schema 进行过滤
- 只保留当前 schema 中定义的字段，过滤掉类型切换时遗留的旧字段

#### 7.2.4 两个过滤函数的区别

系统提供了两个数据过滤函数，适用于不同场景：

##### `filterValueBySchema` - 基础过滤函数

**函数签名**：
```typescript
function filterValueBySchema(
  value: any,
  schema: ExtendedJSONSchema
): any
```

**适用场景**：
- 静态 schema，不涉及动态切换
- 简单的嵌套对象过滤
- 不需要跟踪嵌套表单的 schema 变化

**特点**：
- 只根据传入的 schema 进行过滤
- 递归处理嵌套对象和数组
- 不支持动态嵌套表单的 schema 注册机制

##### `filterValueWithNestedSchemas` - 增强过滤函数

**函数签名**：
```typescript
function filterValueWithNestedSchemas(
  value: any,
  schema: ExtendedJSONSchema,
  nestedSchemas: Map<string, ExtendedJSONSchema>,
  currentPath?: string
): any
```

**适用场景**：
- 动态嵌套表单（使用 `schemaKey` 和 `schemas` 配置）
- 需要根据当前激活的 schema 过滤数据
- 多层嵌套表单场景

**特点**：
- 支持嵌套 schema 注册表
- 对于注册的字段路径，使用注册表中的当前 schema 进行过滤
- 完美支持类型切换时的数据过滤

**使用建议**：
- DynamicForm 内部统一使用 `filterValueWithNestedSchemas`
- 如果没有嵌套 schema 注册表，传入空 Map 即可，功能等同于 `filterValueBySchema`

#### 7.2.5 filterValueWithNestedSchemas 函数详解

`filterValueWithNestedSchemas` 是增强版的数据过滤函数，专门用于处理动态嵌套表单场景。

**函数签名**：

```typescript
function filterValueWithNestedSchemas(
  value: any,
  schema: ExtendedJSONSchema,
  nestedSchemas: Map<string, ExtendedJSONSchema>,
  currentPath?: string
): any
```

**参数说明**：
- `value`: 要过滤的数据
- `schema`: 顶层 JSON Schema
- `nestedSchemas`: 嵌套字段的 schema 注册表（字段路径 -> 当前激活的 schema）
- `currentPath`: 当前字段路径（用于递归，通常不需要手动传入）

**工作原理**：

1. 递归遍历数据结构
2. 对于每个对象字段，检查是否在 `nestedSchemas` 中有注册的 schema
3. 如果有注册的 schema，使用注册的 schema 进行过滤（这是动态嵌套表单的当前 schema）
4. 否则使用原始 schema 中的定义进行过滤

**使用示例：动态嵌套表单场景**

```typescript
// 顶层 schema
const schema: ExtendedJSONSchema = {
  type: 'object',
  properties: {
    userType: { type: 'string' },
    details: {
      type: 'object',
      properties: {}, // 初始为空，由动态 schema 填充
    },
  },
};

// 嵌套 schema 注册表（由 NestedFormWidget 自动维护）
const nestedSchemas = new Map<string, ExtendedJSONSchema>();

// 当前 details 字段使用的是 company schema
nestedSchemas.set('details', {
  type: 'object',
  properties: {
    companyName: { type: 'string' },
    taxId: { type: 'string' },
  },
});

// 用户数据（包含切换类型时遗留的字段）
const dirtyData = {
  userType: 'company',
  details: {
    // personal 类型的字段（应该被过滤）
    firstName: 'John',
    lastName: 'Doe',
    // company 类型的字段（应该保留）
    companyName: 'Acme Inc',
    taxId: '123456',
  },
};

// 使用 filterValueWithNestedSchemas 过滤
const cleanData = filterValueWithNestedSchemas(dirtyData, schema, nestedSchemas);

// 结果：只保留 company schema 中定义的字段
// {
//   userType: 'company',
//   details: {
//     companyName: 'Acme Inc',
//     taxId: '123456'
//   }
// }
```

### 7.3 NestedSchemaContext 机制

为了支持动态嵌套表单的数据过滤，系统使用 `NestedSchemaContext` 机制来跟踪每个嵌套字段当前激活的 schema。

**核心概念**：
- 每个 `NestedFormWidget` 在挂载时自动注册当前使用的 schema
- Schema 动态切换时，注册表会自动更新
- 表单提交时，使用注册表中的当前 schema 进行数据过滤

**工作流程**：
1. DynamicForm 创建 NestedSchemaProvider，初始化注册表
2. NestedFormWidget 挂载时注册当前 schema
3. 用户修改 schemaKey 依赖字段时，NestedFormWidget 更新并重新注册 schema
4. 表单提交时，使用注册表过滤数据，只保留当前 schema 定义的字段

详细的实现机制和分层计算策略，请参考：[UI 联动设计方案 - 分层计算策略](./UI_LINKAGE_DESIGN.md#65-分层计算策略)

---

## 8. 高级特性

### 8.1 异步加载 Schema

```typescript
const schema = {
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      title: 'Product ID',
    },
    configuration: {
      type: 'object',
      title: 'Configuration',
      ui: {
        schemaLoader: async value => {
          // 根据产品 ID 异步加载配置 schema
          const response = await api.getProductConfigSchema(value.productId);
          return response.schema;
        },
      },
    },
  },
};
```

### 8.2 数组中的嵌套表单

```typescript
const schema = {
  type: 'object',
  properties: {
    contacts: {
      type: 'array',
      title: 'Contacts',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          email: { type: 'string', title: 'Email', format: 'email' },
          phone: { type: 'string', title: 'Phone' },
        }
      },
    },
  },
};
```

### 8.3 多层嵌套

```typescript
const schema = {
  type: 'object',
  properties: {
    company: {
      type: 'object',
      title: 'Company',
      properties: {
        name: { type: 'string', title: 'Company Name' },
        address: {
          type: 'object',
          title: 'Address',
          properties: {
            street: { type: 'string', title: 'Street' },
            city: { type: 'string', title: 'City' },
          },
        },
      },
    },
  },
};
```

---

## 9. 最佳实践

### 9.1 数据管理策略

**使用 asNestedForm 模式（推荐）**：

NestedFormWidget 使用 `asNestedForm={true}` 模式，数据通过父表单的 FormContext 自动管理：

```typescript
// NestedFormWidget 内部实现
<DynamicForm
  schema={currentSchema}
  pathPrefix={fullPath}
  asNestedForm={true}
  // 不需要 defaultValues 和 onChange
/>
```

**优势**：
- ✅ 无需手动同步值，避免了复杂的值同步逻辑
- ✅ 避免了父子组件之间的值同步死循环问题
- ✅ 统一的数据管理，所有字段都在父表单的 FormContext 中
- ✅ 更好的性能，减少了不必要的重渲染

**工作原理**：
1. 内层 DynamicForm 通过 `useFormContext()` 获取父表单的 FormContext
2. 字段名通过 `pathPrefix` 自动添加前缀（如 `company.details.name`）
3. 字段值直接从父表单的 FormContext 中读取和更新
4. 验证规则也自动注册到父表单中

### 9.2 验证处理

```typescript
// 嵌套表单的验证应该独立处理
const schema = {
  type: 'object',
  properties: {
    address: {
      type: 'object',
      properties: {
        city: { type: 'string', title: 'City' },
      },
      required: ['city'], // 内层验证
    },
  },
};
```

### 9.3 性能优化

#### 9.3.1 缓存 Schema

```typescript
// 使用 useMemo 缓存 schema，避免每次渲染都创建新对象
const nestedSchema = useMemo(
  () => ({
    type: 'object',
    properties: {
      street: { type: 'string', title: 'Street' },
      city: { type: 'string', title: 'City' },
      zipCode: { type: 'string', title: 'Zip Code' },
    },
  }),
  [] // 静态 schema 无需依赖
);

// 动态 schema 根据依赖缓存
const dynamicSchema = useMemo(
  () => ({
    type: 'object',
    properties: userType === 'personal' ? personalProps : companyProps,
  }),
  [userType] // 只在 userType 变化时重新计算
);
```

#### 9.3.2 使用 React.memo 避免不必要的重渲染

```typescript
import React, { memo } from 'react';

// 使用 React.memo 包裹嵌套表单组件
export const NestedFormWidget = memo(
  forwardRef<HTMLDivElement, NestedFormWidgetProps>(
    ({ name, schema, disabled, readonly, layout, labelWidth }, ref) => {
      // ... 组件实现
      return (
        <Card ref={ref} className="nested-form-widget">
          <DynamicForm
            schema={currentSchema}
            pathPrefix={fullPath}
            asNestedForm={true}
            disabled={disabled}
            readonly={readonly}
            layout={layout}
            labelWidth={labelWidth}
          />
        </Card>
      );
    }
  ),
  // 自定义比较函数，只在关键 props 变化时重渲染
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.schema, nextProps.schema) &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.readonly === nextProps.readonly &&
      prevProps.layout === nextProps.layout &&
      prevProps.labelWidth === nextProps.labelWidth
    );
  }
);
```

**说明**：
- 使用 `asNestedForm` 模式后，不需要比较 `value` 和 `onChange`
- 只需要比较 schema 和配置相关的 props
- 减少了不必要的重渲染，提升性能

---

## 10. 注意事项

1. **避免过深嵌套** - 建议最多 2-3 层
2. **值类型一致** - 确保字段值始终是对象类型
3. **验证独立性** - 内外层表单验证应该独立
4. **性能考虑** - 大量嵌套表单会影响性能

---

**创建日期**: 2025-12-24
**最后更新**: 2025-12-31
**版本**: 2.1
**文档状态**: 已优化

## 变更历史

### v2.1 (2025-12-31)

**文档优化**：精简内容，减少重复，提升可读性

**主要变更**：
- ✅ 精简第 7.1 节：删除与 FIELD_PATH_GUIDE.md 重复的路径格式详细说明，改为引用链接
- ✅ 精简第 7.3 节：删除与 UI_LINKAGE_DESIGN.md 重复的 Context 实现细节，保留核心概念
- ✅ 优化概述部分：使用醒目的提示框突出默认 widget 说明
- ✅ 添加交叉引用：在关键位置添加到 UI_LINKAGE_DESIGN.md 和 ARRAY_FIELD_LINKAGE.md 的链接
- ✅ 文档篇幅减少约 20%，内容更加聚焦和易读

### v2.0 (2025-12-27)

**架构重构**：改用 asNestedForm 模式

**主要变更**：
- 移除了 Controller 组件的使用，改为 asNestedForm 模式
- 更新了 NestedFormWidgetProps 接口，移除 value 和 onChange
- 补充了 asNestedForm 模式的详细说明
- 更新了使用示例，说明数据自动管理机制
- 简化了性能优化部分，移除了过时的值同步策略
