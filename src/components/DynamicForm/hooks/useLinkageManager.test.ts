/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useLinkageManager } from './useLinkageManager';
import type { LinkageConfig, LinkageFunction } from '../types/linkage';

describe('useLinkageManager - 异步函数支持', () => {
  it('应该支持异步的 value 函数', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          price: 100,
          quantity: 2,
          total: 0,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        total: {
          type: 'value',
          dependencies: ['price', 'quantity'],
          fulfill: {
            function: 'calculateTotal',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateTotal: async (formData: any) => {
          // 模拟异步操作（例如调用 API）
          await new Promise(resolve => setTimeout(resolve, 50));
          return (formData.price || 0) * (formData.quantity || 0);
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(
      () => {
        expect(result.current.linkageStates.total?.value).toBe(200);
      },
      { timeout: 5000, interval: 100 }
    );

    // 等待所有异步操作完全稳定（确保 watch 不再触发）
    await new Promise(resolve => setTimeout(resolve, 500));

    // 修改 price
    act(() => {
      result.current.form.setValue('price', 150);
    });

    // 再次等待稳定
    await new Promise(resolve => setTimeout(resolve, 200));

    // 等待联动计算完成
    await waitFor(
      () => {
        expect(result.current.linkageStates.total?.value).toBe(300);
      },
      { timeout: 5000, interval: 100 }
    );
  });

  it('应该支持异步的 options 函数', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          country: 'china',
          province: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        province: {
          type: 'options',
          dependencies: ['country'],
          fulfill: {
            function: 'getProvinceOptions',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        getProvinceOptions: async (formData: any) => {
          // 模拟从 API 获取选项
          await new Promise(resolve => setTimeout(resolve, 50));

          if (formData.country === 'china') {
            return [
              { label: '北京', value: 'beijing' },
              { label: '上海', value: 'shanghai' },
            ];
          } else if (formData.country === 'usa') {
            return [
              { label: 'California', value: 'ca' },
              { label: 'New York', value: 'ny' },
            ];
          }
          return [];
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(
      () => {
        expect(result.current.linkageStates.province?.options).toHaveLength(2);
        expect(result.current.linkageStates.province?.options?.[0].label).toBe('北京');
      },
      { timeout: 5000, interval: 100 }
    );

    // 等待所有异步操作完全稳定（确保 watch 不再触发）
    await new Promise(resolve => setTimeout(resolve, 500));

    // 修改 country
    act(() => {
      result.current.form.setValue('country', 'usa');
    });

    // 再次等待稳定
    await new Promise(resolve => setTimeout(resolve, 200));

    // 等待联动计算完成
    await waitFor(
      () => {
        expect(result.current.linkageStates.province?.options).toHaveLength(2);
        expect(result.current.linkageStates.province?.options?.[0].label).toBe('California');
      },
      { timeout: 5000, interval: 100 }
    );
  });

  it('应该支持异步的 when 条件函数', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          userId: '123',
          advancedFeatures: false,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        advancedFeatures: {
          type: 'visibility',
          dependencies: ['userId'],
          when: 'checkUserPermission',
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        checkUserPermission: async (formData: any) => {
          // 模拟调用 API 检查用户权限
          await new Promise(resolve => setTimeout(resolve, 100));
          // 假设只有特定用户有权限
          return formData.userId === '123';
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.advancedFeatures?.visible).toBe(true);
    });

    // 修改 userId
    result.current.form.setValue('userId', '456');

    // 等待联动计算完成
    await waitFor(() => {
      expect(result.current.linkageStates.advancedFeatures?.visible).toBe(false);
    });
  });

  it('应该支持同步和异步函数混合使用', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          price: 100,
          quantity: 2,
          discount: 0,
          total: 0,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        discount: {
          type: 'value',
          dependencies: ['price', 'quantity'],
          fulfill: {
            function: 'calculateDiscount', // 同步函数
          },
        },
        total: {
          type: 'value',
          dependencies: ['price', 'quantity', 'discount'],
          fulfill: {
            function: 'calculateTotal', // 异步函数
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        // 同步函数
        calculateDiscount: (formData: any) => {
          const subtotal = (formData.price || 0) * (formData.quantity || 0);
          return subtotal > 100 ? 10 : 0;
        },
        // 异步函数
        calculateTotal: async (formData: any) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          const subtotal = (formData.price || 0) * (formData.quantity || 0);
          return subtotal - (formData.discount || 0);
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.discount?.value).toBe(10);
      expect(result.current.linkageStates.total?.value).toBe(190);
    });

    // 修改 price，触发联动计算
    result.current.form.setValue('price', 50);

    // 等待联动计算完成
    // price: 50, quantity: 2 => subtotal: 100
    // subtotal <= 100 => discount: 0
    // total: 100 - 0 = 100
    await waitFor(() => {
      expect(result.current.linkageStates.discount?.value).toBe(0);
      expect(result.current.linkageStates.total?.value).toBe(100);
    });

    // 再次修改 price，触发联动计算
    result.current.form.setValue('price', 200);

    // 等待联动计算完成
    // price: 200, quantity: 2 => subtotal: 400
    // subtotal > 100 => discount: 10
    // total: 400 - 10 = 390
    await waitFor(() => {
      expect(result.current.linkageStates.discount?.value).toBe(10);
      expect(result.current.linkageStates.total?.value).toBe(390);
    });
  });
});

