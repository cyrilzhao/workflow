import React from 'react';
import { DynamicForm } from '@/components/DynamicForm';
import type { ExtendedJSONSchema } from '@/types/schema';
import { Card } from '@blueprintjs/core';

export const NestedArrayExample: React.FC = () => {
  const schema: ExtendedJSONSchema = {
    type: 'object',
    properties: {
      departments: {
        type: 'array',
        title: '部门列表',
        items: {
          type: 'object',
          title: '部门',
          properties: {
            name: {
              type: 'string',
              title: '部门名称',
            },
            employees: {
              type: 'array',
              title: '员工列表',
              items: {
                type: 'object',
                title: '员工',
                properties: {
                  name: { type: 'string', title: '姓名' },
                  position: { type: 'string', title: '职位' },
                },
              },
              ui: {
                flattenPath: true,
                arrayMode: 'dynamic',
                addButtonText: '添加员工',
              },
            },
          },
        },
        ui: {
          arrayMode: 'dynamic',
          addButtonText: '添加部门',
        },
      },
    },
  };

  const defaultValues = {
    departments: [
      {
        name: '技术部',
        employees: [
          { name: '张三', position: '前端工程师' },
          { name: '李四', position: '后端工程师' },
        ],
      },
    ],
  };

  const handleSubmit = (data: any) => {
    console.log('嵌套数组数据:', data);
    alert('提交成功！请查看控制台输出');
  };

  return (
    <Card style={{ marginTop: '20px', maxWidth: '600px' }}>
      <h3>嵌套数组</h3>
      <p>数组中的对象包含另一个数组，支持多层嵌套。</p>
      <ul style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
        <li>支持数组嵌套数组</li>
        <li>每层都可以独立增删</li>
        <li>适用于树形结构数据</li>
      </ul>
      <DynamicForm schema={schema} defaultValues={defaultValues} onSubmit={handleSubmit} />
    </Card>
  );
};
