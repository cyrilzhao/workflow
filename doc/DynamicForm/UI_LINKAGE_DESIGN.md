# 动态表单 UI 联动设计方案

## 1. 设计原则

### 1.1 职责分离

- **JSON Schema**：负责数据验证（Validation）
  - 使用标准的 `required`、`minLength`、`pattern` 等进行数据校验
  - 使用 `dependencies`、`if/then/else`、`allOf/anyOf/oneOf` 进行条件验证

- **UI 扩展（ui 字段）**：负责 UI 联动逻辑（UI Logic）
  - 字段的显示/隐藏
  - 字段的禁用/启用
  - 字段的只读状态
  - 字段值的自动计算
  - 字段选项的动态变化

### 1.2 与 react-hook-form 的集成

利用 react-hook-form 的核心 API：

- `watch(fieldName)` - 监听字段变化
- `setValue(fieldName, value)` - 设置字段值
- `trigger(fieldName)` - 触发字段验证
- `getValues()` - 获取所有表单值

## 2. UI 联动配置规范

### 2.1 基础结构

```typescript
interface UILinkageConfig {
  // 联动类型
  type: 'visibility' | 'disabled' | 'readonly' | 'value' | 'options';

  // 依赖的字段
  dependencies: string[];

  // 条件表达式或函数名（描述"什么时候触发联动"）
  when?: ConditionExpression | string;

  // 条件满足时的效果（描述"触发后做什么"）
  fulfill?: LinkageEffect;

  // 条件不满足时的效果
  otherwise?: LinkageEffect;
}

interface LinkageEffect {
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
```

**设计说明**：

- **职责分离**：`when` 描述条件（什么时候触发），`fulfill/otherwise` 描述效果（触发后做什么）
- **统一接口**：`function` 字段根据 `linkage.type` 自动适配：
  - `value` 类型：函数返回值赋给 `result.value`
  - `options` 类型：函数返回值赋给 `result.options`
  - `visibility`/`disabled`/`readonly` 类型：函数返回值转为 boolean
- **灵活性**：支持直接指定值/选项（`value`/`options`），也支持函数计算（`function`）

### 2.2 条件表达式语法

支持简单的条件表达式，避免使用 eval：

```typescript
interface ConditionExpression {
  // 字段名
  field: string;

  // 操作符
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'notIn' | 'includes' | 'notIncludes';

  // 比较值
  value: any;

  // 逻辑组合
  and?: ConditionExpression[];
  or?: ConditionExpression[];
}
```

## 3. 使用示例

### 3.1 字段显示/隐藏

```json
{
  "type": "object",
  "properties": {
    "hasAddress": {
      "type": "boolean",
      "title": "是否填写地址"
    },
    "address": {
      "type": "string",
      "title": "详细地址",
      "ui": {
        "linkage": {
          "type": "visibility",
          "dependencies": ["hasAddress"],
          "when": {
            "field": "hasAddress",
            "operator": "==",
            "value": true
          },
          "fulfill": {
            "state": { "visible": true }
          },
          "otherwise": {
            "state": { "visible": false }
          }
        }
      }
    }
  }
}
```

### 3.2 字段禁用/启用

```json
{
  "type": "object",
  "properties": {
    "accountType": {
      "type": "string",
      "title": "账户类型",
      "enum": ["free", "premium"]
    },
    "advancedFeatures": {
      "type": "boolean",
      "title": "高级功能",
      "ui": {
        "linkage": {
          "type": "disabled",
          "dependencies": ["accountType"],
          "when": {
            "field": "accountType",
            "operator": "==",
            "value": "free"
          },
          "fulfill": {
            "state": { "disabled": true }
          },
          "otherwise": {
            "state": { "disabled": false }
          }
        }
      }
    }
  }
}
```

### 3.3 字段值自动计算

```json
{
  "type": "object",
  "properties": {
    "price": {
      "type": "number",
      "title": "单价"
    },
    "quantity": {
      "type": "number",
      "title": "数量"
    },
    "total": {
      "type": "number",
      "title": "总价",
      "ui": {
        "readonly": true,
        "linkage": {
          "type": "value",
          "dependencies": ["price", "quantity"],
          "fulfill": {
            "function": "calculateTotal"
          }
        }
      }
    }
  }
}
```

对应的计算函数：

```typescript
const linkageFunctions = {
  calculateTotal: (formData: any, context?: LinkageFunctionContext) => {
    return (formData.price || 0) * (formData.quantity || 0);
  }
};
```

**说明**：

- `type: "value"` 表示这是一个值联动字段
- `fulfill.function` 指定计算函数名
- 当 `price` 或 `quantity` 变化时，自动重新计算 `total`

### 3.4 条件性设置字段值（value 类型）

```json
{
  "type": "object",
  "properties": {
    "autoConfig": {
      "type": "boolean",
      "title": "自动配置"
    },
    "memory": {
      "type": "integer",
      "title": "内存大小（MB）",
      "ui": {
        "linkage": {
          "type": "value",
          "dependencies": ["autoConfig"],
          "when": {
            "field": "autoConfig",
            "operator": "==",
            "value": true
          },
          "fulfill": {
            "state": { "readonly": true },
            "value": 2048
          },
          "otherwise": {
            "state": { "readonly": false }
          }
        }
      }
    }
  }
}
```

**说明**：

- 当 `autoConfig` 为 true 时，`memory` 设置为 2048 并变为只读
- 当 `autoConfig` 为 false 时，`memory` 变为可编辑

### 3.5 动态选项

```json
{
  "type": "object",
  "properties": {
    "country": {
      "type": "string",
      "title": "国家",
      "enum": ["china", "usa"]
    },
    "province": {
      "type": "string",
      "title": "省份/州",
      "ui": {
        "linkage": {
          "type": "options",
          "dependencies": ["country"],
          "fulfill": {
            "function": "getProvinceOptions"
          }
        }
      }
    }
  }
}
```

对应的选项函数：

```typescript
const linkageFunctions = {
  getProvinceOptions: (formData: any, context?: LinkageFunctionContext) => {
    if (formData.country === 'china') {
      return [
        { label: '北京', value: 'beijing' },
        { label: '上海', value: 'shanghai' },
      ];
    } else if (formData.country === 'usa') {
      return [
        { label: 'California', value: 'ca' },
        { label: 'New York', value: 'ny' },
      ];
    }
    return [];
  },
};
```

**说明**：

- `type: "options"` 表示这是动态选项联动
- `fulfill.function` 指定选项计算函数
- 函数返回 `Array<{ label: string; value: any }>` 格式的选项列表

## 4. 复杂联动场景

### 4.1 多字段联动

```json
{
  "type": "object",
  "properties": {
    "age": {
      "type": "integer",
      "title": "年龄"
    },
    "income": {
      "type": "number",
      "title": "年收入"
    },
    "loanAmount": {
      "type": "number",
      "title": "可贷款额度",
      "ui": {
        "linkage": {
          "type": "visibility",
          "dependencies": ["age", "income"],
          "when": {
            "and": [
              {
                "field": "age",
                "operator": ">=",
                "value": 18
              },
              {
                "field": "income",
                "operator": ">=",
                "value": 50000
              }
            ]
          },
          "fulfill": {
            "state": { "visible": true }
          },
          "otherwise": {
            "state": { "visible": false }
          }
        }
      }
    }
  }
}
```

