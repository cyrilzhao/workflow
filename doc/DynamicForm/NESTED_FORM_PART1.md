# 嵌套动态表单技术方案

## 概述

本文档描述了如何在动态表单中支持嵌套表单场景，即某个字段的值是一个对象，该字段使用自定义 Widget（内层动态表单）来编辑这个对象。

---

## 应用场景

### 场景 1: 复杂对象编辑

```typescript
// 外层表单 Schema
{
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
        zipCode: { type: 'string', title: 'Zip Code' }
      },
      required: ['city'],
      ui: {
        widget: 'nested-form'
      }
    }
  }
}
```

### 场景 2: 可配置的子表单

```typescript
// 根据类型动态加载不同的子表单
{
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['personal', 'company'],
      title: 'Type'
    },
    details: {
      type: 'object',
      title: 'Details',
      ui: {
        widget: 'nested-form',
        schemaKey: 'type', // 根据 type 字段值选择不同的 properties
        schemas: {
          personal: {
            properties: {
              firstName: { type: 'string', title: 'First Name' },
              lastName: { type: 'string', title: 'Last Name' }
            }
          },
          company: {
            properties: {
              companyName: { type: 'string', title: 'Company Name' },
              taxId: { type: 'string', title: 'Tax ID' }
            }
          }
        }
      }
    }
  }
}
```

### 场景 3: 数组中的嵌套表单

```typescript
{
  type: 'object',
  properties: {
    contacts: {
      type: 'array',
      title: 'Contacts',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          phone: { type: 'string', title: 'Phone' },
          email: { type: 'string', title: 'Email', format: 'email' }
        },
        ui: {
          widget: 'nested-form'
        }
      }
    }
  }
}
```

---

## 核心特性

1. **值传递**: 外层表单将对象值传递给内层表单
2. **值回传**: 内层表单变化时，将新对象值回传给外层表单
3. **验证独立**: 内层表单有自己的验证规则
4. **样式隔离**: 内层表单可以有独立的样式配置

---

**下一部分**: 类型定义和接口设计
