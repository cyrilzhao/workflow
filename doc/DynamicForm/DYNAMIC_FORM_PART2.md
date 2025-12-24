# 动态表单组件技术方案 - Part 2

## JSON Schema 规范详解

### 5.1 基础类型定义

#### 5.1.1 字符串类型 (string)

```json
{
  "type": "string",
  "title": "用户名",
  "description": "请输入用户名",
  "minLength": 2,
  "maxLength": 20,
  "pattern": "^[a-zA-Z0-9_]+$",
  "default": "",
  "examples": ["john_doe", "user123"]
}
```

**支持的验证规则**:
- `minLength`: 最小长度
- `maxLength`: 最大长度
- `pattern`: 正则表达式
- `format`: 预定义格式（email, uri, date-time 等）
- `enum`: 枚举值

**UI 扩展属性**:
```json
{
  "type": "string",
  "ui": {
    "widget": "textarea",
    "placeholder": "请输入描述",
    "rows": 4
  }
}
```

#### 5.1.2 数字类型 (number/integer)

```json
{
  "type": "integer",
  "title": "年龄",
  "minimum": 0,
  "maximum": 120,
  "multipleOf": 1,
  "default": 18
}
```

**支持的验证规则**:
- `minimum`: 最小值
- `maximum`: 最大值
- `exclusiveMinimum`: 排他最小值
- `exclusiveMaximum`: 排他最大值
- `multipleOf`: 倍数

**UI 扩展属性**:
```json
{
  "type": "number",
  "ui": {
    "widget": "range",
    "step": 0.1,
    "unit": "元"
  }
}
```

#### 5.1.3 布尔类型 (boolean)

```json
{
  "type": "boolean",
  "title": "是否同意协议",
  "default": false
}
```

**UI 扩展属性**:
```json
{
  "type": "boolean",
  "ui": {
    "widget": "switch",
    "checkedText": "是",
    "uncheckedText": "否"
  }
}
```

#### 5.1.4 数组类型 (array)

```json
{
  "type": "array",
  "title": "标签",
  "items": {
    "type": "string"
  },
  "minItems": 1,
  "maxItems": 5,
  "uniqueItems": true
}
```

**对象数组示例**:
```json
{
  "type": "array",
  "title": "联系人列表",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "title": "姓名" },
      "phone": { "type": "string", "title": "电话" }
    },
    "required": ["name"]
  }
}
```

#### 5.1.5 对象类型 (object)

```json
{
  "type": "object",
  "title": "地址信息",
  "properties": {
    "province": { "type": "string", "title": "省份" },
    "city": { "type": "string", "title": "城市" },
    "detail": { "type": "string", "title": "详细地址" }
  },
  "required": ["province", "city"]
}
```

