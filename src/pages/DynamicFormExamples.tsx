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
      phone: {
        type: 'string',
        title: '手机号',
        format: 'phone',
        ui: {
          placeholder: '请输入手机号',
          errorMessages: {
            format: '请输入有效的手机号码',
          },
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
      introduction: {
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

  // 自定义格式验证器
  const customFormats = {
    phone: (value: string) => /^1[3-9]\d{9}$/.test(value),
  };

  return (
    <Card style={{ marginTop: '20px', maxWidth: '600px' }}>
      <h3>基础表单示例</h3>
      <p>
        包含常见的表单字段类型：文本、邮箱、手机号、密码、数字、下拉选择、单选、多行文本、开关、复选框等。
      </p>
      <DynamicForm schema={schema} onSubmit={handleSubmit} customFormats={customFormats} />
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
  const schema: ExtendedJSONSchema = {
    type: 'object',
    title: '项目申请表',
    properties: {
      projectType: {
        type: 'string',
        title: '项目类型',
        enum: ['research', 'development', 'marketing'],
        enumNames: ['研究项目', '开发项目', '市场推广'],
        ui: {
          widget: 'select',
          placeholder: '请选择项目类型',
        },
      },
      projectName: {
        type: 'string',
        title: '项目名称',
        minLength: 3,
        maxLength: 50,
        ui: {
          placeholder: '请输入项目名称',
          errorMessages: {
            required: '项目名称不能为空',
            minLength: '项目名称至少3个字符',
          },
        },
      },
      budget: {
        type: 'number',
        title: '预算金额（万元）',
        minimum: 1,
        maximum: 1000,
        ui: {
          placeholder: '请输入预算金额',
        },
      },
      needsApproval: {
        type: 'boolean',
        title: '是否需要高层审批',
        ui: {
          widget: 'switch',
          linkage: {
            type: 'value',
            dependencies: ['budget'],
            condition: {
              field: 'budget',
              operator: '>',
              value: 100,
            },
            targetValue: true,
          },
        },
      },
      approver: {
        type: 'string',
        title: '审批人',
        enum: ['ceo', 'cto', 'cfo'],
        enumNames: ['CEO', 'CTO', 'CFO'],
        ui: {
          widget: 'select',
          placeholder: '请选择审批人',
          linkage: {
            type: 'visibility',
            dependencies: ['needsApproval'],
            condition: {
              field: 'needsApproval',
              operator: '==',
              value: true,
            },
          },
        },
      },
      projectDetails: {
        type: 'object',
        title: '项目详情',
        properties: {},
        ui: {
          widget: 'nested-form',
          schemaKey: 'projectType',
          schemas: {
            research: {
              properties: {
                researchField: {
                  type: 'string',
                  title: '研究领域',
                  enum: ['ai', 'blockchain', 'iot', 'biotech'],
                  enumNames: ['人工智能', '区块链', '物联网', '生物技术'],
                  ui: {
                    widget: 'select',
                    placeholder: '请选择研究领域',
                  },
                },
                expectedOutcome: {
                  type: 'string',
                  title: '预期成果',
                  ui: {
                    widget: 'textarea',
                    placeholder: '请描述预期的研究成果',
                  },
                },
                duration: {
                  type: 'integer',
                  title: '研究周期（月）',
                  minimum: 1,
                  maximum: 36,
                  ui: {
                    placeholder: '请输入研究周期',
                  },
                },
              },
              required: ['researchField', 'expectedOutcome', 'duration'],
            },
            development: {
              properties: {
                platform: {
                  type: 'string',
                  title: '开发平台',
                  enum: ['web', 'mobile', 'desktop', 'embedded'],
                  enumNames: ['Web应用', '移动应用', '桌面应用', '嵌入式系统'],
                  ui: {
                    widget: 'radio',
                  },
                },
                techStack: {
                  type: 'string',
                  title: '技术栈',
                  ui: {
                    placeholder: '例如：React, Node.js, PostgreSQL',
                  },
                },
                teamSize: {
                  type: 'integer',
                  title: '团队规模',
                  minimum: 1,
                  maximum: 50,
                  ui: {
                    placeholder: '请输入团队人数',
                  },
                },
                hasPrototype: {
                  type: 'boolean',
                  title: '是否有原型',
                },
                prototypeUrl: {
                  type: 'string',
                  title: '原型链接',
                  format: 'uri',
                  ui: {
                    placeholder: 'https://example.com/prototype',
                    linkage: {
                      type: 'visibility',
                      dependencies: ['hasPrototype'],
                      condition: {
                        field: 'hasPrototype',
                        operator: '==',
                        value: true,
                      },
                    },
                  },
                },
              },
              required: ['platform', 'techStack', 'teamSize'],
            },
            marketing: {
              properties: {
                targetAudience: {
                  type: 'string',
                  title: '目标受众',
                  ui: {
                    widget: 'textarea',
                    placeholder: '请描述目标受众群体',
                  },
                },
                channels: {
                  type: 'string',
                  title: '推广渠道',
                  enum: ['social', 'search', 'display', 'email', 'offline'],
                  enumNames: ['社交媒体', '搜索引擎', '展示广告', '邮件营销', '线下活动'],
                  ui: {
                    widget: 'select',
                    placeholder: '请选择主要推广渠道',
                  },
                },
                expectedROI: {
                  type: 'number',
                  title: '预期ROI（%）',
                  minimum: 0,
                  maximum: 1000,
                  ui: {
                    placeholder: '请输入预期投资回报率',
                  },
                },
                campaignDuration: {
                  type: 'integer',
                  title: '活动周期（天）',
                  minimum: 1,
                  maximum: 365,
                  ui: {
                    placeholder: '请输入活动周期',
                  },
                },
              },
              required: ['targetAudience', 'channels', 'expectedROI'],
            },
          },
        },
      },
      risks: {
        type: 'string',
        title: '风险评估',
        ui: {
          widget: 'textarea',
          placeholder: '请描述项目可能面临的风险及应对措施',
        },
      },
      attachments: {
        type: 'string',
        title: '附件说明',
        ui: {
          placeholder: '如有相关文档，请说明',
        },
      },
    },
    required: ['projectType', 'projectName', 'budget', 'risks'],
    if: {
      properties: { needsApproval: { const: true } },
    },
    then: {
      required: ['approver'],
    },
  };

  const handleSubmit = (data: any) => {
    console.log('复杂表单数据:', data);
    alert('提交成功！请查看控制台输出');
  };

  return (
    <Card style={{ marginTop: '20px', maxWidth: '800px' }}>
      <h3>复杂场景示例</h3>
      <p>
        综合示例：项目申请表，包含条件渲染、动态嵌套表单、字段联动等多种特性。
        <br />
        特性说明：
      </p>
      <ul style={{ fontSize: '14px', color: '#666' }}>
        <li>预算超过100万时，自动勾选"需要高层审批"并显示审批人选择</li>
        <li>根据项目类型动态显示不同的详情表单</li>
        <li>开发项目中，勾选"是否有原型"后显示原型链接输入框</li>
        <li>必填字段根据条件动态变化</li>
      </ul>
      <DynamicForm schema={schema} onSubmit={handleSubmit} />
    </Card>
  );
};
