import { SchemaValidator } from '../SchemaValidator';
import type { ExtendedJSONSchema } from '../../types/schema';

describe('SchemaValidator', () => {
  describe('dependencies 验证', () => {
    describe('简单依赖（数组形式）', () => {
      it('当触发字段有值时，依赖字段必填', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            creditCard: { type: 'string', title: 'Card Number' },
            billingAddress: { type: 'string', title: 'Billing Address' },
          },
          dependencies: {
            creditCard: ['billingAddress'],
          },
        };

        const validator = new SchemaValidator(schema);
        const errors = validator.validate({
          creditCard: '1234567890123456',
          billingAddress: '',
        });

        expect(errors.billingAddress).toBe(
          'Billing Address is required when Card Number is provided'
        );
      });

      it('当触发字段无值时，依赖字段不必填', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            creditCard: { type: 'string', title: 'Card Number' },
            billingAddress: { type: 'string', title: 'Billing Address' },
          },
          dependencies: {
            creditCard: ['billingAddress'],
          },
        };

        const validator = new SchemaValidator(schema);
        const errors = validator.validate({
          creditCard: '',
          billingAddress: '',
        });

        expect(errors.billingAddress).toBeUndefined();
      });

      it('当触发字段和依赖字段都有值时，验证通过', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            creditCard: { type: 'string', title: 'Card Number' },
            billingAddress: { type: 'string', title: 'Billing Address' },
          },
          dependencies: {
            creditCard: ['billingAddress'],
          },
        };

        const validator = new SchemaValidator(schema);
        const errors = validator.validate({
          creditCard: '1234567890123456',
          billingAddress: '123 Main St',
        });

        expect(Object.keys(errors).length).toBe(0);
      });
    });

    describe('Schema 依赖（对象形式）', () => {
      it('当触发字段有值时，验证依赖 schema', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            paymentMethod: {
              type: 'string',
              enum: ['credit_card', 'bank_transfer'],
            },
            cardNumber: { type: 'string', title: 'Card Number' },
            bankAccount: { type: 'string', title: 'Bank Account' },
          },
          dependencies: {
            paymentMethod: {
              oneOf: [
                {
                  properties: {
                    paymentMethod: { const: 'credit_card' },
                    cardNumber: { pattern: '^[0-9]{16}$' },
                  },
                  required: ['cardNumber'],
                },
                {
                  properties: {
                    paymentMethod: { const: 'bank_transfer' },
                    bankAccount: { pattern: '^[0-9]{10,20}$' },
                  },
                  required: ['bankAccount'],
                },
              ],
            },
          },
        };

        const validator = new SchemaValidator(schema);
        const errors = validator.validate({
          paymentMethod: 'credit_card',
          cardNumber: '',
          bankAccount: '',
        });

        expect(errors.cardNumber).toBeDefined();
      });
    });
  });

  describe('if/then/else 条件分支验证', () => {
    it('当 if 条件满足时，应用 then schema', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          country: { type: 'string', enum: ['china', 'usa'], title: 'Country' },
          idCard: { type: 'string', title: 'ID Card' },
          ssn: { type: 'string', title: 'SSN' },
        },
        if: {
          properties: { country: { const: 'china' } },
        },
        then: {
          required: ['idCard'],
          properties: {
            idCard: { pattern: '^[1-9]\\d{17}$' },
          },
        },
        else: {
          required: ['ssn'],
          properties: {
            ssn: { pattern: '^\\d{3}-\\d{2}-\\d{4}$' },
          },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        country: 'china',
        idCard: '',
        ssn: '',
      });

      expect(errors.idCard).toBe('ID Card is required');
      expect(errors.ssn).toBeUndefined();
    });

    it('当 if 条件不满足时，应用 else schema', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          country: { type: 'string', enum: ['china', 'usa'], title: 'Country' },
          idCard: { type: 'string', title: 'ID Card' },
          ssn: { type: 'string', title: 'SSN' },
        },
        if: {
          properties: { country: { const: 'china' } },
        },
        then: {
          required: ['idCard'],
          properties: {
            idCard: { pattern: '^[1-9]\\d{17}$' },
          },
        },
        else: {
          required: ['ssn'],
          properties: {
            ssn: { pattern: '^\\d{3}-\\d{2}-\\d{4}$' },
          },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        country: 'usa',
        idCard: '',
        ssn: '',
      });

      expect(errors.ssn).toBe('SSN is required');
      expect(errors.idCard).toBeUndefined();
    });

    it('验证 pattern 格式', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          country: { type: 'string', enum: ['china', 'usa'], title: 'Country' },
          idCard: { type: 'string', title: 'ID Card' },
        },
        if: {
          properties: { country: { const: 'china' } },
        },
        then: {
          required: ['idCard'],
          properties: {
            idCard: { pattern: '^[1-9]\\d{17}$' },
          },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        country: 'china',
        idCard: '123',
      });

      expect(errors.idCard).toBe('ID Card invalid format');
    });
  });

  describe('allOf 逻辑与验证', () => {
    it('必须满足所有子 schema', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          isStudent: { type: 'boolean', title: '是否学生' },
          age: { type: 'integer', title: '年龄' },
          studentId: { type: 'string', title: '学号' },
          school: { type: 'string', title: '学校' },
          guardianPhone: { type: 'string', title: '监护人电话' },
        },
        allOf: [
          {
            if: { properties: { isStudent: { const: true } } },
            then: { required: ['studentId', 'school'] },
          },
          {
            if: { properties: { age: { maximum: 17 } } },
            then: { required: ['guardianPhone'] },
          },
        ],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        isStudent: true,
        age: 16,
        studentId: '',
        school: '',
        guardianPhone: '',
      });

      expect(errors.studentId).toBe('学号 is required');
      expect(errors.school).toBe('学校 is required');
      expect(errors.guardianPhone).toBe('监护人电话 is required');
    });
  });

  describe('anyOf 逻辑或验证', () => {
    it('至少满足一个子 schema 时验证通过', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', title: 'Email', format: 'email' },
          phone: { type: 'string', title: 'Phone' },
          wechat: { type: 'string', title: 'WeChat' },
        },
        anyOf: [{ required: ['email'] }, { required: ['phone'] }, { required: ['wechat'] }],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        email: 'test@example.com',
        phone: '',
        wechat: '',
      });

      expect(Object.keys(errors).length).toBe(0);
    });

    it('没有任何 schema 匹配时返回错误', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', title: 'Email', format: 'email' },
          phone: { type: 'string', title: 'Phone' },
          wechat: { type: 'string', title: 'WeChat' },
        },
        anyOf: [{ required: ['email'] }, { required: ['phone'] }, { required: ['wechat'] }],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        email: '',
        phone: '',
        wechat: '',
      });

      expect(errors.email).toContain('Must satisfy at least one of the following conditions');
    });
  });

  describe('oneOf 逻辑异或验证', () => {
    it('有且仅有一个 schema 匹配时验证通过', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          accountType: { type: 'string', enum: ['personal', 'business'], title: 'Account Type' },
          idCard: { type: 'string', title: 'ID Card' },
          businessLicense: { type: 'string', title: '营业执照号' },
        },
        oneOf: [
          {
            properties: { accountType: { const: 'personal' } },
            required: ['idCard'],
          },
          {
            properties: { accountType: { const: 'business' } },
            required: ['businessLicense'],
          },
        ],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        accountType: 'personal',
        idCard: '123456789012345678',
        businessLicense: '',
      });

      expect(Object.keys(errors).length).toBe(0);
    });

    it('没有任何 schema 匹配时返回错误', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          accountType: { type: 'string', enum: ['personal', 'business'], title: 'Account Type' },
          idCard: { type: 'string', title: 'ID Card' },
          businessLicense: { type: 'string', title: '营业执照号' },
        },
        oneOf: [
          {
            properties: { accountType: { const: 'personal' } },
            required: ['idCard'],
          },
          {
            properties: { accountType: { const: 'business' } },
            required: ['businessLicense'],
          },
        ],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        accountType: 'personal',
        idCard: '',
        businessLicense: '',
      });

      expect(errors.idCard).toBe('ID Card is required');
    });

    it('多个 schema 匹配时返回错误', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          accountType: { type: 'string', enum: ['personal', 'business'], title: 'Account Type' },
          idCard: { type: 'string', title: 'ID Card' },
          businessLicense: { type: 'string', title: '营业执照号' },
        },
        oneOf: [
          {
            // 第一个 schema：只要求 idCard 必填，不限制 accountType
            required: ['idCard'],
          },
          {
            // 第二个 schema：只要求 businessLicense 必填，不限制 accountType
            required: ['businessLicense'],
          },
        ],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        accountType: 'personal',
        idCard: '123456789012345678',
        businessLicense: '123456789',
      });

      expect(errors._schema).toBe('Data matches multiple mutually exclusive conditions');
    });
  });

  describe('字符串类型验证', () => {
    it('验证 minLength 最小长度', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          username: { type: 'string', title: 'Username', minLength: 3 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        username: 'ab',
      });

      expect(errors.username).toBe('Username minimum length is 3 characters');
    });

    it('验证 maxLength 最大长度', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          username: { type: 'string', title: 'Username', maxLength: 10 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        username: 'verylongusername',
      });

      expect(errors.username).toBe('Username maximum length is 10 characters');
    });

    it('验证 pattern 正则表达式', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          phone: { type: 'string', title: 'Phone', pattern: '^\\d{11}$' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        phone: '123',
      });

      expect(errors.phone).toBe('Phone invalid format');
    });

    it('验证 pattern 通过', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          phone: { type: 'string', title: 'Phone', pattern: '^\\d{11}$' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        phone: '13800138000',
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('数字类型验证', () => {
    it('验证 minimum 最小值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          age: { type: 'number', title: 'Age', minimum: 18 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        age: 16,
      });

      expect(errors.age).toBe('Age minimum value is 18');
    });

    it('验证 maximum 最大值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          age: { type: 'number', title: 'Age', maximum: 100 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        age: 120,
      });

      expect(errors.age).toBe('Age maximum value is 100');
    });

    it('验证 exclusiveMinimum 排他最小值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          score: { type: 'number', title: 'Score', exclusiveMinimum: 0 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        score: 0,
      });

      expect(errors.score).toBe('Score must be greater than 0');
    });

    it('验证 exclusiveMaximum 排他最大值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          score: { type: 'number', title: 'Score', exclusiveMaximum: 100 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        score: 100,
      });

      expect(errors.score).toBe('Score must be less than 100');
    });

    it('验证 multipleOf 倍数', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          quantity: { type: 'number', title: 'Quantity', multipleOf: 5 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        quantity: 7,
      });

      expect(errors.quantity).toBe('Quantity must be a multiple of 5');
    });

    it('验证 multipleOf 通过', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          quantity: { type: 'number', title: 'Quantity', multipleOf: 5 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        quantity: 15,
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('数组类型验证', () => {
    it('验证 minItems 最小项数', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          tags: { type: 'array', title: 'Tags', minItems: 2 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        tags: ['tag1'],
      });

      expect(errors.tags).toBe('Tags requires at least 2 items');
    });

    it('验证 maxItems 最大项数', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          tags: { type: 'array', title: 'Tags', maxItems: 3 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      });

      expect(errors.tags).toBe('Tags allows at most 3 items');
    });

    it('验证 uniqueItems 唯一性', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          tags: { type: 'array', title: 'Tags', uniqueItems: true },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        tags: ['tag1', 'tag2', 'tag1'],
      });

      expect(errors.tags).toBe('Tags must not contain duplicate items');
    });

    it('验证 uniqueItems 通过', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          tags: { type: 'array', title: 'Tags', uniqueItems: true },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        tags: ['tag1', 'tag2', 'tag3'],
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('对象类型验证', () => {
    it('验证 minProperties 最小属性数', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          metadata: { type: 'object', title: 'Metadata', minProperties: 2 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        metadata: { key1: 'value1' },
      });

      expect(errors.metadata).toBe('Metadata requires at least 2 properties');
    });

    it('验证 maxProperties 最大属性数', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          metadata: { type: 'object', title: 'Metadata', maxProperties: 2 },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        metadata: { key1: 'value1', key2: 'value2', key3: 'value3' },
      });

      expect(errors.metadata).toBe('Metadata allows at most 2 properties');
    });
  });

  describe('const 常量值验证', () => {
    it('验证 const 值不匹配', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          status: { const: 'active', title: 'Status' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        status: 'inactive',
      });

      expect(errors.status).toBe('Status must be active');
    });

    it('验证 const 值匹配', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          status: { const: 'active', title: 'Status' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        status: 'active',
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('enum 枚举值验证', () => {
    it('验证 enum 值不在枚举列表中', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          color: { type: 'string', title: 'Color', enum: ['red', 'green', 'blue'] },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        color: 'yellow',
      });

      expect(errors.color).toBe('Color must be one of: red, green, blue');
    });

    it('验证 enum 值在枚举列表中', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          color: { type: 'string', title: 'Color', enum: ['red', 'green', 'blue'] },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        color: 'red',
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('format 格式验证', () => {
    it('验证 email 格式错误', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', title: 'Email', format: 'email' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        email: 'invalid-email',
      });

      expect(errors.email).toBe('Email invalid format (expected: email)');
    });

    it('验证 email 格式正确', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', title: 'Email', format: 'email' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        email: 'test@example.com',
      });

      expect(Object.keys(errors).length).toBe(0);
    });

    it('验证 uri 格式错误', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          website: { type: 'string', title: 'Website', format: 'uri' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        website: 'not-a-url',
      });

      expect(errors.website).toBe('Website invalid format (expected: uri)');
    });

    it('验证 uri 格式正确', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          website: { type: 'string', title: 'Website', format: 'uri' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        website: 'https://example.com',
      });

      expect(Object.keys(errors).length).toBe(0);
    });

    it('验证 date 格式错误', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          birthDate: { type: 'string', title: 'Birth Date', format: 'date' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        birthDate: '2024/01/01',
      });

      expect(errors.birthDate).toBe('Birth Date invalid format (expected: date)');
    });

    it('验证 date 格式正确', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          birthDate: { type: 'string', title: 'Birth Date', format: 'date' },
        },
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        birthDate: '2024-01-01',
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('嵌套条件分支验证', () => {
    it('验证嵌套的 if/then/else（三层条件）', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          country: { type: 'string', title: 'Country', enum: ['china', 'usa', 'other'] },
          idCard: { type: 'string', title: 'ID Card' },
          ssn: { type: 'string', title: 'SSN' },
          passport: { type: 'string', title: 'Passport' },
        },
        if: {
          properties: { country: { const: 'china' } },
        },
        then: {
          required: ['idCard'],
          properties: {
            idCard: { pattern: '^[1-9]\\d{17}$' },
          },
        },
        else: {
          if: {
            properties: { country: { const: 'usa' } },
          },
          then: {
            required: ['ssn'],
            properties: {
              ssn: { pattern: '^\\d{3}-\\d{2}-\\d{4}$' },
            },
          },
          else: {
            required: ['passport'],
            properties: {
              passport: { pattern: '^[A-Z]\\d{8}$' },
            },
          },
        },
      };

      const validator = new SchemaValidator(schema);

      // 测试第一层条件：china
      const errors1 = validator.validate({
        country: 'china',
        idCard: '',
        ssn: '',
        passport: '',
      });
      expect(errors1.idCard).toBe('ID Card is required');
      expect(errors1.ssn).toBeUndefined();
      expect(errors1.passport).toBeUndefined();

      // 测试第二层条件：usa
      const errors2 = validator.validate({
        country: 'usa',
        idCard: '',
        ssn: '',
        passport: '',
      });
      expect(errors2.ssn).toBe('SSN is required');
      expect(errors2.idCard).toBeUndefined();
      expect(errors2.passport).toBeUndefined();

      // 测试第三层条件：other
      const errors3 = validator.validate({
        country: 'other',
        idCard: '',
        ssn: '',
        passport: '',
      });
      expect(errors3.passport).toBe('Passport is required');
      expect(errors3.idCard).toBeUndefined();
      expect(errors3.ssn).toBeUndefined();
    });
  });

  describe('边界情况测试', () => {
    it('空值处理：null 值应被视为无值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
        required: ['name'],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        name: null,
      });

      expect(errors.name).toBe('Name is required');
    });

    it('空值处理：undefined 值应被视为无值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
        required: ['name'],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        name: undefined,
      });

      expect(errors.name).toBe('Name is required');
    });

    it('空值处理：空字符串应被视为无值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
        },
        required: ['name'],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        name: '',
      });

      expect(errors.name).toBe('Name is required');
    });

    it('空值处理：空数组应被视为无值', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          tags: { type: 'array', title: 'Tags' },
        },
        required: ['tags'],
      };

      const validator = new SchemaValidator(schema);
      const errors = validator.validate({
        tags: [],
      });

      expect(errors.tags).toBe('Tags is required');
    });
  });
});
