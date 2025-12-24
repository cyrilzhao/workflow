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

    // 解析字段依赖关系
    const dependencies = this.parseDependencies(schema);

    // 解析条件逻辑 (if/then/else)
    const conditionalRules = this.parseConditionalRules(schema);

    // 解析 allOf 条件
    const allOfRules = this.parseAllOf(schema);

    // 解析 anyOf 条件
    const anyOfRules = this.parseAnyOf(schema);

    // 解析 oneOf 条件
    const oneOfRules = this.parseOneOf(schema);

    for (const key of order) {
      const property = properties[key];
      if (!property || typeof property === 'boolean') continue;

      const fieldConfig = this.parseField(
        key,
        property as ExtendedJSONSchema,
        required.includes(key)
      );

      // 添加依赖关系信息
      if (dependencies[key]) {
        fieldConfig.dependencies = dependencies[key];
      }

      // 合并所有条件规则
      const allRules = [
        ...conditionalRules,
        ...allOfRules,
        ...anyOfRules,
        ...oneOfRules
      ];

      if (allRules.length > 0) {
        fieldConfig.conditionalRules = allRules;
      }

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

  /**
   * 解析字段依赖关系 (dependencies)
   */
  private static parseDependencies(schema: ExtendedJSONSchema): Record<string, DependencyConfig> {
    const dependenciesMap: Record<string, DependencyConfig> = {};

    if (!schema.dependencies) {
      return dependenciesMap;
    }

    for (const [fieldName, dependency] of Object.entries(schema.dependencies)) {
      if (Array.isArray(dependency)) {
        // 简单依赖: 当 fieldName 有值时，dependency 中的字段变为必填
        dependenciesMap[fieldName] = {
          type: 'simple',
          requiredFields: dependency,
        };
      } else if (typeof dependency === 'object') {
        // 复杂依赖: oneOf 条件
        if (dependency.oneOf) {
          dependenciesMap[fieldName] = {
            type: 'oneOf',
            conditions: dependency.oneOf.map((condition: any) => ({
              when: condition.properties?.[fieldName],
              then: {
                required: condition.required || [],
                properties: condition.properties || {},
              },
            })),
          };
        }
      }
    }

    return dependenciesMap;
  }

  /**
   * 解析条件逻辑 (if/then/else)
   */
  private static parseConditionalRules(schema: ExtendedJSONSchema): ConditionalRule[] {
    const rules: ConditionalRule[] = [];

    if (!schema.if) {
      return rules;
    }

    const rule: ConditionalRule = {
      type: 'if',
      if: this.parseCondition(schema.if),
      then: schema.then ? this.parseConsequence(schema.then) : undefined,
      else: schema.else ? this.parseConsequence(schema.else) : undefined,
    };

    rules.push(rule);

    return rules;
  }

  /**
   * 解析 allOf (所有条件都满足)
   */
  private static parseAllOf(schema: ExtendedJSONSchema): ConditionalRule[] {
    const rules: ConditionalRule[] = [];

    if (!schema.allOf || !Array.isArray(schema.allOf)) {
      return rules;
    }

    for (const subSchema of schema.allOf) {
      if (typeof subSchema === 'boolean') continue;

      const typedSubSchema = subSchema as ExtendedJSONSchema;

      // 如果 allOf 中包含 if/then/else
      if (typedSubSchema.if) {
        rules.push({
          type: 'allOf',
          if: this.parseCondition(typedSubSchema.if),
          then: typedSubSchema.then ? this.parseConsequence(typedSubSchema.then) : undefined,
          else: typedSubSchema.else ? this.parseConsequence(typedSubSchema.else) : undefined,
        });
      }
    }

    return rules;
  }

  /**
   * 解析 anyOf (任一条件满足)
   */
  private static parseAnyOf(schema: ExtendedJSONSchema): ConditionalRule[] {
    const rules: ConditionalRule[] = [];

    if (!schema.anyOf || !Array.isArray(schema.anyOf)) {
      return rules;
    }

    const anyOfRule: ConditionalRule = {
      type: 'anyOf',
      conditions: schema.anyOf.map((subSchema) => {
        if (typeof subSchema === 'boolean') return null;
        return this.parseConsequence(subSchema as ExtendedJSONSchema);
      }).filter(Boolean) as ConsequenceAction[],
    };

    rules.push(anyOfRule);

    return rules;
  }

  /**
   * 解析 oneOf (仅一个条件满足)
   */
  private static parseOneOf(schema: ExtendedJSONSchema): ConditionalRule[] {
    const rules: ConditionalRule[] = [];

    if (!schema.oneOf || !Array.isArray(schema.oneOf)) {
      return rules;
    }

    const oneOfRule: ConditionalRule = {
      type: 'oneOf',
      conditions: schema.oneOf.map((subSchema) => {
        if (typeof subSchema === 'boolean') return null;
        return this.parseConsequence(subSchema as ExtendedJSONSchema);
      }).filter(Boolean) as ConsequenceAction[],
    };

    rules.push(oneOfRule);

    return rules;
  }

  /**
   * 解析条件表达式
   */
  private static parseCondition(condition: ExtendedJSONSchema): ConditionExpression {
    const expression: ConditionExpression = {
      type: 'condition',
      rules: [],
    };

    if (condition.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(condition.properties)) {
        if (typeof fieldSchema === 'boolean') continue;

        const fieldCondition = fieldSchema as ExtendedJSONSchema;

        // 解析 const 条件
        if (fieldCondition.const !== undefined) {
          expression.rules.push({
            field: fieldName,
            operator: 'equals',
            value: fieldCondition.const,
          });
        }

        // 解析 enum 条件
        if (fieldCondition.enum) {
          expression.rules.push({
            field: fieldName,
            operator: 'in',
            value: fieldCondition.enum,
          });
        }
      }
    }

    return expression;
  }

  /**
   * 解析条件结果 (then/else)
   */
  private static parseConsequence(consequence: ExtendedJSONSchema): ConsequenceAction {
    return {
      required: consequence.required || [],
      properties: consequence.properties || {},
    };
  }
}
```

### 6.6 条件渲染相关类型定义

```typescript
// src/types/schema.ts - 补充类型定义

