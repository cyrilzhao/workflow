/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useArrayLinkageManager } from './useArrayLinkageManager';
import type { LinkageConfig, LinkageFunction } from '../types/linkage';
import type { ExtendedJSONSchema } from '../types/schema';

/**
 * 测试辅助函数：创建基础的 schema
 */
function createSchema(properties: Record<string, any>): ExtendedJSONSchema {
  return {
    type: 'object',
    properties,
  };
}

describe('useArrayLinkageManager - 场景 1: 相对路径依赖', () => {
  it('应该支持数组元素内部的相对路径联动', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          contacts: [
            { type: 'personal', companyName: '' },
            { type: 'work', companyName: '' },
          ],
        },
      });

      const schema = createSchema({
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['personal', 'work'],
              },
              companyName: {
                type: 'string',
              },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径（由 transformToAbsolutePaths 生成）
      // 在实际使用中，NestedFormWidget 会为每个数组元素创建子 DynamicForm，
      // 子 DynamicForm 通过 transformToAbsolutePaths 将模板路径转换为实例化路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.0.companyName': {
          type: 'visibility',
          dependencies: ['contacts.0.type'],
          when: {
            field: 'contacts.0.type',
            operator: '==',
            value: 'work',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
        'contacts.1.companyName': {
          type: 'visibility',
          dependencies: ['contacts.1.type'],
          when: {
            field: 'contacts.1.type',
            operator: '==',
            value: 'work',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      // contacts.0.type = 'personal'，companyName 应该隐藏
      expect(result.current.linkageStates['contacts.0.companyName']?.visible).toBe(false);
      // contacts.1.type = 'work'，companyName 应该显示
      expect(result.current.linkageStates['contacts.1.companyName']?.visible).toBe(true);
    });

    // 修改第一个联系人的类型为 'work'
    result.current.form.setValue('contacts.0.type', 'work');

    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.companyName']?.visible).toBe(true);
    });
  });

  it('应该正确解析相对路径为绝对路径', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          contacts: [{ type: 'work', companyName: '', department: '' }],
        },
      });

      const schema = createSchema({
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              companyName: { type: 'string' },
              department: { type: 'string' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.0.department': {
          type: 'visibility',
          dependencies: ['contacts.0.type', 'contacts.0.companyName'],
          when: {
            and: [
              { field: 'contacts.0.type', operator: '==', value: 'work' },
              { field: 'contacts.0.companyName', operator: 'isNotEmpty' },
            ],
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：type='work' 但 companyName 为空，应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.department']?.visible).toBe(false);
    });

    // 填写公司名称
    result.current.form.setValue('contacts.0.companyName', 'Acme Corp');

    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.department']?.visible).toBe(true);
    });
  });
});

