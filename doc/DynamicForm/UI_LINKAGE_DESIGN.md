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
  type: 'visibility' | 'disabled' | 'readonly' | 'computed' | 'options';

  // 依赖的字段
  dependencies: string[];

  // 联动条件（支持表达式或函数名）
  condition?: string | ConditionExpression;

  // 联动函数名（用于复杂逻辑）
  function?: string;
}
```

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
          "condition": {
            "field": "hasAddress",
            "operator": "==",
            "value": true
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
          "condition": {
            "field": "accountType",
            "operator": "==",
            "value": "free"
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
          "type": "computed",
          "dependencies": ["price", "quantity"],
          "function": "calculateTotal"
        }
      }
    }
  }
}
```

对应的计算函数：
```typescript
const linkageFunctions = {
  calculateTotal: (formData: any) => {
    return (formData.price || 0) * (formData.quantity || 0);
  }
};
```

### 3.4 条件性设置字段值（value 类型）

**说明**：`value` 类型用于根据条件表达式的结果，直接设置字段的值（而不是通过函数计算）。

#### 方式一：使用 condition + targetValue

```json
{
  "type": "object",
  "properties": {
    "membershipType": {
      "type": "string",
      "title": "会员类型",
      "enum": ["free", "premium", "vip"]
    },
    "maxProjects": {
      "type": "integer",
      "title": "最大项目数",
      "ui": {
        "readonly": true,
        "linkage": {
          "type": "value",
          "dependencies": ["membershipType"],
          "condition": {
            "field": "membershipType",
            "operator": "==",
            "value": "free"
          },
          "targetValue": 3
        }
      }
    }
  }
}
```

**说明**：当 `membershipType` 为 "free" 时，`maxProjects` 自动设置为 3。

#### 方式二：使用 when/fulfill/otherwise（推荐）

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

#### value 类型 vs computed 类型

| 特性 | `value` 类型 | `computed` 类型 |
|------|-------------|----------------|
| **值的来源** | 配置中直接指定（`targetValue` 或 `fulfill.value`） | 通过函数计算得出 |
| **适用场景** | 条件性设置固定值、预设值 | 需要计算的值（如总价、折扣） |
| **是否需要函数** | 否 | 是（必须提供 `function` 参数） |
| **典型用例** | 根据会员类型设置配额、根据开关设置默认值 | 总价 = 单价 × 数量、BMI 计算 |

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
          "function": "getProvinceOptions"
        }
      }
    }
  }
}
```

对应的选项函数：
```typescript
const linkageFunctions = {
  getProvinceOptions: (formData: any) => {
    if (formData.country === 'china') {
      return [
        { label: '北京', value: 'beijing' },
        { label: '上海', value: 'shanghai' }
      ];
    } else if (formData.country === 'usa') {
      return [
        { label: 'California', value: 'ca' },
        { label: 'New York', value: 'ny' }
      ];
    }
    return [];
  }
};
```

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
          "condition": {
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
          "condition": {
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
          "condition": {
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
export type LinkageType = 'visibility' | 'disabled' | 'readonly' | 'value' | 'computed' | 'options';

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
 * 联动效果定义
 */
export interface LinkageEffect {
  state?: {
    visible?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
  };
  value?: any;
}

/**
 * 联动配置
 */
export interface LinkageConfig {
  type: LinkageType;
  dependencies: string[];

  // 原有的单条件方式（向后兼容）
  condition?: ConditionExpression;
  function?: string;
  targetValue?: any; // 用于 value 类型联动的目标值

  // 新增：双分支方式
  when?: ConditionExpression | string;  // 条件表达式或函数名
  fulfill?: LinkageEffect;              // 条件满足时的效果
  otherwise?: LinkageEffect;            // 条件不满足时的效果
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
```

### 6.2 条件表达式求值器

```typescript
// src/utils/conditionEvaluator.ts

export class ConditionEvaluator {
  /**
   * 求值条件表达式
   */
  static evaluate(
    condition: ConditionExpression,
    formData: Record<string, any>
  ): boolean {
    // 处理逻辑组合
    if (condition.and) {
      return condition.and.every(c => this.evaluate(c, formData));
    }

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
   * 获取字段值（支持嵌套路径）
   */
  private static getFieldValue(
    formData: Record<string, any>,
    fieldPath: string
  ): any {
    const keys = fieldPath.split('.');
    let value = formData;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
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
        return fieldValue === null ||
               fieldValue === undefined ||
               fieldValue === '' ||
               (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'isNotEmpty':
        return fieldValue !== null &&
               fieldValue !== undefined &&
               fieldValue !== '' &&
               (!Array.isArray(fieldValue) || fieldValue.length > 0);

      default:
        return false;
    }
  }
}
```

---

**下一部分**：联动管理器实现

### 6.3 联动管理器

