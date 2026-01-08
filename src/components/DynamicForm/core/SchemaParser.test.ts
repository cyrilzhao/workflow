import { SchemaParser } from './SchemaParser';
import type { ExtendedJSONSchema, FieldConfig } from '../types/schema';

describe('SchemaParser', () => {
  describe('parse', () => {
    describe('基本功能', () => {
      it('应该解析简单的对象 schema', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              title: '姓名',
            },
            age: {
              type: 'number',
              title: '年龄',
            },
          },
          required: ['name'],
        };

        const fields = SchemaParser.parse(schema);

        expect(fields).toHaveLength(2);
        expect(fields[0]).toMatchObject({
          name: 'name',
          type: 'string',
          label: '姓名',
          required: true,
          widget: 'text',
        });
        expect(fields[1]).toMatchObject({
          name: 'age',
          type: 'number',
          label: '年龄',
          required: false,
          widget: 'number',
        });
      });

      it('应该返回空数组当 schema 不是对象类型', () => {
        const schema: ExtendedJSONSchema = {
          type: 'string',
        };

        const fields = SchemaParser.parse(schema);
        expect(fields).toEqual([]);
      });

      it('应该返回空数组当 schema 没有 properties', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
        };

        const fields = SchemaParser.parse(schema);
        expect(fields).toEqual([]);
      });

      it('应该跳过布尔类型的 property', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            invalid: true as any,
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('name');
      });

      it('应该过滤掉隐藏的字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            secret: {
              type: 'string',
              ui: { hidden: true },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('name');
      });
    });

    describe('字段顺序', () => {
      it('应该按照 properties 的顺序返回字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            email: { type: 'string' },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields.map(f => f.name)).toEqual(['name', 'age', 'email']);
      });

      it('应该按照 ui.order 指定的顺序返回字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            email: { type: 'string' },
          },
          ui: {
            order: ['email', 'name', 'age'],
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields.map(f => f.name)).toEqual(['email', 'name', 'age']);
      });

      it('应该忽略 ui.order 中不存在的字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          ui: {
            order: ['email', 'name', 'age', 'phone'],
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields.map(f => f.name)).toEqual(['name', 'age']);
      });
    });
  });

  describe('parseField - 基本字段属性', () => {
    it('应该解析字段的基本属性', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            title: '用户名',
            description: '请输入用户名',
            default: 'guest',
            ui: {
              placeholder: '请输入...',
              disabled: true,
              readonly: true,
            },
          },
        },
        required: ['username'],
      };

      const fields = SchemaParser.parse(schema);
      const field = fields[0];

      expect(field).toMatchObject({
        name: 'username',
        type: 'string',
        label: '用户名',
        description: '请输入用户名',
        defaultValue: 'guest',
        placeholder: '请输入...',
        required: true,
        disabled: true,
        readonly: true,
      });
    });

    it('应该处理没有 ui 配置的字段', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: '姓名',
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      const field = fields[0];

      expect(field.placeholder).toBeUndefined();
      expect(field.disabled).toBeUndefined();
      expect(field.readonly).toBeUndefined();
      expect(field.hidden).toBeUndefined();
    });

    it('应该为对象类型字段保留 schema', () => {
      const nestedSchema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
      };

      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          address: nestedSchema,
        },
      };

      const fields = SchemaParser.parse(schema);
      const field = fields[0];

      expect(field.schema).toBeDefined();
      expect(field.schema).toEqual(nestedSchema);
    });

    it('应该为所有字段保留 schema', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields[0].schema).toBeDefined();
      expect(fields[0].schema?.type).toBe('string');
      expect(fields[1].schema).toBeDefined();
      expect(fields[1].schema?.type).toBe('number');
    });
  });

  describe('getWidget - Widget 类型推断', () => {
    describe('字符串类型', () => {
      it('应该为普通字符串返回 text widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('text');
      });

      it('应该为 email 格式返回 email widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('email');
      });

      it('应该为 date 格式返回 date widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            birthday: {
              type: 'string',
              format: 'date',
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('date');
      });

      it('应该为 date-time 格式返回 datetime widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('datetime');
      });

      it('应该为 time 格式返回 time widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            startTime: {
              type: 'string',
              format: 'time',
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('time');
      });

      it('应该为有 enum 的字符串返回 select widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending'],
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('select');
      });

      it('应该为长文本返回 textarea widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              maxLength: 500,
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('textarea');
      });

      it('应该为短文本返回 text widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 50,
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('text');
      });
    });

    describe('数字类型', () => {
      it('应该为 number 类型返回 number widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            price: { type: 'number' },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('number');
      });

      it('应该为 integer 类型返回 number widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            count: { type: 'integer' },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('number');
      });
    });

    describe('布尔类型', () => {
      it('应该为 boolean 类型返回 checkbox widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            agreed: { type: 'boolean' },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('checkbox');
      });
    });

    describe('数组类型', () => {
      it('应该为有 enum items 的数组返回 array widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            hobbies: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['reading', 'sports', 'music'],
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('array');
      });

      it('应该为普通数组返回 array widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('array');
      });

      it('应该处理没有 items 的数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            data: {
              type: 'array',
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('array');
      });
    });

    describe('对象类型', () => {
      it('应该为 object 类型返回 nested-form widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('nested-form');
      });
    });

    describe('自定义 widget', () => {
      it('应该优先使用 ui.widget 指定的 widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            password: {
              type: 'string',
              ui: {
                widget: 'password',
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('password');
      });

      it('应该允许覆盖默认的 widget 推断', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              ui: {
                widget: 'radio',
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('radio');
      });
    });

    describe('未知类型处理', () => {
      it('应该为未知类型返回 text widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            unknown: {
              type: 'null' as any, // 使用一个不常见的类型
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('text');
      });

      it('应该为没有 type 的字段返回 text widget', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            noType: {} as any,
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].widget).toBe('text');
      });
    });
  });

  describe('getValidationRules - 验证规则', () => {
    describe('必填验证', () => {
      it('应该为必填字段添加 required 规则', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.required).toBe('This field is required');
      });

      it('应该使用自定义的 required 错误消息', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              ui: {
                errorMessages: {
                  required: '请输入邮箱地址',
                },
              },
            },
          },
          required: ['email'],
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.required).toBe('请输入邮箱地址');
      });

      it('应该为非必填字段不添加 required 规则', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            nickname: { type: 'string' },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.required).toBeUndefined();
      });
    });

    describe('长度验证', () => {
      it('应该添加 minLength 规则', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            password: {
              type: 'string',
              minLength: 8,
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.validate?.minLength).toBeDefined();

        // 测试验证函数
        const validator = fields[0].validation?.validate?.minLength;
        if (validator) {
          expect(validator('short')).toBe('Minimum length is 8 characters');
          expect(validator('longenough')).toBe(true);
          expect(validator(null)).toBe('Minimum length is 8 characters');
        }
      });

      it('应该添加 maxLength 规则', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              maxLength: 20,
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.maxLength).toEqual({
          value: 20,
          message: 'Maximum length is 20 characters',
        });
      });

      it('应该使用自定义的长度错误消息', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              ui: {
                errorMessages: {
                  minLength: '验证码必须是6位',
                  maxLength: '验证码必须是6位',
                },
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);

        // 测试 minLength 自定义错误消息
        const minLengthValidator = fields[0].validation?.validate?.minLength;
        if (minLengthValidator) {
          expect(minLengthValidator('12345')).toBe('验证码必须是6位');
          expect(minLengthValidator('123456')).toBe(true);
        }

        // 测试 maxLength 自定义错误消息
        expect(fields[0].validation?.maxLength?.message).toBe('验证码必须是6位');
      });
    });

    describe('数值范围验证', () => {
      it('应该添加 minimum 规则', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            age: {
              type: 'number',
              minimum: 18,
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.min).toEqual({
          value: 18,
          message: 'Minimum value is 18',
        });
      });

      it('应该添加 maximum 规则', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              maximum: 100,
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.max).toEqual({
          value: 100,
          message: 'Maximum value is 100',
        });
      });

      it('应该处理 minimum 为 0 的情况', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              minimum: 0,
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.min).toEqual({
          value: 0,
          message: 'Minimum value is 0',
        });
      });

      it('应该使用自定义的数值范围错误消息', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            price: {
              type: 'number',
              minimum: 0,
              maximum: 9999,
              ui: {
                errorMessages: {
                  min: '价格不能为负数',
                  max: '价格不能超过9999',
                },
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.min?.message).toBe('价格不能为负数');
        expect(fields[0].validation?.max?.message).toBe('价格不能超过9999');
      });
    });

    describe('正则表达式验证', () => {
      it('应该添加 pattern 规则', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            phone: {
              type: 'string',
              pattern: '^1[3-9]\\d{9}$',
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.pattern?.value).toEqual(/^1[3-9]\d{9}$/);
        expect(fields[0].validation?.pattern?.message).toBe('Invalid format');
      });

      it('应该使用自定义的 pattern 错误消息', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            idCard: {
              type: 'string',
              pattern: '^\\d{17}[\\dXx]$',
              ui: {
                errorMessages: {
                  pattern: '请输入有效的身份证号码',
                },
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.pattern?.message).toBe('请输入有效的身份证号码');
      });
    });

    describe('格式验证', () => {
      it('应该为 email 格式添加内置验证', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.pattern?.value).toEqual(
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        );
        expect(fields[0].validation?.pattern?.message).toBe('Please enter a valid email address');
      });

      it('应该使用自定义的 email 格式错误消息', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              ui: {
                errorMessages: {
                  format: '邮箱格式错误',
                },
              },
            },
          },
        };

        const fields = SchemaParser.parse(schema);
        expect(fields[0].validation?.pattern?.message).toBe('邮箱格式错误');
      });
    });
  });

  describe('getOptions - 选项列表', () => {
    it('应该从 enum 生成选项列表', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      expect(fields[0].options).toEqual([
        { label: 'active', value: 'active' },
        { label: 'inactive', value: 'inactive' },
        { label: 'pending', value: 'pending' },
      ]);
    });

    it('应该使用 enumNames 作为选项标签', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
            enumNames: ['激活', '未激活', '待处理'],
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      expect(fields[0].options).toEqual([
        { label: '激活', value: 'active' },
        { label: '未激活', value: 'inactive' },
        { label: '待处理', value: 'pending' },
      ]);
    });

    it('应该处理数字类型的 enum', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          priority: {
            type: 'number',
            enum: [1, 2, 3],
            enumNames: ['低', '中', '高'],
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      expect(fields[0].options).toEqual([
        { label: '低', value: 1 },
        { label: '中', value: 2 },
        { label: '高', value: 3 },
      ]);
    });

    it('应该为没有 enum 的字段返回 undefined', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const fields = SchemaParser.parse(schema);
      expect(fields[0].options).toBeUndefined();
    });
  });

  describe('setCustomFormats - 自定义格式验证器', () => {
    beforeEach(() => {
      // 清空自定义格式验证器
      SchemaParser.setCustomFormats({});
    });

    it('应该支持设置自定义格式验证器', () => {
      SchemaParser.setCustomFormats({
        phone: (value: string) => /^1[3-9]\d{9}$/.test(value),
      });

      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          mobile: {
            type: 'string',
            format: 'phone',
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      expect(fields[0].validation?.validate).toBeDefined();
      expect(fields[0].validation?.validate?.phone).toBeDefined();
    });

    it('应该使用自定义格式验证器进行验证', () => {
      SchemaParser.setCustomFormats({
        idCard: (value: string) => /^\d{17}[\dXx]$/.test(value),
      });

      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          idNumber: {
            type: 'string',
            format: 'idCard',
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      const validator = fields[0].validation?.validate?.idCard;

      expect(validator).toBeDefined();
      if (validator) {
        expect(validator('11010119900101001X')).toBe(true);
        expect(validator('invalid')).toBe('Invalid idCard format');
      }
    });

    it('应该处理空值', () => {
      SchemaParser.setCustomFormats({
        custom: (value: string) => value === 'valid',
      });

      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            format: 'custom',
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      const validator = fields[0].validation?.validate?.custom;

      expect(validator).toBeDefined();
      if (validator) {
        expect(validator('')).toBe(true);
        expect(validator(null as any)).toBe(true);
        expect(validator(undefined as any)).toBe(true);
      }
    });

    it('应该使用自定义的格式错误消息', () => {
      SchemaParser.setCustomFormats({
        zipCode: (value: string) => /^\d{6}$/.test(value),
      });

      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          zip: {
            type: 'string',
            format: 'zipCode',
            ui: {
              errorMessages: {
                format: '请输入6位邮政编码',
              },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      const validator = fields[0].validation?.validate?.zipCode;

      expect(validator).toBeDefined();
      if (validator) {
        expect(validator('invalid')).toBe('请输入6位邮政编码');
      }
    });

    it('应该优先使用自定义格式验证器而不是内置验证', () => {
      SchemaParser.setCustomFormats({
        email: (value: string) => value.includes('@custom.com'),
      });

      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
        },
      };

      const fields = SchemaParser.parse(schema);
      // 应该使用自定义验证器，而不是内置的 pattern 验证
      expect(fields[0].validation?.validate?.email).toBeDefined();
      expect(fields[0].validation?.pattern).toBeUndefined();
    });
  });

  describe('buildFieldPath - 路径构建', () => {
    it('应该为空父路径返回字段名', () => {
      const path = SchemaParser.buildFieldPath('', 'name', false);
      expect(path).toBe('name');
    });

    it('应该使用 . 连接普通字段', () => {
      const path = SchemaParser.buildFieldPath('user', 'name', false);
      expect(path).toBe('user.name');
    });

    it('应该使用 ~~ 连接 flattenPath 字段', () => {
      const path = SchemaParser.buildFieldPath('region', 'market', true);
      expect(path).toBe('region~~market');
    });

    it('应该在父级是 flattenPath 链时使用 ~~', () => {
      const path = SchemaParser.buildFieldPath('region~~market', 'contacts', false);
      expect(path).toBe('region~~market~~contacts');
    });

    it('应该处理混合的 . 和 ~~ 分隔符', () => {
      const path = SchemaParser.buildFieldPath('region~~market~~contacts.0', 'category', true);
      expect(path).toBe('region~~market~~contacts.0~~category');
    });

    it('应该在 flattenPath 链中继续使用 ~~', () => {
      const path = SchemaParser.buildFieldPath('region~~market~~contacts.0~~category', 'group', true);
      expect(path).toBe('region~~market~~contacts.0~~category~~group');
    });

    it('应该在 flattenPath 链末尾添加普通字段时使用 ~~', () => {
      const path = SchemaParser.buildFieldPath('region~~market~~contacts.0~~category~~group', 'name', false);
      expect(path).toBe('region~~market~~contacts.0~~category~~group~~name');
    });

    it('应该正确判断最后一个分隔符类型', () => {
      // 最后是 .，当前不是 flattenPath，应该用 .
      const path1 = SchemaParser.buildFieldPath('user.address', 'street', false);
      expect(path1).toBe('user.address.street');

      // 最后是 ~~，即使当前不是 flattenPath，也应该用 ~~
      const path2 = SchemaParser.buildFieldPath('region~~market', 'name', false);
      expect(path2).toBe('region~~market~~name');
    });
  });

  describe('hasFlattenPath - 检测路径扁平化', () => {
    it('应该为非对象类型返回 false', () => {
      const schema: ExtendedJSONSchema = {
        type: 'string',
      };
      expect(SchemaParser.hasFlattenPath(schema)).toBe(false);
    });

    it('应该为没有 properties 的对象返回 false', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
      };
      expect(SchemaParser.hasFlattenPath(schema)).toBe(false);
    });

    it('应该检测到直接子字段的 flattenPath', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            ui: { flattenPath: true },
            properties: {
              name: { type: 'string' },
            },
          },
        },
      };
      expect(SchemaParser.hasFlattenPath(schema)).toBe(true);
    });

    it('应该递归检测嵌套字段的 flattenPath', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              address: {
                type: 'object',
                ui: { flattenPath: true },
                properties: {
                  street: { type: 'string' },
                },
              },
            },
          },
        },
      };
      expect(SchemaParser.hasFlattenPath(schema)).toBe(true);
    });

    it('应该为没有 flattenPath 的 schema 返回 false', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
          },
        },
      };
      expect(SchemaParser.hasFlattenPath(schema)).toBe(false);
    });

    it('应该跳过布尔类型的 property', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          invalid: true as any,
        },
      };
      expect(SchemaParser.hasFlattenPath(schema)).toBe(false);
    });
  });

  describe('flattenPath - 路径扁平化功能', () => {
    it('应该扁平化嵌套对象的字段', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            title: 'Region',
            ui: { flattenPath: true },
            properties: {
              name: { type: 'string', title: 'Region Name' },
              code: { type: 'string', title: 'Region Code' },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields).toHaveLength(2);
      // flattenPath 只影响当前字段的路径构建，子字段使用普通的 . 连接
      expect(fields[0].name).toBe('region.name');
      expect(fields[1].name).toBe('region.code');
    });

    it('应该在 flattenPath 字段上添加标签前缀', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            title: 'Region',
            ui: {
              flattenPath: true,
              flattenPrefix: true,
            },
            properties: {
              name: { type: 'string', title: 'Name' },
              code: { type: 'string', title: 'Code' },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields[0].label).toBe('Region - Name');
      expect(fields[1].label).toBe('Region - Code');
    });

    it('应该在没有 flattenPrefix 时不添加标签前缀', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            title: 'Region',
            ui: {
              flattenPath: true,
              flattenPrefix: false,
            },
            properties: {
              name: { type: 'string', title: 'Name' },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields[0].label).toBe('Name');
    });

    it('应该处理多层嵌套的 flattenPath', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            title: 'Region',
            ui: {
              flattenPath: true,
              flattenPrefix: true,
            },
            properties: {
              market: {
                type: 'object',
                title: 'Market',
                ui: {
                  flattenPath: true,
                  flattenPrefix: true,
                },
                properties: {
                  name: { type: 'string', title: 'Name' },
                },
              },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('region~~market~~name');
      expect(fields[0].label).toBe('Region - Market - Name');
    });

    it('应该继承父级的 UI 配置（layout）', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            ui: {
              flattenPath: true,
              layout: 'horizontal',
            },
            properties: {
              name: { type: 'string', title: 'Name' },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields[0].schema?.ui?.layout).toBe('horizontal');
    });

    it('应该继承父级的 UI 配置（labelWidth）', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            ui: {
              flattenPath: true,
              labelWidth: 120,
            },
            properties: {
              name: { type: 'string', title: 'Name' },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields[0].schema?.ui?.labelWidth).toBe(120);
    });

    it('应该允许子字段覆盖继承的 UI 配置', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          region: {
            type: 'object',
            ui: {
              flattenPath: true,
              layout: 'horizontal',
              labelWidth: 120,
            },
            properties: {
              name: {
                type: 'string',
                title: 'Name',
                ui: {
                  layout: 'vertical',
                  labelWidth: 80,
                },
              },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields[0].schema?.ui?.layout).toBe('vertical');
      expect(fields[0].schema?.ui?.labelWidth).toBe(80);
    });

    it('应该处理三层嵌套的 flattenPath 且累积标签前缀', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          company: {
            type: 'object',
            title: 'Company',
            ui: {
              flattenPath: true,
              flattenPrefix: true,
            },
            properties: {
              region: {
                type: 'object',
                title: 'Region',
                ui: {
                  flattenPath: true,
                  flattenPrefix: true,
                },
                properties: {
                  market: {
                    type: 'object',
                    title: 'Market',
                    ui: {
                      flattenPath: true,
                      flattenPrefix: true,
                    },
                    properties: {
                      name: { type: 'string', title: 'Name' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields).toHaveLength(1);
      // 测试累积的标签前缀：Company - Region - Market - Name
      expect(fields[0].label).toBe('Company - Region - Market - Name');
    });

    it('应该从父级继承 UI 配置到多层嵌套的子字段', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          section1: {
            type: 'object',
            ui: {
              flattenPath: true,
              layout: 'horizontal',
              labelWidth: 100,
            },
            properties: {
              section2: {
                type: 'object',
                ui: {
                  flattenPath: true,
                },
                properties: {
                  field: { type: 'string', title: 'Field' },
                },
              },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      // section2 没有设置 layout 和 labelWidth，应该继承自 section1
      expect(fields[0].schema?.ui?.layout).toBe('horizontal');
      expect(fields[0].schema?.ui?.labelWidth).toBe(100);
    });

    it('应该处理 flattenPath 字段没有 UI 配置的情况', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          section: {
            type: 'object',
            title: 'Section',
            ui: {
              flattenPath: true,
              flattenPrefix: true,
            },
            properties: {
              field: { type: 'string', title: 'Field' },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      // 没有 inheritedUI，layout 和 labelWidth 应该是 undefined
      expect(fields[0].schema?.ui?.layout).toBeUndefined();
      expect(fields[0].schema?.ui?.labelWidth).toBeUndefined();
      // 但应该有标签前缀
      expect(fields[0].label).toBe('Section - Field');
    });

    it('应该在嵌套 flattenPath 中正确继承父级 UI 配置', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          parent: {
            type: 'object',
            title: 'Parent',
            ui: {
              flattenPath: true,
              layout: 'horizontal',
              labelWidth: 150,
            },
            properties: {
              child: {
                type: 'object',
                title: 'Child',
                ui: {
                  flattenPath: true,
                  flattenPrefix: true,
                },
                properties: {
                  field: { type: 'string', title: 'Field' },
                },
              },
            },
          },
        },
      };

      const fields = SchemaParser.parse(schema);

      // child 没有设置 layout 和 labelWidth，应该从 parent 继承
      expect(fields[0].schema?.ui?.layout).toBe('horizontal');
      expect(fields[0].schema?.ui?.labelWidth).toBe(150);
      expect(fields[0].label).toBe('Child - Field');
    });
  });

  describe('getValidationRules - 参数默认值测试', () => {
    it('应该在不传递 required 参数时使用默认值 false', () => {
      const schema: ExtendedJSONSchema = {
        type: 'string',
        minLength: 5,
      };

      // 不传递 required 参数，应该使用默认值 false
      const rules = SchemaParser.getValidationRules(schema);

      expect(rules.required).toBeUndefined();
      expect(rules.validate?.minLength).toBeDefined();
    });

    it('应该在传递 required=true 时添加 required 规则', () => {
      const schema: ExtendedJSONSchema = {
        type: 'string',
      };

      const rules = SchemaParser.getValidationRules(schema, true);

      expect(rules.required).toBe('This field is required');
    });
  });

  describe('综合场景测试', () => {
    it('应该正确解析复杂的表单 schema', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            title: '用户名',
            minLength: 3,
            maxLength: 20,
            pattern: '^[a-zA-Z0-9_]+$',
            ui: {
              placeholder: '请输入用户名',
              errorMessages: {
                required: '用户名不能为空',
                minLength: '用户名至少3个字符',
                maxLength: '用户名最多20个字符',
                pattern: '用户名只能包含字母、数字和下划线',
              },
            },
          },
          email: {
            type: 'string',
            title: '邮箱',
            format: 'email',
          },
          age: {
            type: 'number',
            title: '年龄',
            minimum: 18,
            maximum: 100,
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
          },
          agreed: {
            type: 'boolean',
            title: '同意条款',
          },
        },
        required: ['username', 'email', 'agreed'],
        ui: {
          order: ['username', 'email', 'age', 'gender', 'bio', 'agreed'],
        },
      };

      const fields = SchemaParser.parse(schema);

      expect(fields).toHaveLength(6);
      expect(fields.map(f => f.name)).toEqual([
        'username',
        'email',
        'age',
        'gender',
        'bio',
        'agreed',
      ]);

      // 验证 username 字段
      expect(fields[0]).toMatchObject({
        name: 'username',
        type: 'string',
        label: '用户名',
        required: true,
        widget: 'text',
      });
      // minLength 现在是 validate 函数，不是对象
      expect(fields[0].validation?.validate?.minLength).toBeDefined();
      expect(fields[0].validation?.maxLength?.value).toBe(20);
      expect(fields[0].validation?.pattern?.value).toEqual(/^[a-zA-Z0-9_]+$/);

      // 验证 email 字段
      expect(fields[1]).toMatchObject({
        name: 'email',
        type: 'string',
        label: '邮箱',
        required: true,
        widget: 'email',
      });

      // 验证 gender 字段
      expect(fields[3].widget).toBe('radio');
      expect(fields[3].options).toEqual([
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
        { label: '其他', value: 'other' },
      ]);

      // 验证 bio 字段
      expect(fields[4].widget).toBe('textarea');
    });
  });
});
