# 动态表单组件技术方案 - Part 5

## 使用指南和最佳实践

### 8.1 基础使用示例

#### 8.1.1 简单表单

```typescript
import React from 'react';
import { DynamicForm } from '@/components/DynamicForm';

const schema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      title: '用户名',
      minLength: 3,
      maxLength: 20,
    },
    email: {
      type: 'string',
      title: '邮箱',
      format: 'email',
    },
  },
  required: ['username', 'email'],
};

export const SimpleFormExample: React.FC = () => {
  const handleSubmit = (data: any) => {
    console.log('表单数据:', data);
  };

  return (
    <DynamicForm
      schema={schema}
      onSubmit={handleSubmit}
    />
  );
};
```

#### 8.1.2 带默认值的表单

```typescript
const defaultValues = {
  username: 'john_doe',
  email: 'john@example.com',
  age: 25,
};

<DynamicForm
  schema={schema}
  defaultValues={defaultValues}
  onSubmit={handleSubmit}
/>
```

#### 8.1.3 监听表单变化

```typescript
const handleChange = (data: any) => {
  console.log('表单变化:', data);
};

<DynamicForm
  schema={schema}
  onChange={handleChange}
  onSubmit={handleSubmit}
/>
```

### 8.2 高级使用示例

#### 8.2.1 自定义字段组件

```typescript
// 自定义日期选择器
const CustomDatePicker: React.FC<FieldWidgetProps> = forwardRef(
  ({ name, value, onChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        className="custom-date-picker"
        {...props}
      />
    );
  }
);

// 使用自定义组件
const customWidgets = {
  'custom-date': CustomDatePicker,
};

<DynamicForm
  schema={schema}
  widgets={customWidgets}
  onSubmit={handleSubmit}
/>
```

#### 8.2.2 复杂嵌套表单

```typescript
const complexSchema = {
  type: 'object',
  properties: {
    personalInfo: {
      type: 'object',
      title: '个人信息',
      properties: {
        name: { type: 'string', title: '姓名' },
        age: { type: 'integer', title: '年龄' },
      },
    },
    contacts: {
      type: 'array',
      title: '联系方式',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            title: '类型',
            enum: ['phone', 'email'],
            enumNames: ['电话', '邮箱'],
          },
          value: { type: 'string', title: '值' },
        },
      },
    },
  },
};
```

#### 8.2.3 条件显示字段

```typescript
const conditionalSchema = {
  type: 'object',
  properties: {
    hasAddress: {
      type: 'boolean',
      title: '是否填写地址',
    },
    address: {
      type: 'string',
      title: '详细地址',
    },
  },
  dependencies: {
    hasAddress: {
      oneOf: [
        {
          properties: {
            hasAddress: { const: true },
            address: { minLength: 1 },
          },
          required: ['address'],
        },
      ],
    },
  },
};
```

### 8.3 集成到项目

#### 8.3.1 安装依赖

```bash
npm install react-hook-form
npm install ajv ajv-formats
npm install @types/json-schema
```

#### 8.3.2 项目配置

```typescript
// src/config/formConfig.ts

export const formConfig = {
  // 默认验证模式
  validateMode: 'onSubmit' as const,

  // 是否显示错误列表
  showErrorList: true,

  // 默认布局
  layout: 'vertical' as const,
};
```

#### 8.3.3 全局注册自定义组件

```typescript
// src/components/DynamicForm/setup.ts

import { FieldRegistry } from './core/FieldRegistry';
import { CustomDatePicker } from './widgets/CustomDatePicker';
import { CustomUpload } from './widgets/CustomUpload';

export function setupDynamicForm() {
  // 注册自定义组件
  FieldRegistry.registerBatch({
    'custom-date': CustomDatePicker,
    'custom-upload': CustomUpload,
  });
}

// 在应用入口调用
// src/main.tsx
import { setupDynamicForm } from '@/components/DynamicForm/setup';

setupDynamicForm();
```

### 8.4 最佳实践

#### 8.4.1 Schema 设计原则

**1. 保持简单**
```typescript
// ✅ 好的做法
{
  type: 'string',
  title: '用户名',
  minLength: 3
}

// ❌ 避免过度复杂
{
  type: 'string',
  title: '用户名',
  minLength: 3,
  maxLength: 20,
  pattern: '^[a-zA-Z0-9_]+$',
  allOf: [...],
  anyOf: [...]
}
```

**2. 使用有意义的字段名**
```typescript
// ✅ 好的做法
properties: {
  firstName: { type: 'string' },
  lastName: { type: 'string' }
}

// ❌ 避免无意义的名称
properties: {
  field1: { type: 'string' },
  field2: { type: 'string' }
}
```

**3. 提供清晰的标题和描述**
```typescript
{
  type: 'string',
  title: '邮箱地址',
  description: '用于接收通知和找回密码',
  'ui:placeholder': 'example@email.com'
}
```

#### 8.4.2 性能优化

**1. 使用 useMemo 缓存 Schema**
```typescript
const schema = useMemo(() => ({
  type: 'object',
  properties: {
    // ...
  }
}), []);
```

**2. 避免频繁的 onChange 回调**
```typescript
// ✅ 使用防抖
const debouncedOnChange = useMemo(
  () => debounce((data) => {
    console.log('表单变化:', data);
  }, 300),
  []
);

<DynamicForm
  schema={schema}
  onChange={debouncedOnChange}
/>
```

**3. 大型表单分步处理**
```typescript
// 将大型表单拆分为多个步骤
const step1Schema = { /* ... */ };
const step2Schema = { /* ... */ };
const step3Schema = { /* ... */ };
```

#### 8.4.3 错误处理

**1. 提供友好的错误提示**
```typescript
{
  type: 'string',
  minLength: 6,
  'ui:errorMessages': {
    minLength: '密码至少需要6个字符'
  }
}
```

**2. 全局错误处理**
```typescript
const handleSubmit = async (data: any) => {
  try {
    await api.submitForm(data);
  } catch (error) {
    // 显示错误提示
    toast.error('提交失败，请重试');
  }
};
```

#### 8.4.4 类型安全

**1. 定义表单数据类型**
```typescript
interface UserFormData {
  username: string;
  email: string;
  age: number;
}

const handleSubmit = (data: UserFormData) => {
  // TypeScript 会提供类型检查
  console.log(data.username);
};
```

**2. 使用 Schema 生成类型**
```typescript
import { FromSchema } from 'json-schema-to-ts';

const schema = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['username'],
} as const;

type FormData = FromSchema<typeof schema>;
// { username: string; age?: number }
```

---

**下一部分**: 常见问题和实施建议
