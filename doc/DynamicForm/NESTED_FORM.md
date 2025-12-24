# 嵌套动态表单技术方案

## 目录

1. [概述](#1-概述)
2. [应用场景](#2-应用场景)
3. [核心特性](#3-核心特性)
4. [类型定义和接口设计](#4-类型定义和接口设计)
5. [组件实现](#5-组件实现)
6. [使用示例](#6-使用示例)
7. [高级特性](#7-高级特性)
8. [最佳实践](#8-最佳实践)
9. [注意事项](#9-注意事项)

---

## 1. 概述

本文档描述了如何在动态表单中支持嵌套表单场景，即某个字段的值是一个对象，该字段使用自定义 Widget（内层动态表单）来编辑这个对象。

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
      required: ['city'],
      ui: {
        widget: 'nested-form'
      }
    }
  }
}
```

### 2.2 场景 2: 可配置的子表单

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
        schemaKey: 'type', // 根据 type 字段值选择不同的 properties
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

### 2.3 场景 3: 数组中的嵌套表单

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
        },
        ui: {
          widget: 'nested-form'
        }
      }
    }
  }
}
```

---

## 3. 核心特性

1. **值传递**: 外层表单将对象值传递给内层表单
2. **值回传**: 内层表单变化时，将新对象值回传给外层表单
3. **验证独立**: 内层表单有自己的验证规则
4. **样式隔离**: 内层表单可以有独立的样式配置

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
  schemaKey?: string; // 动态 schema 的依赖字段
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

  // 当前字段值（对象）
  value?: Record<string, any>;

  // 值变化回调
  onChange?: (value: Record<string, any>) => void;

  // 其他配置
  disabled?: boolean;
  readonly?: boolean;
}
```

---

## 5. 组件实现

### 5.1 基础 NestedFormWidget 实现

```typescript
// src/components/DynamicForm/widgets/NestedFormWidget.tsx

import React, { forwardRef, useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { DynamicForm } from '../DynamicForm';
import { NestedFormWidgetProps } from '../types';

export const NestedFormWidget = forwardRef<HTMLDivElement, NestedFormWidgetProps>(
  (
    {
      name,
      value = {},
      onChange,
      schema,
      schemaKey,
      schemas,
      schemaLoader,
      disabled,
      readonly,
      ...props
    },
    ref
  ) => {
    const [currentSchema, setCurrentSchema] = useState(schema);
    const [loading, setLoading] = useState(false);
    const { watch } = useFormContext();

    // 处理动态 schema 加载
    useEffect(() => {
      if (schemaKey && schemas) {
        // 监听依赖字段变化
        const subscription = watch((formValue, { name: changedField }) => {
          if (changedField === schemaKey) {
            const key = formValue[schemaKey];
            const dynamicSchema = schemas[key];
            if (dynamicSchema) {
              // 合并动态 properties 到当前 schema
              setCurrentSchema({
                ...schema,
                properties: dynamicSchema.properties,
                required: dynamicSchema.required
              });
            }
          }
        });
        return () => subscription.unsubscribe();
      }
    }, [schemaKey, schemas, watch, schema]);

    // 处理异步 schema 加载
    useEffect(() => {
      if (schemaLoader && value) {
        setLoading(true);
        schemaLoader(value)
          .then(setCurrentSchema)
          .finally(() => setLoading(false));
      }
    }, [schemaLoader, value]);

    // 内层表单值变化处理
    const handleNestedChange = (nestedValue: Record<string, any>) => {
      onChange?.(nestedValue);
    };

    if (loading) {
      return <div className="nested-form-loading">Loading...</div>;
    }

    if (!currentSchema) {
      return null;
    }

    return (
      <div ref={ref} className="nested-form-widget" {...props}>
        <DynamicForm
          schema={currentSchema}
          defaultValues={value}
          onChange={handleNestedChange}
          disabled={disabled}
          readonly={readonly}
          onSubmit={() => {}} // 嵌套表单不需要提交按钮
        />
      </div>
    );
  }
);

NestedFormWidget.displayName = 'NestedFormWidget';
```

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
      ui: {
        widget: 'nested-form',
        schema: {
          type: 'object',
          properties: {
            street: { type: 'string', title: 'Street' },
            city: { type: 'string', title: 'City' },
            zipCode: { type: 'string', title: 'Zip Code' }
          },
          required: ['city']
        }
      }
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

## 7. 高级特性

### 7.1 异步加载 Schema

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
        widget: 'nested-form',
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

### 7.2 数组中的嵌套表单

```typescript
const schema = {
  type: 'object',
  properties: {
    contacts: {
      type: 'array',
      title: 'Contacts',
      items: {
        type: 'object',
        ui: {
          widget: 'nested-form',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
              email: { type: 'string', title: 'Email', format: 'email' },
              phone: { type: 'string', title: 'Phone' },
            },
          },
        },
      },
    },
  },
};
```

### 7.3 多层嵌套

```typescript
const schema = {
  type: 'object',
  properties: {
    company: {
      type: 'object',
      title: 'Company',
      ui: {
        widget: 'nested-form',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Company Name' },
            address: {
              type: 'object',
              title: 'Address',
              ui: {
                widget: 'nested-form',
                schema: {
                  type: 'object',
                  properties: {
                    street: { type: 'string', title: 'Street' },
                    city: { type: 'string', title: 'City' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
```

---

## 8. 最佳实践

### 8.1 值同步策略

```typescript
import { useState, useEffect, useRef } from 'react';
import isEqual from 'lodash/isEqual'; // 或使用其他深度比较库

// 使用 useEffect 确保值同步，并避免死循环
const NestedFormWidget = ({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState(value);
  const internalValueRef = useRef(value);

  // 监听外部 value 变化
  useEffect(() => {
    // 只有外部传入的 value 与当前 internalValue 不同时才更新
    if (!isEqual(value, internalValueRef.current)) {
      setInternalValue(value);
      internalValueRef.current = value;
    }
  }, [value]);

  const handleChange = (newValue) => {
    // 只有新值与当前值不同时才触发更新
    if (!isEqual(newValue, internalValueRef.current)) {
      setInternalValue(newValue);
      internalValueRef.current = newValue;
      onChange?.(newValue);
    }
  };

  return <DynamicForm defaultValues={internalValue} onChange={handleChange} />;
};
```

**说明**：

- 使用 `internalValueRef` 保存 `internalValue` 的最新值
- 在更新 state 的同时立即同步更新 ref，无需额外的 `useEffect`
- 在 `useEffect` 和 `handleChange` 中都直接与 `internalValueRef.current` 对比
- 使用 `isEqual` 进行深度比较，避免对象引用变化导致的误判
- 这样可以有效避免父子组件之间的值同步死循环，且代码更简洁

### 8.2 验证处理

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
      ui: {
        widget: 'nested-form',
      },
    },
  },
};
```

### 8.3 性能优化

#### 8.3.1 缓存 Schema

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

#### 8.3.2 使用 useCallback 缓存回调函数

```typescript
const NestedFormWidget = ({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState(value);
  const internalValueRef = useRef(value);

  // 缓存 onChange 回调，避免子组件不必要的重渲染
  const handleChange = useCallback((newValue) => {
    if (!isEqual(newValue, internalValueRef.current)) {
      setInternalValue(newValue);
      internalValueRef.current = newValue;
      onChange?.(newValue);
    }
  }, [onChange]);

  return <DynamicForm defaultValues={internalValue} onChange={handleChange} />;
};
```

#### 8.3.3 防抖处理频繁变化

```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const NestedFormWidget = ({ value, onChange }) => {
  // 对频繁的 onChange 调用进行防抖
  const debouncedOnChange = useMemo(
    () => debounce((newValue) => {
      onChange?.(newValue);
    }, 300),
    [onChange]
  );

  const handleChange = (newValue) => {
    if (!isEqual(newValue, internalValueRef.current)) {
      setInternalValue(newValue);
      internalValueRef.current = newValue;
      debouncedOnChange(newValue);
    }
  };

  // 清理防抖函数
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return <DynamicForm defaultValues={internalValue} onChange={handleChange} />;
};
```

#### 8.3.4 使用 React.memo 避免不必要的重渲染

```typescript
import React, { memo } from 'react';

// 使用 React.memo 包裹嵌套表单组件
export const NestedFormWidget = memo(
  forwardRef<HTMLDivElement, NestedFormWidgetProps>(
    ({ name, value, onChange, schema, ...props }, ref) => {
      // ... 组件实现
      return (
        <div ref={ref} className="nested-form-widget" {...props}>
          <DynamicForm
            schema={schema}
            defaultValues={value}
            onChange={onChange}
          />
        </div>
      );
    }
  ),
  // 自定义比较函数，只在关键 props 变化时重渲染
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.value, nextProps.value) &&
      isEqual(prevProps.schema, nextProps.schema) &&
      prevProps.onChange === nextProps.onChange &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.readonly === nextProps.readonly
    );
  }
);
```

#### 8.3.5 组件拆分优化

```typescript
// 不好的做法：所有逻辑都在一个大组件中
const BadNestedForm = ({ schema, value, onChange }) => {
  // 大量的状态和逻辑
  const [field1, setField1] = useState();
  const [field2, setField2] = useState();
  // ... 更多状态

  return (
    <div>
      {/* 大量的 JSX */}
    </div>
  );
};
```

**推荐做法：拆分为更小的子组件**

```typescript
// 拆分字段组件
const NestedFormField = memo(({ field, value, onChange }) => {
  return (
    <div className="nested-form-field">
      <FieldWidget
        name={field.name}
        value={value}
        onChange={onChange}
        schema={field.schema}
      />
    </div>
  );
});

// 主组件只负责协调
const NestedFormWidget = ({ schema, value, onChange }) => {
  const fields = useMemo(() => Object.entries(schema.properties), [schema]);

  // 为每个字段创建稳定的 onChange 回调
  const handleFieldChange = useCallback(
    (fieldName: string) => (newValue: any) => {
      onChange({ ...value, [fieldName]: newValue });
    },
    [value, onChange]
  );

  return (
    <div className="nested-form-widget">
      {fields.map(([name, fieldSchema]) => (
        <NestedFormField
          key={name}
          field={{ name, schema: fieldSchema }}
          value={value?.[name]}
          onChange={handleFieldChange(name)}
        />
      ))}
    </div>
  );
};
```

**说明**：
- `fields` 使用 `useMemo` 缓存字段定义列表，只在 `schema` 变化时重新计算
- `handleFieldChange` 使用 `useCallback` 创建稳定的回调函数
- 当 `value` 变化时，`value?.[name]` 会变化，触发对应的 `NestedFormField` 重渲染
- 配合 `memo` 使用，只有相关字段的值变化时才重渲染该字段组件

---

## 9. 注意事项

1. **避免过深嵌套** - 建议最多 2-3 层
2. **值类型一致** - 确保字段值始终是对象类型
3. **验证独立性** - 内外层表单验证应该独立
4. **性能考虑** - 大量嵌套表单会影响性能

---

**创建日期**: 2025-12-24
**版本**: 1.0
**文档状态**: 已完成
