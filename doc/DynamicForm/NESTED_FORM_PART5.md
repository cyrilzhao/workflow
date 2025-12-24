# 嵌套动态表单技术方案 - Part 5

## 高级特性

### 1. 异步加载 Schema

```typescript
const schema = {
  type: 'object',
  properties: {
    productId: {
      type: 'string',
      title: 'Product ID'
    },
    configuration: {
      type: 'object',
      title: 'Configuration',
      ui: {
        widget: 'nested-form',
        schemaLoader: async (value) => {
          // 根据产品 ID 异步加载配置 schema
          const response = await api.getProductConfigSchema(value.productId);
          return response.schema;
        }
      }
    }
  }
};
```

### 2. 数组中的嵌套表单

```typescript
const schema = {
  type: 'object',
  properties: {
    contacts: {
      type: 'array',
      title: 'Contacts',
      items: {
        type: 'object',
        ui: {
          widget: 'nested-form',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name' },
              email: { type: 'string', title: 'Email', format: 'email' },
              phone: { type: 'string', title: 'Phone' }
            }
          }
        }
      }
    }
  }
};
```

### 3. 多层嵌套

```typescript
const schema = {
  type: 'object',
  properties: {
    company: {
      type: 'object',
      title: 'Company',
      ui: {
        widget: 'nested-form',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Company Name' },
            address: {
              type: 'object',
              title: 'Address',
              ui: {
                widget: 'nested-form',
                schema: {
                  type: 'object',
                  properties: {
                    street: { type: 'string', title: 'Street' },
                    city: { type: 'string', title: 'City' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
```

---

**下一部分**: 最佳实践和注意事项
