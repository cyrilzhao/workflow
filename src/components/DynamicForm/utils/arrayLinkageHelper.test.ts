import {
  findArrayInPath,
  isArrayElementPath,
  extractArrayInfo,
  parseJsonPointer,
  resolveDependencyPath,
  resolveArrayElementLinkage,
} from './arrayLinkageHelper';
import type { ExtendedJSONSchema } from '../types/schema';
import type { LinkageConfig } from '../types/linkage';

describe('arrayLinkageHelper', () => {
  describe('isArrayElementPath', () => {
    it('应该识别包含数字索引的路径', () => {
      expect(isArrayElementPath('contacts.0.name')).toBe(true);
      expect(isArrayElementPath('departments.0.employees.1.name')).toBe(true);
    });

    it('应该识别包含 ~~ 分隔符和数字索引的路径', () => {
      expect(isArrayElementPath('group~~category~~contacts.0.name')).toBe(true);
      expect(isArrayElementPath('group~~category.0.field')).toBe(true);
    });

    it('应该识别不包含数字索引的路径', () => {
      expect(isArrayElementPath('contacts.name')).toBe(false);
      expect(isArrayElementPath('group~~category~~contacts.name')).toBe(false);
      expect(isArrayElementPath('simpleField')).toBe(false);
    });
  });

  describe('parseJsonPointer', () => {
    it('应该解析简单的 JSON Pointer', () => {
      const result = parseJsonPointer('#/properties/name');
      expect(result).toBe('name');
    });

    it('应该解析嵌套对象的 JSON Pointer', () => {
      const result = parseJsonPointer('#/properties/user/properties/email');
      expect(result).toBe('user.email');
    });

    it('应该解析数组元素的 JSON Pointer', () => {
      const result = parseJsonPointer('#/properties/contacts/items/properties/type');
      expect(result).toBe('contacts.type');
    });

    it('应该解析嵌套数组的 JSON Pointer', () => {
      const result = parseJsonPointer(
        '#/properties/departments/items/properties/employees/items/properties/name'
      );
      expect(result).toBe('departments.employees.name');
    });

    it('应该对无效的 JSON Pointer 抛出错误', () => {
      expect(() => parseJsonPointer('invalid/pointer')).toThrow('无效的 JSON Pointer');
      expect(() => parseJsonPointer('/properties/name')).toThrow('无效的 JSON Pointer');
    });
  });

  describe('resolveDependencyPath', () => {
    const schema: ExtendedJSONSchema = {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              companyName: { type: 'string' },
            },
          },
        },
        departments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              employees: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    techStack: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    };

    it('应该解析相对路径（同级字段）', () => {
      const result = resolveDependencyPath({
        depPath: './type',
        currentPath: 'contacts.0.companyName',
      });

      expect(result).toBe('contacts.0.type');
    });

    it('应该解析 JSON Pointer（子数组到父数组）', () => {
      const result = resolveDependencyPath({
        depPath: '#/properties/departments/items/properties/type',
        currentPath: 'departments.0.employees.1.techStack',
        schema,
      });

      expect(result).toBe('departments.0.type');
    });

    it('应该直接返回运行时绝对路径', () => {
      const result = resolveDependencyPath({
        depPath: 'contacts.0.type',
        currentPath: 'contacts.0.companyName',
      });

      expect(result).toBe('contacts.0.type');
    });

    it('应该解析 JSON Pointer（父数组到子数组）', () => {
      const result = resolveDependencyPath({
        depPath: '#/properties/departments/items/properties/employees',
        currentPath: 'departments.0.totalSalary',
        schema,
      });

      expect(result).toBe('departments.0.employees');
    });

    it('应该解析 JSON Pointer（顶层字段，不需要索引匹配）', () => {
      const result = resolveDependencyPath({
        depPath: '#/properties/globalSetting',
        currentPath: 'departments.0.name',
        schema,
      });

      expect(result).toBe('globalSetting');
    });

    it('应该解析 JSON Pointer（same-level 关系）', () => {
      const result = resolveDependencyPath({
        depPath: '#/properties/departments/items/properties/type',
        currentPath: 'departments.0.name',
        schema,
      });

      // same-level 关系会插入当前元素的索引
      expect(result).toBe('departments.0.type');
    });

    it('应该处理子数组到父数组的依赖（无索引的情况）', () => {
      const result = resolveDependencyPath({
        depPath: '#/properties/departments/items/properties/type',
        currentPath: 'departments.name',
        schema,
      });

      // 当前路径没有索引时，返回逻辑路径
      expect(result).toBe('departments.type');
    });

    it('应该解析 JSON Pointer（父数组到子数组，无索引的情况）', () => {
      const result = resolveDependencyPath({
        depPath: '#/properties/departments/items/properties/employees',
        currentPath: 'departments.name',
        schema,
      });

      // 当前路径没有索引时，返回逻辑路径
      expect(result).toBe('departments.employees');
    });

    it('应该解析 JSON Pointer（父数组到子数组，有索引的情况）', () => {
      const schemaWithNested: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          departments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                totalSalary: { type: 'number' },
                employees: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      salary: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = resolveDependencyPath({
        depPath: '#/properties/departments/items/properties/employees',
        currentPath: 'departments.0.totalSalary',
        schema: schemaWithNested,
      });

      expect(result).toBe('departments.0.employees');
    });
  });

  describe('resolveArrayElementLinkage', () => {
    const schema: ExtendedJSONSchema = {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              companyName: { type: 'string' },
            },
          },
        },
      },
    };

    it('应该解析 dependencies 中的相对路径', () => {
      const linkage: LinkageConfig = {
        type: 'visibility',
        dependencies: ['./type'],
        when: {
          field: './type',
          operator: '==',
          value: 'company',
        },
        fulfill: { state: { visible: true } },
      };

      const result = resolveArrayElementLinkage(linkage, 'contacts.0.companyName', schema);

      expect(result.dependencies).toEqual(['contacts.0.type']);
      expect(result.when).toEqual({
        field: 'contacts.0.type',
        operator: '==',
        value: 'company',
      });
    });

    it('应该解析 when 条件中的 and/or 嵌套路径', () => {
      const linkage: LinkageConfig = {
        type: 'visibility',
        dependencies: [],
        when: {
          and: [
            { field: './type', operator: '==', value: 'company' },
            { field: './companyName', operator: 'isNotEmpty' },
          ],
        },
        fulfill: { state: { visible: true } },
      };

      const result = resolveArrayElementLinkage(linkage, 'contacts.0.companyName', schema);

      expect(result.when).toEqual({
        and: [
          { field: 'contacts.0.type', operator: '==', value: 'company' },
          { field: 'contacts.0.companyName', operator: 'isNotEmpty' },
        ],
      });
    });

    it('应该解析 when 条件中的 or 嵌套路径', () => {
      const linkage: LinkageConfig = {
        type: 'visibility',
        dependencies: [],
        when: {
          or: [
            { field: './type', operator: '==', value: 'company' },
            { field: './type', operator: '==', value: 'personal' },
          ],
        },
        fulfill: { state: { visible: true } },
      };

      const result = resolveArrayElementLinkage(linkage, 'contacts.0.companyName', schema);

      expect(result.when).toEqual({
        or: [
          { field: 'contacts.0.type', operator: '==', value: 'company' },
          { field: 'contacts.0.type', operator: '==', value: 'personal' },
        ],
      });
    });

    it('应该在没有 schema 时解析相对路径', () => {
      const linkage: LinkageConfig = {
        type: 'visibility',
        dependencies: ['./type'],
        when: {
          field: './type',
          operator: '==',
          value: 'company',
        },
        fulfill: { state: { visible: true } },
      };

      const result = resolveArrayElementLinkage(linkage, 'contacts.0.companyName');

      expect(result.dependencies).toEqual(['contacts.0.type']);
      expect(result.when).toEqual({
        field: 'contacts.0.type',
        operator: '==',
        value: 'company',
      });
    });
  });

  describe('extractArrayInfo', () => {
    it('应该从简单数组路径中提取信息', () => {
      const result = extractArrayInfo('contacts.0.name');

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('contacts');
      expect(result?.index).toBe(0);
      expect(result?.fieldPath).toBe('name');
    });

    it('应该从包含 ~~ 分隔符的路径中提取信息', () => {
      const result = extractArrayInfo('group~~category~~contacts.0.name');

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('group~~category~~contacts');
      expect(result?.index).toBe(0);
      expect(result?.fieldPath).toBe('name');
    });

    it('应该正确处理混合 ~~ 和 . 分隔符的路径', () => {
      const result = extractArrayInfo('group~~category.contacts~~items.0.name');

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('group~~category.contacts~~items');
      expect(result?.index).toBe(0);
      expect(result?.fieldPath).toBe('name');
    });

    it('应该正确处理索引前是 ~~ 分隔符的路径', () => {
      const result = extractArrayInfo('group~~category~~0.name');

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('group~~category');
      expect(result?.index).toBe(0);
      expect(result?.fieldPath).toBe('name');
    });

    it('应该从嵌套数组路径中提取第一个数组信息', () => {
      const result = extractArrayInfo('departments.0.employees.1.techStack');

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('departments');
      expect(result?.index).toBe(0);
      expect(result?.fieldPath).toBe('employees.1.techStack');
    });

    it('应该对不包含索引的路径返回 null', () => {
      const result = extractArrayInfo('contacts.name');

      expect(result).toBeNull();
    });
  });

  describe('findArrayInPath', () => {
    it('应该正确识别数组字段路径', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                companyName: { type: 'string' },
              },
            },
          },
        },
      };

      const result = findArrayInPath('contacts.companyName', schema);

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('contacts');
      expect(result?.fieldPathInArray).toBe('companyName');
    });

    it('应该识别嵌套数组路径', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          departments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                employees: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = findArrayInPath('departments.employees.name', schema);

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('departments');
      expect(result?.fieldPathInArray).toBe('employees.name');
    });

    it('应该对非数组路径返回 null', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const result = findArrayInPath('name', schema);

      expect(result).toBeNull();
    });

    it('应该识别包含 flattenPath 的数组路径（使用 ~~ 分隔符）', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          group: {
            type: 'object',
            ui: { flattenPath: true },
            properties: {
              category: {
                type: 'object',
                ui: { flattenPath: true },
                properties: {
                  contacts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = findArrayInPath('group~~category~~contacts.name', schema);

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('group~~category~~contacts');
      expect(result?.fieldPathInArray).toBe('name');
    });

    it('应该对没有 properties 的 schema 返回 null', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
      };

      const result = findArrayInPath('contacts.name', schema);

      expect(result).toBeNull();
    });

    it('应该识别嵌套对象中的数组路径（非 flattenPath）', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          company: {
            type: 'object',
            properties: {
              departments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      };

      const result = findArrayInPath('company.departments.name', schema);

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('company.departments');
      expect(result?.fieldPathInArray).toBe('name');
    });

    it('应该识别数组元素内部使用 ~~ 分隔符的路径', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                address: {
                  type: 'object',
                  ui: { flattenPath: true },
                  properties: {
                    city: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      };

      const result = findArrayInPath('contacts~~address~~city', schema);

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('contacts');
      expect(result?.fieldPathInArray).toBe('address~~city');
    });

    it('应该递归处理数组元素内部的嵌套数组', () => {
      const schema: ExtendedJSONSchema = {
        type: 'object',
        properties: {
          departments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                employees: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      skills: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = findArrayInPath('departments.employees.skills.name', schema);

      expect(result).not.toBeNull();
      expect(result?.arrayPath).toBe('departments');
      expect(result?.fieldPathInArray).toBe('employees.skills.name');
    });

  });
});