describe('useArrayLinkageManager - 场景 2: 绝对路径依赖（数组内依赖外部）', () => {
  it('应该支持数组元素依赖外部字段', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          enableVip: false,
          contacts: [
            { name: 'Alice', vipLevel: '' },
            { name: 'Bob', vipLevel: '' },
          ],
        },
      });

      const schema = createSchema({
        enableVip: { type: 'boolean' },
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              vipLevel: { type: 'string' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.0.vipLevel': {
          type: 'visibility',
          dependencies: ['enableVip'],
          when: {
            field: 'enableVip',
            operator: '==',
            value: true,
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
        'contacts.1.vipLevel': {
          type: 'visibility',
          dependencies: ['enableVip'],
          when: {
            field: 'enableVip',
            operator: '==',
            value: true,
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：enableVip = false，所有 vipLevel 应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.vipLevel']?.visible).toBe(false);
      expect(result.current.linkageStates['contacts.1.vipLevel']?.visible).toBe(false);
    });

    // 启用 VIP 功能
    result.current.form.setValue('enableVip', true);

    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.vipLevel']?.visible).toBe(true);
      expect(result.current.linkageStates['contacts.1.vipLevel']?.visible).toBe(true);
    });
  });

  it('应该支持外部字段变化影响所有数组元素', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          showAdvanced: false,
          items: [
            { name: 'Item 1', advancedSettings: '' },
            { name: 'Item 2', advancedSettings: '' },
            { name: 'Item 3', advancedSettings: '' },
          ],
        },
      });

      const schema = createSchema({
        showAdvanced: { type: 'boolean' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              advancedSettings: { type: 'string' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'items.0.advancedSettings': {
          type: 'visibility',
          dependencies: ['showAdvanced'],
          when: {
            field: 'showAdvanced',
            operator: '==',
            value: true,
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
        'items.1.advancedSettings': {
          type: 'visibility',
          dependencies: ['showAdvanced'],
          when: {
            field: 'showAdvanced',
            operator: '==',
            value: true,
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
        'items.2.advancedSettings': {
          type: 'visibility',
          dependencies: ['showAdvanced'],
          when: {
            field: 'showAdvanced',
            operator: '==',
            value: true,
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：所有 advancedSettings 应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates['items.0.advancedSettings']?.visible).toBe(false);
      expect(result.current.linkageStates['items.1.advancedSettings']?.visible).toBe(false);
      expect(result.current.linkageStates['items.2.advancedSettings']?.visible).toBe(false);
    });

    // 启用高级设置
    result.current.form.setValue('showAdvanced', true);

    await waitFor(() => {
      expect(result.current.linkageStates['items.0.advancedSettings']?.visible).toBe(true);
      expect(result.current.linkageStates['items.1.advancedSettings']?.visible).toBe(true);
      expect(result.current.linkageStates['items.2.advancedSettings']?.visible).toBe(true);
    });
  });
});

describe('useArrayLinkageManager - 场景 3: 菱形依赖', () => {
  it('应该正确处理数组元素内部的菱形依赖', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          contacts: [
            {
              type: 'work',
              showCompany: false,
              showDepartment: false,
              workInfo: '',
            },
          ],
        },
      });

      const schema = createSchema({
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              showCompany: { type: 'boolean' },
              showDepartment: { type: 'boolean' },
              workInfo: { type: 'string' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.0.showCompany': {
          type: 'value',
          dependencies: ['contacts.0.type'],
          fulfill: {
            function: 'calcShowCompany',
          },
        },
        'contacts.0.showDepartment': {
          type: 'value',
          dependencies: ['contacts.0.type'],
          fulfill: {
            function: 'calcShowDepartment',
          },
        },
        'contacts.0.workInfo': {
          type: 'visibility',
          dependencies: ['contacts.0.showCompany', 'contacts.0.showDepartment'],
          when: {
            and: [
              { field: 'contacts.0.showCompany', operator: '==', value: true },
              { field: 'contacts.0.showDepartment', operator: '==', value: true },
            ],
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calcShowCompany: (formData: any) => {
          return formData.contacts?.[0]?.type === 'work';
        },
        calcShowDepartment: (formData: any) => {
          return formData.contacts?.[0]?.type === 'work';
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        linkageFunctions,
        schema,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.showCompany']?.value).toBe(true);
      expect(result.current.linkageStates['contacts.0.showDepartment']?.value).toBe(true);
      expect(result.current.linkageStates['contacts.0.workInfo']?.visible).toBe(true);
    });

    // 修改类型为 'personal'
    result.current.form.setValue('contacts.0.type', 'personal');

    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.showCompany']?.value).toBe(false);
      expect(result.current.linkageStates['contacts.0.showDepartment']?.value).toBe(false);
      expect(result.current.linkageStates['contacts.0.workInfo']?.visible).toBe(false);
    });
  });
});

