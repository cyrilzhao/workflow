import { filterValueWithNestedSchemas } from './filterValueWithNestedSchemas';
import type { ExtendedJSONSchema } from '../../../types/schema';

describe('filterValueWithNestedSchemas', () => {
  describe('基本类型处理', () => {
    it('应该处理 null 值', () => {
      const schema: ExtendedJSONSchema = { type: 'string' };
      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      const result = filterValueWithNestedSchemas(null, schema, nestedSchemas);
      expect(result).toBeNull();
    });

    it('应该处理 undefined 值', () => {
      const schema: ExtendedJSONSchema = { type: 'string' };
      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      const result = filterValueWithNestedSchemas(undefined, schema, nestedSchemas);
      expect(result).toBeUndefined();
    });

    it('应该直接返回基本类型', () => {
      const schema: ExtendedJSONSchema = { type: 'string' };
      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      const value = 'test string';
      const result = filterValueWithNestedSchemas(value, schema, nestedSchemas);
      expect(result).toBe('test string');
    });
  });

  describe('对象类型处理（无嵌套 schema）', () => {
    it('应该过滤掉不在 schema 中定义的字段', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      const value = {
        name: 'John',
        age: 30,
        extraField: 'should be removed',
      };

      const result = filterValueWithNestedSchemas(value, schema, nestedSchemas);
      expect(result).toEqual({ name: 'John', age: 30 });
      expect(result).not.toHaveProperty('extraField');
    });
  });

  describe('嵌套对象处理（使用注册的 schema）', () => {
    it('应该使用注册的 schema 过滤嵌套字段', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              // 初始 schema 定义
              field1: { type: 'string' },
              field2: { type: 'string' },
            },
          },
        },
      };

      // 注册的 schema（动态切换后的 schema）
      const registeredSchema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          // 只保留 field1
          field1: { type: 'string' },
        },
      };

      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      nestedSchemas.set('details', registeredSchema);

      const value = {
        name: 'John',
        details: {
          field1: 'value1',
          field2: 'value2', // 应该被过滤掉
        },
      };

      const result = filterValueWithNestedSchemas(value, schema, nestedSchemas);
      expect(result).toEqual({
        name: 'John',
        details: {
          field1: 'value1',
          // field2 被过滤掉了
        },
      });
    });

    it('应该模拟动态表单 schemaKey 切换场景', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          userType: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              // 初始 schema（personal）
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      };

      // 用户切换到 company 类型后的 schema
      const companySchema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          taxId: { type: 'string' },
        },
      };

      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      nestedSchemas.set('details', companySchema);

      // 数据包含两种类型的字段（用户切换类型时保留了所有数据）
      const value = {
        userType: 'company',
        details: {
          // personal 类型的字段（应该被过滤）
          firstName: 'John',
          lastName: 'Doe',
          // company 类型的字段（应该保留）
          companyName: 'Acme Inc',
          taxId: '123456',
        },
      };

      const result = filterValueWithNestedSchemas(value, schema, nestedSchemas);
      expect(result).toEqual({
        userType: 'company',
        details: {
          companyName: 'Acme Inc',
          taxId: '123456',
          // firstName 和 lastName 被过滤掉了
        },
      });
    });
  });

  describe('多层嵌套处理', () => {
    it('应该处理多层嵌套对象的 schema 注册', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          company: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              details: {
                type: 'object',
                properties: {
                  field1: { type: 'string' },
                  field2: { type: 'string' },
                },
              },
            },
          },
        },
      };

      const registeredSchema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          field1: { type: 'string' },
        },
      };

      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      nestedSchemas.set('company.details', registeredSchema);

      const value = {
        company: {
          name: 'Acme',
          details: {
            field1: 'value1',
            field2: 'value2',
          },
        },
      };

      const result = filterValueWithNestedSchemas(value, schema, nestedSchemas);
      expect(result).toEqual({
        company: {
          name: 'Acme',
          details: {
            field1: 'value1',
          },
        },
      });
    });
  });

  describe('数组类型处理', () => {
    it('应该处理数组中的对象元素', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const nestedSchemas = new Map<string, ExtendedJSONSchema>();
      const value = {
        items: [
          { id: 1, name: 'Item 1', extra: 'remove' },
          { id: 2, name: 'Item 2', another: 'remove' },
        ],
      };

      const result = filterValueWithNestedSchemas(value, schema, nestedSchemas);
      expect(result).toEqual({
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      });
    });
  });
});
