# 动态表单组件技术方案 - Part 3

## 组件架构设计

### 6.1 核心组件层次结构

```
DynamicForm (根组件)
├── FormProvider (react-hook-form 上下文)
├── SchemaParser (Schema 解析器)
├── FormLayout (布局容器)
│   ├── FormSection (表单分组)
│   │   ├── FormField (字段包装器)
│   │   │   ├── FieldLabel (字段标签)
│   │   │   ├── FieldWidget (字段组件)
│   │   │   └── FieldError (错误提示)
│   │   └── ...
│   └── ...
└── FormActions (表单操作按钮)
```

### 6.2 核心类型定义

```typescript
// src/types/schema.ts

import { JSONSchema7 } from 'json-schema';

/**
 * UI 配置类型
 */
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
  [key: string]: any; // 支持其他自定义属性
}

/**
 * 错误信息配置
 */
export interface ErrorMessages {
  required?: string;
  minLength?: string;
  maxLength?: string;
  min?: string;
  max?: string;
  pattern?: string;
  [key: string]: string | undefined;
}

/**
 * 扩展的 JSON Schema 类型
 */
export interface ExtendedJSONSchema extends JSONSchema7 {
  // UI 扩展配置
  ui?: UIConfig;

  // 自定义属性
  enumNames?: string[];
  dependencies?: Record<string, any>;
}

/**
 * Widget 类型
 */
export type WidgetType =
  | 'text'
  | 'textarea'
  | 'password'
  | 'email'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxes'
  | 'switch'
  | 'date'
  | 'datetime'
  | 'time'
  | 'range'
  | 'color'
  | 'file';

/**
 * 字段配置
 */
export interface FieldConfig {
  name: string;
  type: string;
  widget: WidgetType;
  label?: string;
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  validation?: ValidationRules;
  options?: FieldOption[];
  dependencies?: string[];
}

/**
 * 字段选项
 */
export interface FieldOption {
  label: string;
  value: any;
  disabled?: boolean;
}

/**
 * 验证规则
 */
export interface ValidationRules {
  required?: string | boolean;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  validate?: Record<string, (value: any) => boolean | string>;
}
```

### 6.3 主组件接口设计

```typescript
// src/components/DynamicForm/types.ts

import { UseFormReturn } from 'react-hook-form';
import { ExtendedJSONSchema } from '@/types/schema';

/**
 * DynamicForm 组件属性
 */
export interface DynamicFormProps {
  // 必需属性
  schema: ExtendedJSONSchema;

  // 可选属性
  defaultValues?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onChange?: (data: Record<string, any>) => void;

  // 自定义配置
  widgets?: Record<string, React.ComponentType<any>>;
  validators?: Record<string, Function>;

  // UI 配置
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number | string;
  showErrorList?: boolean;

  // 表单行为
  validateMode?: 'onSubmit' | 'onBlur' | 'onChange' | 'all';
  reValidateMode?: 'onSubmit' | 'onBlur' | 'onChange';

  // 样式
  className?: string;
  style?: React.CSSProperties;

  // 其他
  loading?: boolean;
  disabled?: boolean;
  readonly?: boolean;
}

/**
 * 字段组件属性
 */
export interface FieldWidgetProps {
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: string;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  options?: FieldOption[];
  [key: string]: any;
}
```

### 6.4 目录结构设计

```
src/
├── components/
│   └── DynamicForm/
│       ├── index.tsx                    # 主组件导出
│       ├── DynamicForm.tsx              # 主组件实现
│       ├── types.ts                     # 类型定义
│       │
│       ├── core/                        # 核心功能
│       │   ├── SchemaParser.ts          # Schema 解析器
│       │   ├── FieldRegistry.ts         # 字段注册表
│       │   └── Validator.ts             # 验证器
│       │
│       ├── widgets/                     # 字段组件
│       │   ├── index.ts                 # 统一导出
│       │   ├── TextWidget.tsx           # 文本输入
│       │   ├── TextareaWidget.tsx       # 多行文本
│       │   ├── NumberWidget.tsx         # 数字输入
│       │   ├── SelectWidget.tsx         # 下拉选择
│       │   ├── RadioWidget.tsx          # 单选按钮
│       │   ├── CheckboxWidget.tsx       # 复选框
│       │   ├── SwitchWidget.tsx         # 开关
│       │   ├── DateWidget.tsx           # 日期选择
│       │   └── ...
│       │
│       ├── layout/                      # 布局组件
│       │   ├── FormLayout.tsx           # 表单布局
│       │   ├── FormSection.tsx          # 表单分组
│       │   ├── FormField.tsx            # 字段包装器
│       │   └── FormActions.tsx          # 操作按钮
│       │
│       ├── components/                  # 辅助组件
│       │   ├── FieldLabel.tsx           # 字段标签
│       │   ├── FieldError.tsx           # 错误提示
│       │   ├── FieldHelp.tsx            # 帮助文本
│       │   └── ErrorList.tsx            # 错误列表
│       │
│       ├── hooks/                       # 自定义 Hooks
│       │   ├── useSchemaParser.ts       # Schema 解析
│       │   ├── useFieldConfig.ts        # 字段配置
│       │   └── useFormValidation.ts     # 表单验证
│       │
│       └── styles/                      # 样式文件
│           └── DynamicForm.scss
│
├── types/
│   └── schema.ts                        # Schema 类型定义
│
└── utils/
    ├── schemaUtils.ts                   # Schema 工具函数
    └── validationUtils.ts               # 验证工具函数
```

