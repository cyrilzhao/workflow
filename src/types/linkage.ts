/**
 * 联动类型
 */
export type LinkageType = 'visibility' | 'disabled' | 'readonly' | 'computed' | 'options';

/**
 * 条件操作符
 */
export type ConditionOperator =
  | '==' | '!='
  | '>' | '<' | '>=' | '<='
  | 'in' | 'notIn'
  | 'includes' | 'notIncludes'
  | 'isEmpty' | 'isNotEmpty';

/**
 * 条件表达式
 */
export interface ConditionExpression {
  field: string;
  operator: ConditionOperator;
  value?: any;
  and?: ConditionExpression[];
  or?: ConditionExpression[];
}

/**
 * 联动配置
 */
export interface LinkageConfig {
  type: LinkageType;
  dependencies: string[];
  condition?: ConditionExpression;
  function?: string;
}

/**
 * 联动结果
 */
export interface LinkageResult {
  visible?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  value?: any;
  options?: Array<{ label: string; value: any }>;
}

/**
 * 联动函数签名
 */
export type LinkageFunction = (formData: Record<string, any>) => any;