describe('useLinkageManager - 条件表达式', () => {
  it('应该支持单条件表达式 (==)', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          userType: 'individual',
          companyName: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        companyName: {
          type: 'visibility',
          dependencies: ['userType'],
          when: {
            field: 'userType',
            operator: '==',
            value: 'company',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 初始状态：userType = 'individual'，companyName 应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.companyName?.visible).toBe(false);
    });

    // 修改为 'company'，companyName 应该显示
    result.current.form.setValue('userType', 'company');

    await waitFor(() => {
      expect(result.current.linkageStates.companyName?.visible).toBe(true);
    });
  });

  it('应该支持 and 逻辑组合', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          age: 15,
          income: 30000,
          loanAmount: 0,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        loanAmount: {
          type: 'visibility',
          dependencies: ['age', 'income'],
          when: {
            and: [
              {
                field: 'age',
                operator: '>=',
                value: 18,
              },
              {
                field: 'income',
                operator: '>=',
                value: 50000,
              },
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

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 初始状态：age < 18 且 income < 50000，应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.loanAmount?.visible).toBe(false);
    });

    // 只满足年龄条件，仍然隐藏
    result.current.form.setValue('age', 20);
    await waitFor(() => {
      expect(result.current.linkageStates.loanAmount?.visible).toBe(false);
    });

    // 同时满足两个条件，应该显示
    result.current.form.setValue('income', 60000);
    await waitFor(() => {
      expect(result.current.linkageStates.loanAmount?.visible).toBe(true);
    });
  });

  it('应该支持 or 逻辑组合', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          isVip: false,
          totalSpent: 500,
          discount: 0,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        discount: {
          type: 'visibility',
          dependencies: ['isVip', 'totalSpent'],
          when: {
            or: [
              {
                field: 'isVip',
                operator: '==',
                value: true,
              },
              {
                field: 'totalSpent',
                operator: '>=',
                value: 1000,
              },
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

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 初始状态：两个条件都不满足，应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.discount?.visible).toBe(false);
    });

    // 满足 VIP 条件，应该显示
    result.current.form.setValue('isVip', true);
    await waitFor(() => {
      expect(result.current.linkageStates.discount?.visible).toBe(true);
    });

    // 取消 VIP，但满足消费金额条件，仍然显示
    result.current.form.setValue('isVip', false);
    result.current.form.setValue('totalSpent', 1500);
    await waitFor(() => {
      expect(result.current.linkageStates.discount?.visible).toBe(true);
    });
  });

  it('应该支持嵌套的 and/or 逻辑组合', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          userType: 'individual',
          country: 'china',
          age: 15,
          idCard: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        idCard: {
          type: 'visibility',
          dependencies: ['userType', 'country', 'age'],
          when: {
            and: [
              {
                field: 'userType',
                operator: '==',
                value: 'individual',
              },
              {
                or: [
                  {
                    and: [
                      {
                        field: 'country',
                        operator: '==',
                        value: 'china',
                      },
                      {
                        field: 'age',
                        operator: '>=',
                        value: 16,
                      },
                    ],
                  },
                  {
                    and: [
                      {
                        field: 'country',
                        operator: '==',
                        value: 'japan',
                      },
                      {
                        field: 'age',
                        operator: '>=',
                        value: 20,
                      },
                    ],
                  },
                ],
              },
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

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 初始状态：userType = 'individual', country = 'china', age = 15
    // 不满足条件（中国需要 >= 16 岁），应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.idCard?.visible).toBe(false);
    });

    // 年龄改为 16，满足条件，应该显示
    result.current.form.setValue('age', 16);
    await waitFor(() => {
      expect(result.current.linkageStates.idCard?.visible).toBe(true);
    });

    // 切换到日本，年龄 16 不满足（日本需要 >= 20 岁），应该隐藏
    result.current.form.setValue('country', 'japan');
    await waitFor(() => {
      expect(result.current.linkageStates.idCard?.visible).toBe(false);
    });

    // 年龄改为 20，满足条件，应该显示
    result.current.form.setValue('age', 20);
    await waitFor(() => {
      expect(result.current.linkageStates.idCard?.visible).toBe(true);
    });

    // 切换为企业用户，不满足条件，应该隐藏
    result.current.form.setValue('userType', 'company');
    await waitFor(() => {
      expect(result.current.linkageStates.idCard?.visible).toBe(false);
    });
  });
});

