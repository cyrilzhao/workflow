# 嵌套动态表单技术方案 - Part 3

## 组件实现

### 基础 NestedFormWidget 实现

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

**下一部分**: 使用示例