**说明**：

- 简单的 `and` 组合：年龄 ≥ 18 **且** 年收入 ≥ 50000
- 两个条件是平级的，没有嵌套结构
- 适用于简单的多条件判断场景

### 4.2 嵌套条件

```json
{
  "type": "object",
  "properties": {
    "userType": {
      "type": "string",
      "title": "用户类型",
      "enum": ["individual", "company"]
    },
    "country": {
      "type": "string",
      "title": "国家",
      "enum": ["china", "japan", "usa"]
    },
    "age": {
      "type": "integer",
      "title": "年龄"
    },
    "idCard": {
      "type": "string",
      "title": "身份证号",
      "ui": {
        "linkage": {
          "type": "visibility",
          "dependencies": ["userType", "country", "age"],
          "when": {
            "and": [
              {
                "field": "userType",
                "operator": "==",
                "value": "individual"
              },
              {
                "or": [
                  {
                    "and": [
                      {
                        "field": "country",
                        "operator": "==",
                        "value": "china"
                      },
                      {
                        "field": "age",
                        "operator": ">=",
                        "value": 16
                      }
                    ]
                  },
                  {
                    "and": [
                      {
                        "field": "country",
                        "operator": "==",
                        "value": "japan"
                      },
                      {
                        "field": "age",
                        "operator": ">=",
                        "value": 20
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    }
  }
}
```

**说明**：

- 用户类型必须是"个人" **且**
- （国家是中国 **且** 年龄 ≥ 16）**或**（国家是日本 **且** 年龄 ≥ 20）
- 这展示了 `and` 和 `or` 的多层嵌套组合

## 5. 与 JSON Schema 验证的配合

UI 联动和数据验证是独立的：

```json
{
  "type": "object",
  "properties": {
    "hasAddress": {
      "type": "boolean",
      "title": "是否填写地址"
    },
    "address": {
      "type": "string",
      "title": "详细地址",
      "minLength": 5,
      "ui": {
        "linkage": {
          "type": "visibility",
          "dependencies": ["hasAddress"],
          "when": {
            "field": "hasAddress",
            "operator": "==",
            "value": true
          }
        }
      }
    }
  },
  "if": {
    "properties": { "hasAddress": { "const": true } }
  },
  "then": {
    "required": ["address"]
  }
}
```

**说明**：

- `ui.linkage` 控制 `address` 字段的显示/隐藏（UI 层面）
- `if/then` 控制当 `hasAddress` 为 true 时，`address` 必填（验证层面）
- 两者配合使用，职责清晰

---

## 6. 实现方案

### 6.1 类型定义

**实际实现**：`src/types/linkage.ts`

```typescript
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
 * 联动函数上下文信息
 */
export interface LinkageFunctionContext {
  /** 当前字段的完整路径（如 'contacts.0.companyName'） */
  fieldPath: string;
  /** 当前字段在数组中的索引（如果是数组元素字段） */
  arrayIndex?: number;
  /** 当前字段所在的数组路径（如果是数组元素字段，如 'contacts'） */
  arrayPath?: string;
}

/**
 * 联动函数签名（支持同步和异步函数）
 */
export type LinkageFunction = (
  formData: Record<string, any>,
  context?: LinkageFunctionContext
) => any | Promise<any>;
```

### 6.2 条件表达式求值器

**实际实现**：`src/utils/conditionEvaluator.ts`

```typescript
import type { ConditionExpression, ConditionOperator } from '@/types/linkage';
import { PathResolver } from './pathResolver';

/**
 * 条件表达式求值器
 */
export class ConditionEvaluator {
  /**
   * 求值条件表达式
   */
  static evaluate(
    condition: ConditionExpression,
    formData: Record<string, any>
  ): boolean {
    // 处理逻辑组合 - and
    if (condition.and) {
      return condition.and.every(c => this.evaluate(c, formData));
    }

    // 处理逻辑组合 - or
    if (condition.or) {
      return condition.or.some(c => this.evaluate(c, formData));
    }

    // 获取字段值
    const fieldValue = this.getFieldValue(formData, condition.field);

    // 根据操作符求值
    return this.evaluateOperator(
      fieldValue,
      condition.operator,
      condition.value
    );
  }

  /**
   * 获取字段值（支持嵌套路径和 JSON Pointer）
   */
  private static getFieldValue(
    formData: Record<string, any>,
    fieldPath: string
  ): any {
    // 使用 PathResolver 支持 JSON Pointer 格式
    return PathResolver.resolve(fieldPath, formData);
  }

  /**
   * 求值操作符
   */
  private static evaluateOperator(
    fieldValue: any,
    operator: ConditionOperator,
    compareValue: any
  ): boolean {
    switch (operator) {
      case '==':
        return fieldValue === compareValue;

      case '!=':
        return fieldValue !== compareValue;

      case '>':
        return fieldValue > compareValue;

      case '<':
        return fieldValue < compareValue;

      case '>=':
        return fieldValue >= compareValue;

      case '<=':
        return fieldValue <= compareValue;

      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);

      case 'notIn':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);

      case 'includes':
        return Array.isArray(fieldValue) && fieldValue.includes(compareValue);

      case 'notIncludes':
        return Array.isArray(fieldValue) && !fieldValue.includes(compareValue);

      case 'isEmpty':
        return (
          fieldValue === null ||
          fieldValue === undefined ||
          fieldValue === '' ||
          (Array.isArray(fieldValue) && fieldValue.length === 0)
        );

      case 'isNotEmpty':
        return (
          fieldValue !== null &&
          fieldValue !== undefined &&
          fieldValue !== '' &&
          (!Array.isArray(fieldValue) || fieldValue.length > 0)
        );

      default:
        return false;
    }
  }
}
```

**关键特性**：

- ✅ 使用 `PathResolver.resolve()` 统一处理字段路径
- ✅ 支持简单字段名、点号路径和 JSON Pointer 格式
- ✅ 支持 `and`/`or` 逻辑组合的递归求值
- ✅ 完整的操作符支持（包括 `isEmpty`/`isNotEmpty`）

---

**下一部分**：联动管理器实现

### 6.3 联动管理器

**实际实现**：`src/hooks/useLinkageManager.ts`

#### 核心实现

