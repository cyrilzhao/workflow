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
// 单条件表达式
interface SingleCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

// 逻辑组合表达式
interface LogicalCondition {
  and?: ConditionExpression[];
  or?: ConditionExpression[];
}

// 条件表达式（联合类型）
export type ConditionExpression = SingleCondition | LogicalCondition;

// 条件操作符
type ConditionOperator =
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
```

**说明**：使用联合类型确保类型安全，单条件和逻辑组合不能混用。

### 2.3 路径引用格式

联动配置中的字段引用支持以下格式：

| 格式             | 语法               | 使用场景               | 示例                               |
| ---------------- | ------------------ | ---------------------- | ---------------------------------- |
| **JSON Pointer** | `#/properties/...` | 跨层级字段引用（推荐） | `#/properties/user/properties/age` |
| **相对路径**     | `./fieldName`      | 数组元素内部字段引用   | `./type`                           |
| **简单字段名**   | `fieldName`        | 同级字段引用（不推荐） | `age`                              |

**推荐使用 JSON Pointer 格式**，它提供了明确的路径语义，避免歧义。

详细的路径系统说明请参考：[字段路径完全指南](./FIELD_PATH_GUIDE.md)

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
          "dependencies": ["#/properties/hasAddress"],
          "when": {
            "field": "#/properties/hasAddress",
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
          "dependencies": ["#/properties/accountType"],
          "when": {
            "field": "#/properties/accountType",
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
          "dependencies": ["#/properties/price", "#/properties/quantity"],
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
  },
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
          "dependencies": ["#/properties/country"],
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
          "dependencies": ["#/properties/age", "#/properties/income"],
          "when": {
            "and": [
              {
                "field": "#/properties/age",
                "operator": ">=",
                "value": 18
              },
              {
                "field": "#/properties/income",
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
          "dependencies": ["#/properties/userType", "#/properties/country", "#/properties/age"],
          "when": {
            "and": [
              {
                "field": "#/properties/userType",
                "operator": "==",
                "value": "individual"
              },
              {
                "or": [
                  {
                    "and": [
                      {
                        "field": "#/properties/country",
                        "operator": "==",
                        "value": "china"
                      },
                      {
                        "field": "#/properties/age",
                        "operator": ">=",
                        "value": 16
                      }
                    ]
                  },
                  {
                    "and": [
                      {
                        "field": "#/properties/country",
                        "operator": "==",
                        "value": "japan"
                      },
                      {
                        "field": "#/properties/age",
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

**说明**：用户类型必须是"个人" **且**（国家是中国 **且** 年龄 ≥ 16）**或**（国家是日本 **且** 年龄 ≥ 20）

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
          "dependencies": ["#/properties/hasAddress"],
          "when": {
            "field": "#/properties/hasAddress",
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
 * 单条件表达式
 */
interface SingleCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

/**
 * 逻辑组合表达式
 */
interface LogicalCondition {
  and?: ConditionExpression[];
  or?: ConditionExpression[];
}

/**
 * 条件表达式（联合类型）
 */
export type ConditionExpression = SingleCondition | LogicalCondition;

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
  options?: Array<{ label: string; value: any }>;
  function?: string;
}

/**
 * 联动配置
 */
export interface LinkageConfig {
  type: LinkageType;
  dependencies: string[];
  when?: ConditionExpression | string;
  fulfill?: LinkageEffect;
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
  static evaluate(condition: ConditionExpression, formData: Record<string, any>): boolean {
    // 处理逻辑组合 - and
    if ('and' in condition && condition.and) {
      return condition.and.every(c => this.evaluate(c, formData));
    }

    // 处理逻辑组合 - or
    if ('or' in condition && condition.or) {
      return condition.or.some(c => this.evaluate(c, formData));
    }

    // 单条件求值
    if ('field' in condition) {
      const fieldValue = PathResolver.resolve(condition.field, formData);
      return this.evaluateOperator(fieldValue, condition.operator, condition.value);
    }

    return false;
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

### 6.3 联动管理器

**实际实现**：`src/hooks/useLinkageManager.ts`

核心功能：

1. **构建依赖图**：使用 `DependencyGraph` 管理字段依赖关系
2. **初始化联动状态**：并行计算所有字段的初始状态
3. **监听字段变化**：使用 `watch` 监听依赖字段变化
4. **精确更新**：只重新计算受影响的字段
5. **自动值更新**：`value` 类型联动自动调用 `form.setValue`

```typescript
export function useLinkageManager({
  form,
  linkages,
  linkageFunctions = {},
  pathMappings = [],
}: LinkageManagerOptions) {
  const { watch, getValues } = form;

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

  // 联动状态缓存
  const [linkageStates, setLinkageStates] = useState<Record<string, LinkageResult>>({});

  // 初始化联动状态
  useEffect(() => {
    (async () => {
      const formData = getValues();
      const states: Record<string, LinkageResult> = {};

      // 并行计算所有字段的初始联动状态
      const results = await Promise.allSettled(
        Object.entries(linkages).map(async ([fieldName, linkage]) => ({
          fieldName,
          result: await evaluateLinkage(linkage, formData, linkageFunctions, fieldName),
        }))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          states[result.value.fieldName] = result.value.result;
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

        // 并行计算所有受影响字段的联动结果
        const results = await Promise.allSettled(
          affectedFields.map(async fieldName => {
            const linkage = linkages[fieldName];
            if (!linkage) return null;

            const result = await evaluateLinkage(linkage, formData, linkageFunctions, fieldName);
            return { fieldName, linkage, result };
          })
        );

        // 处理结果
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
          }
        });

        // 批量更新状态
        if (Object.keys(newStates).length > 0) {
          setLinkageStates(prev => ({ ...prev, ...newStates }));
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [watch, form, getValues, linkages, linkageFunctions, dependencyGraph]);

  return linkageStates;
}
```

**关键特性**：

- ✅ 异步支持：完整支持同步和异步联动函数
- ✅ 错误隔离：使用 `Promise.allSettled` 确保单个字段失败不会阻塞其他字段
- ✅ 并行执行：多个字段的联动计算并行执行
- ✅ 依赖图优化：精确计算受影响的字段，避免不必要的重新计算
- ✅ 循环依赖检测：自动检测并警告循环依赖

### 6.4 PathMapping 机制

当使用路径透明化（`flattenPath`）时，逻辑路径和物理路径会不一致。PathMapping 机制用于处理这种映射关系。

**类型定义**：`src/utils/schemaLinkageParser.ts`

```typescript
export interface PathMapping {
  logicalPath: string;
  physicalPath: string;
  isArray?: boolean;
  skippedSegments?: string[];
}
```

**路径转换函数**：

```typescript
export function logicalToPhysicalPath(logicalPath: string, pathMappings: PathMapping[]): string {
  for (const mapping of pathMappings) {
    if (logicalPath === mapping.logicalPath) {
      return mapping.physicalPath;
    }
    if (logicalPath.startsWith(mapping.logicalPath + '.')) {
      const suffix = logicalPath.slice(mapping.logicalPath.length);
      return mapping.physicalPath + suffix;
    }
  }
  return logicalPath;
}
```

### 6.5 分层计算策略

当表单包含嵌套结构时，联动状态的计算采用分层策略。

**核心原则**：

1. 每层 DynamicForm 只计算自己范围内的联动
2. 通过 Context 共享表单实例和父级联动状态
3. 子级过滤掉已在父级计算的联动，避免重复计算

**Context 定义**：

```typescript
interface LinkageStateContextValue {
  parentLinkageStates: Record<string, LinkageResult>;
  form: UseFormReturn<any>;
  rootSchema: ExtendedJSONSchema;
  pathPrefix?: string;
  linkageFunctions?: Record<string, LinkageFunction>;
}
```

### 6.6 DynamicForm 集成

**实际实现**：`src/components/DynamicForm/DynamicForm.tsx`

#### 步骤 1：Context 获取（集中管理）

```typescript
const parentFormContext = useFormContext();
const linkageStateContext = useLinkageStateContext();
const nestedSchemaRegistry = useNestedSchemaRegistryOptional();
```

#### 步骤 2：联动配置解析

```typescript
// 解析 schema 中的联动配置（包含路径映射）
const {
  linkages: rawLinkages,
  pathMappings,
  hasFlattenPath,
} = useMemo(() => {
  const parsed = parseSchemaLinkages(schema);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DynamicForm] 解析 schema 联动配置:', {
      schema: schema.title || 'root',
      pathPrefix,
      asNestedForm,
      rawLinkages: parsed.linkages,
      pathMappingsCount: parsed.pathMappings.length,
      hasFlattenPath: parsed.hasFlattenPath,
    });
  }
  return parsed;
}, [schema, pathPrefix, asNestedForm]);
```

**说明**：

- `parseSchemaLinkages` 解析 Schema，提取联动配置
- 同时生成 PathMapping 表（用于路径透明化）
- 检测是否使用了 `flattenPath`

#### 步骤 3：路径转换和过滤

```typescript
// 统一处理联动配置：路径转换 -> 过滤父级联动
const { processedLinkages, formToUse, effectiveLinkageFunctions } = useMemo(() => {
  // 步骤3.1: 路径转换
  let linkages = rawLinkages;
  if (asNestedForm && pathPrefix) {
    // 将相对路径转换为绝对路径
    const transformed = transformToAbsolutePaths(rawLinkages, pathPrefix);

    // 步骤3.2: 过滤父级已计算的联动
    if (linkageStateContext?.parentLinkageStates) {
      const filtered: Record<string, LinkageConfig> = {};
      Object.entries(transformed).forEach(([key, value]) => {
        // 如果父级没有计算过这个字段，才保留
        if (!(key in linkageStateContext.parentLinkageStates)) {
          filtered[key] = value;
        }
      });
      linkages = filtered;
    } else {
      linkages = transformed;
    }
  }

  // 步骤3.3: 确定使用的表单实例和联动函数
  return {
    processedLinkages: linkages,
    formToUse: linkageStateContext?.form || methods,
    effectiveLinkageFunctions:
      linkageFunctions || linkageStateContext?.linkageFunctions || EMPTY_LINKAGE_FUNCTIONS,
  };
}, [
  rawLinkages,
  asNestedForm,
  pathPrefix,
  linkageStateContext?.parentLinkageStates,
  linkageStateContext?.form,
  linkageStateContext?.linkageFunctions,
  linkageFunctions,
  methods,
]);
```

**说明**：

- **路径转换**：嵌套表单中，将相对路径转换为绝对路径
- **过滤父级联动**：避免重复计算已在父级计算过的联动
- **共享表单实例**：子级使用父级的表单实例，确保数据一致

#### 步骤 4：计算和合并联动状态

```typescript
// 步骤4.1: 计算自己的联动状态
const ownLinkageStates = useArrayLinkageManager({
  form: formToUse,
  baseLinkages: processedLinkages,
  linkageFunctions: effectiveLinkageFunctions,
  schema,
  pathMappings,
});

// 步骤4.2: 合并父级和自己的联动状态
const linkageStates = useMemo(() => {
  if (linkageStateContext?.parentLinkageStates) {
    const merged = { ...linkageStateContext.parentLinkageStates, ...ownLinkageStates };
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DynamicForm] 合并联动状态:', {
        pathPrefix,
        parentStates: linkageStateContext.parentLinkageStates,
        ownStates: ownLinkageStates,
        merged,
      });
    }
    return merged;
  }
  return ownLinkageStates;
}, [linkageStateContext?.parentLinkageStates, ownLinkageStates, pathPrefix]);
```

**说明**：

- **计算自己的状态**：使用 `useArrayLinkageManager` 计算当前层级的联动
- **合并状态**：父级状态 + 自己的状态，确保完整的联动效果
- **调试日志**：开发环境下输出详细日志，便于调试

#### 步骤 5：渲染字段并传递 Context

```typescript
const renderFields = () => {
  const fieldsContent = (
    <div className="dynamic-form__fields">
      {fields.map(field => {
        const linkageState = linkageStates[field.name];

        // 使用统一的路径工具检查字段是否被隐藏
        if (isFieldHiddenByLinkage(field.name, linkageStates)) {
          return null;
        }

        return (
          <FormField
            key={field.name}
            field={field}
            disabled={disabled || field.disabled || loading || linkageState?.disabled}
            readonly={readonly || field.readonly || linkageState?.readonly}
            widgets={stableWidgets}
            linkageState={linkageState}
            layout={layout}
            labelWidth={labelWidth}
          />
        );
      })}
    </div>
  );

  // 如果不是嵌套表单，提供 LinkageStateContext
  if (!asNestedForm) {
    return (
      <LinkageStateProvider
        value={{
          parentLinkageStates: linkageStates,
          form: methods,
          rootSchema: schema,
          pathPrefix: pathPrefix,
          linkageFunctions: effectiveLinkageFunctions,
        }}
      >
        {fieldsContent}
      </LinkageStateProvider>
    );
  }

  return fieldsContent;
};
```

**说明**：

- **应用联动状态**：根据 `linkageState` 控制字段的显示、禁用、只读
- **传递 Context**：根 DynamicForm 通过 Provider 传递状态给子级
- **嵌套表单处理**：子级不再创建新的 Provider，直接使用父级的 Context

### 6.7 依赖图优化（DAG）

**实际实现**：`src/utils/dependencyGraph.ts`

依赖图用于优化联动字段的更新顺序和性能。

**关键特性**：

- ✅ 精确计算受影响的字段
- ✅ 循环依赖检测
- ✅ 支持拓扑排序

### 6.8 异步函数支持

联动系统完整支持异步函数，适用于需要调用 API、执行异步计算等场景。

**示例**：

```typescript
const linkageFunctions = {
  fetchProvinceOptions: async (formData: any) => {
    const response = await fetch(`/api/provinces?country=${formData.country}`);
    const data = await response.json();
    return data.provinces;
  },
};
```

---

## 7. 完整的端到端示例

### 7.1 场景描述

实现一个订单表单，包含以下功能：

1. 根据用户类型显示不同的折扣字段
2. 自动计算总价
3. 动态加载省份选项
4. 支持多个商品项

### 7.2 Schema 定义

```typescript
const orderSchema = {
  type: 'object',
  properties: {
    // 用户类型
    userType: {
      type: 'string',
      title: '用户类型',
      enum: ['individual', 'company'],
      enumNames: ['个人', '企业'],
      default: 'individual',
    },

    // 企业折扣（仅企业用户显示）
    companyDiscount: {
      type: 'number',
      title: '企业折扣（%）',
      minimum: 0,
      maximum: 50,
      ui: {
        linkage: {
          type: 'visibility',
          dependencies: ['#/properties/userType'],
          when: {
            field: '#/properties/userType',
            operator: '==',
            value: 'company',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      },
    },

    // 配送地址
    country: {
      type: 'string',
      title: '国家',
      enum: ['china', 'usa'],
      enumNames: ['中国', '美国'],
    },

    province: {
      type: 'string',
      title: '省份/州',
      ui: {
        linkage: {
          type: 'options',
          dependencies: ['#/properties/country'],
          fulfill: {
            function: 'loadProvinceOptions',
          },
        },
      },
    },

    // 商品列表
    items: {
      type: 'array',
      title: '商品列表',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            title: '商品名称',
          },
          price: {
            type: 'number',
            title: '单价',
            minimum: 0,
          },
          quantity: {
            type: 'integer',
            title: '数量',
            minimum: 1,
            default: 1,
          },
          subtotal: {
            type: 'number',
            title: '小计',
            ui: {
              readonly: true,
              linkage: {
                type: 'value',
                dependencies: ['./price', './quantity'],
                fulfill: {
                  function: 'calculateSubtotal',
                },
              },
            },
          },
        },
        required: ['productName', 'price', 'quantity'],
      },
    },

    // 总价（自动计算）
    totalAmount: {
      type: 'number',
      title: '总价',
      ui: {
        readonly: true,
        linkage: {
          type: 'value',
          dependencies: ['#/properties/items', '#/properties/companyDiscount'],
          fulfill: {
            function: 'calculateTotal',
          },
        },
      },
    },
  },
  required: ['userType', 'country', 'province', 'items'],
};
```

### 7.3 联动函数实现

```typescript
const linkageFunctions = {
  /**
   * 异步加载省份选项
   */
  loadProvinceOptions: async (formData: any) => {
    const { country } = formData;

    if (!country) {
      return [];
    }

    try {
      // 模拟 API 调用
      const response = await fetch(`/api/provinces?country=${country}`);
      const data = await response.json();
      return data.provinces;
    } catch (error) {
      console.error('加载省份失败:', error);

      // 降级方案：返回静态数据
      if (country === 'china') {
        return [
          { label: '北京', value: 'beijing' },
          { label: '上海', value: 'shanghai' },
          { label: '广东', value: 'guangdong' },
        ];
      } else if (country === 'usa') {
        return [
          { label: 'California', value: 'ca' },
          { label: 'New York', value: 'ny' },
          { label: 'Texas', value: 'tx' },
        ];
      }
      return [];
    }
  },

  /**
   * 计算商品小计
   */
  calculateSubtotal: (formData: any, context?: LinkageFunctionContext) => {
    // context.fieldPath 示例: 'items.0.subtotal'
    // 需要获取同一数组元素的 price 和 quantity

    if (!context?.arrayPath || context.arrayIndex === undefined) {
      return 0;
    }

    const item = formData[context.arrayPath]?.[context.arrayIndex];
    if (!item) {
      return 0;
    }

    const price = item.price || 0;
    const quantity = item.quantity || 0;
    return price * quantity;
  },

  /**
   * 计算订单总价
   */
  calculateTotal: (formData: any) => {
    const { items = [], companyDiscount = 0, userType } = formData;

    // 计算所有商品的小计总和
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      return sum + price * quantity;
    }, 0);

    // 应用企业折扣
    if (userType === 'company' && companyDiscount > 0) {
      return subtotal * (1 - companyDiscount / 100);
    }

    return subtotal;
  },
};
```

### 7.4 组件使用

```typescript
import { DynamicForm } from '@/components/DynamicForm';

function OrderForm() {
  const handleSubmit = (data: any) => {
    console.log('提交订单:', data);
    // 发送到后端 API
  };

  return (
    <DynamicForm
      schema={orderSchema}
      linkageFunctions={linkageFunctions}
      onSubmit={handleSubmit}
      defaultValues={{
        userType: 'individual',
        country: 'china',
        items: [
          {
            productName: '商品A',
            price: 100,
            quantity: 2
          }
        ]
      }}
    />
  );
}
```

### 7.5 运行效果

**初始状态**（用户类型：个人）：

```
┌─────────────────────────────────────┐
│ 用户类型: [个人 ▼]                  │
│ 国家: [中国 ▼]                      │
│ 省份/州: [北京 ▼]                   │
│                                     │
│ 商品列表:                           │
│ ┌─────────────────────────────────┐ │
│ │ 商品名称: [商品A]               │ │
│ │ 单价: [100]                     │ │
│ │ 数量: [2]                       │ │
│ │ 小计: 200 (只读，自动计算)      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 总价: 200 (只读，自动计算)          │
└─────────────────────────────────────┘
```

**切换为企业用户后**：

```
┌─────────────────────────────────────┐
│ 用户类型: [企业 ▼]                  │
│ 企业折扣(%): [10]  ← 新显示的字段   │
│ 国家: [中国 ▼]                      │
│ 省份/州: [北京 ▼]                   │
│                                     │
│ 商品列表:                           │
│ ┌─────────────────────────────────┐ │
│ │ 商品名称: [商品A]               │ │
│ │ 单价: [100]                     │ │
│ │ 数量: [2]                       │ │
│ │ 小计: 200                       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 总价: 180 (应用10%折扣后)           │
└─────────────────────────────────────┘
```

### 7.6 联动执行流程

**场景 1：用户切换用户类型**

```
用户操作: 选择 "企业"
    ↓
watch 监听到 userType 变化
    ↓
dependencyGraph.getAffectedFields('userType')
    → 返回: ['companyDiscount', 'totalAmount']
    ↓
并行计算联动状态:
    ├─ companyDiscount:
    │   ├─ 求值 when 条件: userType == 'company' → true
    │   ├─ 应用 fulfill.state: { visible: true }
    │   └─ 结果: 字段显示
    │
    └─ totalAmount:
        ├─ 调用 calculateTotal(formData)
        ├─ 计算: 200 * (1 - 10/100) = 180
        ├─ 调用 form.setValue('totalAmount', 180)
        └─ 结果: 字段值更新为 180
```

**场景 2：用户修改商品数量**

```
用户操作: 将数量从 2 改为 3
    ↓
watch 监听到 items.0.quantity 变化
    ↓
dependencyGraph.getAffectedFields('items.0.quantity')
    → 返回: ['items.0.subtotal', 'totalAmount']
    ↓
并行计算联动状态:
    ├─ items.0.subtotal:
    │   ├─ 调用 calculateSubtotal(formData, context)
    │   │   context = {
    │   │     fieldPath: 'items.0.subtotal',
    │   │     arrayPath: 'items',
    │   │     arrayIndex: 0
    │   │   }
    │   ├─ 计算: 100 * 3 = 300
    │   ├─ 调用 form.setValue('items.0.subtotal', 300)
    │   └─ 结果: 小计更新为 300
    │
    └─ totalAmount:
        ├─ 调用 calculateTotal(formData)
        ├─ 计算: 300 * (1 - 10/100) = 270
        ├─ 调用 form.setValue('totalAmount', 270)
        └─ 结果: 总价更新为 270
```

### 7.7 关键要点总结

---

## 8. 特殊场景

### 8.1 数组字段联动

数组字段的联动涉及相对路径、动态索引等复杂场景。

**快速示例**：

```typescript
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
              dependencies: ['./type'],
              when: { field: './type', operator: '==', value: 'work' }
            }
          }
        }
      }
    }
  }
}
```

**详细文档**：[数组字段联动设计方案](./ARRAY_FIELD_LINKAGE.md)

### 8.2 路径透明化场景

当使用 `flattenPath` 时，联动配置中的路径会自动处理 `~~` 分隔符。

**详细文档**：[字段路径透明化设计方案](./FIELD_PATH_FLATTENING.md)

---

## 9. 设计总结

### 9.1 职责分离

| 层面                | 负责内容     | 实现方式                              |
| ------------------- | ------------ | ------------------------------------- |
| **JSON Schema**     | 数据验证     | `required`, `minLength`, `pattern` 等 |
| **UI 扩展**         | UI 联动逻辑  | `visibility`, `disabled`, `value` 等  |
| **react-hook-form** | 表单状态管理 | `watch`, `setValue`, `getValues`      |

### 9.2 核心优势

1. **职责清晰**：验证逻辑和 UI 逻辑分离
2. **标准兼容**：遵循 JSON Schema 标准
3. **性能优化**：依赖图 + 并行计算 + 精确更新
4. **类型安全**：完整的 TypeScript 类型定义
5. **易于扩展**：支持自定义联动函数
6. **异步支持**：完整支持同步和异步联动函数
7. **分层计算**：嵌套表单自动分层，避免重复计算
8. **路径透明化**：自动处理 flattenPath 场景

---

## 10. 常见问题

### Q1: 如何调试联动不生效的问题？

请参考 [动态表单常见问题](./DYNAMIC_FORM_PART6.md) 第 9.1 节 Q5。

### Q2: 如何处理循环依赖？

系统会在构建依赖图时自动检测循环依赖并在控制台输出警告。

### Q3: 联动函数可以是异步的吗？

可以。系统完整支持异步联动函数，详见第 6.8 节。

---

## 相关文档

- [数组字段联动设计方案](./ARRAY_FIELD_LINKAGE.md)
- [字段路径透明化设计方案](./FIELD_PATH_FLATTENING.md)
- [字段路径完全指南](./FIELD_PATH_GUIDE.md)
- [动态表单常见问题](./DYNAMIC_FORM_PART6.md)

---

**文档版本**: 2.0  
**创建日期**: 2025-12-26  
**最后更新**: 2025-12-30  
**文档状态**: 已重构

## 变更历史

### v2.0 (2025-12-30)

**重大重构**：精简文档，优化章节结构，补充关键实现细节

**主要变更**：

1. **修正类型定义**
   - ✅ 使用联合类型 `ConditionExpression = SingleCondition | LogicalCondition`
   - ✅ 确保类型安全，单条件和逻辑组合不能混用

2. **优化章节结构**
   - ✅ 将 PathMapping、分层计算、DynamicForm 集成合并到第 6 节（实现方案）
   - ✅ 调整章节顺序：端到端示例前置到第 7 节
   - ✅ 删除"高级特性"标题，避免误导

3. **补充关键实现细节**
   - ✅ 6.4 节：PathMapping 机制详细说明
   - ✅ 6.5 节：分层计算策略和工作流程
   - ✅ 6.6 节：DynamicForm 集成（五步流程）
   - ✅ 6.7 节：依赖图优化
   - ✅ 6.8 节：异步函数支持
   - ✅ 第 7 节：完整的端到端示例

4. **精简重复内容**
   - ✅ 删除与专题文档重复的详细说明
   - ✅ 改为引用相关文档链接

**文档规模**：~900 行（精简 55%，但内容更充实）

### v1.0 (2025-12-26)

初始版本，包含完整的 UI 联动设计方案。