describe('useArrayLinkageManager - 场景 4: 混合依赖（外部 + 内部相对路径）', () => {
  it('应该支持同时依赖外部字段和内部相对路径字段', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          enableAdvanced: false,
          contacts: [
            { type: 'personal', advancedWorkInfo: '' },
            { type: 'work', advancedWorkInfo: '' },
          ],
        },
      });

      const schema = createSchema({
        enableAdvanced: { type: 'boolean' },
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              advancedWorkInfo: { type: 'string' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.0.advancedWorkInfo': {
          type: 'visibility',
          dependencies: ['enableAdvanced', 'contacts.0.type'],
          when: {
            and: [
              { field: 'enableAdvanced', operator: '==', value: true },
              { field: 'contacts.0.type', operator: '==', value: 'work' },
            ],
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
        'contacts.1.advancedWorkInfo': {
          type: 'visibility',
          dependencies: ['enableAdvanced', 'contacts.1.type'],
          when: {
            and: [
              { field: 'enableAdvanced', operator: '==', value: true },
              { field: 'contacts.1.type', operator: '==', value: 'work' },
            ],
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：enableAdvanced = false，所有 advancedWorkInfo 应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.advancedWorkInfo']?.visible).toBe(false);
      expect(result.current.linkageStates['contacts.1.advancedWorkInfo']?.visible).toBe(false);
    });

    // 启用高级功能，但第一个联系人是 personal，仍然隐藏
    result.current.form.setValue('enableAdvanced', true);

    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.advancedWorkInfo']?.visible).toBe(false);
      expect(result.current.linkageStates['contacts.1.advancedWorkInfo']?.visible).toBe(true);
    });

    // 修改第一个联系人为 work
    result.current.form.setValue('contacts.0.type', 'work');

    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.advancedWorkInfo']?.visible).toBe(true);
    });
  });
});

describe('useArrayLinkageManager - 场景 5: 跨数组联动', () => {
  it('应该支持数组 A 的聚合状态影响数组 B 的所有元素', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          permissions: [
            { name: 'read', isAdmin: false },
            { name: 'write', isAdmin: false },
          ],
          features: [
            { name: 'feature1', enabled: false },
            { name: 'feature2', enabled: false },
          ],
        },
      });

      const schema = createSchema({
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              isAdmin: { type: 'boolean' },
            },
          },
        },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              enabled: { type: 'boolean' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'features.0.enabled': {
          type: 'value',
          dependencies: ['permissions'],
          fulfill: {
            function: 'checkAdminPermission',
          },
        },
        'features.1.enabled': {
          type: 'value',
          dependencies: ['permissions'],
          fulfill: {
            function: 'checkAdminPermission',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        checkAdminPermission: (formData: any) => {
          const permissions = formData.permissions || [];
          return permissions.some((p: any) => p.isAdmin === true);
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        linkageFunctions,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：没有管理员权限，所有功能应该禁用
    await waitFor(() => {
      expect(result.current.linkageStates['features.0.enabled']?.value).toBe(false);
      expect(result.current.linkageStates['features.1.enabled']?.value).toBe(false);
    });

    // 添加管理员权限
    result.current.form.setValue('permissions.0.isAdmin', true);

    await waitFor(() => {
      expect(result.current.linkageStates['features.0.enabled']?.value).toBe(true);
      expect(result.current.linkageStates['features.1.enabled']?.value).toBe(true);
    });
  });

  it('应该支持数组 A 的特定元素影响数组 B 的所有元素', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          tasks: [
            { name: 'Task 1', priority: 'low' },
            { name: 'Task 2', priority: 'medium' },
          ],
          reminders: [
            { message: 'Reminder 1', notifyImmediately: false },
            { message: 'Reminder 2', notifyImmediately: false },
          ],
        },
      });

      const schema = createSchema({
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              priority: { type: 'string' },
            },
          },
        },
        reminders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              notifyImmediately: { type: 'boolean' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'reminders.0.notifyImmediately': {
          type: 'value',
          dependencies: ['tasks'],
          fulfill: {
            function: 'checkUrgentTasks',
          },
        },
        'reminders.1.notifyImmediately': {
          type: 'value',
          dependencies: ['tasks'],
          fulfill: {
            function: 'checkUrgentTasks',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        checkUrgentTasks: (formData: any) => {
          const tasks = formData.tasks || [];
          return tasks.some((task: any) => task.priority === 'urgent');
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        linkageFunctions,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：没有紧急任务，不需要立即通知
    await waitFor(() => {
      expect(result.current.linkageStates['reminders.0.notifyImmediately']?.value).toBe(false);
      expect(result.current.linkageStates['reminders.1.notifyImmediately']?.value).toBe(false);
    });

    // 添加紧急任务
    result.current.form.setValue('tasks.0.priority', 'urgent');

    await waitFor(() => {
      expect(result.current.linkageStates['reminders.0.notifyImmediately']?.value).toBe(true);
      expect(result.current.linkageStates['reminders.1.notifyImmediately']?.value).toBe(true);
    });
  });
});