```typescript
// src/hooks/useLinkageManager.ts

import { useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LinkageConfig, LinkageResult, LinkageFunction } from '@/types/linkage';
import { ConditionEvaluator } from '@/utils/conditionEvaluator';

interface LinkageManagerOptions {
  form: UseFormReturn<any>;
  linkages: Record<string, LinkageConfig>;
  linkageFunctions?: Record<string, LinkageFunction>;
}

export function useLinkageManager({
  form,
  linkages,
  linkageFunctions = {}
}: LinkageManagerOptions) {
  const { watch, setValue, getValues } = form;

  // 收集所有需要监听的字段
  const watchFields = useMemo(() => {
    const fields = new Set<string>();
    Object.values(linkages).forEach(linkage => {
      linkage.dependencies.forEach(dep => fields.add(dep));
    });
    return Array.from(fields);
  }, [linkages]);

  // 监听所有依赖字段
  const watchedValues = watch(watchFields);

  // 计算每个字段的联动状态
  const linkageStates = useMemo(() => {
    const formData = getValues();
    const states: Record<string, LinkageResult> = {};

    Object.entries(linkages).forEach(([fieldName, linkage]) => {
      states[fieldName] = evaluateLinkage(linkage, formData, linkageFunctions);
    });

    return states;
  }, [watchedValues, linkages, linkageFunctions]);

  return linkageStates;
}

/**
 * 求值单个联动配置
 */
function evaluateLinkage(
  linkage: LinkageConfig,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>
): LinkageResult {
  const result: LinkageResult = {};

  // 如果指定了自定义函数，优先使用
  if (linkage.function && linkageFunctions[linkage.function]) {
    const fnResult = linkageFunctions[linkage.function](formData);

    // 根据联动类型处理返回值
    switch (linkage.type) {
      case 'visibility':
        result.visible = Boolean(fnResult);
        break;
      case 'disabled':
        result.disabled = Boolean(fnResult);
        break;
      case 'readonly':
        result.readonly = Boolean(fnResult);
        break;
      case 'computed':
        result.value = fnResult;
        break;
      case 'options':
        result.options = fnResult;
        break;
    }

    return result;
  }

  // 如果有条件表达式，求值条件
  if (linkage.condition) {
    const conditionMet = ConditionEvaluator.evaluate(linkage.condition, formData);

    switch (linkage.type) {
      case 'visibility':
        result.visible = conditionMet;
        break;
      case 'disabled':
        result.disabled = conditionMet;
        break;
      case 'readonly':
        result.readonly = conditionMet;
        break;
    }
  }

  return result;
}
```

### 6.4 计算字段自动更新

**实现说明**：计算字段的自动更新功能已集成到 `useLinkageManager` 和 `FormField` 组件中，无需单独的 Hook。

#### 实现方式

**1. useLinkageManager 中的值联动处理**

```typescript
// src/hooks/useLinkageManager.ts (第 78-89 行)

useEffect(() => {
  const subscription = watch((_, { name }) => {
    if (!name) return;
    const affectedFields = dependencyGraph.getAffectedFields(name);
    if (affectedFields.length === 0) return;

    const formData = getValues();

    affectedFields.forEach(fieldName => {
      const linkage = linkages[fieldName];
      if (!linkage) return;

      const result = evaluateLinkage(linkage, formData, linkageFunctions);

      // 处理值联动：自动更新表单字段值
      if (
        (linkage.type === 'computed' || linkage.type === 'value') &&
        result.value !== undefined
      ) {
        const currentValue = formData[fieldName];
        if (currentValue !== result.value) {
          form.setValue(fieldName, result.value, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    });
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
- ✅ **向后兼容**：支持所有联动类型（visibility、disabled、readonly、value、computed、options）


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
          condition: {
            field: "hasAddress",
            operator: "==",
            value: true
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
          type: "computed",
          dependencies: ["price", "quantity"],
          function: "calculateTotal"
        }
      }
    }
  }
};

const linkageFunctions = {
  calculateTotal: (formData: any) => {
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
          function: "getProvinceOptions"
        }
      }
    }
  },
  required: ["country", "province"]
};

const linkageFunctions = {
  getProvinceOptions: (formData: any) => {
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

| 层面 | 负责内容 | 实现方式 |
|------|---------|---------|
| **JSON Schema** | 数据验证 | `required`, `minLength`, `pattern`, `if/then/else`, `dependencies` 等 |
| **UI 扩展 (ui.linkage)** | UI 联动逻辑 | `visibility`, `disabled`, `readonly`, `computed`, `options` |
| **react-hook-form** | 表单状态管理 | `watch`, `setValue`, `trigger`, `getValues` |

### 9.2 关键优势

1. **职责清晰**：验证逻辑和 UI 逻辑分离
2. **标准兼容**：遵循 JSON Schema 标准
3. **性能优化**：只监听必要的字段变化
4. **类型安全**：完整的 TypeScript 类型定义
5. **易于扩展**：支持自定义联动函数

### 9.3 与之前设计的对比

| 方面 | 之前的设计 | 新设计 |
|------|-----------|--------|
| 条件渲染位置 | 滥用 JSON Schema 验证关键字 | 在 `ui.linkage` 中定义 |
| 职责 | 混淆验证和 UI 逻辑 | 职责清晰分离 |
| 与 RHF 集成 | 未考虑 | 深度集成 `watch`/`setValue` |
| 性能 | 可能过度渲染 | 精确监听依赖字段 |


---

## 10. 补充设计：参考其他方案的改进

### 10.1 JSON Pointer 路径引用

为了支持嵌套对象和更标准化的字段引用，我们扩展 `dependencies` 支持 JSON Pointer 格式。

#### 路径格式

```typescript
// 简单字段名（向后兼容）
dependencies: ["age", "income"]

