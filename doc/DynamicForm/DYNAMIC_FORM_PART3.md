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
  linkage?: LinkageConfig;  // UI 联动配置（详见 UI_LINKAGE_DESIGN.md）

  // 路径透明化配置（详见 FIELD_PATH_FLATTENING.md）
  flattenPath?: boolean;  // 是否跳过该对象层级
  flattenPrefix?: boolean;  // 是否添加当前字段 title 作为前缀

  // 动态嵌套表单配置（详见 NESTED_FORM.md）
  schemaKey?: string;  // 动态 schema 的依赖字段
  schemas?: Record<string, { properties?; required?[] }>;  // 多个子表单 schema 片段
  schemaLoader?: (value: any) => Promise<ExtendedJSONSchema>;  // 异步加载 schema

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
  | 'url'
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
  | 'file'
  | 'nested-form';  // 嵌套表单组件

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
  dependencies?: any;  // JSON Schema dependencies（保留原始格式）
  schema?: ExtendedJSONSchema;  // 用于嵌套表单
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
  linkageFunctions?: Record<string, LinkageFunction>;  // 联动函数（详见 UI_LINKAGE_DESIGN.md）
  customFormats?: Record<string, (value: string) => boolean>;  // 自定义格式验证器

  // UI 配置
  layout?: 'vertical' | 'horizontal' | 'inline';
  showSubmitButton?: boolean;  // 是否显示提交按钮
  renderAsForm?: boolean;  // 是否渲染为 <form> 标签（默认 true）

  // 表单行为
  validateMode?: 'onSubmit' | 'onBlur' | 'onChange' | 'all';

  // 样式
  className?: string;
  style?: React.CSSProperties;

  // 其他
  loading?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  pathPrefix?: string;  // 路径前缀（用于嵌套表单）
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
   * 设置自定义格式验证器
   */
  static setCustomFormats(formats: Record<string, (value: string) => boolean>) {
    // 设置自定义格式验证器
  }

  /**
   * 检查 schema 中是否使用了路径扁平化
   */
  static hasFlattenPath(schema: ExtendedJSONSchema): boolean {
    // 递归检查 schema 中是否有 flattenPath 配置
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

        // 递归解析子字段，跳过当前层级
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

  /**
   * 解析单个字段（支持嵌套路径和标签前缀）
   */
  private static parseField(
    path: string,
    schema: ExtendedJSONSchema,
    required: boolean,
    prefixLabel: string = ''
  ): FieldConfig {
    const ui = schema.ui || {};

    // 如果有前缀标签，添加到字段标签前
    const label = prefixLabel && schema.title
      ? `${prefixLabel} - ${schema.title}`
      : schema.title;

    return {
      name: path,  // 使用完整路径作为字段名
      type: schema.type as string,
      widget: this.getWidget(schema),
      label,
      placeholder: ui.placeholder,
      description: schema.description,
      defaultValue: schema.default,
      required,
      disabled: ui.disabled,
      readonly: ui.readonly,
      hidden: ui.hidden,
      validation: this.getValidationRules(schema, required),
      options: this.getOptions(schema),
      schema: schema.type === 'object' ? schema : undefined,
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
      return 'select';
    }

    if (type === 'object') {
      return 'nested-form';  // 嵌套表单组件
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
      rules.required = errorMessages.required || '此字段为必填项';
    }

    if (schema.minLength) {
      rules.minLength = {
        value: schema.minLength,
        message: errorMessages.minLength || `最小长度为 ${schema.minLength} 个字符`,
      };
    }

    if (schema.maxLength) {
      rules.maxLength = {
        value: schema.maxLength,
        message: errorMessages.maxLength || `最大长度为 ${schema.maxLength} 个字符`,
      };
    }

    if (schema.minimum !== undefined) {
      rules.min = {
        value: schema.minimum,
        message: errorMessages.min || `最小值为 ${schema.minimum}`,
      };
    }

    if (schema.maximum !== undefined) {
      rules.max = {
        value: schema.maximum,
        message: errorMessages.max || `最大值为 ${schema.maximum}`,
      };
    }

    if (schema.pattern) {
      rules.pattern = {
        value: new RegExp(schema.pattern),
        message: errorMessages.pattern || '格式不正确',
      };
    }

    // 处理 format 验证
    if (schema.format === 'email') {
      rules.pattern = {
        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        message: errorMessages.format || '请输入有效的邮箱地址',
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

### 6.6 实际类型定义

以下是实际代码中使用的类型定义（`src/types/schema.ts`）：

```typescript
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
  dependencies?: any;  // JSON Schema dependencies（保留原始格式）
  schema?: ExtendedJSONSchema;  // 用于嵌套表单
}
```

> **注意**：
> - UI 联动配置（如 linkage）在 schema 的 `ui` 字段中定义，不在 FieldConfig 中
> - JSON Schema 的条件验证（if/then/else、allOf/anyOf/oneOf）由 react-hook-form 和 JSON Schema 验证器处理
> - 完整的 UI 联动设计和实现请参考：[UI 联动设计文档](./UI_LINKAGE_DESIGN.md)


---

**下一部分**: 代码实现示例