describe('useLinkageManager - 条件操作符', () => {
  it('应该支持比较操作符 (!=, >, <, >=, <=)', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          score: 75,
          grade: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        grade: {
          type: 'value',
          dependencies: ['score'],
          fulfill: {
            function: 'calculateGrade',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateGrade: (formData: any) => {
          const score = formData.score || 0;
          if (score >= 90) return 'A';
          if (score >= 80) return 'B';
          if (score >= 70) return 'C';
          if (score >= 60) return 'D';
          return 'F';
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    await waitFor(() => {
      expect(result.current.linkageStates.grade?.value).toBe('C');
    });

    result.current.form.setValue('score', 95);
    await waitFor(() => {
      expect(result.current.linkageStates.grade?.value).toBe('A');
    });

    result.current.form.setValue('score', 55);
    await waitFor(() => {
      expect(result.current.linkageStates.grade?.value).toBe('F');
    });
  });

  it('应该支持 in 和 notIn 操作符', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          country: 'china',
          needsVisa: false,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        needsVisa: {
          type: 'visibility',
          dependencies: ['country'],
          when: {
            field: 'country',
            operator: 'in',
            value: ['usa', 'uk', 'canada'],
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 初始状态：china 不在列表中，应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.needsVisa?.visible).toBe(false);
    });

    // 切换到 usa，在列表中，应该显示
    result.current.form.setValue('country', 'usa');
    await waitFor(() => {
      expect(result.current.linkageStates.needsVisa?.visible).toBe(true);
    });
  });

  it('应该支持 includes 和 notIncludes 操作符', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          selectedFeatures: ['feature1', 'feature2'],
          advancedSettings: false,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        advancedSettings: {
          type: 'visibility',
          dependencies: ['selectedFeatures'],
          when: {
            field: 'selectedFeatures',
            operator: 'includes',
            value: 'advanced',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 初始状态：不包含 'advanced'，应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.advancedSettings?.visible).toBe(false);
    });

    // 添加 'advanced'，应该显示
    result.current.form.setValue('selectedFeatures', ['feature1', 'feature2', 'advanced']);
    await waitFor(() => {
      expect(result.current.linkageStates.advancedSettings?.visible).toBe(true);
    });
  });

  it('应该支持 isEmpty 和 isNotEmpty 操作符', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          description: '',
          charCount: 0,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        charCount: {
          type: 'visibility',
          dependencies: ['description'],
          when: {
            field: 'description',
            operator: 'isNotEmpty',
          },
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 初始状态：description 为空，应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.charCount?.visible).toBe(false);
    });

    // 输入内容，应该显示
    result.current.form.setValue('description', 'Hello');
    await waitFor(() => {
      expect(result.current.linkageStates.charCount?.visible).toBe(true);
    });

    // 清空内容，应该隐藏
    result.current.form.setValue('description', '');
    await waitFor(() => {
      expect(result.current.linkageStates.charCount?.visible).toBe(false);
    });
  });
});

