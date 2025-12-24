# 条件渲染功能说明

## 概述

已在 DYNAMIC_FORM_PART4.md 中补充了条件渲染功能的实现代码。

---

## 核心功能

### 1. VisibilityCondition 类型

```typescript
export interface VisibilityCondition {
  field: string;        // 依赖的字段名
  equals?: any;         // 等于某个值
  notEquals?: any;      // 不等于某个值
  in?: any[];          // 在某个数组中
  notIn?: any[];       // 不在某个数组中
  custom?: (value: any, formValues: Record<string, any>) => boolean;
}
```

### 2. useConditionalRender Hook

监听依赖字段的值变化，返回当前字段是否可见。

---

## 使用示例

```typescript
{
  type: 'object',
  properties: {
    country: {
      type: 'string',
      enum: ['china', 'usa']
    },
    idCard: {
      type: 'string',
      ui: {
        visibleWhen: {
          field: 'country',
          equals: 'china'
        }
      }
    }
  }
}
```

---

**更新日期**: 2025-12-24