```typescript
import { useMemo, useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { LinkageConfig, LinkageFunction, ConditionExpression } from '@/types/linkage';
import type { LinkageResult } from '@/types/linkage';
import { ConditionEvaluator } from '@/utils/conditionEvaluator';
import { DependencyGraph } from '@/utils/dependencyGraph';
import { PathResolver } from '@/utils/pathResolver';

interface LinkageManagerOptions {
  form: UseFormReturn<any>;
  linkages: Record<string, LinkageConfig>;
  linkageFunctions?: Record<string, LinkageFunction>;
}

/**
 * 联动管理器 Hook
 */
export function useLinkageManager({
  form,
  linkages,
  linkageFunctions = {},
}: LinkageManagerOptions) {
  const { watch, getValues } = form;

  // 构建依赖图
  const dependencyGraph = useMemo(() => {
    const graph = new DependencyGraph();

    Object.entries(linkages).forEach(([fieldName, linkage]) => {
      linkage.dependencies.forEach(dep => {
        // 标准化路径并添加依赖关系
        const normalizedDep = PathResolver.toFieldPath(dep);
        graph.addDependency(fieldName, normalizedDep);
      });
    });

    // 检测循环依赖
    const cycle = graph.detectCycle();
    if (cycle) {
      console.error('检测到循环依赖:', cycle.join(' -> '));
    }

    return graph;
  }, [linkages]);

  // 联动状态缓存（使用 useState 而不是 useMemo，以便在 useEffect 中更新）
  const [linkageStates, setLinkageStates] = useState<Record<string, LinkageResult>>({});

  // 初始化联动状态
  useEffect(() => {
    (async () => {
      const formData = getValues();
      const states: Record<string, LinkageResult> = {};

      // 并行计算所有字段的初始联动状态（使用 allSettled 避免单个失败阻塞其他字段）
      const results = await Promise.allSettled(
        Object.entries(linkages).map(async ([fieldName, linkage]) => ({
          fieldName,
          result: await evaluateLinkage(linkage, formData, linkageFunctions, fieldName),
        }))
      );

      // 处理结果，忽略失败的字段
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          states[result.value.fieldName] = result.value.result;
        } else {
          console.error('联动初始化失败:', result.reason);
        }
      });

      setLinkageStates(states);
    })();
  }, [linkages, linkageFunctions, getValues]);

  // 统一的字段变化监听和联动处理
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;
      // 获取受影响的字段（使用依赖图精确计算）
      const affectedFields = dependencyGraph.getAffectedFields(name);
      if (affectedFields.length === 0) return;

      const formData = getValues();

      // 异步处理联动逻辑
      (async () => {
        const newStates: Record<string, LinkageResult> = {};
        let hasStateChange = false;

        // 并行计算所有受影响字段的联动结果（使用 allSettled 避免单个失败阻塞其他字段）
        const results = await Promise.allSettled(
          affectedFields.map(async fieldName => {
            const linkage = linkages[fieldName];
            if (!linkage) return null;

            const result = await evaluateLinkage(linkage, formData, linkageFunctions, fieldName);
            return { fieldName, linkage, result };
          })
        );

        // 处理结果，忽略失败的字段
        results.forEach(promiseResult => {
          if (promiseResult.status === 'fulfilled' && promiseResult.value) {
            const { fieldName, linkage, result } = promiseResult.value;
            newStates[fieldName] = result;

            // 处理值联动：自动更新表单字段值
            if (linkage.type === 'value' && result.value !== undefined) {
              const currentValue = formData[fieldName];
              if (currentValue !== result.value) {
                form.setValue(fieldName, result.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
            }

            hasStateChange = true;
          } else if (promiseResult.status === 'rejected') {
            console.error('联动计算失败:', promiseResult.reason);
          }
        });

        // 批量更新状态（只更新变化的字段）
        if (hasStateChange) {
          setLinkageStates(prev => ({ ...prev, ...newStates }));
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [watch, form, getValues, linkages, linkageFunctions, dependencyGraph]);

  return linkageStates;
}

/**
 * 求值单个联动配置（支持异步函数）
 */
async function evaluateLinkage(
  linkage: LinkageConfig,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>,
  fieldPath: string  // 新增：当前字段路径
): Promise<LinkageResult> {
  const result: LinkageResult = {};

  // 如果没有 when 条件，默认使用 fulfill
  const shouldFulfill = linkage.when
    ? await evaluateCondition(linkage.when, formData, linkageFunctions)
    : true;

  const effect = shouldFulfill ? linkage.fulfill : linkage.otherwise;

  if (!effect) return result;

  // 1. 应用状态变更
  if (effect.state) {
    Object.assign(result, effect.state);
  }

  // 2. 应用函数计算
  if (effect.function) {
    const fn = linkageFunctions[effect.function];
    if (fn) {
      // 构建上下文信息
      const context = buildLinkageContext(fieldPath);

      // 使用 await 支持异步函数，传递 context 参数
      const fnResult = await fn(formData, context);

      // 根据 linkage.type 决定将结果赋值给哪个字段
      switch (linkage.type) {
        case 'value':
          result.value = fnResult;
          break;
        case 'options':
          result.options = fnResult;
          break;
        case 'visibility':
          result.visible = Boolean(fnResult);
          break;
        case 'disabled':
          result.disabled = Boolean(fnResult);
          break;
        case 'readonly':
          result.readonly = Boolean(fnResult);
          break;
      }
    }
  }

  // 3. 应用直接指定的值（优先级低于函数）
  if (effect.value !== undefined && !effect.function) {
    result.value = effect.value;
  }

  // 4. 应用直接指定的选项（优先级低于函数）
  if (effect.options !== undefined && !effect.function) {
    result.options = effect.options;
  }

  return result;
}

/**
 * 构建联动函数上下文信息
 */
function buildLinkageContext(fieldPath: string): LinkageFunctionContext {
  const context: LinkageFunctionContext = {
    fieldPath,
  };

  // 检查是否是数组元素字段
  const arrayInfo = extractArrayInfo(fieldPath);
  if (arrayInfo) {
    context.arrayIndex = arrayInfo.index;
    context.arrayPath = arrayInfo.arrayPath;
  }

  return context;
}

/**
 * 从字段路径中提取数组信息
 */
function extractArrayInfo(fieldPath: string): {
  arrayPath: string;
  index: number;
} | null {
  const parts = fieldPath.split('.');
  const indexPos = parts.findIndex(part => /^\d+$/.test(part));

  if (indexPos === -1) {
    return null;
  }

  return {
    arrayPath: parts.slice(0, indexPos).join('.'),
    index: parseInt(parts[indexPos], 10),
  };
}

/**
 * 求值条件（支持表达式对象或函数名，支持异步函数）
 */
async function evaluateCondition(
  when: ConditionExpression | string,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>
): Promise<boolean> {
  // 如果是字符串，尝试作为函数名调用
  if (typeof when === 'string') {
    const fn = linkageFunctions[when];
    if (fn) {
      // 使用 await 支持异步函数
      const result = await fn(formData);
      return Boolean(result);
    }
    console.warn(`Linkage function "${when}" not found`);
    return false;
  }

  // 否则作为条件表达式求值
  return ConditionEvaluator.evaluate(when, formData);
}
```

**关键特性**：

