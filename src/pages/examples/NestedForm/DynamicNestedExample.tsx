import React from 'react';
import { DynamicForm } from '@/components/DynamicForm';
import type { ExtendedJSONSchema } from '@/components/DynamicForm/types/schema';
import { Card } from '@blueprintjs/core';

export const DynamicNestedExample: React.FC = () => {
  const schema: ExtendedJSONSchema = {
    type: 'object',
    properties: {
      userType: {
        type: 'string',
        title: '用户类型',
        enum: ['personal', 'company'],
        enumNames: ['个人用户', '企业用户'],
        ui: {
          widget: 'radio',
        },
      },
      details: {
        type: 'object',
        title: '详细信息',
        properties: {},
        ui: {
          widget: 'nested-form',
          schemaKey: 'userType',
          schemas: {
            personal: {
              properties: {
                firstName: {
                  type: 'string',
                  title: '名',
                  ui: { placeholder: '请输入名' },
                },
                lastName: {
                  type: 'string',
                  title: '姓',
                  ui: { placeholder: '请输入姓' },
                },
                birthDate: {
                  type: 'string',
                  title: '出生日期',
                  ui: { placeholder: '请输入出生日期' },
                },
              },
              required: ['firstName', 'lastName'],
            },
            company: {
              properties: {
                companyName: {
                  type: 'string',
                  title: '公司名称',
                  ui: { placeholder: '请输入公司名称' },
                },
                taxId: {
                  type: 'string',
                  title: '税号',
                  ui: { placeholder: '请输入税号' },
                },
                industry: {
                  type: 'string',
                  title: '行业',
                  ui: { placeholder: '请输入行业' },
                },
              },
              required: ['companyName', 'taxId'],
            },
          },
        },
      },
    },
    required: ['userType'],
  };

  const handleSubmit = (data: any) => {
    console.log('动态嵌套表单数据:', data);
    alert('提交成功！请查看控制台输出');
  };

  return (
    <Card style={{ marginTop: '20px', maxWidth: '600px' }}>
      <h3>动态嵌套表单</h3>
      <p>根据用户类型选择，动态显示不同的详细信息表单。</p>
      <DynamicForm schema={schema} onSubmit={handleSubmit} />
    </Card>
  );
};
