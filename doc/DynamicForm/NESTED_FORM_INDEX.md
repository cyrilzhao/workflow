# 嵌套动态表单技术方案 - 索引

## 文档概述

本系列文档描述了如何在动态表单中实现嵌套表单功能，支持字段值为对象类型，由内层动态表单编辑。

---

## 文档列表

### Part 1: 概述和场景
**文件**: `NESTED_FORM_PART1.md`

**内容**:
- 应用场景（复杂对象编辑、可配置子表单、数组嵌套）
- 核心特性（值传递、值回传、验证独立、样式隔离）

---

### Part 2: 类型定义
**文件**: `NESTED_FORM_PART2.md`

**内容**:
- 扩展的 UIConfig 类型
- NestedFormWidget 组件属性接口

---

### Part 3: 组件实现
**文件**: `NESTED_FORM_PART3.md`

**内容**:
- NestedFormWidget 完整实现代码
- 动态 schema 加载逻辑
- 值变化处理

---

### Part 4: 使用示例
**文件**: `NESTED_FORM_PART4.md`

**内容**:
- 静态嵌套表单示例
- 动态嵌套表单示例（根据字段值切换）

---

### Part 5: 高级特性
**文件**: `NESTED_FORM_PART5.md`

**内容**:
- 异步加载 Schema
- 数组中的嵌套表单
- 多层嵌套

---

### Part 6: 最佳实践
**文件**: `NESTED_FORM_PART6.md`

**内容**:
- 值同步策略
- 验证处理
- 性能优化
- 注意事项

---

## 快速开始

```typescript
const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Name'
    },
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
};
```

**说明**:
- `address` 字段的 `type` 为 `object`
- 使用标准的 `properties` 定义子字段
- `ui.widget` 设置为 `nested-form` 即可启用嵌套表单渲染

---

**创建日期**: 2025-12-24
**版本**: 1.0