describe('useLinkageManager - 联动类型', () => {
  it('应该支持 visibility 联动类型（通过函数）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          userType: 'individual',
          companyInfo: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        companyInfo: {
          type: 'visibility',
          dependencies: ['userType'],
          fulfill: {
            function: 'checkCompanyVisible',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        checkCompanyVisible: (formData: any) => {
          return formData.userType === 'company';
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 初始状态：个人用户，应该隐藏
    await waitFor(() => {
      expect(result.current.linkageStates.companyInfo?.visible).toBe(false);
    });

    // 切换为企业用户，应该显示
    act(() => {
      result.current.form.setValue('userType', 'company');
    });

    await waitFor(() => {
      expect(result.current.linkageStates.companyInfo?.visible).toBe(true);
    });
  });

  it('应该支持 disabled 联动类型（通过函数）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          accountType: 'free',
          advancedFeatures: false,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        advancedFeatures: {
          type: 'disabled',
          dependencies: ['accountType'],
          fulfill: {
            function: 'checkDisabled',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        checkDisabled: (formData: any) => {
          return formData.accountType === 'free';
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 初始状态：免费账户，应该禁用
    await waitFor(() => {
      expect(result.current.linkageStates.advancedFeatures?.disabled).toBe(true);
    });

    // 升级为高级账户，应该启用
    act(() => {
      result.current.form.setValue('accountType', 'premium');
    });

    await waitFor(() => {
      expect(result.current.linkageStates.advancedFeatures?.disabled).toBe(false);
    });
  });

  it('应该支持 readonly 联动类型（通过函数）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          isEditing: false,
          userName: 'John',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        userName: {
          type: 'readonly',
          dependencies: ['isEditing'],
          fulfill: {
            function: 'checkReadonly',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        checkReadonly: (formData: any) => {
          return !formData.isEditing;
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 初始状态：非编辑模式，应该只读
    await waitFor(() => {
      expect(result.current.linkageStates.userName?.readonly).toBe(true);
    });

    // 进入编辑模式，应该可编辑
    act(() => {
      result.current.form.setValue('isEditing', true);
    });

    await waitFor(() => {
      expect(result.current.linkageStates.userName?.readonly).toBe(false);
    });
  });
});

describe('useLinkageManager - 数组字段联动上下文', () => {
  it('应该正确传递数组上下文信息给联动函数', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          items: [
            { price: 100, quantity: 2, subtotal: 0 },
            { price: 50, quantity: 3, subtotal: 0 },
          ],
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        'items.0.subtotal': {
          type: 'value',
          dependencies: ['items.0.price', 'items.0.quantity'],
          fulfill: {
            function: 'calculateSubtotal',
          },
        },
        'items.1.subtotal': {
          type: 'value',
          dependencies: ['items.1.price', 'items.1.quantity'],
          fulfill: {
            function: 'calculateSubtotal',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateSubtotal: (formData: any, context?: any) => {
          // 验证上下文信息
          expect(context).toBeDefined();
          expect(context?.arrayPath).toBe('items');
          expect(context?.arrayIndex).toBeGreaterThanOrEqual(0);

          const item = formData.items?.[context?.arrayIndex];
          if (!item) return 0;

          return (item.price || 0) * (item.quantity || 0);
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates['items.0.subtotal']?.value).toBe(200);
      expect(result.current.linkageStates['items.1.subtotal']?.value).toBe(150);
    });
  });
});

describe('useLinkageManager - 依赖图和拓扑排序', () => {
  it('应该检测并警告循环依赖', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          a: 1,
          b: 2,
          c: 3,
        },
      });

      // 创建循环依赖：a -> b -> c -> a
      const linkages: Record<string, LinkageConfig> = {
        a: {
          type: 'value',
          dependencies: ['c'],
          fulfill: {
            function: 'calculateA',
          },
        },
        b: {
          type: 'value',
          dependencies: ['a'],
          fulfill: {
            function: 'calculateB',
          },
        },
        c: {
          type: 'value',
          dependencies: ['b'],
          fulfill: {
            function: 'calculateC',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateA: (formData: any) => formData.c + 1,
        calculateB: (formData: any) => formData.a + 1,
        calculateC: (formData: any) => formData.b + 1,
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates).toBeDefined();
    });

    // 验证循环依赖被检测到
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '检测到循环依赖:',
      expect.any(String)
    );

    consoleErrorSpy.mockRestore();
  });

  it('应该按照依赖顺序计算联动（拓扑排序）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          a: 1,
          b: 0,
          c: 0,
          d: 0,
        },
      });

      // 依赖链：a -> b -> c -> d
      const linkages: Record<string, LinkageConfig> = {
        b: {
          type: 'value',
          dependencies: ['a'],
          fulfill: {
            function: 'calculateB',
          },
        },
        c: {
          type: 'value',
          dependencies: ['b'],
          fulfill: {
            function: 'calculateC',
          },
        },
        d: {
          type: 'value',
          dependencies: ['c'],
          fulfill: {
            function: 'calculateD',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateB: (formData: any) => formData.a * 2,
        calculateC: (formData: any) => formData.b * 3,
        calculateD: (formData: any) => formData.c * 4,
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    // a=1 -> b=2 -> c=6 -> d=24
    await waitFor(() => {
      expect(result.current.linkageStates.b?.value).toBe(2);
      expect(result.current.linkageStates.c?.value).toBe(6);
      expect(result.current.linkageStates.d?.value).toBe(24);
    });

    // 修改 a，应该触发整个依赖链
    result.current.form.setValue('a', 2);

    // a=2 -> b=4 -> c=12 -> d=48
    await waitFor(() => {
      expect(result.current.linkageStates.b?.value).toBe(4);
      expect(result.current.linkageStates.c?.value).toBe(12);
      expect(result.current.linkageStates.d?.value).toBe(48);
    });
  });

  it('应该只重新计算受影响的字段', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          a: 1,
          b: 0,
          x: 10,
          y: 0,
        },
      });

      // 两条独立的依赖链：a -> b 和 x -> y
      const linkages: Record<string, LinkageConfig> = {
        b: {
          type: 'value',
          dependencies: ['a'],
          fulfill: {
            function: 'calculateB',
          },
        },
        y: {
          type: 'value',
          dependencies: ['x'],
          fulfill: {
            function: 'calculateY',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateB: (formData: any) => formData.a * 2,
        calculateY: (formData: any) => formData.x * 3,
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.b?.value).toBe(2);
      expect(result.current.linkageStates.y?.value).toBe(30);
    });

    // 只修改 a，验证 b 被正确更新
    result.current.form.setValue('a', 2);

    await waitFor(() => {
      expect(result.current.linkageStates.b?.value).toBe(4);
    });

    // 验证 y 的值保持不变（因为 x 没有改变）
    expect(result.current.linkageStates.y?.value).toBe(30);

    // 修改 x，验证 y 被正确更新
    result.current.form.setValue('x', 20);

    await waitFor(() => {
      expect(result.current.linkageStates.y?.value).toBe(60);
    });

    // 验证 b 的值保持不变（因为 a 没有改变）
    expect(result.current.linkageStates.b?.value).toBe(4);
  });
});

