# 嵌套动态表单技术方案 - Part 2

## 类型定义和接口设计

### 扩展的 UIConfig 类型

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
  schemaKey?: string;                    // 动态 schema 的依赖字段
  schemas?: Record<string, {             // 多个子表单 schema 片段
    properties?: Record<string, ExtendedJSONSchema>;
    required?: string[];
  }>;
  schemaLoader?: (value: any) => Promise<ExtendedJSONSchema>; // 异步加载 schema

  [key: string]: any;
}
```

### NestedFormWidget 组件属性

```typescript
// src/components/DynamicForm/widgets/NestedFormWidget.tsx

export interface NestedFormWidgetProps extends FieldWidgetProps {
  // 当前字段的 schema（包含 properties）
  schema: ExtendedJSONSchema;

  // 动态 Schema 配置（可选）
  schemaKey?: string;
  schemas?: Record<string, {
    properties?: Record<string, ExtendedJSONSchema>;
    required?: string[];
  }>;
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

**下一部分**: 组件实现代码
