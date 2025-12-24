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

### 3.4 动态选项

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

```typescript
// src/types/linkage.ts

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

```typescript
// src/hooks/useComputedFields.ts

import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LinkageConfig, LinkageFunction } from '@/types/linkage';

interface ComputedFieldsOptions {
  form: UseFormReturn<any>;
  computedFields: Record<string, LinkageConfig>;
  linkageFunctions: Record<string, LinkageFunction>;
}

export function useComputedFields({
  form,
  computedFields,
  linkageFunctions
}: ComputedFieldsOptions) {
  const { watch, setValue, getValues } = form;

  // 收集所有计算字段的依赖
  const dependencies = Object.values(computedFields).flatMap(
    config => config.dependencies
  );

  // 监听依赖字段变化
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // 如果变化的字段是某个计算字段的依赖
      if (name && dependencies.includes(name)) {
        const formData = getValues();

        // 更新所有相关的计算字段
        Object.entries(computedFields).forEach(([fieldName, config]) => {
          if (config.dependencies.includes(name)) {
            const fn = linkageFunctions[config.function!];
            if (fn) {
              const computedValue = fn(formData);
              setValue(fieldName, computedValue, { shouldValidate: true });
            }
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue, getValues, computedFields, linkageFunctions, dependencies]);
}
```

### 6.5 在 DynamicForm 中集成

```typescript
// src/components/DynamicForm/DynamicForm.tsx

import React from 'react';
import { useForm } from 'react-hook-form';
import { useLinkageManager } from '@/hooks/useLinkageManager';
import { useComputedFields } from '@/hooks/useComputedFields';
import { ExtendedJSONSchema } from '@/types/schema';
import { LinkageFunction } from '@/types/linkage';

interface DynamicFormProps {
  schema: ExtendedJSONSchema;
  defaultValues?: Record<string, any>;
  linkageFunctions?: Record<string, LinkageFunction>;
  onSubmit?: (data: Record<string, any>) => void;
}

export function DynamicForm({
  schema,
  defaultValues,
  linkageFunctions = {},
  onSubmit
}: DynamicFormProps) {
  const form = useForm({ defaultValues });

  // 解析 schema 中的联动配置
  const { linkages, computedFields } = parseSchemaLinkages(schema);

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

  // 渲染表单字段...
  return (
    <form onSubmit={form.handleSubmit(onSubmit || (() => {}))}>
      {/* 渲染字段，应用 linkageStates */}
    </form>
  );
}
```
---

## 7. Schema 解析器更新

### 7.1 解析联动配置

```typescript
// src/utils/schemaParser.ts

import { ExtendedJSONSchema } from '@/types/schema';
import { LinkageConfig } from '@/types/linkage';

interface ParsedLinkages {
  linkages: Record<string, LinkageConfig>;
  computedFields: Record<string, LinkageConfig>;
}

export function parseSchemaLinkages(schema: ExtendedJSONSchema): ParsedLinkages {
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