/**
 * 依赖配置
 */
export interface DependencyConfig {
  type: 'simple' | 'oneOf';
  requiredFields?: string[];
  conditions?: Array<{
    when: any;
    then: {
      required: string[];
      properties: Record<string, any>;
    };
  }>;
}

/**
 * 条件规则
 */
export interface ConditionalRule {
  type: 'if' | 'allOf' | 'anyOf' | 'oneOf';
  if?: ConditionExpression;
  then?: ConsequenceAction;
  else?: ConsequenceAction;
  conditions?: ConsequenceAction[];  // 用于 anyOf 和 oneOf
}

/**
 * 条件表达式
 */
export interface ConditionExpression {
  type: 'condition';
  rules: Array<{
    field: string;
    operator: 'equals' | 'in' | 'notEquals' | 'notIn';
    value: any;
  }>;
}

/**
 * 条件结果动作
 */
export interface ConsequenceAction {
  required: string[];
  properties: Record<string, any>;
}

/**
 * 字段配置 - 补充依赖和条件属性
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
  dependencies?: DependencyConfig;      // 字段依赖配置（用于验证）
  conditionalRules?: ConditionalRule[]; // JSON Schema 条件验证规则
}
```

> **注意**：UI 联动相关的配置（如 linkage）在 schema 的 `ui` 字段中定义，不在 FieldConfig 中。
> 详见 [UI 联动设计文档](./UI_LINKAGE_DESIGN.md)。


---

**下一部分**: 代码实现示例

---

## 7. UI 联动配置解析

> **重要说明**：UI 联动逻辑与数据验证逻辑是分离的。本节介绍如何解析 `ui.linkage` 配置。
>
> 完整的 UI 联动设计和实现请参考：[UI 联动设计文档](./UI_LINKAGE_DESIGN.md)

### 7.1 解析 ui.linkage 配置

```typescript
// src/components/DynamicForm/core/SchemaParser.ts

import { LinkageConfig } from '@/types/linkage';

/**
 * 解析 Schema 中的 UI 联动配置
 */
static parseLinkages(schema: ExtendedJSONSchema): {
  linkages: Record<string, LinkageConfig>;
  computedFields: Record<string, LinkageConfig>;
} {
  const linkages: Record<string, LinkageConfig> = {};
  const computedFields: Record<string, LinkageConfig> = {};

  if (!schema.properties) {
    return { linkages, computedFields };
  }

  // 遍历所有字段
  Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
    if (typeof fieldSchema === 'boolean') return;

    const typedSchema = fieldSchema as ExtendedJSONSchema;
    const linkageConfig = typedSchema.ui?.linkage;

    if (linkageConfig) {
      // 区分计算字段和其他联动类型
      if (linkageConfig.type === 'computed') {
        computedFields[fieldName] = linkageConfig;
      } else {
        linkages[fieldName] = linkageConfig;
      }
    }
  });

  return { linkages, computedFields };
}
```


### 7.2 在 DynamicForm 中使用

```typescript
// src/components/DynamicForm/DynamicForm.tsx

import { useLinkageManager } from '@/hooks/useLinkageManager';
import { useComputedFields } from '@/hooks/useComputedFields';

export function DynamicForm({ schema, linkageFunctions, ...props }: DynamicFormProps) {
  const form = useForm({ defaultValues: props.defaultValues });

  // 解析字段配置（用于渲染）
  const fields = SchemaParser.parse(schema);

  // 解析 UI 联动配置
  const { linkages, computedFields } = SchemaParser.parseLinkages(schema);

  // 使用联动管理器
  const linkageStates = useLinkageManager({
    form,
    linkages,
    linkageFunctions
  });

  // 使用计算字段自动更新
  useComputedFields({
    form,
    computedFields,
    linkageFunctions
  });

  // 渲染表单...
}
```


### 7.3 完整示例

```typescript
// 示例 Schema
const schema = {
  type: "object",
  properties: {
    price: {
      type: "number",
      title: "单价",
      minimum: 0
    },
    quantity: {
      type: "number",
      title: "数量",
      minimum: 1
    },
    total: {
      type: "number",
      title: "总价",
      ui: {
        readonly: true,
        linkage: {
          type: "computed",
          dependencies: ["price", "quantity"],
          function: "calculateTotal"
        }
      }
    }
  }
};

// 联动函数
const linkageFunctions = {
  calculateTotal: (formData: any) => {
    return (formData.price || 0) * (formData.quantity || 0);
  }
};

// 使用
<DynamicForm 
  schema={schema} 
  linkageFunctions={linkageFunctions}
/>
```

