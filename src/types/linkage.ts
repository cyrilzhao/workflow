/**
 * 联动类型
 */
export type LinkageType = 'visibility' | 'disabled' | 'readonly' | 'value' | 'options';

/**
 * 条件操作符
 */
export type ConditionOperator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'in'
  | 'notIn'
  | 'includes'
  | 'notIncludes'
  | 'isEmpty'
  | 'isNotEmpty';

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
 * 联动效果定义
 */
export interface LinkageEffect {
  // 状态变更
  state?: {
    visible?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
  };
  // 直接指定值（用于 value 类型）
  value?: any;
  // 直接指定选项（用于 options 类型）
  options?: Array<{ label: string; value: any }>;
  // 通过函数计算（根据 linkage.type 决定计算结果的用途）
  function?: string;
}

/**
 * 联动配置
 */
export interface LinkageConfig {
  type: LinkageType;
  dependencies: string[];

  // 条件表达式或函数名（描述"什么时候触发联动"）
  when?: ConditionExpression | string;
  // 条件满足时的效果（描述"触发后做什么"）
  fulfill?: LinkageEffect;
  // 条件不满足时的效果
  otherwise?: LinkageEffect;
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
 * 联动函数签名（支持同步和异步函数）
 */
export type LinkageFunction = (formData: Record<string, any>) => any | Promise<any>;
