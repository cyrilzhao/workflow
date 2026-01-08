import { wrapPrimitiveArrays, unwrapPrimitiveArrays } from './arrayTransformer';
import type { ExtendedJSONSchema } from '../types/schema';

describe('arrayTransformer', () => {
  describe('wrapPrimitiveArrays', () => {
    describe('基本类型数组', () => {
      it('应该将字符串数组包装成对象数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data = ['a', 'b', 'c'];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
      });

      it('应该将数字数组包装成对象数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'number' },
        };
        const data = [1, 2, 3];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
      });

      it('应该将整数数组包装成对象数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'integer' },
        };
        const data = [10, 20, 30];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([{ value: 10 }, { value: 20 }, { value: 30 }]);
      });

      it('应该将布尔数组包装成对象数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'boolean' },
        };
        const data = [true, false, true];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([{ value: true }, { value: false }, { value: true }]);
      });

      it('应该处理空数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data: string[] = [];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([]);
      });

      it('应该处理包含 null/undefined 的数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data = ['a', null, undefined, 'b'];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([
          { value: 'a' },
          { value: null },
          { value: undefined },
          { value: 'b' },
        ]);
      });
    });

    describe('对象数组', () => {
      it('应该保持对象数组不变', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
          },
        };
        const data = [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual(data);
      });

      it('应该递归处理对象数组中的嵌套基本类型数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        };
        const data = [
          { name: 'Alice', tags: ['tag1', 'tag2'] },
          { name: 'Bob', tags: ['tag3'] },
        ];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([
          {
            name: 'Alice',
            tags: [{ value: 'tag1' }, { value: 'tag2' }],
          },
          {
            name: 'Bob',
            tags: [{ value: 'tag3' }],
          },
        ]);
      });
    });

    describe('嵌套数组', () => {
      it('应该处理数组的数组（基本类型）', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        };
        const data = [
          ['a', 'b'],
          ['c', 'd'],
        ];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([
          [{ value: 'a' }, { value: 'b' }],
          [{ value: 'c' }, { value: 'd' }],
        ]);
      });

      it('应该处理三层嵌套数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        };
        const data = [
          [
            [1, 2],
            [3, 4],
          ],
          [[5, 6]],
        ];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual([
          [
            [{ value: 1 }, { value: 2 }],
            [{ value: 3 }, { value: 4 }],
          ],
          [[{ value: 5 }, { value: 6 }]],
        ]);
      });
    });

    describe('对象中的数组', () => {
      it('应该处理对象中的基本类型数组字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            hobbies: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        };
        const data = {
          name: 'Alice',
          hobbies: ['reading', 'coding'],
        };
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          name: 'Alice',
          hobbies: [{ value: 'reading' }, { value: 'coding' }],
        });
      });

      it('应该处理对象中的多个数组字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            scores: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        };
        const data = {
          tags: ['tag1', 'tag2'],
          scores: [90, 85, 95],
        };
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          tags: [{ value: 'tag1' }, { value: 'tag2' }],
          scores: [{ value: 90 }, { value: 85 }, { value: 95 }],
        });
      });

      it('应该处理嵌套对象中的数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        };
        const data = {
          user: {
            name: 'Alice',
            tags: ['admin', 'user'],
          },
        };
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          user: {
            name: 'Alice',
            tags: [{ value: 'admin' }, { value: 'user' }],
          },
        });
      });
    });

    describe('边界情况', () => {
      it('应该处理 null 数据', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const result = wrapPrimitiveArrays(null, schema);

        expect(result).toBeNull();
      });

      it('应该处理 undefined 数据', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const result = wrapPrimitiveArrays(undefined, schema);

        expect(result).toBeUndefined();
      });

      it('应该处理 null schema', () => {
        const data = ['a', 'b'];
        const result = wrapPrimitiveArrays(data, null as any);

        expect(result).toEqual(data);
      });

      it('应该处理非数组数据（当 schema 为 array 时）', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data = 'not an array';
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toBe(data);
      });

      it('应该处理没有 items 的数组 schema', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
        };
        const data = ['a', 'b'];
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual(data);
      });

      it('应该处理对象中不存在于 schema 的字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        };
        const data = {
          name: 'Alice',
          extra: 'field',
        };
        const result = wrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          name: 'Alice',
          extra: 'field',
        });
      });
    });
  });

  describe('unwrapPrimitiveArrays', () => {
    describe('基本类型数组', () => {
      it('应该将对象数组解包成字符串数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data = [{ value: 'a' }, { value: 'b' }, { value: 'c' }];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual(['a', 'b', 'c']);
      });

      it('应该将对象数组解包成数字数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'number' },
        };
        const data = [{ value: 1 }, { value: 2 }, { value: 3 }];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual([1, 2, 3]);
      });

      it('应该将对象数组解包成整数数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'integer' },
        };
        const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual([10, 20, 30]);
      });

      it('应该将对象数组解包成布尔数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'boolean' },
        };
        const data = [{ value: true }, { value: false }, { value: true }];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual([true, false, true]);
      });

      it('应该处理空数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data: any[] = [];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual([]);
      });

      it('应该处理包含 null/undefined 的数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data = [{ value: 'a' }, { value: null }, { value: undefined }, { value: 'b' }];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual(['a', null, undefined, 'b']);
      });
    });

    describe('对象数组', () => {
      it('应该保持对象数组不变', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
          },
        };
        const data = [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual(data);
      });

      it('应该递归处理对象数组中的嵌套基本类型数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        };
        const data = [
          {
            name: 'Alice',
            tags: [{ value: 'tag1' }, { value: 'tag2' }],
          },
          {
            name: 'Bob',
            tags: [{ value: 'tag3' }],
          },
        ];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual([
          { name: 'Alice', tags: ['tag1', 'tag2'] },
          { name: 'Bob', tags: ['tag3'] },
        ]);
      });
    });

    describe('嵌套数组', () => {
      it('应该处理数组的数组（基本类型）', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        };
        const data = [
          [{ value: 'a' }, { value: 'b' }],
          [{ value: 'c' }, { value: 'd' }],
        ];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual([
          ['a', 'b'],
          ['c', 'd'],
        ]);
      });

      it('应该处理三层嵌套数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        };
        const data = [
          [
            [{ value: 1 }, { value: 2 }],
            [{ value: 3 }, { value: 4 }],
          ],
          [[{ value: 5 }, { value: 6 }]],
        ];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual([
          [
            [1, 2],
            [3, 4],
          ],
          [[5, 6]],
        ]);
      });
    });

    describe('对象中的数组', () => {
      it('应该处理对象中的基本类型数组字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            hobbies: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        };
        const data = {
          name: 'Alice',
          hobbies: [{ value: 'reading' }, { value: 'coding' }],
        };
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          name: 'Alice',
          hobbies: ['reading', 'coding'],
        });
      });

      it('应该处理对象中的多个数组字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            scores: {
              type: 'array',
              items: { type: 'number' },
            },
          },
        };
        const data = {
          tags: [{ value: 'tag1' }, { value: 'tag2' }],
          scores: [{ value: 90 }, { value: 85 }, { value: 95 }],
        };
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          tags: ['tag1', 'tag2'],
          scores: [90, 85, 95],
        });
      });

      it('应该处理嵌套对象中的数组', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        };
        const data = {
          user: {
            name: 'Alice',
            tags: [{ value: 'admin' }, { value: 'user' }],
          },
        };
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          user: {
            name: 'Alice',
            tags: ['admin', 'user'],
          },
        });
      });
    });

    describe('边界情况', () => {
      it('应该处理 null 数据', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const result = unwrapPrimitiveArrays(null, schema);

        expect(result).toBeNull();
      });

      it('应该处理 undefined 数据', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const result = unwrapPrimitiveArrays(undefined, schema);

        expect(result).toBeUndefined();
      });

      it('应该处理 null schema', () => {
        const data = [{ value: 'a' }, { value: 'b' }];
        const result = unwrapPrimitiveArrays(data, null as any);

        expect(result).toEqual(data);
      });

      it('应该处理非数组数据（当 schema 为 array 时）', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data = 'not an array';
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toBe(data);
      });

      it('应该处理没有 items 的数组 schema', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
        };
        const data = [{ value: 'a' }, { value: 'b' }];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual(data);
      });

      it('应该处理对象中不存在于 schema 的字段', () => {
        const schema: ExtendedJSONSchema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        };
        const data = {
          name: 'Alice',
          extra: 'field',
        };
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual({
          name: 'Alice',
          extra: 'field',
        });
      });

      it('应该处理对象数组中的 null/undefined 项', () => {
        const schema: ExtendedJSONSchema = {
          type: 'array',
          items: { type: 'string' },
        };
        const data = [{ value: 'a' }, null, undefined, { value: 'b' }];
        const result = unwrapPrimitiveArrays(data, schema);

        expect(result).toEqual(['a', undefined, undefined, 'b']);
      });
    });
  });

  describe('往返转换（Round-trip）', () => {
    it('基本类型数组应该能够正确往返转换', () => {
      const schema: ExtendedJSONSchema = {
        type: 'array',
        items: { type: 'string' },
      };
      const original = ['a', 'b', 'c'];

      const wrapped = wrapPrimitiveArrays(original, schema);
      const unwrapped = unwrapPrimitiveArrays(wrapped, schema);

      expect(unwrapped).toEqual(original);
    });

    it('复杂嵌套结构应该能够正确往返转换', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                },
                scores: {
                  type: 'array',
                  items: { type: 'number' },
                },
              },
            },
          },
        },
      };
      const original = {
        users: [
          {
            name: 'Alice',
            tags: ['admin', 'user'],
            scores: [90, 85],
          },
          {
            name: 'Bob',
            tags: ['user'],
            scores: [75, 80, 95],
          },
        ],
      };

      const wrapped = wrapPrimitiveArrays(original, schema);
      const unwrapped = unwrapPrimitiveArrays(wrapped, schema);

      expect(unwrapped).toEqual(original);
    });

    it('嵌套数组应该能够正确往返转换', () => {
      const schema: ExtendedJSONSchema = {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'number' },
        },
      };
      const original = [[1, 2, 3], [4, 5], [6]];

      const wrapped = wrapPrimitiveArrays(original, schema);
      const unwrapped = unwrapPrimitiveArrays(wrapped, schema);

      expect(unwrapped).toEqual(original);
    });
  });
});