- ✅ **职责清晰**：`when` 描述条件，`fulfill/otherwise` 描述效果，`function` 在效果中计算结果
- ✅ **统一接口**：`function` 字段根据 `linkage.type` 自动适配不同的返回值类型
- ✅ **异步支持**：完整支持同步和异步联动函数，使用 `await` 处理 Promise
- ✅ **错误隔离**：使用 `Promise.allSettled` 确保单个字段失败不会阻塞其他字段的计算
- ✅ **并行执行**：多个字段的联动计算并行执行，提高性能
- ✅ **依赖图优化**：使用 `DependencyGraph` 精确计算受影响的字段，避免不必要的重新计算
- ✅ **循环依赖检测**：在构建依赖图时自动检测并警告循环依赖
- ✅ **路径标准化**：使用 `PathResolver.toFieldPath()` 统一处理 JSON Pointer 和简单字段名
- ✅ **状态管理**：使用 `useState` 而非 `useMemo`，支持在 `useEffect` 中异步更新状态
- ✅ **自动值更新**：在 `useEffect` 中直接调用 `form.setValue` 更新 `computed` 和 `value` 类型的字段
- ✅ **批量更新**：只更新受影响的字段，提高性能
- ✅ **上下文支持**：联动函数可以通过可选的 `context` 参数获取当前字段路径、数组索引等信息

#### 异步函数使用示例

联动系统完整支持异步函数，适用于需要调用 API、执行异步计算等场景。

**示例 1：异步加载动态选项**

```typescript
const schema = {
  type: "object",
  properties: {
    country: {
      type: "string",
      title: "国家",
      enum: ["china", "usa"]
    },
    province: {
      type: "string",
      title: "省份/州",
      ui: {
        linkage: {
          type: "options",
          dependencies: ["country"],
          fulfill: {
            function: "fetchProvinceOptions"
          }
        }
      }
    }
  }
};

const linkageFunctions = {
  // 异步函数：从 API 获取选项
  fetchProvinceOptions: async (formData: any, context?: LinkageFunctionContext) => {
    try {
      const response = await fetch(`/api/provinces?country=${formData.country}`);
      if (!response.ok) {
        console.error('获取省份列表失败:', response.statusText);
        return [];
      }
      const data = await response.json();
      return data.provinces.map((p: any) => ({
        label: p.name,
        value: p.code
      }));
    } catch (error) {
      console.error('获取省份列表出错:', error);
      return [];
    }
  }
};
```

**示例 2：异步权限检查**

```typescript
const schema = {
  type: "object",
  properties: {
    userId: {
      type: "string",
      title: "用户 ID"
    },
    advancedSettings: {
      type: "object",
      title: "高级设置",
      ui: {
        linkage: {
          type: "visibility",
          dependencies: ["userId"],
          when: "checkAdminPermission",
          fulfill: {
            state: { visible: true }
          },
          otherwise: {
            state: { visible: false }
          }
        }
      }
    }
  }
};

const linkageFunctions = {
  // 异步函数：检查用户权限
  checkAdminPermission: async (formData: any, context?: LinkageFunctionContext) => {
    try {
      const response = await fetch(`/api/users/${formData.userId}/permissions`);
      const data = await response.json();
      return data.isAdmin;
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }
};
```

**示例 3：混合使用同步和异步函数**

```typescript
const schema = {
  type: "object",
  properties: {
    price: {
      type: "number",
      title: "单价",
      minimum: 0
    },
    quantity: {
      type: "integer",
      title: "数量",
      minimum: 1
    },
    region: {
      type: "string",
      title: "地区",
      enum: ["north", "south", "east", "west"],
      enumNames: ["华北", "华南", "华东", "华西"]
    },
    discount: {
      type: "number",
      title: "折扣金额",
      ui: {
        readonly: true,
        linkage: {
          type: "value",
          dependencies: ["price", "quantity"],
          fulfill: {
            function: "calculateDiscount"
          }
        }
      }
    },
    tax: {
      type: "number",
      title: "税费",
      ui: {
        readonly: true,
        linkage: {
          type: "value",
          dependencies: ["price", "quantity", "region"],
          fulfill: {
            function: "calculateTax"
          }
        }
      }
    },
    total: {
      type: "number",
      title: "总价",
      ui: {
        readonly: true,
        linkage: {
          type: "value",
          dependencies: ["price", "quantity", "discount", "tax"],
          fulfill: {
            function: "calculateTotal"
          }
        }
      }
    }
  },
  required: ["price", "quantity", "region"]
};

const linkageFunctions = {
  // 同步函数：简单计算
  calculateDiscount: (formData: any, context?: LinkageFunctionContext) => {
    const subtotal = (formData.price || 0) * (formData.quantity || 0);
    return subtotal > 100 ? 10 : 0;
  },

  // 异步函数：调用 API 计算税费
  calculateTax: async (formData: any, context?: LinkageFunctionContext) => {
    try {
      const response = await fetch('/api/calculate-tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: formData.price * formData.quantity,
          region: formData.region
        })
      });
      const data = await response.json();
      return data.tax;
    } catch (error) {
      console.error('税费计算失败:', error);
      return 0;
    }
  },

  // 异步函数：计算最终总价
  calculateTotal: async (formData: any, context?: LinkageFunctionContext) => {
    const subtotal = (formData.price || 0) * (formData.quantity || 0);
    const discount = formData.discount || 0;
    const tax = formData.tax || 0;
    return subtotal - discount + tax;
  }
};
```

**注意事项**：

1. **错误处理**：异步函数应该包含适当的错误处理，避免未捕获的异常
2. **降级方案**：当 API 调用失败时，应返回合理的默认值（如空数组、false 等）
3. **性能优化**：系统使用 `Promise.allSettled` 并行执行多个异步函数，单个失败不会阻塞其他字段
4. **防抖建议**：对于频繁触发的异步函数（如输入框联动），建议在函数内部实现防抖逻辑

### 6.4 计算字段自动更新

**实现说明**：计算字段的自动更新功能已集成到 `useLinkageManager` 和 `FormField` 组件中，无需单独的 Hook。

#### 实现方式

**1. useLinkageManager 中的值联动处理**

在 `useLinkageManager` 的 `useEffect` 中（第 725-768 行），当依赖字段变化时：

```typescript
// src/hooks/useLinkageManager.ts

useEffect(() => {
  const subscription = watch((_, { name }) => {
    if (!name) return;
    // 获取受影响的字段（使用依赖图精确计算）
    const affectedFields = dependencyGraph.getAffectedFields(name);
    if (affectedFields.length === 0) return;

    const formData = getValues();
    const newStates: Record<string, LinkageResult> = {};
    let hasStateChange = false;

    // 只重新计算受影响的字段
    affectedFields.forEach(fieldName => {
      const linkage = linkages[fieldName];
      if (!linkage) return;

      const result = evaluateLinkage(linkage, formData, linkageFunctions);
      newStates[fieldName] = result;

      // 处理值联动：自动更新表单字段值
      if (linkage.type === 'value' && result.value !== undefined) {
        const currentValue = formData[fieldName];
        if (currentValue !== result.value) {
          form.setValue(fieldName, result.value, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }

      hasStateChange = true;
    });

    // 批量更新状态（只更新变化的字段）
    if (hasStateChange) {
      setLinkageStates(prev => ({ ...prev, ...newStates }));
    }
  });

  return () => subscription.unsubscribe();
}, [watch, form, getValues, linkages, linkageFunctions, dependencyGraph]);
```

