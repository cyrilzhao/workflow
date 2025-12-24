# 动态表单组件技术方案 - Part 6

## 常见问题和实施建议

### 9.1 常见问题 (FAQ)

#### Q1: 如何处理异步验证？

**A**: 使用 react-hook-form 的 validate 函数

```typescript
const schema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      title: '用户名',
      'ui:asyncValidate': 'checkUsername'
    }
  }
};

// 在组件中注册异步验证
const asyncValidators = {
  checkUsername: async (value: string) => {
    const exists = await api.checkUsername(value);
    return exists ? '用户名已存在' : true;
  }
};
```

#### Q2: 如何实现字段联动？

**A**: 使用 watch 监听字段变化

```typescript
const { watch, setValue } = useFormContext();

useEffect(() => {
  const subscription = watch((value, { name }) => {
    if (name === 'country') {
      // 当国家改变时，清空城市
      setValue('city', '');
    }
  });
  return () => subscription.unsubscribe();
}, [watch, setValue]);
```

#### Q3: 如何支持文件上传？

**A**: 创建自定义文件上传组件

```typescript
const FileUploadWidget: React.FC<FieldWidgetProps> = ({
  name,
  onChange
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 可以在这里上传文件到服务器
      onChange(file);
    }
  };

  return <input type="file" onChange={handleFileChange} />;
};
```

#### Q4: 如何实现表单的撤销/重做？

**A**: 使用状态历史管理

```typescript
const [history, setHistory] = useState<any[]>([]);
const [currentIndex, setCurrentIndex] = useState(-1);

const saveHistory = (data: any) => {
  const newHistory = history.slice(0, currentIndex + 1);
  setHistory([...newHistory, data]);
  setCurrentIndex(newHistory.length);
};

const undo = () => {
  if (currentIndex > 0) {
    setCurrentIndex(currentIndex - 1);
    reset(history[currentIndex - 1]);
  }
};

const redo = () => {
  if (currentIndex < history.length - 1) {
    setCurrentIndex(currentIndex + 1);
    reset(history[currentIndex + 1]);
  }
};
```

#### Q5: 如何处理大型表单的性能问题？

**A**: 采用以下优化策略

1. **使用虚拟滚动**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={fields.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <FormField field={fields[index]} />
    </div>
  )}
</FixedSizeList>
```

2. **分步表单**
```typescript
const [step, setStep] = useState(0);
const schemas = [step1Schema, step2Schema, step3Schema];

<DynamicForm schema={schemas[step]} />
```

3. **懒加载字段**
```typescript
const [visibleFields, setVisibleFields] = useState(
  fields.slice(0, 20)
);

// 滚动时加载更多
const loadMore = () => {
  setVisibleFields(fields.slice(0, visibleFields.length + 20));
};
```

### 9.2 实施建议

#### 9.2.1 项目集成步骤

**第一阶段：基础搭建（1-2 周）**

1. 安装依赖和配置
2. 创建基础组件结构
3. 实现核心字段组件（text, select, checkbox 等）
4. 实现 Schema Parser
5. 编写基础测试用例

**第二阶段：功能完善（2-3 周）**

1. 实现高级字段组件（date, file, array 等）
2. 完善验证功能
3. 实现条件渲染
4. 添加错误处理
5. 优化用户体验

**第三阶段：扩展和优化（2-3 周）**

1. 实现自定义组件系统
2. 性能优化
3. 添加单元测试和集成测试
4. 编写文档和示例
5. 代码审查和重构

#### 9.2.2 团队协作建议

**1. 制定 Schema 规范**
- 统一字段命名规则
- 统一验证规则
- 统一 UI 扩展属性

**2. 建立组件库**
- 创建可复用的字段组件
- 统一样式规范
- 提供组件文档

**3. 版本管理**
- Schema 版本控制
- 向后兼容性
- 迁移指南

### 9.3 测试策略

#### 9.3.1 单元测试

```typescript
// SchemaParser.test.ts
import { SchemaParser } from './SchemaParser';

describe('SchemaParser', () => {
  it('should parse simple schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '姓名' }
      }
    };

    const fields = SchemaParser.parse(schema);

    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('name');
    expect(fields[0].type).toBe('string');
  });

  it('should handle required fields', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string' }
      },
      required: ['email']
    };

    const fields = SchemaParser.parse(schema);

    expect(fields[0].required).toBe(true);
  });
});
```

#### 9.3.2 集成测试

```typescript
// DynamicForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicForm } from './DynamicForm';

describe('DynamicForm', () => {
  it('should render form fields', () => {
    const schema = {
      type: 'object',
      properties: {
        username: { type: 'string', title: '用户名' }
      }
    };

    render(<DynamicForm schema={schema} />);

    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', title: '邮箱' }
      },
      required: ['email']
    };

    const onSubmit = jest.fn();
    render(<DynamicForm schema={schema} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('提交'));

    expect(await screen.findByText('邮箱必填')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

### 9.4 部署和维护

#### 9.4.1 性能监控

```typescript
// 监控表单渲染性能
import { Profiler } from 'react';

<Profiler
  id="DynamicForm"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} ${phase} took ${actualDuration}ms`);
  }}
>
  <DynamicForm schema={schema} />
</Profiler>
```

#### 9.4.2 错误追踪

```typescript
// 集成错误追踪服务（如 Sentry）
import * as Sentry from '@sentry/react';

try {
  SchemaParser.parse(schema);
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'DynamicForm' },
    extra: { schema }
  });
}
```

---

**文档完成**