describe('useArrayLinkageManager - 场景 6: 嵌套数组联动', () => {
  it('应该支持子数组元素依赖父数组元素字段', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          departments: [
            {
              name: 'Tech',
              type: 'tech',
              employees: [
                { name: 'Alice', techStack: '' },
                { name: 'Bob', techStack: '' },
              ],
            },
            {
              name: 'Sales',
              type: 'sales',
              employees: [{ name: 'Charlie', techStack: '' }],
            },
          ],
        },
      });

      const schema = createSchema({
        departments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              employees: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    techStack: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径（嵌套数组）
      const baseLinkages: Record<string, LinkageConfig> = {
        'departments.0.employees.0.techStack': {
          type: 'visibility',
          dependencies: ['departments.0.type'],
          when: {
            field: 'departments.0.type',
            operator: '==',
            value: 'tech',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
        'departments.0.employees.1.techStack': {
          type: 'visibility',
          dependencies: ['departments.0.type'],
          when: {
            field: 'departments.0.type',
            operator: '==',
            value: 'tech',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
        'departments.1.employees.0.techStack': {
          type: 'visibility',
          dependencies: ['departments.1.type'],
          when: {
            field: 'departments.1.type',
            operator: '==',
            value: 'tech',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：第一个部门是 tech，techStack 应该显示
    await waitFor(() => {
      expect(result.current.linkageStates['departments.0.employees.0.techStack']?.visible).toBe(
        true
      );
      expect(result.current.linkageStates['departments.0.employees.1.techStack']?.visible).toBe(
        true
      );
      // 第二个部门是 sales，techStack 应该隐藏
      expect(result.current.linkageStates['departments.1.employees.0.techStack']?.visible).toBe(
        false
      );
    });

    // 修改第一个部门类型为 sales
    result.current.form.setValue('departments.0.type', 'sales');

    await waitFor(() => {
      expect(result.current.linkageStates['departments.0.employees.0.techStack']?.visible).toBe(
        false
      );
      expect(result.current.linkageStates['departments.0.employees.1.techStack']?.visible).toBe(
        false
      );
    });
  });

  it('应该支持父数组元素依赖子数组（聚合计算）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          departments: [
            {
              name: 'Tech',
              employees: [
                { name: 'Alice', salary: 5000 },
                { name: 'Bob', salary: 6000 },
              ],
              employeeCount: 0,
              totalSalary: 0,
            },
          ],
        },
      });

      const schema = createSchema({
        departments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              employees: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    salary: { type: 'number' },
                  },
                },
              },
              employeeCount: { type: 'number' },
              totalSalary: { type: 'number' },
            },
          },
        },
      });

      // 模拟真实场景：传入已实例化的路径
      const baseLinkages: Record<string, LinkageConfig> = {
        'departments.0.employeeCount': {
          type: 'value',
          dependencies: ['departments.0.employees'],
          fulfill: {
            function: 'countEmployees',
          },
        },
        'departments.0.totalSalary': {
          type: 'value',
          dependencies: ['departments.0.employees'],
          fulfill: {
            function: 'sumSalaries',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        countEmployees: (formData: any) => {
          return formData.departments?.[0]?.employees?.length || 0;
        },
        sumSalaries: (formData: any) => {
          const employees = formData.departments?.[0]?.employees || [];
          return employees.reduce((sum: number, emp: any) => sum + (emp.salary || 0), 0);
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        linkageFunctions,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：2 个员工，总薪资 11000
    await waitFor(() => {
      expect(result.current.linkageStates['departments.0.employeeCount']?.value).toBe(2);
      expect(result.current.linkageStates['departments.0.totalSalary']?.value).toBe(11000);
    });

    // 修改员工薪资
    result.current.form.setValue('departments.0.employees.0.salary', 7000);

    await waitFor(() => {
      expect(result.current.linkageStates['departments.0.totalSalary']?.value).toBe(13000);
    });
  });
});

