import React, { useState } from 'react';
import { DynamicForm } from '@/components/DynamicForm';
import type { ExtendedJSONSchema } from '@/types/schema';
import { Tabs, Tab, Card } from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';

export const DynamicFormExamples: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('basic');

  // 1. 基础表单
  const basicSchema: ExtendedJSONSchema = {
    type: 'object',
    title: '用户注册表单',
    properties: {
      username: {
        type: 'string',
        title: '用户名',
        minLength: 3,
        maxLength: 20,
        ui: {
          placeholder: '请输入用户名',
          errorMessages: {
            required: '用户名不能为空',
            minLength: '用户名至少3个字符',
            maxLength: '用户名最多20个字符',
          },
        },
      },
      email: {
        type: 'string',
        title: '邮箱',
        format: 'email',
        ui: {
          placeholder: 'example@email.com',
        },
      },
      password: {
        type: 'string',
        title: '密码',
        minLength: 6,
        ui: {
          widget: 'password',
          placeholder: '至少6位字符',
        },
      },
      age: {
        type: 'integer',
        title: '年龄',
        minimum: 18,
        maximum: 100,
      },
      country: {
        type: 'string',
        title: '国家',
        enum: ['china', 'usa', 'japan', 'uk', 'other'],
        enumNames: ['中国', '美国', '日本', '英国', '其他'],
        ui: {
          widget: 'select',
          placeholder: '请选择国家',
        },
      },
      gender: {
        type: 'string',
        title: '性别',
        enum: ['male', 'female', 'other'],
        enumNames: ['男', '女', '其他'],
        ui: {
          widget: 'radio',
        },
      },
      bio: {
        type: 'string',
        title: '个人简介',
        maxLength: 500,
        ui: {
          widget: 'textarea',
          placeholder: '介绍一下自己...',
        },
      },
      receiveNewsletter: {
        type: 'boolean',
        title: '订阅新闻邮件',
        ui: {
          widget: 'switch',
        },
      },
      agreeTerms: {
        type: 'boolean',
        title: '同意用户协议',
      },
    },
    required: ['username', 'email', 'password', 'agreeTerms'],
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>动态表单示例</h1>
      <Tabs selectedTabId={selectedTab} onChange={id => setSelectedTab(id as string)}>
        <Tab id="basic" title="基础表单" panel={<BasicFormPanel schema={basicSchema} />} />
        <Tab id="conditional" title="条件渲染" panel={<ConditionalFormPanel />} />
        <Tab id="nested" title="嵌套表单" panel={<NestedFormPanel />} />
        <Tab id="complex" title="复杂场景" panel={<ComplexFormPanel />} />
      </Tabs>
    </div>
  );
};

const BasicFormPanel: React.FC<{ schema: ExtendedJSONSchema }> = ({ schema }) => {
  const handleSubmit = (data: any) => {
    console.log('基础表单数据:', data);
    alert('提交成功！请查看控制台输出');
  };

  return (
    <Card style={{ marginTop: '20px', maxWidth: '600px' }}>
      <h3>基础表单示例</h3>
      <p>包含常见的表单字段类型：文本、邮箱、密码、数字、单选、多行文本、复选框等。</p>
      <DynamicForm schema={schema} onSubmit={handleSubmit} />
    </Card>
  );
};

const ConditionalFormPanel: React.FC = () => {
  const schema: ExtendedJSONSchema = {
    type: 'object',
    properties: {
      hasAddress: {
        type: 'boolean',
        title: '是否填写地址',
      },
      address: {
        type: 'string',
        title: '详细地址',
        minLength: 5,
        ui: {
          placeholder: '请输入详细地址',
          linkage: {
            type: 'visibility',
            dependencies: ['hasAddress'],
            condition: {
              field: 'hasAddress',
              operator: '==',
              value: true,
            },
          },
        },
      },
    },
    if: {
      properties: { hasAddress: { const: true } },
    },
    then: {
      required: ['address'],
    },
  };

  const handleSubmit = (data: any) => {
    console.log('条件表单数据:', data);
    alert('提交成功！请查看控制台输出');
  };

  return (
    <Card style={{ marginTop: '20px', maxWidth: '600px' }}>
      <h3>条件渲染示例</h3>
      <p>当勾选"是否填写地址"时，地址字段会显示并变为必填。</p>
      <DynamicForm schema={schema} onSubmit={handleSubmit} />
    </Card>
  );
};

const NestedFormPanel: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState('static');

  return (
    <div style={{ marginTop: '20px' }}>
      <Tabs selectedTabId={selectedExample} onChange={id => setSelectedExample(id as string)}>
        <Tab id="static" title="静态嵌套" panel={<StaticNestedExample />} />
        <Tab id="dynamic" title="动态嵌套" panel={<DynamicNestedExample />} />
      </Tabs>
    </div>
  );
};

// 动态嵌套表单示例
const DynamicNestedExample: React.FC = () => {
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

// 静态嵌套表单示例
const StaticNestedExample: React.FC = () => {
  const schema: ExtendedJSONSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: '姓名',
        ui: {
          placeholder: '请输入姓名',
        },
      },
      address: {
        type: 'object',
        title: '地址信息',
        properties: {
          street: {
            type: 'string',
            title: '街道',
            ui: {
              placeholder: '请输入街道地址',
            },
          },
          city: {
            type: 'string',
            title: '城市',
            ui: {
              placeholder: '请输入城市',
            },
          },
          zipCode: {
            type: 'string',
            title: '邮政编码',
            ui: {
              placeholder: '请输入邮政编码',
            },
          },
        },
        required: ['city'],
        ui: {
          widget: 'nested-form',
        },
      },
    },
    required: ['name'],
  };

  const handleSubmit = (data: any) => {
    console.log('静态嵌套表单数据:', data);
    alert('提交成功！请查看控制台输出');
  };

  return (
    <Card style={{ marginTop: '20px', maxWidth: '600px' }}>
      <h3>静态嵌套表单</h3>
      <p>地址信息使用嵌套表单组件，包含街道、城市和邮政编码字段。</p>
      <DynamicForm schema={schema} onSubmit={handleSubmit} />
    </Card>
  );
};

const ComplexFormPanel: React.FC = () => {
  return (
    <Card style={{ marginTop: '20px', maxWidth: '600px' }}>
      <h3>复杂场景示例</h3>
      <p>复杂场景功能正在开发中...</p>
    </Card>
  );
};
