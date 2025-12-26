/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useLinkageManager } from './useLinkageManager';
import type { LinkageConfig, LinkageFunction } from '../types/linkage';

describe('useLinkageManager - 异步函数支持', () => {
  it('应该支持异步的 computed 函数', async () => {
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
          type: 'computed',
          dependencies: ['price', 'quantity'],
          fulfill: {
            function: 'calculateTotal',
          },
        },
      };

      const linkageFunctions: Record<string, LinkageFunction> = {
        calculateTotal: async (formData: any) => {
          // 模拟异步操作（例如调用 API）
          await new Promise(resolve => setTimeout(resolve, 100));
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

    // 修改 price
    result.current.form.setValue('price', 150);

    // 等待联动计算完成
    await waitFor(() => {
      expect(result.current.linkageStates.total?.value).toBe(300);
    });
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
          await new Promise(resolve => setTimeout(resolve, 100));

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
    await waitFor(() => {
      expect(result.current.linkageStates.province?.options).toHaveLength(2);
      expect(result.current.linkageStates.province?.options?.[0].label).toBe('北京');
    });

    // 修改 country
    result.current.form.setValue('country', 'usa');

    // 等待联动计算完成
    await waitFor(() => {
      expect(result.current.linkageStates.province?.options).toHaveLength(2);
      expect(result.current.linkageStates.province?.options?.[0].label).toBe('California');
    });
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
          type: 'computed',
          dependencies: ['price', 'quantity'],
          fulfill: {
            function: 'calculateDiscount', // 同步函数
          },
        },
        total: {
          type: 'computed',
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
