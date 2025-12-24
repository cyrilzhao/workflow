# 错误信息自定义功能更新说明

## 更新概述

已为动态表单组件添加自定义错误信息功能，并将所有默认错误信息改为英文。

---

## 核心变化

### 1. 新增 ErrorMessages 类型

```typescript
export interface ErrorMessages {
  required?: string;
  minLength?: string;
  maxLength?: string;
  min?: string;
  max?: string;
  pattern?: string;
  [key: string]: string | undefined;
}
```

### 2. UIConfig 新增 errorMessages 属性

```typescript
export interface UIConfig {
  widget?: WidgetType;
  placeholder?: string;
  // ... 其他属性
  errorMessages?: ErrorMessages;  // ⭐ 新增
}
```

---

## 使用示例

### 基础用法

```json
{
  "type": "string",
  "title": "Username",
  "minLength": 3,
  "maxLength": 20,
  "ui": {
    "errorMessages": {
      "required": "Username is required",
      "minLength": "Username must be at least 3 characters",
      "maxLength": "Username cannot exceed 20 characters"
    }
  }
}
```

### 完整示例

```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "title": "Email",
      "format": "email",
      "ui": {
        "placeholder": "Enter your email",
        "errorMessages": {
          "required": "Email address is required",
          "pattern": "Please enter a valid email address"
        }
      }
    },
    "age": {
      "type": "integer",
      "title": "Age",
      "minimum": 18,
      "maximum": 100,
      "ui": {
        "errorMessages": {
          "required": "Please enter your age",
          "min": "You must be at least 18 years old",
          "max": "Age cannot exceed 100"
        }
      }
    },
    "password": {
      "type": "string",
      "title": "Password",
      "minLength": 8,
      "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
      "ui": {
        "widget": "password",
        "errorMessages": {
          "required": "Password is required",
          "minLength": "Password must be at least 8 characters",
          "pattern": "Password must contain uppercase, lowercase and numbers"
        }
      }
    }
  },
  "required": ["email", "age", "password"]
}
```

---

## 默认错误信息（英文）

如果未提供自定义错误信息，系统将使用以下默认英文错误信息：

| 验证规则 | 默认错误信息 |
|---------|------------|
| required | `{title} is required` 或 `This field is required` |
| minLength | `Minimum length is {value} characters` |
| maxLength | `Maximum length is {value} characters` |
| min | `Minimum value is {value}` |
| max | `Maximum value is {value}` |
| pattern | `Invalid format` |

---

## 实现细节

### getValidationRules 方法更新

```typescript
private static getValidationRules(
  schema: ExtendedJSONSchema,
  required: boolean
): ValidationRules {
  const rules: ValidationRules = {};
  const errorMessages = schema.ui?.errorMessages || {};

  if (required) {
    rules.required = errorMessages.required ||
      (schema.title ? `${schema.title} is required` : 'This field is required');
  }

  if (schema.minLength) {
    rules.minLength = {
      value: schema.minLength,
      message: errorMessages.minLength ||
        `Minimum length is ${schema.minLength} characters`,
    };
  }

  // ... 其他验证规则
}
```

---

## 优势

1. **灵活性** - 支持为每个字段自定义错误信息
2. **国际化友好** - 可以轻松支持多语言
3. **向后兼容** - 未配置时使用默认英文错误信息
4. **类型安全** - 完整的 TypeScript 类型支持

---

## 国际化支持

可以结合 i18n 库实现多语言错误信息：

```typescript
const schema = {
  type: "string",
  title: "Username",
  minLength: 3,
  ui: {
    errorMessages: {
      required: t('validation.username.required'),
      minLength: t('validation.username.minLength', { min: 3 })
    }
  }
};
```

---

**更新日期**: 2025-12-22
**版本**: 2.1
