# refreshLinkage 使用指南

## 功能说明

`refreshLinkage` 方法用于在异步数据加载完成后，手动重新触发表单的联动计算。

## 使用场景

当联动函数依赖于异步加载的数据时（如员工列表、部门列表等），需要在数据加载完成后重新触发联动初始化。

## 使用示例

### 示例 1: 员工列表联动

```tsx
import { useRef, useEffect, useState } from 'react';
import { DynamicForm, DynamicFormRef } from './components/DynamicForm';
import type { ExtendedJSONSchema } from './components/DynamicForm/types/schema';

function EmployeeForm() {
  const formRef = useRef<DynamicFormRef>(null);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // 加载员工列表
  useEffect(() => {
    async function loadEmployees() {
      setLoading(true);
      try {
        const response = await fetch('/api/employees');
        const data = await response.json();
        setEmployees(data);

        // 数据加载完成后，重新触发联动
        await formRef.current?.refreshLinkage();
      } finally {
        setLoading(false);
      }
    }

    loadEmployees();
  }, []);

  const schema: ExtendedJSONSchema = {
    type: 'object',
    properties: {
      department: {
        type: 'string',
        title: 'Department',
        enum: ['engineering', 'sales', 'hr'],
      },
      employee: {
        type: 'string',
        title: 'Employee',
        ui: {
          widget: 'select',
          // options 将通过联动函数动态生成
        },
        linkage: {
          type: 'options',
          dependencies: ['department'],
          fulfill: {
            function: 'getEmployeeOptions',
          },
        },
      },
    },
  };

  const linkageFunctions = {
    // 根据部门筛选员工列表
    getEmployeeOptions: (formData: Record<string, any>) => {
      const department = formData.department;
      if (!department || employees.length === 0) {
        return [];
      }

      // 根据部门筛选员工（假设 employees 数据中包含 department 字段）
      return employees
        .filter(emp => emp.department === department)
        .map(emp => ({
          label: emp.name,
          value: emp.id,
        }));
    },
  };

  return (
    <DynamicForm
      ref={formRef}
      schema={schema}
      linkageFunctions={linkageFunctions}
      loading={loading}
      onSubmit={data => {
        console.log('Form submitted:', data);
      }}
    />
  );
}
```

### 示例 2: 多个异步数据源

```tsx
function ComplexForm() {
  const formRef = useRef<DynamicFormRef>(null);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // 并行加载多个数据源
        const [deptData, locData] = await Promise.all([
          fetch('/api/departments').then(r => r.json()),
          fetch('/api/locations').then(r => r.json()),
        ]);

        setDepartments(deptData);
        setLocations(locData);
        setDataLoaded(true);

        // 所有数据加载完成后，重新触发联动
        await formRef.current?.refreshLinkage();
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }

    loadData();
  }, []);

  const linkageFunctions = {
    getDepartmentOptions: () => {
      return departments.map(dept => ({
        label: dept.name,
        value: dept.id,
      }));
    },

    getLocationOptions: (formData: Record<string, any>) => {
      const deptId = formData.department;
      if (!deptId) return [];

      // 根据部门筛选可用的办公地点
      return locations
        .filter(loc => loc.departmentId === deptId)
        .map(loc => ({
          label: loc.name,
          value: loc.id,
        }));
    },
  };

  // ... schema 定义和表单渲染
}
```

### 示例 3: 手动刷新联动

```tsx
function FormWithRefresh() {
  const formRef = useRef<DynamicFormRef>(null);

  const handleRefreshData = async () => {
    // 重新加载数据
    await loadSomeData();

    // 手动触发联动刷新
    await formRef.current?.refreshLinkage();
  };

  return (
    <div>
      <button onClick={handleRefreshData}>
        Refresh Data
      </button>

      <DynamicForm
        ref={formRef}
        schema={schema}
        linkageFunctions={linkageFunctions}
      />
    </div>
  );
}
```

## 注意事项

1. **异步执行**: `refreshLinkage` 返回一个 Promise，建议使用 `await` 等待执行完成

2. **数据准备**: 确保在调用 `refreshLinkage` 之前，联动函数依赖的数据已经加载完成

3. **性能考虑**: `refreshLinkage` 会重新计算所有联动状态，避免频繁调用

4. **初始加载**: 表单首次渲染时会自动触发联动初始化，只有在数据更新后才需要手动调用

## API 参考

```typescript
interface DynamicFormRef {
  // ... 其他方法

  /**
   * 重新触发联动初始化
   * @returns Promise<void>
   */
  refreshLinkage: () => Promise<void>;
}
```

## 工作原理

1. `refreshLinkage` 内部通过更新一个计数器来触发联动重新初始化
2. 联动管理器监听到计数器变化后，会重新执行所有联动函数
3. 新的联动结果会更新到表单状态中，触发 UI 重新渲染

## 相关文档

- [联动机制设计文档](./UI_LINKAGE_DESIGN.md)
- [DynamicForm API 文档](./src/components/DynamicForm/README.md)
