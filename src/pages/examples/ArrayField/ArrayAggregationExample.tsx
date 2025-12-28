import React from 'react';
import { DynamicForm } from '@/components/DynamicForm';
import type { ExtendedJSONSchema } from '@/types/schema';
import type { LinkageFunction } from '@/types/linkage';

/**
 * 场景7：数组聚合计算
 * 业务场景：总价依赖商品列表的所有价格
 */
export const ArrayAggregationExample: React.FC = () => {
  const schema: ExtendedJSONSchema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        title: '商品列表',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              title: '商品名称',
            },
            price: {
              type: 'number',
              title: '单价',
              minimum: 0,
            },
            quantity: {
              type: 'number',
              title: '数量',
              minimum: 1,
            },
          },
          required: ['name', 'price', 'quantity'],
        },
        minItems: 1,
        ui: {
          arrayMode: 'dynamic',
          addButtonText: '添加商品',
        },
      },
      totalPrice: {
        type: 'number',
        title: '总价',
        ui: {
          readonly: true,
          linkage: {
            type: 'value',
            dependencies: ['#/properties/items'],
            fulfill: {
              function: 'calculateTotal',
            },
          },
        },
      },
    },
  };

  // 联动函数
  const linkageFunctions: Record<string, LinkageFunction> = {
    calculateTotal: (formData: any) => {
      const items = formData.items || [];
      return items.reduce((sum: number, item: any) => {
        return sum + (item.price || 0) * (item.quantity || 0);
      }, 0);
    },
  };

  const defaultValues = {
    items: [
      { name: '商品A', price: 100, quantity: 2 },
    ],
    totalPrice: 0,
  };

  const handleSubmit = (data: any) => {
    console.log('提交的数据:', data);
    alert('数据已提交，请查看控制台');
  };

  return (
    <div>
      <h2>场景7：数组聚合计算</h2>
      <p>
        <strong>业务场景：</strong>总价依赖商品列表的所有价格
      </p>
      <p>
        <strong>技术要点：</strong>
      </p>
      <ul>
        <li>外部字段依赖整个数组</li>
        <li>数组元素增删、修改都会触发重新计算</li>
        <li>使用 <code>reduce()</code> 进行聚合计算</li>
      </ul>

      <DynamicForm
        schema={schema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        linkageFunctions={linkageFunctions}
      />
    </div>
  );
};
