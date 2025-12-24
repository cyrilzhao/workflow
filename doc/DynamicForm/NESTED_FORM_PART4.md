# 嵌套动态表单技术方案 - Part 4

## 使用示例

### 示例 1: 静态嵌套表单

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
      ui: {
        widget: 'nested-form',
        schema: {
          type: 'object',
          properties: {
            street: { type: 'string', title: 'Street' },
            city: { type: 'string', title: 'City' },
            zipCode: { type: 'string', title: 'Zip Code' }
          },
          required: ['city']
        }
      }
    }
  }
};

// 使用
<DynamicForm schema={schema} onSubmit={handleSubmit} />

// 提交的数据结构
{
  name: 'John Doe',
  address: {
    street: '123 Main St',
    city: 'New York',
    zipCode: '10001'
  }
}
```

### 示例 2: 动态嵌套表单（根据字段值切换）

```typescript
const schema = {
  type: 'object',
  properties: {
    userType: {
      type: 'string',
      title: 'User Type',
      enum: ['personal', 'company'],
      enumNames: ['Personal', 'Company']
    },
    details: {
      type: 'object',
      title: 'Details',
      ui: {
        widget: 'nested-form',
        schemaKey: 'userType',
        schemas: {
          personal: {
            type: 'object',
            properties: {
              firstName: { type: 'string', title: 'First Name' },
              lastName: { type: 'string', title: 'Last Name' },
              birthDate: { type: 'string', title: 'Birth Date', ui: { widget: 'date' } }
            }
          },
          company: {
            type: 'object',
            properties: {
              companyName: { type: 'string', title: 'Company Name' },
              taxId: { type: 'string', title: 'Tax ID' },
              industry: { type: 'string', title: 'Industry' }
            }
          }
        }
      }
    }
  }
};
```

---

**下一部分**: 高级特性和最佳实践
