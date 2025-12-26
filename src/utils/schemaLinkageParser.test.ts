import { parseSchemaLinkages } from './schemaLinkageParser';
import type { ExtendedJSONSchema, LinkageConfig } from '@/types/schema';

describe('parseSchemaLinkages', () => {
  describe('基本功能', () => {
    it('应该从 schema 中解析出联动配置', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          country: {
            type: 'string',
            title: '国家',
          },
          province: {
            type: 'string',
            title: '省份',
            ui: {
              linkage: {
                type: 'visibility',
                dependencies: ['country'],
                when: {
                  field: 'country',
                  operator: '==',
                  value: 'China',
                },
                fulfill: {
                  state: { visible: true },
                },
              },
            },
          },
        },
      };

      const result = parseSchemaLinkages(schema);

      expect(result.linkages).toHaveProperty('province');
      expect(result.linkages.province.type).toBe('visibility');
      expect(result.linkages.province.dependencies).toEqual(['country']);
    });

    it('应该返回空对象当 schema 没有 properties', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
      };

      const result = parseSchemaLinkages(schema);

      expect(result.linkages).toEqual({});
    });

    it('应该忽略没有联动配置的字段', () => {
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
      };

      const result = parseSchemaLinkages(schema);

      expect(result.linkages).toEqual({});
    });
  });

  describe('不同类型的联动配置', () => {
    it('应该解析 computed 类型联动', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          price: {
            type: 'number',
          },
          quantity: {
            type: 'number',
          },
          total: {
            type: 'number',
            ui: {
              linkage: {
                type: 'computed',
                dependencies: ['price', 'quantity'],
                fulfill: {
                  function: 'calculateTotal',
                },
              },
            },
          },
        },
      };

      const result = parseSchemaLinkages(schema);

      expect(result.linkages.total.type).toBe('computed');
      expect(result.linkages.total.fulfill?.function).toBe('calculateTotal');
    });
  });
});
