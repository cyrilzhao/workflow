// import type { UseFormReturn } from 'react-hook-form';
import type { ExtendedJSONSchema, FieldOption } from './schema';
import type { LinkageFunction } from './linkage';

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
  linkageFunctions?: Record<string, LinkageFunction>; // 联动函数（详见 UI_LINKAGE_DESIGN.md）
  customFormats?: Record<string, (value: string) => boolean>; // 自定义格式验证器

  // UI 配置
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number | string; // 全局标签宽度（仅 horizontal layout 下生效）
  showErrorList?: boolean; // 是否显示错误列表
  showSubmitButton?: boolean; // 是否显示提交按钮
  renderAsForm?: boolean; // 是否渲染为 <form> 标签（默认 true）

  // 表单行为
  validateMode?: 'onSubmit' | 'onBlur' | 'onChange' | 'all';
  reValidateMode?: 'onSubmit' | 'onBlur' | 'onChange'; // 重新验证模式

  // 样式
  className?: string;
  style?: React.CSSProperties;

  // 其他
  loading?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  pathPrefix?: string; // 路径前缀（用于嵌套表单）
  /**
   * 是否作为嵌套表单运行
   * - true: 复用父表单的 FormContext，不创建新的 useForm，字段直接注册到父表单
   * - false: 创建独立的 useForm 实例（默认）
   */
  asNestedForm?: boolean;
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