// JSON Pointer 格式（推荐）
dependencies: ["#/properties/age", "#/properties/address/city"]

// 支持嵌套对象
dependencies: ["#/properties/user/name", "#/properties/user/profile/age"]
```

#### 路径解析工具

```typescript
// src/utils/pathResolver.ts

export class PathResolver {
  /**
   * 解析 JSON Pointer 路径
   */
  static resolve(path: string, formData: Record<string, any>): any {
    // 如果不是 JSON Pointer 格式，直接返回字段值
    if (!path.startsWith('#/')) {
      return formData[path];
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
      
      value = value[segment];
    }
    
    return value;
  }

  /**
   * 标准化路径格式
   */
  static normalize(path: string): string {
    if (path.startsWith('#/')) {
      return path;
    }
    return `#/properties/${path}`;
  }
}
```


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
          "condition": {
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

参考其他方案，我们扩展联动配置支持更清晰的条件分支语义。

#### 扩展的 LinkageConfig 类型

```typescript
// src/types/linkage.ts

export interface LinkageConfig {
  type: LinkageType;
  dependencies: string[];
  
  // 原有的单条件方式（向后兼容）
  condition?: ConditionExpression;
  function?: string;
  
  // 新增：双分支方式
  when?: ConditionExpression | string;  // 条件表达式
  fulfill?: LinkageEffect;              // 条件满足时的效果
  otherwise?: LinkageEffect;            // 条件不满足时的效果
}

/**
 * 联动效果定义
 */
export interface LinkageEffect {
  state?: {
    visible?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
  };
  value?: any;
}
```


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


#### 求值逻辑更新

```typescript
// src/hooks/useLinkageManager.ts

function evaluateLinkage(
  linkage: LinkageConfig,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>
): LinkageResult {
  const result: LinkageResult = {};

  // 支持新的 when/fulfill/otherwise 语法
  if (linkage.when && (linkage.fulfill || linkage.otherwise)) {
    const conditionMet = evaluateCondition(linkage.when, formData);
    const effect = conditionMet ? linkage.fulfill : linkage.otherwise;
    
    if (effect) {
      // 应用状态变更
      if (effect.state) {
        Object.assign(result, effect.state);
      }
      // 应用值变更
      if (effect.value !== undefined) {
        result.value = effect.value;
      }
    }
    
    return result;
  }

  // 向后兼容原有逻辑...
  // (保留之前的实现)
}
```


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
  "condition": {
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
import { evaluate } from 'expr-eval';  // 数学表达式
import filtrex from 'filtrex';         // 过滤表达式

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
    timeout: 1000,  // 1秒超时
    sandbox: context
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

```typescript
// src/utils/dependencyGraph.ts

export class DependencyGraph {
  private graph: Map<string, Set<string>> = new Map();
  
  /**
   * 添加依赖关系
   */
  addDependency(target: string, source: string) {
    if (!this.graph.has(source)) {
      this.graph.set(source, new Set());
    }
    this.graph.get(source)!.add(target);
  }
  
  /**
   * 获取受影响的字段（拓扑排序）
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
          affected.push(dependent);
          dfs(dependent);
        });
      }
    };
    
    dfs(changedField);
    return affected;
  }
}
```


#### 在联动管理器中使用

```typescript
// src/hooks/useLinkageManager.ts

export function useLinkageManager({
  form,
  linkages,
  linkageFunctions
}: LinkageManagerOptions) {
  const { watch, setValue, getValues } = form;

  // 构建依赖图
  const dependencyGraph = useMemo(() => {
    const graph = new DependencyGraph();
    
    Object.entries(linkages).forEach(([fieldName, linkage]) => {
      linkage.dependencies.forEach(dep => {
        const normalizedDep = PathResolver.normalize(dep);
        graph.addDependency(fieldName, normalizedDep);
      });
    });
    
    return graph;
  }, [linkages]);

  // 监听字段变化，只更新受影响的字段
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (!name) return;
      
      const affectedFields = dependencyGraph.getAffectedFields(name);
      // 只更新受影响的字段...
    });
    
    return () => subscription.unsubscribe();
  }, [watch, dependencyGraph]);
}
```


### 10.5 readonly 状态支持

#### 扩展 LinkageResult 类型

```typescript
// src/types/linkage.ts

export interface LinkageResult {
  visible?: boolean;
  disabled?: boolean;
  readonly?: boolean;  // 新增：只读状态
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
          "type": "computed",
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

