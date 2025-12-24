# UI 字段结构更新说明

## 更新概述

已将所有 UI 扩展属性从 `ui:xxx` 格式统一改为 `ui` 对象字段格式。

---

## 修改对比

### 旧格式（ui:xxx）

```json
{
  "type": "string",
  "title": "用户名",
  "ui:widget": "text",
  "ui:placeholder": "请输入用户名",
  "ui:disabled": false,
  "ui:help": "帮助文本"
}
```

### 新格式（ui 对象）

```json
{
  "type": "string",
  "title": "用户名",
  "ui": {
    "widget": "text",
    "placeholder": "请输入用户名",
    "disabled": false,
    "help": "帮助文本"
  }
}
```

---

## 完整示例

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "用户注册表单",
  "properties": {
    "username": {
      "type": "string",
      "title": "用户名",
      "minLength": 3,
      "ui": {
        "placeholder": "请输入用户名"
      }
    },
    "password": {
      "type": "string",
      "title": "密码",
      "minLength": 6,
      "ui": {
        "widget": "password",
        "placeholder": "至少6位字符"
      }
    },
    "gender": {
      "type": "string",
      "title": "性别",
      "enum": ["male", "female"],
      "enumNames": ["男", "女"],
      "ui": {
        "widget": "radio"
      }
    },
    "bio": {
      "type": "string",
      "title": "个人简介",
      "ui": {
        "widget": "textarea",
        "rows": 4,
        "placeholder": "请输入个人简介"
      }
    }
  },
  "required": ["username", "password"]
}
```

---

## TypeScript 类型定义

```typescript
// UI 配置类型
export interface UIConfig {
  widget?: WidgetType;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  help?: string;
  className?: string;
  style?: React.CSSProperties;
  order?: string[];
  [key: string]: any; // 支持其他自定义属性
}

// 扩展的 JSON Schema
export interface ExtendedJSONSchema extends JSONSchema7 {
  ui?: UIConfig;
  enumNames?: string[];
  dependencies?: Record<string, any>;
}
```

---

## 代码适配

### Schema Parser 适配

```typescript
// 旧代码
const order = schema['ui:order'] || Object.keys(properties);
const placeholder = schema['ui:placeholder'];
const widget = schema['ui:widget'];

// 新代码
const order = schema.ui?.order || Object.keys(properties);
const placeholder = schema.ui?.placeholder;
const widget = schema.ui?.widget;
```

### 字段解析适配

```typescript
private static parseField(
  name: string,
  schema: ExtendedJSONSchema,
  required: boolean
): FieldConfig {
  const ui = schema.ui || {};

  return {
    name,
    type: schema.type as string,
    widget: this.getWidget(schema),
    label: schema.title,
    placeholder: ui.placeholder,
    disabled: ui.disabled,
    readonly: ui.readonly,
    hidden: ui.hidden,
    // ...
  };
}
```

---

## 已更新的文档

✅ **DYNAMIC_FORM_PART2.md** - JSON Schema 规范
- 更新了所有基础类型示例
- 更新了完整表单示例
- 更新了 UI 扩展规范

✅ **DYNAMIC_FORM_PART3.md** - 组件架构设计
- 更新了类型定义
- 更新了 SchemaParser 实现

---

## 优势

1. **更符合 JSON 规范**：使用标准的对象嵌套结构
2. **更易于维护**：所有 UI 配置集中在一个对象中
3. **更好的类型支持**：TypeScript 类型推导更准确
4. **更灵活**：支持任意自定义 UI 属性

---

## 迁移指南

如果你已有使用旧格式的 Schema，可以使用以下函数转换：

```typescript
function migrateSchema(oldSchema: any): ExtendedJSONSchema {
  const newSchema = { ...oldSchema };
  const ui: UIConfig = {};

  // 提取所有 ui:xxx 属性
  Object.keys(newSchema).forEach(key => {
    if (key.startsWith('ui:')) {
      const uiKey = key.substring(3); // 移除 'ui:' 前缀
      ui[uiKey] = newSchema[key];
      delete newSchema[key];
    }
  });

  // 如果有 UI 属性，添加到 ui 对象
  if (Object.keys(ui).length > 0) {
    newSchema.ui = ui;
  }

  // 递归处理嵌套属性
  if (newSchema.properties) {
    Object.keys(newSchema.properties).forEach(key => {
      newSchema.properties[key] = migrateSchema(newSchema.properties[key]);
    });
  }

  return newSchema;
}
```

---

**更新日期**: 2025-12-22
**版本**: 2.0
