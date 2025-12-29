# 动态表单字段路径完全指南

## 目录

1. [概述](#1-概述)
2. [路径类型总览](#2-路径类型总览)
3. [表单数据路径](#3-表单数据路径)
4. [联动依赖路径](#4-联动依赖路径)
5. [路径透明化](#5-路径透明化)
6. [数组场景的路径处理](#6-数组场景的路径处理)
7. [路径转换工具](#7-路径转换工具)
8. [完整示例](#8-完整示例)
9. [常见问题](#9-常见问题)

---

## 1. 概述

在动态表单系统中，"路径"是一个核心概念，用于定位和引用表单中的字段。由于表单支持嵌套对象、数组、路径透明化等复杂场景，系统中存在多种路径格式，各有其适用场景。

### 1.1 为什么需要理解路径

- **字段定位**：表单数据是嵌套结构，需要路径来定位具体字段
- **联动配置**：字段之间的联动依赖需要通过路径引用
- **数据转换**：路径透明化场景需要在不同路径格式间转换
- **数组处理**：数组元素的路径包含动态索引，需要特殊处理

### 1.2 路径的三个维度

| 维度 | 说明 | 示例 |
|------|------|------|
| **表单数据路径** | 用于 react-hook-form 的字段注册和数据访问 | `contacts.0.name` |
| **联动依赖路径** | 用于 Schema 中配置字段间的依赖关系 | `./type` 或 `#/properties/enableVip` |
| **物理/逻辑路径** | 路径透明化场景下的两种路径表示 | 物理: `group.category.contacts`<br>逻辑: `group~~category~~contacts` |

---

## 2. 路径类型总览

### 2.1 路径格式速查表

| 路径格式 | 语法 | 使用场景 | 示例 |
|----------|------|----------|------|
| **点号路径** | `a.b.c` | 表单数据访问、字段注册 | `user.address.city` |
| **数组索引路径** | `a.0.b` | 数组元素字段访问 | `contacts.0.name` |
| **相对路径** | `./field` | 数组元素内部联动 | `./type` |
| **JSON Pointer** | `#/properties/...` | 跨层级联动依赖 | `#/properties/enableVip` |
| **逻辑路径** | 使用 `~~` 分隔 flattenPath 层级 | Schema 字段定义 | `group~~category~~contacts` |
| **物理路径** | 完整数据路径 | 实际数据存储 | `group.category.contacts` |

### 2.2 路径格式对比

```
Schema 定义                    表单数据                      联动配置
─────────────────────────────────────────────────────────────────────────
properties:                    {                             dependencies:
  user:                          user: {                       - './age'        (相对路径)
    properties:                    name: 'John',               - '#/properties/user/age' (JSON Pointer)
      name: { type: 'string' }     age: 25
      age: { type: 'number' }    }
                               }

字段路径: user.name            数据路径: user.name           依赖路径: ./age 或 #/properties/user/age
```

---

## 3. 表单数据路径

表单数据路径是最基础的路径格式，用于 react-hook-form 的字段注册和数据访问。

### 3.1 基本格式

使用点号（`.`）分隔嵌套层级：

```typescript
// 简单字段
'name'           // → formData.name

// 嵌套对象
'user.name'      // → formData.user.name
'user.address.city'  // → formData.user.address.city

// 数组元素
'contacts.0'         // → formData.contacts[0]
'contacts.0.name'    // → formData.contacts[0].name
'contacts.1.phone'   // → formData.contacts[1].phone

// 嵌套数组
'departments.0.employees.1.name'  // → formData.departments[0].employees[1].name
```

### 3.2 数组索引路径

数组元素使用数字索引：

```typescript
// 判断是否是数组元素路径
function isArrayElementPath(path: string): boolean {
  const parts = path.split('.');
  return parts.some(part => /^\d+$/.test(part));
}

// 示例
isArrayElementPath('contacts.0.name')  // true
isArrayElementPath('contacts.name')    // false
isArrayElementPath('items.2.details.0.value')  // true
```

### 3.3 提取数组信息

```typescript
// 从路径中提取数组信息
function extractArrayInfo(path: string) {
  // 'contacts.0.name' → { arrayPath: 'contacts', index: 0, fieldPath: 'name' }
  // 'departments.1.employees.2.name' → { arrayPath: 'departments', index: 1, fieldPath: 'employees.2.name' }
}
```

---

## 4. 联动依赖路径

联动依赖路径用于在 Schema 中配置字段间的依赖关系。系统支持两种格式：**相对路径**和 **JSON Pointer**。

### 4.1 相对路径（`./fieldName`）

**适用场景**：引用同一对象内的兄弟字段（同级字段）

**语法**：以 `./` 开头，后跟字段名

```typescript
// Schema 配置
{
  contacts: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['personal', 'work']
        },
        companyName: {
          type: 'string',
          ui: {
            linkage: {
              type: 'visibility',
              dependencies: ['./type'],  // ✅ 相对路径：引用同级的 type 字段
              when: {
                field: './type',
                operator: '==',
                value: 'work'
              }
            }
          }
        }
      }
    }
  }
}
```

**运行时解析**：

```typescript
// 当前字段路径: contacts.0.companyName
// 相对路径: ./type
// 解析结果: contacts.0.type

// 当前字段路径: contacts.1.companyName
// 相对路径: ./type
// 解析结果: contacts.1.type
```

**限制**：
- ✅ 只支持 `./fieldName` 格式
- ❌ 不支持 `../fieldName`（父级相对路径）
- ❌ 不支持 `../../fieldName`（祖父级相对路径）

### 4.2 JSON Pointer（`#/properties/...`）

**适用场景**：引用任意层级的字段（跨层级依赖）

**语法**：以 `#/` 开头，使用 `/properties/` 分隔对象层级，使用 `/items/` 表示数组元素

```typescript
// 基本格式
'#/properties/fieldName'                           // 顶层字段
'#/properties/parent/properties/child'             // 嵌套字段
'#/properties/array/items/properties/field'        // 数组元素字段
```

**示例**：

```typescript
// 1. 引用顶层字段
{
  enableVip: { type: 'boolean' },
  contacts: {
    type: 'array',
    items: {
      properties: {
        vipLevel: {
          type: 'string',
          ui: {
            linkage: {
              dependencies: ['#/properties/enableVip'],  // ✅ 引用顶层字段
              when: {
                field: '#/properties/enableVip',
                operator: '==',
                value: true
              }
            }
          }
        }
      }
    }
  }
}

// 2. 引用父数组元素的字段
{
  departments: {
    type: 'array',
    items: {
      properties: {
        type: { type: 'string', enum: ['tech', 'sales'] },
        employees: {
          type: 'array',
          items: {
            properties: {
              techStack: {
                type: 'string',
                ui: {
                  linkage: {
                    // 引用父数组元素的 type 字段
                    dependencies: ['#/properties/departments/items/properties/type'],
                    when: {
                      field: '#/properties/departments/items/properties/type',
                      operator: '==',
                      value: 'tech'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 4.3 JSON Pointer 转换规则

| JSON Pointer | 表单数据路径 | 说明 |
|--------------|-------------|------|
| `#/properties/name` | `name` | 顶层字段 |
| `#/properties/user/properties/age` | `user.age` | 嵌套字段 |
| `#/properties/contacts/items/properties/name` | `contacts.name`（模板）<br>`contacts.0.name`（运行时） | 数组元素字段 |

**转换函数**：

```typescript
// JSON Pointer → 表单数据路径
function parseJsonPointer(pointer: string): string {
  // '#/properties/contacts/items/properties/type'
  // → 'contacts.type'

  const segments = pointer.slice(2).split('/');
  const logicalSegments = segments.filter(s => s !== 'properties' && s !== 'items');
  return logicalSegments.join('.');
}
```

### 4.4 路径格式选择指南

| 场景 | 推荐格式 | 示例 |
|------|----------|------|
| 同一对象内的字段依赖 | 相对路径 | `./type` |
| 数组元素内部字段依赖 | 相对路径 | `./status` |
| 依赖顶层字段 | JSON Pointer | `#/properties/enableFeature` |
| 依赖父数组元素字段 | JSON Pointer | `#/properties/departments/items/properties/type` |
| 依赖整个数组（聚合计算） | JSON Pointer | `#/properties/items` |

---

## 5. 路径透明化

路径透明化（Field Path Flattening）用于解决深层嵌套参数显示冗余的问题。

### 5.1 核心概念

当 Schema 中某个对象字段设置了 `flattenPath: true`，该层级在 UI 上会被"跳过"，但数据结构保持不变。

**重要**：为了避免不同物理路径产生相同逻辑路径的冲突，系统使用 `~~` 分隔符在逻辑路径中保留被透明化的路径段。

```typescript
// Schema 定义
{
  group: {
    type: 'object',
    ui: { flattenPath: true },  // 透明化此层级
    properties: {
      category: {
        type: 'object',
        ui: { flattenPath: true },  // 透明化此层级
        properties: {
          contacts: {
            type: 'array',
            items: { /* ... */ }
          }
        }
      }
    }
  }
}

// 逻辑路径（表单字段注册）: group~~category~~contacts
// 物理路径（数据存储）: group.category.contacts
```

### 5.2 逻辑路径 vs 物理路径

| 概念 | 定义 | 用途 |
|------|------|------|
| **逻辑路径** | 使用 `~~` 连接透明化层级的路径 | 表单字段注册、联动配置 |
| **物理路径** | 使用 `.` 连接所有层级的完整路径 | 实际数据存储 |

**示例**：

```typescript
// Schema 中 group 和 category 都设置了 flattenPath: true

// 字段: contacts
逻辑路径: 'group~~category~~contacts'
物理路径: 'group.category.contacts'

// 字段: contacts[0].name
逻辑路径: 'group~~category~~contacts.0.name'
物理路径: 'group.category.contacts.0.name'
```

**为什么使用 `~~` 分隔符？**

避免路径冲突。如果有两个不同的物理路径：
- `group.category.contacts`
- `region.market.contacts`

使用 `~~` 分隔符后，它们的逻辑路径分别是：
- `group~~category~~contacts`
- `region~~market~~contacts`

这样就不会产生冲突。

### 5.3 路径映射

系统会自动生成路径映射表，用于在逻辑路径和物理路径之间转换：

```typescript
interface PathMapping {
  logicalPath: string;    // 逻辑路径（使用 ~~ 分隔符）
  physicalPath: string;   // 物理路径（使用 . 分隔符）
  isArray?: boolean;      // 是否是数组字段
  skippedSegments?: string[];  // 被透明化的路径段
}

// 示例映射
{
  logicalPath: 'group~~category~~contacts',
  physicalPath: 'group.category.contacts',
  isArray: true,
  skippedSegments: ['group', 'category']
}
```

### 5.4 数据转换

路径透明化场景需要在数据输入和输出时进行转换：

```typescript
// 输入转换：物理路径结构 → 逻辑路径结构
// 用于初始化表单数据
const formData = PathTransformer.nestedToFlatWithSchema(
  { group: { category: { contacts: [...] } } },  // 物理路径结构
  schema
);
// 结果: { 'group~~category~~contacts': [...] }  // 逻辑路径结构

// 输出转换：逻辑路径结构 → 物理路径结构
// 用于提交表单数据
const submitData = PathTransformer.flatToNestedWithSchema(
  { 'group~~category~~contacts': [...] },  // 逻辑路径结构
  schema
);
// 结果: { group: { category: { contacts: [...] } } }  // 物理路径结构
```

---

## 6. 数组场景的路径处理

数组是路径处理中最复杂的场景，涉及动态索引和模板路径的概念。

### 6.1 模板路径 vs 运行时路径

| 概念 | 定义 | 示例 |
|------|------|------|
| **模板路径** | Schema 解析时的路径（不含索引） | `contacts.name` |
| **运行时路径** | 实际数组元素的路径（含索引） | `contacts.0.name`, `contacts.1.name` |

```typescript
// Schema 定义（模板）
{
  contacts: {
    type: 'array',
    items: {
      properties: {
        name: { type: 'string' },
        type: { type: 'string' }
      }
    }
  }
}

// 模板路径: contacts.name, contacts.type

// 运行时路径（假设有 3 个元素）:
// contacts.0.name, contacts.0.type
// contacts.1.name, contacts.1.type
// contacts.2.name, contacts.2.type
```

### 6.2 数组联动的路径解析

数组元素内部的联动配置使用模板路径定义，运行时动态解析为实际路径：

```typescript
// Schema 中的联动配置（模板）
{
  contacts: {
    items: {
      properties: {
        type: { type: 'string' },
        companyName: {
          ui: {
            linkage: {
              dependencies: ['./type'],  // 模板：相对路径
              when: { field: './type', operator: '==', value: 'work' }
            }
          }
        }
      }
    }
  }
}

// 运行时解析
// 对于 contacts.0.companyName:
//   dependencies: ['contacts.0.type']
//   when.field: 'contacts.0.type'

// 对于 contacts.1.companyName:
//   dependencies: ['contacts.1.type']
//   when.field: 'contacts.1.type'
```

### 6.3 嵌套数组的路径

嵌套数组的路径包含多个索引：

```typescript
// Schema
{
  departments: {
    type: 'array',
    items: {
      properties: {
        name: { type: 'string' },
        employees: {
          type: 'array',
          items: {
            properties: {
              name: { type: 'string' },
              skills: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}

// 路径示例
'departments.0.name'                    // 第 1 个部门的名称
'departments.0.employees.0.name'        // 第 1 个部门的第 1 个员工的名称
'departments.1.employees.2.skills.0'    // 第 2 个部门的第 3 个员工的第 1 个技能
```

### 6.4 跨数组层级的依赖

子数组元素依赖父数组元素字段时，系统会自动匹配正确的索引：

```typescript
// 依赖配置
dependencies: ['#/properties/departments/items/properties/type']

// 当前路径: departments.0.employees.1.techStack
// 解析结果: departments.0.type  // 自动匹配父数组索引 0

// 当前路径: departments.2.employees.0.techStack
// 解析结果: departments.2.type  // 自动匹配父数组索引 2
```

---

## 7. 路径转换工具

系统提供了多个工具类和函数用于路径处理。

### 7.1 PathResolver

用于 JSON Pointer 路径的解析和转换：

```typescript
import { PathResolver } from '@/utils/pathResolver';

// 解析 JSON Pointer 获取值
PathResolver.resolve('#/properties/user/age', { user: { age: 25 } });
// → 25

// 标准化路径
PathResolver.normalize('user.age');
// → '#/properties/user/age'

// JSON Pointer → 表单数据路径
PathResolver.toFieldPath('#/properties/user/age');
// → 'user.age'

// 获取嵌套值
PathResolver.getNestedValue({ user: { age: 25 } }, 'user.age');
// → 25
```

### 7.2 PathTransformer

用于路径透明化场景的数据转换：

```typescript
import { PathTransformer } from '@/utils/pathTransformer';

// 基于 Schema 的输入转换（推荐）
PathTransformer.nestedToFlatWithSchema(nestedData, schema);

// 基于 Schema 的输出转换（推荐）
PathTransformer.flatToNestedWithSchema(flatData, schema);

// 简单转换（不支持 flattenPath）
PathTransformer.nestedToFlat(nestedData);
PathTransformer.flatToNested(flatData);
```

### 7.3 schemaLinkageParser

用于解析 Schema 中的联动配置和路径映射：

```typescript
import {
  parseSchemaLinkages,
  physicalToLogicalPath,
  logicalToPhysicalPath,
  transformToAbsolutePaths,
  buildLogicalPath,
  buildPhysicalPath,
  isInFlattenPathChain
} from '@/utils/schemaLinkageParser';

// 解析 Schema
const { linkages, pathMappings, hasFlattenPath } = parseSchemaLinkages(schema);

// 路径转换
physicalToLogicalPath('group.category.contacts.0', pathMappings);
// → 'group~~category~~contacts.0'

logicalToPhysicalPath('group~~category~~contacts.0', pathMappings);
// → 'group.category.contacts.0'

// 统一的路径生成函数（推荐）
buildLogicalPath('auth~~content', 'key', false);
// → 'auth~~content~~key'  // 父级在 flattenPath 链中，自动使用 ~~ 分隔符

buildLogicalPath('user', 'name', false);
// → 'user.name'  // 普通路径，使用 . 分隔符

buildPhysicalPath('auth.content', 'key');
// → 'auth.content.key'  // 物理路径始终使用 . 分隔符

// 转换为绝对路径（用于嵌套表单）
transformToAbsolutePaths(linkages, 'contacts.0');
```

### 7.4 arrayLinkageHelper

用于数组联动场景的路径处理：

```typescript
import {
  isArrayElementPath,
  extractArrayInfo,
  parseJsonPointer,
  resolveRelativePath,
  resolveDependencyPath,
  resolveArrayElementLinkage
} from '@/utils/arrayLinkageHelper';

// 判断是否是数组元素路径
isArrayElementPath('contacts.0.name');  // true

// 提取数组信息
extractArrayInfo('contacts.0.name');
// → { arrayPath: 'contacts', index: 0, fieldPath: 'name' }

// 解析 JSON Pointer
parseJsonPointer('#/properties/contacts/items/properties/type');
// → 'contacts.type'

// 解析相对路径
resolveRelativePath('./type', 'contacts.0.companyName');
// → 'contacts.0.type'

// 解析依赖路径（核心函数）
resolveDependencyPath('./type', 'contacts.0.companyName', schema);
// → 'contacts.0.type'

resolveDependencyPath('#/properties/enableVip', 'contacts.0.vipLevel', schema);
// → 'enableVip'
```

---

## 8. 完整示例

### 8.1 示例 1：简单嵌套表单

```typescript
// Schema
const schema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名' },
        age: { type: 'number', title: '年龄' },
        isAdult: {
          type: 'boolean',
          title: '是否成年',
          ui: {
            linkage: {
              type: 'value',
              dependencies: ['./age'],  // 相对路径
              fulfill: { function: 'checkAdult' }
            }
          }
        }
      }
    }
  }
};

// 表单数据路径
// user.name → formData.user.name
// user.age → formData.user.age
// user.isAdult → formData.user.isAdult

// 联动解析
// 当前路径: user.isAdult
// 依赖路径: ./age → user.age
```

### 8.2 示例 2：数组联动

```typescript
// Schema
const schema = {
  type: 'object',
  properties: {
    enableVip: { type: 'boolean', title: '启用 VIP' },
    contacts: {
      type: 'array',
      title: '联系人',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['personal', 'work'],
            title: '类型'
          },
          companyName: {
            type: 'string',
            title: '公司名称',
            ui: {
              linkage: {
                type: 'visibility',
                dependencies: ['./type'],  // 相对路径：同级字段
                when: { field: './type', operator: '==', value: 'work' }
              }
            }
          },
          vipLevel: {
            type: 'string',
            title: 'VIP 等级',
            ui: {
              linkage: {
                type: 'visibility',
                dependencies: ['#/properties/enableVip'],  // JSON Pointer：顶层字段
                when: { field: '#/properties/enableVip', operator: '==', value: true }
              }
            }
          }
        }
      }
    }
  }
};

// 运行时路径解析（假设有 2 个联系人）

// contacts.0.companyName 的联动:
//   dependencies: ['contacts.0.type']
//   when.field: 'contacts.0.type'

// contacts.1.companyName 的联动:
//   dependencies: ['contacts.1.type']
//   when.field: 'contacts.1.type'

// contacts.0.vipLevel 的联动:
//   dependencies: ['enableVip']
//   when.field: 'enableVip'
```

### 8.3 示例 3：路径透明化

```typescript
// Schema
const schema = {
  type: 'object',
  properties: {
    config: {
      type: 'object',
      ui: { flattenPath: true },  // 跳过此层级
      properties: {
        auth: {
          type: 'object',
          ui: { flattenPath: true },  // 跳过此层级
          properties: {
            apiKey: { type: 'string', title: 'API Key' },
            apiSecret: { type: 'string', title: 'API Secret' }
          }
        }
      }
    }
  }
};

// 路径映射
// 逻辑路径: config~~auth~~apiKey      → 物理路径: config.auth.apiKey
// 逻辑路径: config~~auth~~apiSecret   → 物理路径: config.auth.apiSecret

// 数据转换
// 输入数据（物理路径结构）:
{ config: { auth: { apiKey: 'xxx', apiSecret: 'yyy' } } }

// 表单数据（逻辑路径结构）:
{ 'config~~auth~~apiKey': 'xxx', 'config~~auth~~apiSecret': 'yyy' }

// 提交数据（物理路径结构）:
{ config: { auth: { apiKey: 'xxx', apiSecret: 'yyy' } } }
```

---

## 9. 常见问题

### 9.1 为什么不支持 `../` 相对路径？

**原因**：
1. 语义不清晰：在多层嵌套中，`../` 的含义容易混淆
2. 维护困难：Schema 结构变化时，相对路径需要同步修改
3. JSON Pointer 更强大：可以引用任意层级的字段

**解决方案**：使用 JSON Pointer 替代

```typescript
// ❌ 不支持
dependencies: ['../type']

// ✅ 使用 JSON Pointer
dependencies: ['#/properties/departments/items/properties/type']
```

### 9.2 路径透明化时联动不生效？

**可能原因**：联动配置中使用了物理路径而非逻辑路径

**解决方案**：联动配置应使用逻辑路径（带 `~~` 分隔符）

```typescript
// Schema 中 group.category 设置了 flattenPath: true

// ❌ 错误：使用物理路径
dependencies: ['group.category.enableFeature']

// ✅ 正确：使用逻辑路径
dependencies: ['group~~category~~enableFeature']
// 或使用 JSON Pointer
dependencies: ['#/properties/group/properties/category/properties/enableFeature']
```

### 9.3 数组元素联动只对第一个元素生效？

**可能原因**：使用了固定索引而非相对路径

**解决方案**：使用相对路径 `./`

```typescript
// ❌ 错误：固定索引
dependencies: ['contacts.0.type']

// ✅ 正确：相对路径
dependencies: ['./type']
```

### 9.4 如何调试路径问题？

**方法 1**：打印路径映射

```typescript
const { linkages, pathMappings } = parseSchemaLinkages(schema);
console.log('路径映射:', pathMappings);
console.log('联动配置:', linkages);
```

**方法 2**：检查运行时解析结果

```typescript
const resolved = resolveDependencyPath(depPath, currentPath, schema);
console.log(`${depPath} → ${resolved}`);
```

---

## 附录：路径相关文件索引

| 文件 | 职责 |
|------|------|
| `src/utils/pathResolver.ts` | JSON Pointer 解析和转换 |
| `src/utils/pathTransformer.ts` | 路径透明化数据转换 |
| `src/utils/schemaLinkageParser.ts` | Schema 联动配置解析、路径映射、统一路径生成函数 |
| `src/utils/arrayLinkageHelper.ts` | 数组联动路径处理 |
| `src/hooks/useLinkageManager.ts` | 联动状态管理 |
| `src/hooks/useArrayLinkageManager.ts` | 数组联动状态管理 |

---

**创建日期**: 2025-12-28
**最后更新**: 2025-12-29
**版本**: 1.1
**文档状态**: 已更新

**更新内容**:

### v1.1 (2025-12-29)
- 更新了逻辑路径示例，使用 `~~` 分隔符
- 新增统一路径生成函数 `buildLogicalPath`、`buildPhysicalPath`、`isInFlattenPathChain` 的说明
- 更新了 schemaLinkageParser 工具函数列表
