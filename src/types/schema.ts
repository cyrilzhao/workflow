import type { JSONSchema7 } from 'json-schema';
import type { LinkageConfig, ConditionExpression } from './linkage';

// 重新导出联动相关类型，方便其他模块使用
export type { LinkageConfig, ConditionExpression } from './linkage';

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
  | 'nested-form';

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
  linkage?: LinkageConfig;

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

/**
 * 扩展的 JSON Schema 类型
 */
export interface ExtendedJSONSchema extends JSONSchema7 {
  ui?: UIConfig;
  enumNames?: string[];
  dependencies?: Record<string, any>;
  properties?: Record<string, ExtendedJSONSchema>;
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
  dependencies?: any;
  schema?: ExtendedJSONSchema;
}