**2. FormField 组件中的值同步**

```typescript
// src/components/DynamicForm/layout/FormField.tsx (第 33-37 行)

// 当联动状态中有值时，自动设置字段值
React.useEffect(() => {
  if (linkageState?.value !== undefined) {
    setValue(field.name, linkageState.value);
  }
}, [linkageState?.value, field.name, setValue]);
```

**说明**：这个 `useEffect` 提供了额外的保障，确保 UI 与联动状态同步。

#### 工作流程

1. **依赖字段变化** → `useLinkageManager` 的 `watch` 监听到变化
2. **计算受影响字段** → 使用 `DependencyGraph` 精确计算受影响的字段
3. **求值联动配置** → 调用 `evaluateLinkage` 计算新的联动状态
4. **自动更新值** → 如果是 `computed` 或 `value` 类型，直接调用 `form.setValue` 更新
5. **组件同步** → `FormField` 组件的 `useEffect` 确保 UI 与状态同步

#### 优势

- ✅ **统一处理**：所有联动逻辑在一个地方管理
- ✅ **性能优化**：使用依赖图避免不必要的计算
- ✅ **避免重复监听**：不需要额外的 `watch` 订阅
- ✅ **类型安全**：同时支持 `computed` 和 `value` 类型

### 6.5 在 DynamicForm 中集成

**实际实现**：`src/components/DynamicForm/DynamicForm.tsx`

```typescript
// 解析 schema 中的联动配置（第 48-49 行）
const { linkages } = useMemo(() => parseSchemaLinkages(schema), [schema]);

// 使用联动管理器（第 51-56 行）
const linkageStates = useLinkageManager({
  form: methods,
  linkages,
  linkageFunctions,
});
```

**渲染字段时应用联动状态**（第 83-105 行）：

```typescript
const renderFields = () => (
  <div className="dynamic-form__fields">
    {fields.map(field => {
      const linkageState = linkageStates[field.name];

      // 如果联动状态指定不可见，则不渲染该字段
      if (linkageState?.visible === false) {
        return null;
      }

      return (
        <FormField
          key={field.name}
          field={field}
          disabled={disabled || field.disabled || loading || linkageState?.disabled}
          readonly={readonly || field.readonly || linkageState?.readonly}
          widgets={widgets}
          linkageState={linkageState}
        />
      );
    })}
  </div>
);
```

---

## 7. Schema 解析器更新

### 7.1 解析联动配置

**实际实现**：`src/utils/schemaLinkageParser.ts`

```typescript
import type { ExtendedJSONSchema, LinkageConfig } from '@/types/schema';

/**
 * 解析结果
 */
export interface ParsedLinkages {
  linkages: Record<string, LinkageConfig>;
}

/**
 * 解析 Schema 中的联动配置
 *
 * 注意：所有类型的联动（包括 computed、value、visibility 等）都统一在 linkages 中返回，
 * 由 useLinkageManager 统一处理。不再区分 computedFields。
 */
export function parseSchemaLinkages(schema: ExtendedJSONSchema): ParsedLinkages {
  const linkages: Record<string, LinkageConfig> = {};

  if (!schema.properties) {
    return { linkages };
  }

  // 遍历所有字段
  Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
    if (typeof fieldSchema === 'boolean') return;

    const typedSchema = fieldSchema as ExtendedJSONSchema;
    const linkageConfig = typedSchema.ui?.linkage;

    if (linkageConfig) {
      linkages[fieldName] = linkageConfig;
    }
  });

  return { linkages };
}
```

**设计说明**：

- ✅ **统一处理**：不再区分 `computedFields`，所有联动类型统一返回
- ✅ **简化逻辑**：`useLinkageManager` 根据 `type` 字段自动处理不同类型的联动
- ✅ **完整支持**：支持所有联动类型（visibility、disabled、readonly、value、computed、options）

---

## 8. 完整使用示例

### 8.1 基础示例：字段显示/隐藏

```typescript
const schema = {
  type: "object",
  properties: {
    hasAddress: {
      type: "boolean",
      title: "是否填写地址"
    },
    address: {
      type: "string",
      title: "详细地址",
      minLength: 5,
      ui: {
        linkage: {
          type: "visibility",
          dependencies: ["hasAddress"],
          when: {
            field: "hasAddress",
            operator: "==",
            value: true
          },
          fulfill: {
            state: { visible: true }
          },
          otherwise: {
            state: { visible: false }
          }
        }
      }
    }
  },
  // JSON Schema 验证：当 hasAddress 为 true 时，address 必填
  if: {
    properties: { hasAddress: { const: true } }
  },
  then: {
    required: ["address"]
  }
};

<DynamicForm schema={schema} />
```

### 8.2 计算字段示例

```typescript
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
          type: "value",
          dependencies: ["price", "quantity"],
          fulfill: {
            function: "calculateTotal"
          }
        }
      }
    }
  }
};

const linkageFunctions = {
  calculateTotal: (formData: any, context?: LinkageFunctionContext) => {
    return (formData.price || 0) * (formData.quantity || 0);
  }
};

<DynamicForm
  schema={schema}
  linkageFunctions={linkageFunctions}
/>
```

### 8.3 动态选项示例

```typescript
const schema = {
  type: "object",
  properties: {
    country: {
      type: "string",
      title: "国家",
      enum: ["china", "usa"],
      enumNames: ["中国", "美国"]
    },
    province: {
      type: "string",
      title: "省份/州",
      ui: {
        linkage: {
          type: "options",
          dependencies: ["country"],
          fulfill: {
            function: "getProvinceOptions"
          }
        }
      }
    }
  },
  required: ["country", "province"]
};

const linkageFunctions = {
  getProvinceOptions: (formData: any, context?: LinkageFunctionContext) => {
    if (formData.country === 'china') {
      return [
        { label: '北京', value: 'beijing' },
        { label: '上海', value: 'shanghai' },
        { label: '广东', value: 'guangdong' }
      ];
    } else if (formData.country === 'usa') {
      return [
        { label: 'California', value: 'ca' },
        { label: 'New York', value: 'ny' },
        { label: 'Texas', value: 'tx' }
      ];
    }
    return [];
  }
};

<DynamicForm
  schema={schema}
  linkageFunctions={linkageFunctions}
/>
```

---

## 9. 设计总结

### 9.1 职责分离

| 层面                     | 负责内容     | 实现方式                                                              |
| ------------------------ | ------------ | --------------------------------------------------------------------- |
| **JSON Schema**          | 数据验证     | `required`, `minLength`, `pattern`, `if/then/else`, `dependencies` 等 |
| **UI 扩展 (ui.linkage)** | UI 联动逻辑  | `visibility`, `disabled`, `readonly`, `computed`, `options`           |
| **react-hook-form**      | 表单状态管理 | `watch`, `setValue`, `trigger`, `getValues`                           |

### 9.2 关键优势

1. **职责清晰**：验证逻辑和 UI 逻辑分离
2. **标准兼容**：遵循 JSON Schema 标准
3. **性能优化**：只监听必要的字段变化
4. **类型安全**：完整的 TypeScript 类型定义
5. **易于扩展**：支持自定义联动函数
6. **异步支持**：完整支持同步和异步联动函数

