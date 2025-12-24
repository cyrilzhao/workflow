# 嵌套动态表单技术方案 - Part 6

## 最佳实践

### 1. 值同步策略

```typescript
// 使用 useEffect 确保值同步
const NestedFormWidget = ({ value, onChange }) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (newValue) => {
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return <DynamicForm defaultValues={internalValue} onChange={handleChange} />;
};
```

### 2. 验证处理

```typescript
// 嵌套表单的验证应该独立处理
const schema = {
  type: 'object',
  properties: {
    address: {
      type: 'object',
      ui: {
        widget: 'nested-form',
        schema: {
          type: 'object',
          properties: {
            city: { type: 'string', title: 'City' }
          },
          required: ['city'] // 内层验证
        }
      }
    }
  }
};
```

### 3. 性能优化

```typescript
// 使用 useMemo 缓存 schema
const nestedSchema = useMemo(() => ({
  type: 'object',
  properties: {
    // ...
  }
}), []);
```

---

## 注意事项

1. **避免过深嵌套** - 建议最多 2-3 层
2. **值类型一致** - 确保字段值始终是对象类型
3. **验证独立性** - 内外层表单验证应该独立
4. **性能考虑** - 大量嵌套表单会影响性能

---

**文档完成**