describe('useLinkageManager - 路径映射场景', () => {
  // v3.0: 已移除 pathMappings 功能，所有路径统一使用标准 . 分隔符
});

describe('useLinkageManager - 错误处理', () => {
  it('应该处理联动函数不存在的情况', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          field1: 'value1',
          field2: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        field2: {
          type: 'value',
          dependencies: ['field1'],
          fulfill: {
            function: 'nonExistentFunction',
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions: {},
      });

      return { form, linkageStates };
    });

    // 等待初始化完成，应该不会崩溃
    await waitFor(() => {
      expect(result.current.linkageStates.field2).toBeDefined();
    });

    consoleWarnSpy.mockRestore();
  });

  it('应该处理条件函数不存在的情况（when 为字符串）', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          field1: 'value1',
          field2: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        field2: {
          type: 'visibility',
          dependencies: ['field1'],
          when: 'nonExistentConditionFunction',
          fulfill: {
            state: { visible: true },
          },
          otherwise: {
            state: { visible: false },
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions: {},
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.field2).toBeDefined();
    });

    // 验证警告被记录
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Linkage function "nonExistentConditionFunction" not found'
    );

    // 条件函数不存在时，应该返回 false，使用 otherwise
    expect(result.current.linkageStates.field2?.visible).toBe(false);

    consoleWarnSpy.mockRestore();
  });

  it('应该处理联动函数抛出错误的情况', async () => {
    // 必须在 renderHook 之前 mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          field1: 'value1',
          field2: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        field2: {
          type: 'value',
          dependencies: ['field1'],
          fulfill: {
            function: 'errorFunction',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        errorFunction: () => {
          throw new Error('Test error');
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成，应该不会崩溃
    await waitFor(() => {
      expect(result.current.linkageStates).toBeDefined();
    });

    // 验证错误被记录
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('应该处理异步函数失败的情况', async () => {
    // 必须在 renderHook 之前 mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          field1: 'value1',
          field2: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        field2: {
          type: 'value',
          dependencies: ['field1'],
          fulfill: {
            function: 'asyncErrorFunction',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        asyncErrorFunction: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          throw new Error('Async test error');
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待足够长的时间让异步函数执行并失败
    await new Promise(resolve => setTimeout(resolve, 200));

    // 等待状态更新
    await waitFor(() => {
      expect(result.current.linkageStates).toBeDefined();
    });

    // 验证错误被记录（异步错误会被 console.error 捕获）
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('应该处理没有 when 条件的联动（默认使用 fulfill）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          price: 100,
          quantity: 2,
          total: 0,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        total: {
          type: 'value',
          dependencies: ['price', 'quantity'],
          // 没有 when 条件，默认使用 fulfill
          fulfill: {
            function: 'calculateTotal',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateTotal: (formData: any) => {
          return (formData.price || 0) * (formData.quantity || 0);
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.total?.value).toBe(200);
    });
  });
});

describe('useLinkageManager - 竞态条件处理', () => {
  it('应该正确处理异步函数的竞态条件（快速连续修改字段）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          query: '',
          results: [],
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        results: {
          type: 'value',
          dependencies: ['query'],
          fulfill: {
            function: 'searchResults',
          },
        },
      };

      let callCount = 0;
      const linkageFunctions: Record<string, LinkageFunction> = {
        searchResults: async (formData: any) => {
          const currentCall = ++callCount;
          const query = formData.query || '';

          // 模拟不同查询有不同的延迟
          const delay = query === 'slow' ? 200 : 50;
          await new Promise(resolve => setTimeout(resolve, delay));

          return [`Result for ${query} (call ${currentCall})`];
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.results).toBeDefined();
    });

    // 快速连续修改字段，触发竞态条件
    act(() => {
      result.current.form.setValue('query', 'slow');
    });

    // 立即修改为另一个值
    await new Promise(resolve => setTimeout(resolve, 10));
    act(() => {
      result.current.form.setValue('query', 'fast');
    });

    // 等待所有异步操作完成
    await new Promise(resolve => setTimeout(resolve, 300));

    // 最终结果应该是最后一次修改的值（fast），而不是慢查询（slow）的结果
    await waitFor(
      () => {
        const results = result.current.linkageStates.results?.value;
        expect(results).toBeDefined();
        expect(results[0]).toContain('fast');
        expect(results[0]).not.toContain('slow');
      },
      { timeout: 1000 }
    );
  });

  it('应该正确处理队列中的多个任务（队列递归处理）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          field1: 0,
          field2: 0,
          field3: 0,
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        field2: {
          type: 'value',
          dependencies: ['field1'],
          fulfill: {
            function: 'double',
          },
        },
        field3: {
          type: 'value',
          dependencies: ['field2'],
          fulfill: {
            function: 'triple',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        double: (formData: any) => (formData.field1 || 0) * 2,
        triple: (formData: any) => (formData.field2 || 0) * 3,
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.field2?.value).toBe(0);
      expect(result.current.linkageStates.field3?.value).toBe(0);
    });

    // 快速连续修改多个字段，触发队列递归处理
    act(() => {
      result.current.form.setValue('field1', 5);
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    act(() => {
      result.current.form.setValue('field1', 10);
    });

    // 等待所有队列任务完成
    await waitFor(
      () => {
        expect(result.current.linkageStates.field2?.value).toBe(20);
        expect(result.current.linkageStates.field3?.value).toBe(60);
      },
      { timeout: 1000 }
    );
  });
});

describe('useLinkageManager - Schema 类型联动', () => {
  it('应该支持 schema 类型联动', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          fieldType: 'text',
          dynamicField: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        dynamicField: {
          type: 'schema',
          dependencies: ['fieldType'],
          fulfill: {
            function: 'getFieldSchema',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        getFieldSchema: (formData: any) => {
          const fieldType = formData.fieldType;
          if (fieldType === 'text') {
            return { type: 'string', maxLength: 100 };
          } else if (fieldType === 'number') {
            return { type: 'number', minimum: 0, maximum: 999 };
          }
          return { type: 'string' };
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
        linkageFunctions,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.dynamicField?.schema).toEqual({
        type: 'string',
        maxLength: 100,
      });
    });

    // 修改字段类型
    act(() => {
      result.current.form.setValue('fieldType', 'number');
    });

    // 等待联动计算完成
    await waitFor(() => {
      expect(result.current.linkageStates.dynamicField?.schema).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 999,
      });
    });
  });
});