### 9.3 与之前设计的对比

| 方面         | 之前的设计                  | 新设计                      |
| ------------ | --------------------------- | --------------------------- |
| 条件渲染位置 | 滥用 JSON Schema 验证关键字 | 在 `ui.linkage` 中定义      |
| 职责         | 混淆验证和 UI 逻辑          | 职责清晰分离                |
| 与 RHF 集成  | 未考虑                      | 深度集成 `watch`/`setValue` |
| 性能         | 可能过度渲染                | 精确监听依赖字段            |

---

## 10. 补充设计：参考其他方案的改进

### 10.1 JSON Pointer 路径引用

为了支持嵌套对象和更标准化的字段引用，我们扩展 `dependencies` 支持 JSON Pointer 格式。

#### 路径格式

```typescript
// 简单字段名
dependencies: ['age', 'income'];

// JSON Pointer 格式（推荐用于嵌套字段）
dependencies: ['#/properties/age', '#/properties/address/city'];

// 支持嵌套对象
dependencies: ['#/properties/user/name', '#/properties/user/profile/age'];
```

#### 路径解析工具

**实际实现**：`src/utils/pathResolver.ts`

```typescript
/**
 * JSON Pointer 路径解析器
 * 支持标准的 JSON Pointer 格式和简单字段名
 */
export class PathResolver {
  /**
   * 解析 JSON Pointer 路径获取值
   * @param path - 字段路径，支持简单字段名或 JSON Pointer 格式
   * @param formData - 表单数据
   * @returns 字段值
   *
   * @example
   * // 简单字段名
   * PathResolver.resolve('age', { age: 18 }) // 18
   *
   * // JSON Pointer 格式
   * PathResolver.resolve('#/properties/user/age', { user: { age: 18 } }) // 18
   */
  static resolve(path: string, formData: Record<string, any>): any {
    // 如果不是 JSON Pointer 格式，直接返回字段值
    if (!path.startsWith('#/')) {
      return this.getNestedValue(formData, path);
    }

    // 移除 #/ 前缀
    const cleanPath = path.replace(/^#\//, '');

    // 分割路径
    const segments = cleanPath.split('/');

    let value = formData;
    for (const segment of segments) {
      // 跳过 "properties" 关键字
      if (segment === 'properties') continue;

      if (value === null || value === undefined) {
        return undefined;
      }

      // 解码 JSON Pointer 转义字符
      const decodedSegment = this.decodePointerSegment(segment);
      value = value[decodedSegment];
    }

    return value;
  }

  /**
   * 标准化路径格式
   * @param path - 原始路径
   * @returns 标准化的 JSON Pointer 路径
   *
   * @example
   * PathResolver.normalize('age') // '#/properties/age'
   * PathResolver.normalize('#/properties/age') // '#/properties/age'
   */
  static normalize(path: string): string {
    if (path.startsWith('#/')) {
      return path;
    }

    // 处理嵌套路径 (如 'user.age')
    if (path.includes('.')) {
      const parts = path.split('.');
      return `#/properties/${parts.join('/properties/')}`;
    }

    return `#/properties/${path}`;
  }

  /**
   * 从 JSON Pointer 路径提取字段名
   * @param path - JSON Pointer 路径
   * @returns 实际的字段路径（用于 react-hook-form）
   *
   * @example
   * PathResolver.toFieldPath('#/properties/user/age') // 'user.age'
   * PathResolver.toFieldPath('age') // 'age'
   */
  static toFieldPath(path: string): string {
    if (!path.startsWith('#/')) {
      return path;
    }

    const cleanPath = path.replace(/^#\//, '');
    const segments = cleanPath.split('/').filter(s => s !== 'properties');
    return segments.join('.');
  }

  /**
   * 获取嵌套对象的值（支持点号路径）
   */
  private static getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * 解码 JSON Pointer 转义字符
   * 根据 RFC 6901 规范：
   * - ~1 表示 /
   * - ~0 表示 ~
   */
  private static decodePointerSegment(segment: string): string {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  /**
   * 编码 JSON Pointer 转义字符
   */
  static encodePointerSegment(segment: string): string {
    return segment.replace(/~/g, '~0').replace(/\//g, '~1');
  }
}
```

**关键特性**：

- ✅ **多格式支持**：同时支持简单字段名、点号路径和 JSON Pointer 格式
- ✅ **双向转换**：`normalize()` 转换为 JSON Pointer，`toFieldPath()` 转换为字段路径
- ✅ **嵌套路径**：`getNestedValue()` 支持点号分隔的嵌套路径（如 `user.profile.age`）
- ✅ **RFC 6901 兼容**：正确处理 JSON Pointer 转义字符（`~0` 和 `~1`）
- ✅ **空值安全**：在路径解析过程中正确处理 `null` 和 `undefined`

#### 使用示例

```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "age": {
          "type": "integer",
          "title": "年龄"
        },
        "address": {
          "type": "object",
          "properties": {
            "city": {
              "type": "string",
              "title": "城市"
            }
          }
        }
      }
    },
    "driverLicense": {
      "type": "string",
      "title": "驾照编号",
      "ui": {
        "linkage": {
          "type": "visibility",
          "dependencies": ["#/properties/user/age"],
          "when": {
            "field": "#/properties/user/age",
            "operator": ">=",
            "value": 18
          }
        }
      }
    }
  }
}
```

### 10.2 fulfill/otherwise 双分支设计

`fulfill/otherwise` 双分支语法已在类型系统中完整支持（参见第 6.1 节的 `LinkageConfig` 和 `LinkageEffect` 类型定义），提供了更清晰的条件分支语义。

#### 使用示例

```json
{
  "type": "object",
  "properties": {
    "age": {
      "type": "integer",
      "title": "年龄"
    },
    "driverLicense": {
      "type": "string",
      "title": "驾照编号",
      "ui": {
        "linkage": {
          "type": "disabled",
          "dependencies": ["#/properties/age"],
          "when": {
            "field": "age",
            "operator": "<",
            "value": 18
          },
          "fulfill": {
            "state": { "disabled": true }
          },
          "otherwise": {
            "state": { "disabled": false }
          }
        }
      }
    }
  }
}
```

**说明**：

- `fulfill/otherwise` 双分支语法已在第 6.3 节的 `evaluateLinkage` 函数中完整实现
- 该语法提供了更清晰的条件分支语义，使配置更易读
- 实际实现中同时支持自定义函数和 `when/fulfill/otherwise` 语法

### 10.3 表达式安全性考虑

#### 安全风险

如果支持字符串表达式（如 `"{{ $deps[0] > 18 }}"`），需要注意以下安全风险：

1. **代码注入**：恶意表达式可能执行任意代码
2. **原型链污染**：访问 `__proto__` 等危险属性
3. **性能问题**：复杂表达式可能导致性能下降

#### 安全策略

**方案一：禁用字符串表达式（推荐）**

只支持结构化的条件对象，不支持字符串表达式：

```typescript
// ✅ 安全：结构化条件
{
  "when": {
    "field": "age",
    "operator": ">",
    "value": 18
  }
}