### 5.2 完整表单 Schema 示例

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "用户注册表单",
  "description": "新用户注册信息",
  "properties": {
    "username": {
      "type": "string",
      "title": "用户名",
      "minLength": 3,
      "maxLength": 20,
      "pattern": "^[a-zA-Z0-9_]+$",
      "ui": {
        "placeholder": "请输入用户名"
      }
    },
    "email": {
      "type": "string",
      "title": "邮箱",
      "format": "email",
      "ui": {
        "placeholder": "example@email.com"
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
    "age": {
      "type": "integer",
      "title": "年龄",
      "minimum": 18,
      "maximum": 100
    },
    "gender": {
      "type": "string",
      "title": "性别",
      "enum": ["male", "female", "other"],
      "enumNames": ["男", "女", "其他"],
      "ui": {
        "widget": "radio"
      }
    },
    "interests": {
      "type": "array",
      "title": "兴趣爱好",
      "items": {
        "type": "string",
        "enum": ["reading", "sports", "music", "travel"],
        "enumNames": ["阅读", "运动", "音乐", "旅行"]
      },
      "uniqueItems": true,
      "ui": {
        "widget": "checkboxes"
      }
    },
    "bio": {
      "type": "string",
      "title": "个人简介",
      "maxLength": 500,
      "ui": {
        "widget": "textarea",
        "rows": 4
      }
    },
    "agreeTerms": {
      "type": "boolean",
      "title": "同意用户协议",
      "const": true
    }
  },
  "required": ["username", "email", "password", "agreeTerms"]
}
```

### 5.3 UI 扩展规范

#### 5.3.1 通用 UI 属性

```typescript
interface UIConfig {
  widget?: string;                // 组件类型
  placeholder?: string;           // 占位符
  disabled?: boolean;             // 是否禁用
  readonly?: boolean;             // 是否只读
  hidden?: boolean;               // 是否隐藏
  help?: string;                  // 帮助文本
  className?: string;             // CSS 类名
  style?: React.CSSProperties;    // 内联样式
  order?: string[];               // 字段顺序
  errorMessages?: ErrorMessages;  // 自定义错误信息
  [key: string]: any;             // 其他自定义属性
}

/**
 * 错误信息配置
 */
interface ErrorMessages {
  required?: string;              // 必填错误信息
  minLength?: string;             // 最小长度错误信息
  maxLength?: string;             // 最大长度错误信息
  min?: string;                   // 最小值错误信息
  max?: string;                   // 最大值错误信息
  pattern?: string;               // 格式错误信息
  [key: string]: string;          // 其他自定义错误信息
}
```

#### 5.3.2 字段级 UI 配置

```json
{
  "properties": {
    "email": {
      "type": "string",
      "title": "Email",
      "ui": {
        "widget": "email",
        "placeholder": "Enter your email",
        "help": "We will never share your email",
        "className": "custom-email-field"
      }
    }
  }
}
```

#### 5.3.3 自定义错误信息

```json
{
  "properties": {
    "username": {
      "type": "string",
      "title": "Username",
      "minLength": 3,
      "maxLength": 20,
      "pattern": "^[a-zA-Z0-9_]+$",
      "ui": {
        "placeholder": "Enter username",
        "errorMessages": {
          "required": "Username is required",
          "minLength": "Username must be at least 3 characters",
          "maxLength": "Username cannot exceed 20 characters",
          "pattern": "Username can only contain letters, numbers and underscores"
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
    }
  },
  "required": ["username", "age"]
}
```

#### 5.3.3 支持的 Widget 类型

| Widget 类型 | 适用字段类型 | 说明 |
|------------|------------|------|
| `text` | string | 单行文本输入 |
| `textarea` | string | 多行文本输入 |
| `password` | string | 密码输入 |
| `email` | string | 邮箱输入 |
| `url` | string | URL 输入 |
| `number` | number/integer | 数字输入 |
| `range` | number/integer | 滑块 |
| `select` | string/number | 下拉选择 |
| `radio` | string/number | 单选按钮 |
| `checkboxes` | array | 多选框组 |
| `checkbox` | boolean | 单个复选框 |
| `switch` | boolean | 开关 |
| `date` | string | 日期选择 |
| `datetime` | string | 日期时间选择 |
| `time` | string | 时间选择 |
| `color` | string | 颜色选择 |
| `file` | string | 文件上传 |

### 5.4 条件渲染

#### 5.4.1 使用 dependencies

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
      "title": "详细地址"
    }
  },
  "dependencies": {
    "hasAddress": {
      "oneOf": [
        {
          "properties": {
            "hasAddress": { "const": true },
            "address": { "minLength": 1 }
          },
          "required": ["address"]
        }
      ]
    }
  }
}
```

#### 5.4.2 使用 if/then/else (Draft-07+)

```json
{
  "type": "object",
  "properties": {
    "country": {
      "type": "string",
      "enum": ["china", "usa"]
    },
    "idCard": { "type": "string" },
    "ssn": { "type": "string" }
  },
  "if": {
    "properties": { "country": { "const": "china" } }
  },
  "then": {
    "required": ["idCard"]
  },
  "else": {
    "required": ["ssn"]
  }
}
```

### 5.5 自定义验证

#### 5.5.1 自定义格式

```json
{
  "type": "string",
  "format": "phone",
  "title": "手机号"
}
```

对应的验证器注册：
```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

// 自定义手机号格式
ajv.addFormat('phone', {
  validate: (data: string) => /^1[3-9]\d{9}$/.test(data)
});
```

#### 5.5.2 自定义关键字

```typescript
ajv.addKeyword({
  keyword: 'isAdult',
  validate: (schema: boolean, data: number) => {
    return schema ? data >= 18 : true;
  }
});
```

使用：
```json
{
  "type": "integer",
  "title": "年龄",
  "isAdult": true
}
```

---

**下一部分**: 组件架构设计