describe('useArrayLinkageManager - 场景 7: 数组聚合计算（外部字段）', () => {
  it('应该支持外部字段依赖整个数组（求和、计数等）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          items: [
            { name: 'Item 1', price: 100, quantity: 2 },
            { name: 'Item 2', price: 50, quantity: 3 },
          ],
          totalPrice: 0,
        },
      });

      const schema = createSchema({
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
              quantity: { type: 'number' },
            },
          },
        },
        totalPrice: { type: 'number' },
      });

      const baseLinkages: Record<string, LinkageConfig> = {
        totalPrice: {
          type: 'value',
          dependencies: ['#/properties/items'],
          fulfill: {
            function: 'calculateTotal',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateTotal: (formData: any) => {
          const items = formData.items || [];
          return items.reduce(
            (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0),
            0
          );
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        linkageFunctions,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：总价 = 100*2 + 50*3 = 350
    await waitFor(() => {
      expect(result.current.linkageStates.totalPrice?.value).toBe(350);
    });

    // 修改第一个商品的数量
    result.current.form.setValue('items.0.quantity', 5);

    await waitFor(() => {
      expect(result.current.linkageStates.totalPrice?.value).toBe(650); // 100*5 + 50*3
    });
  });

  it('应该支持外部字段依赖数组的特定条件元素', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          contacts: [
            { name: 'Alice', type: 'normal' },
            { name: 'Bob', type: 'vip' },
            { name: 'Charlie', type: 'normal' },
          ],
          vipCount: 0,
        },
      });

      const schema = createSchema({
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        vipCount: { type: 'number' },
      });

      const baseLinkages: Record<string, LinkageConfig> = {
        vipCount: {
          type: 'value',
          dependencies: ['#/properties/contacts'],
          fulfill: {
            function: 'countVip',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        countVip: (formData: any) => {
          const contacts = formData.contacts || [];
          return contacts.filter((contact: any) => contact.type === 'vip').length;
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        linkageFunctions,
        schema,
      });

      return { form, linkageStates };
    });

    // 初始状态：1 个 VIP
    await waitFor(() => {
      expect(result.current.linkageStates.vipCount?.value).toBe(1);
    });

    // 修改第一个联系人为 VIP
    result.current.form.setValue('contacts.0.type', 'vip');

    await waitFor(() => {
      expect(result.current.linkageStates.vipCount?.value).toBe(2);
    });
  });
});