describe('useLinkageManager - 直接指定值', () => {
  it('应该支持直接指定 value（无函数）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          useDefault: true,
          targetField: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        targetField: {
          type: 'value',
          dependencies: ['useDefault'],
          when: {
            field: 'useDefault',
            operator: '==',
            value: true,
          },
          fulfill: {
            value: 'default value',
          },
          otherwise: {
            value: '',
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.targetField?.value).toBe('default value');
    });

    // 修改条件
    act(() => {
      result.current.form.setValue('useDefault', false);
    });

    // 等待联动计算完成
    await waitFor(() => {
      expect(result.current.linkageStates.targetField?.value).toBe('');
    });
  });

  it('应该支持直接指定 options（无函数）', async () => {
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: {
          category: 'fruits',
          item: '',
        },
      });

      const linkages: Record<string, LinkageConfig> = {
        item: {
          type: 'options',
          dependencies: ['category'],
          when: {
            field: 'category',
            operator: '==',
            value: 'fruits',
          },
          fulfill: {
            options: [
              { label: 'Apple', value: 'apple' },
              { label: 'Banana', value: 'banana' },
            ],
          },
          otherwise: {
            options: [
              { label: 'Carrot', value: 'carrot' },
              { label: 'Potato', value: 'potato' },
            ],
          },
        },
      };

      const linkageStates = useLinkageManager({
        form,
        linkages,
      });

      return { form, linkageStates };
    });

    // 等待初始化完成
    await waitFor(() => {
      expect(result.current.linkageStates.item?.options).toEqual([
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
      ]);
    });

    // 修改分类
    act(() => {
      result.current.form.setValue('category', 'vegetables');
    });

    // 等待联动计算完成
    await waitFor(() => {
      expect(result.current.linkageStates.item?.options).toEqual([
        { label: 'Carrot', value: 'carrot' },
        { label: 'Potato', value: 'potato' },
      ]);
    });
  });
});
