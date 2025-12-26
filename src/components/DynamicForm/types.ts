// import type { UseFormReturn } from 'react-hook-form';
import type { ExtendedJSONSchema, FieldOption } from '@/types/schema';
import type { LinkageFunction } from '@/types/linkage';

/**
 * DynamicForm 组件属性
 */
export interface DynamicFormProps {
  schema: ExtendedJSONSchema;
  defaultValues?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onChange?: (data: Record<string, any>) => void;
  widgets?: Record<string, React.ComponentType<any>>;
  linkageFunctions?: Record<string, LinkageFunction>;
  customFormats?: Record<string, (value: string) => boolean>;
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number | string;
  showErrorList?: boolean;
  showSubmitButton?: boolean;
  renderAsForm?: boolean; // 是否渲染为 form 标签，默认 true
  validateMode?: 'onSubmit' | 'onBlur' | 'onChange' | 'all';
  reValidateMode?: 'onSubmit' | 'onBlur' | 'onChange';
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  pathPrefix?: string; // 嵌套表单的路径前缀，用于拼接完整字段路径
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
  schema?: ExtendedJSONSchema;
  [key: string]: any;
}