describe('useArrayLinkageManager - 循环依赖检测', () => {
  it('应该检测到循环依赖并触发回调', async () => {
    const onCycleDetected = jest.fn();

    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          contacts: [{ a: 1, b: 2, c: 3 }],
        },
      });

      const schema = createSchema({
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              a: { type: 'number' },
              b: { type: 'number' },
              c: { type: 'number' },
            },
          },
        },
      });

      // 创建循环依赖：a -> b -> c -> a（使用实例化路径）
      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.0.a': {
          type: 'value',
          dependencies: ['contacts.0.c'],
          fulfill: { function: 'calc' },
        },
        'contacts.0.b': {
          type: 'value',
          dependencies: ['contacts.0.a'],
          fulfill: { function: 'calc' },
        },
        'contacts.0.c': {
          type: 'value',
          dependencies: ['contacts.0.b'],
          fulfill: { function: 'calc' },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calc: (formData: any) => 0,
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        linkageFunctions,
        schema,
        onCycleDetected,
        throwOnCycle: false,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates).toBeDefined();
    });

    // 验证循环依赖回调被调用
    expect(onCycleDetected).toHaveBeenCalled();
  });

  it('应该在 throwOnCycle=true 时抛出错误', () => {
    expect(() => {
      renderHook(() => {
        const form = useForm({
          defaultValues: {
            contacts: [{ a: 1, b: 2 }],
          },
        });

        const schema = createSchema({
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' },
              },
            },
          },
        });

        // 创建循环依赖：a -> b -> a（使用实例化路径）
        const baseLinkages: Record<string, LinkageConfig> = {
          'contacts.0.a': {
            type: 'value',
            dependencies: ['contacts.0.b'],
            fulfill: { function: 'calc' },
          },
          'contacts.0.b': {
            type: 'value',
            dependencies: ['contacts.0.a'],
            fulfill: { function: 'calc' },
          },
        };

        const linkageFunctions: Record<string, LinkageFunction> = {
          calc: (formData: any) => 0,
        };

        useArrayLinkageManager({
          form,
          baseLinkages,
          linkageFunctions,
          schema,
          throwOnCycle: true,
        });
      });
    }).toThrow('循环依赖');
  });
});


describe('useArrayLinkageManager - 路径映射支持', () => {
  // v3.0: 已移除 pathMappings 功能，所有路径统一使用标准 . 分隔符
});

describe('useArrayLinkageManager - 边界情况和错误处理', () => {
  it('应该处理空数组的情况', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          contacts: [],
        },
      });

      const schema = createSchema({
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              companyName: { type: 'string' },
            },
          },
        },
      });

      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.companyName': {
          type: 'visibility',
          dependencies: ['./type'],
          when: {
            field: './type',
            operator: '==',
            value: 'work',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 空数组不应该有任何联动状态
    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.companyName']).toBeUndefined();
    });
  });

  it('应该处理没有 schema 的情况', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          contacts: [{ type: 'work', companyName: '' }],
        },
      });

      const baseLinkages: Record<string, LinkageConfig> = {
        'contacts.0.companyName': {
          type: 'visibility',
          dependencies: ['contacts.0.type'],
          when: {
            field: 'contacts.0.type',
            operator: '==',
            value: 'work',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        // 不传递 schema
      });

      return { form, linkageStates };
    });

    // 应该正常工作（使用已实例化的路径）
    await waitFor(() => {
      expect(result.current.linkageStates['contacts.0.companyName']?.visible).toBe(true);
    });
  });

  it('应该处理非数组字段的联动', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          enableFeature: false,
          featureName: '',
        },
      });

      const schema = createSchema({
        enableFeature: { type: 'boolean' },
        featureName: { type: 'string' },
      });

      const baseLinkages: Record<string, LinkageConfig> = {
        featureName: {
          type: 'visibility',
          dependencies: ['#/properties/enableFeature'],
          when: {
            field: '#/properties/enableFeature',
            operator: '==',
            value: true,
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useArrayLinkageManager({
        form,
        baseLinkages,
        schema,
      });

      return { form, linkageStates };
    });

    // 非数组字段应该正常工作
    await waitFor(() => {
      expect(result.current.linkageStates.featureName?.visible).toBe(false);
    });

    result.current.form.setValue('enableFeature', true);

    await waitFor(() => {
      expect(result.current.linkageStates.featureName?.visible).toBe(true);
    });
  });
});
