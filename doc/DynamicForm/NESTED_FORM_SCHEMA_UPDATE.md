# 嵌套表单 Schema 设计优化说明

## 更新概述

已将嵌套表单的 Schema 设计从"在 `ui` 中嵌套完整 schema"改为"使用标准 `properties` 字段"。

---

## 设计对比

### 旧设计（不推荐）

```typescript
{
  type: 'object',
  properties: {
    address: {
      type: 'object',
      title: 'Address',
      ui: {
        widget: 'nested-form',
        schema: {  // ❌ 在 ui 中嵌套完整 schema
          type: 'object',
          properties: {
            city: { type: 'string', title: 'City' }
          }
        }
      }
    }
  }
}
```

### 新设计（推荐）✅

```typescript
{
  type: 'object',
  properties: {
    address: {
      type: 'object',
      title: 'Address',
      properties: {  // ✅ 使用标准 properties 字段
        city: { type: 'string', title: 'City' }
      },
      ui: {
        widget: 'nested-form'  // 只需指定 widget 类型
      }
    }
  }
}
```

---

## 新设计的优势

1. **符合 JSON Schema 标准** - `properties` 是标准字段
2. **避免重复** - 不需要在 `ui` 中重复定义 schema
3. **更简洁** - `ui.widget` 只负责指定渲染方式
4. **类型推导更好** - TypeScript 可以直接推导类型
5. **验证更自然** - `required` 等验证规则直接定义在字段上

---

**更新日期**: 2025-12-24
**版本**: 2.0