// ❌ 不支持：字符串表达式
{
  "when": "{{ $deps[0] > 18 }}"
}
```

**方案二：使用安全的表达式库**

如果必须支持字符串表达式，使用专门的表达式解析库：

```typescript
// 推荐的安全表达式库
import { evaluate } from 'expr-eval'; // 数学表达式
import filtrex from 'filtrex'; // 过滤表达式

// 示例：使用 expr-eval
function evaluateExpression(expr: string, context: Record<string, any>): any {
  try {
    const parser = new Parser();
    return parser.evaluate(expr, context);
  } catch (error) {
    console.error('Expression evaluation failed:', error);
    return false;
  }
}
```

**方案三：沙箱执行（高级）**

使用 Web Worker 或 VM 沙箱隔离表达式执行：

```typescript
// 使用 vm2 库（Node.js 环境）
import { VM } from 'vm2';

function evaluateInSandbox(expr: string, context: Record<string, any>): any {
  const vm = new VM({
    timeout: 1000, // 1秒超时
    sandbox: context,
  });

  return vm.run(expr);
}
```

#### 我们的建议

**采用方案一**：只支持结构化条件对象，通过函数引用处理复杂逻辑。

优势：

- ✅ 完全安全，无代码注入风险
- ✅ 类型安全，编译时检查
- ✅ 易于测试和调试
- ✅ 性能更好

### 10.4 DAG 依赖图优化

#### 问题背景

当表单字段之间存在复杂的联动关系时，需要构建依赖图来优化性能：

```
price ──┐
        ├──> total ──> discount
quantity┘
```

如果 `price` 变化，只需要更新 `total` 和 `discount`，而不是重新计算所有字段。

#### 依赖图构建

**实际实现**：`src/utils/dependencyGraph.ts`

```typescript
/**
 * 循环依赖错误
 */