### 6.5 核心模块设计

#### 6.5.1 Schema Parser (解析器)

```typescript
// src/components/DynamicForm/core/SchemaParser.ts

import { ExtendedJSONSchema, FieldConfig } from '@/types/schema';

export class SchemaParser {
  /**
   * 解析 Schema 生成字段配置
   */
  static parse(schema: ExtendedJSONSchema): FieldConfig[] {
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

      const fieldConfig = this.parseField(
        key,
        property as ExtendedJSONSchema,
        required.includes(key)
      );

      if (!fieldConfig.hidden) {
        fields.push(fieldConfig);
      }
    }

    return fields;
  }

  /**
   * 解析单个字段
   */
  private static parseField(
    name: string,
    schema: ExtendedJSONSchema,
    required: boolean
  ): FieldConfig {
    const ui = schema.ui || {};

    return {
      name,
      type: schema.type as string,
      widget: this.getWidget(schema),
      label: schema.title,
      placeholder: ui.placeholder,
      description: schema.description,
      defaultValue: schema.default,
      required,
      disabled: ui.disabled,
      readonly: ui.readonly,
      hidden: ui.hidden,
      validation: this.getValidationRules(schema, required),
      options: this.getOptions(schema),
    };
  }

  /**
   * 获取 Widget 类型
   */
  private static getWidget(schema: ExtendedJSONSchema): WidgetType {
    // 优先使用显式指定的 widget
    if (schema.ui?.widget) {
      return schema.ui.widget;
    }

    // 根据类型和其他属性推断
    const type = schema.type;

    if (type === 'string') {
      if (schema.format === 'email') return 'email';
      if (schema.format === 'date') return 'date';
      if (schema.format === 'date-time') return 'datetime';
      if (schema.enum) return 'select';
      if (schema.maxLength && schema.maxLength > 100) return 'textarea';
      return 'text';
    }

    if (type === 'number' || type === 'integer') {
      return 'number';
    }

    if (type === 'boolean') {
      return 'checkbox';
    }

    if (type === 'array') {
      if (schema.items && typeof schema.items === 'object') {
        const items = schema.items as ExtendedJSONSchema;
        if (items.enum) return 'checkboxes';
      }
      return 'select'; // 多选下拉
    }

    return 'text';
  }

  /**
   * 获取验证规则
   */
  private static getValidationRules(
    schema: ExtendedJSONSchema,
    required: boolean
  ): ValidationRules {
    const rules: ValidationRules = {};
    const errorMessages = schema.ui?.errorMessages || {};

    if (required) {
      rules.required = errorMessages.required ||
        (schema.title ? `${schema.title} is required` : 'This field is required');
    }

    if (schema.minLength) {
      rules.minLength = {
        value: schema.minLength,
        message: errorMessages.minLength ||
          `Minimum length is ${schema.minLength} characters`,
      };
    }

    if (schema.maxLength) {
      rules.maxLength = {
        value: schema.maxLength,
        message: errorMessages.maxLength ||
          `Maximum length is ${schema.maxLength} characters`,
      };
    }

    if (schema.minimum !== undefined) {
      rules.min = {
        value: schema.minimum,
        message: errorMessages.min ||
          `Minimum value is ${schema.minimum}`,
      };
    }

    if (schema.maximum !== undefined) {
      rules.max = {
        value: schema.maximum,
        message: errorMessages.max ||
          `Maximum value is ${schema.maximum}`,
      };
    }

    if (schema.pattern) {
      rules.pattern = {
        value: new RegExp(schema.pattern),
        message: errorMessages.pattern ||
          'Invalid format',
      };
    }

    return rules;
  }

  /**
   * 获取选项列表
   */
  private static getOptions(schema: ExtendedJSONSchema): FieldOption[] | undefined {
    if (!schema.enum) return undefined;

    const enumNames = schema.enumNames || schema.enum;

    return schema.enum.map((value, index) => ({
      label: String(enumNames[index]),
      value,
    }));
  }
}
```

---

**下一部分**: 代码实现示例