export class CircularDependencyError extends Error {
  constructor(
    public readonly cycle: string[],
    message?: string
  ) {
    super(message || `检测到循环依赖: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * 依赖图检测结果
 */
export interface DependencyGraphValidation {
  /** 是否有效（无循环依赖） */
  isValid: boolean;
  /** 循环依赖路径（如果存在） */
  cycle: string[] | null;
  /** 错误信息 */
  error?: string;
}

/**
 * 依赖图（DAG）管理器
 * 用于优化联动字段的更新顺序和性能
 */
export class DependencyGraph {
  // 依赖关系图：key 是源字段，value 是依赖该字段的目标字段集合
  private graph: Map<string, Set<string>> = new Map();
  // 反向依赖图：key 是目标字段，value 是该字段依赖的源字段集合
  private reverseGraph: Map<string, Set<string>> = new Map();

  /**
   * 添加依赖关系
   * @param target - 目标字段（依赖其他字段的字段）
   * @param source - 源字段（被依赖的字段）
   */
  addDependency(target: string, source: string) {
    // 正向依赖图：source -> target
    if (!this.graph.has(source)) {
      this.graph.set(source, new Set());
    }
    this.graph.get(source)!.add(target);

    // 反向依赖图：target -> source（用于拓扑排序时计算入度）
    if (!this.reverseGraph.has(target)) {
      this.reverseGraph.set(target, new Set());
    }
    this.reverseGraph.get(target)!.add(source);
  }

  /**
   * 获取字段的所有依赖（该字段依赖哪些字段）
   */
  getDependencies(field: string): string[] {
    const deps = this.reverseGraph.get(field);
    return deps ? Array.from(deps) : [];
  }

  /**
   * 获取受影响的字段
   * 当某个字段变化时，返回所有需要更新的字段
   */
  getAffectedFields(changedField: string): string[] {
    const affected: string[] = [];
    const visited = new Set<string>();

    const dfs = (field: string) => {
      if (visited.has(field)) return;
      visited.add(field);

      const dependents = this.graph.get(field);
      if (dependents) {
        dependents.forEach(dependent => {
          if (!visited.has(dependent)) {
            affected.push(dependent);
          }
          dfs(dependent);
        });
      }
    };

    dfs(changedField);
    return affected;
  }

  /**
   * 检测循环依赖
   * @param throwOnCycle - 是否在检测到循环时抛出错误
   * @returns 如果存在循环依赖，返回循环路径；否则返回 null
   * @throws CircularDependencyError 如果 throwOnCycle 为 true 且存在循环依赖
   */
  detectCycle(throwOnCycle: boolean = false): string[] | null {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];
    let cycleStart: string | null = null;

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = this.graph.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (dfs(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            cycleStart = neighbor;
            return true;
          }
        }
      }

      recStack.delete(node);
      path.pop();
      return false;
    };

    for (const node of this.graph.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          // 提取完整的循环路径
          const cycleStartIndex = path.indexOf(cycleStart!);
          const cyclePath =
            cycleStartIndex >= 0
              ? [...path.slice(cycleStartIndex), cycleStart!]
              : [...path, path[0]];

          if (throwOnCycle) {
            throw new CircularDependencyError(cyclePath);
          }
          return cyclePath;
        }
      }
    }

    return null;
  }

  /**
   * 验证依赖图的有效性
   * @returns 验证结果，包含是否有效、循环路径和错误信息
   */
  validate(): DependencyGraphValidation {
    const cycle = this.detectCycle(false);
    if (cycle) {
      return {
        isValid: false,
        cycle,
        error: `检测到循环依赖: ${cycle.join(' -> ')}`,
      };
    }
    return { isValid: true, cycle: null };
  }

  /**
   * 获取所有源字段（被依赖的字段）
   */
  getSources(): string[] {
    return Array.from(this.graph.keys());
  }

  /**
   * 获取字段的直接依赖者
   */
  getDirectDependents(field: string): string[] {
    const dependents = this.graph.get(field);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * 拓扑排序：返回按依赖顺序排列的字段列表（Kahn 算法）
   * @param fields - 需要排序的字段列表
   * @param options - 排序选项
   * @returns 按拓扑顺序排列的字段列表
   */
  topologicalSort(
    fields: string[],
    options: {
      throwOnCycle?: boolean;
      onCycleDetected?: (cycle: string[]) => void;
    } = {}
  ): string[] {
    const { throwOnCycle = false, onCycleDetected } = options;
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, Set<string>>();

    // 初始化入度和邻接表
    const fieldSet = new Set(fields);
    fields.forEach(field => {
      inDegree.set(field, 0);
      adjList.set(field, new Set());
    });

    // 构建邻接表和计算入度
    fields.forEach(field => {
      const dependents = this.graph.get(field);
      if (dependents) {
        dependents.forEach(dependent => {
          if (fieldSet.has(dependent)) {
            adjList.get(field)!.add(dependent);
            inDegree.set(dependent, (inDegree.get(dependent) || 0) + 1);
          }
        });
      }
    });

    // Kahn 算法进行拓扑排序
    const queue: string[] = [];
    const result: string[] = [];

    inDegree.forEach((degree, field) => {
      if (degree === 0) queue.push(field);
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjList.get(current);
      if (neighbors) {
        neighbors.forEach(neighbor => {
          const newDegree = (inDegree.get(neighbor) || 0) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) queue.push(neighbor);
        });
      }
    }

    // 检测循环依赖
    if (result.length < fields.length) {
      const cycleNodes = fields.filter(f => !result.includes(f));
      if (onCycleDetected) onCycleDetected(cycleNodes);
      if (throwOnCycle) throw new CircularDependencyError(cycleNodes);
      console.warn('拓扑排序检测到循环依赖:', cycleNodes.join(' -> '));
      return [...result, ...cycleNodes];
    }

    return result;
  }

  /**
   * 清空依赖图
   */
  clear() {
    this.graph.clear();
    this.reverseGraph.clear();
  }
}
```

**关键特性**：

- ✅ **循环依赖错误类**：`CircularDependencyError` 提供结构化的错误信息
- ✅ **依赖图验证**：`validate()` 方法返回详细的验证结果
- ✅ **循环依赖检测**：`detectCycle()` 支持可选的抛出错误模式
- ✅ **真正的拓扑排序**：`topologicalSort()` 使用 Kahn 算法确保正确的执行顺序
- ✅ **性能优化**：只计算和更新真正受影响的字段，避免全量重新计算
- ✅ **辅助方法**：提供 `getSources()`、`getDirectDependents()`、`clear()` 等实用方法

#### 在联动管理器中使用

在 `useLinkageManager` 中构建依赖图并进行循环检测：

```typescript
// src/hooks/useLinkageManager.ts

// 构建依赖图
const dependencyGraph = useMemo(() => {
  const graph = new DependencyGraph();

  Object.entries(linkages).forEach(([fieldName, linkage]) => {
    linkage.dependencies.forEach(dep => {
      const normalizedDep = PathResolver.toFieldPath(dep);
      graph.addDependency(fieldName, normalizedDep);
    });
  });

  // 检测循环依赖
  const cycle = graph.detectCycle();
  if (cycle) {
    console.error('检测到循环依赖:', cycle.join(' -> '));
  }

  return graph;
}, [linkages]);
```

**按拓扑顺序执行联动**（关键改进）：

```typescript
useEffect(() => {
  const subscription = watch((_, { name }) => {
    if (!name) return;

    // 获取受影响的字段
    const affectedFields = dependencyGraph.getAffectedFields(name);
    if (affectedFields.length === 0) return;

    (async () => {
      const formData = { ...getValues() };

      // 关键：对受影响的字段进行拓扑排序，确保按依赖顺序计算
      const sortedFields = dependencyGraph.topologicalSort(affectedFields);

      // 按拓扑顺序串行执行联动（而非并行）
      for (const fieldName of sortedFields) {
        const linkage = linkages[fieldName];
        if (!linkage) continue;

        const result = await evaluateLinkage(linkage, formData, linkageFunctions);

        // 处理值联动：更新 formData 以供后续字段使用
        if (linkage.type === 'value' && result.value !== undefined) {
          formData[fieldName] = result.value;
          form.setValue(fieldName, result.value, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }

        newStates[fieldName] = result;
      }

      setLinkageStates(prev => ({ ...prev, ...newStates }));
    })();
  });

  return () => subscription.unsubscribe();
}, [watch, form, linkages, linkageFunctions, dependencyGraph]);
```

**关键改进说明**：

1. **拓扑排序**：使用 `topologicalSort()` 确保字段按依赖顺序计算
2. **串行执行**：使用 `for...of` 循环串行执行，而非 `Promise.all` 并行执行
3. **实时更新 formData**：每个字段计算后立即更新 `formData`，确保后续字段能获取最新值

### 10.5 readonly 状态支持

#### 扩展 LinkageResult 类型

```typescript
// src/types/linkage.ts

export interface LinkageResult {
  visible?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  value?: any;
  options?: Array<{ label: string; value: any }>;
}
```

#### 使用示例

```json
{
  "type": "object",
  "properties": {
    "autoConfig": {
      "type": "boolean",
      "title": "自动配置"
    },
    "memory": {
      "type": "integer",
      "title": "内存大小",
      "ui": {
        "linkage": {
          "type": "value",
          "dependencies": ["#/properties/autoConfig"],
          "when": {
            "field": "autoConfig",
            "operator": "==",
            "value": true
          },
          "fulfill": {
            "state": { "readonly": true },
            "value": 2048
          },
          "otherwise": {
            "state": { "readonly": false }
          }
        }
      }
    }
  }
}
```

#### 在字段组件中应用

```typescript
// src/components/DynamicForm/FormField.tsx

function FormField({ fieldName, linkageStates }: FormFieldProps) {
  const linkageState = linkageStates[fieldName];

  return (
    <input
      name={fieldName}
      disabled={linkageState?.disabled}
      readOnly={linkageState?.readonly}
      style={{ display: linkageState?.visible === false ? 'none' : 'block' }}
    />
  );
}
```

### 10.6 数组字段的联动支持

数组字段的联动需要特殊处理，因为涉及到相对路径、动态索引和嵌套表单联动状态传递。

**详细设计请参考**：[数组字段联动设计方案](./ARRAY_FIELD_LINKAGE.md)

该专门文档详细描述了：
- **核心挑战**：相对路径依赖、动态索引、菱形依赖、嵌套表单联动状态传递
- **解决方案架构**：
  - 嵌套表单联动状态传递方案（分层计算）
  - 模板依赖图方案
- **基础场景**：相对路径、绝对路径、菱形依赖
- **复杂场景**：混合依赖、跨数组依赖、嵌套数组联动、数组聚合计算
- **完整实现方案**：工具函数、Schema 解析、运行时管理、Context 协调
- **最佳实践**：路径引用规范、性能优化、调试技巧

#### 嵌套表单联动状态传递

当 ArrayFieldWidget 渲染对象类型数组元素时，通过 NestedFormWidget 创建新的 DynamicForm 实例。为了高效传递联动状态，我们采用**分层计算方案**：

**核心原则**：
- 每层 DynamicForm 只计算自己范围内的联动
- 通过 Context 共享表单实例和父级联动状态
- 按需计算，支持虚拟滚动和懒加载

**快速示例**：

```typescript
// 相对路径依赖
{
  contacts: {
    type: 'array',
    items: {
      properties: {
        type: { type: 'string', enum: ['personal', 'work'] },
        companyName: {
          type: 'string',
          ui: {
            linkage: {
              type: 'visibility',
              dependencies: ['./type'],  // 相对路径
              when: { field: './type', operator: '==', value: 'work' }
            }
          }
        }
      }
    }
  }
}
```

**处理流程**：
1. Schema 解析：识别 `contacts.companyName` 的联动配置
2. 模板依赖：`contacts.companyName` → `contacts.type`
3. 运行时实例化：为每个数组元素生成绝对路径



更多详细示例和实现细节请参考 [数组字段联动设计方案](./ARRAY_FIELD_LINKAGE.md)。

