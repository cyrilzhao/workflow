import type { ExtendedJSONSchema } from '@/types/schema';

/**
 * 路径转换工具类
 * 用于在扁平化路径和嵌套对象之间进行转换
 */
export class PathTransformer {
  /**
   * 将扁平化的表单数据转换为嵌套结构
   * @example
   * flatToNested({ 'auth.content.key': 'value' })
   * // => { auth: { content: { key: 'value' } } }
   */
  static flatToNested(flatData: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    Object.entries(flatData).forEach(([path, value]) => {
      this.setNestedValue(result, path, value);
    });

    return result;
  }

  /**
   * 将嵌套结构的数据转换为扁平化格式
   * @example
   * nestedToFlat({ auth: { content: { key: 'value' } } })
   * // => { 'auth.content.key': 'value' }
   */
  static nestedToFlat(
    nestedData: Record<string, any>,
    prefix: string = ''
  ): Record<string, any> {
    const result: Record<string, any> = {};

    Object.entries(nestedData).forEach(([key, value]) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // 递归处理嵌套对象
        Object.assign(result, this.nestedToFlat(value, fullPath));
      } else {
        result[fullPath] = value;
      }
    });

    return result;
  }

  /**
   * 根据路径设置嵌套对象的值
   */
  private static setNestedValue(
    obj: Record<string, any>,
    path: string,
    value: any
  ): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 根据路径获取嵌套对象的值
   */
  static getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 基于 Schema 的路径映射转换
   * 将嵌套数据转换为表单期望的格式（考虑 flattenPath）
   *
   * @param nestedData - 原始嵌套数据
   * @param schema - Schema 定义
   * @returns 转换后的数据（逻辑路径作为 key）
   */
  static nestedToFlatWithSchema(
    nestedData: Record<string, any>,
    schema: ExtendedJSONSchema
  ): Record<string, any> {
    const result: Record<string, any> = {};
    this.transformWithSchema(nestedData, schema, '', '', result);
    return result;
  }

  /**
   * 递归转换数据，根据 Schema 的 flattenPath 配置决定输出路径
   */
  private static transformWithSchema(
    data: any,
    schema: ExtendedJSONSchema,
    logicalPath: string,
    physicalPath: string,
    result: Record<string, any>
  ): void {
    if (!schema.properties || data === null || data === undefined) {
      return;
    }

    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      if (typeof propSchema === 'boolean') return;

      const typedSchema = propSchema as ExtendedJSONSchema;
      const value = data[key];

      if (value === undefined) return;

      const shouldFlatten = typedSchema.type === 'object' && typedSchema.ui?.flattenPath;

      // 计算逻辑路径和物理路径
      const newLogicalPath = shouldFlatten
        ? logicalPath // flattenPath: 逻辑路径不变
        : logicalPath ? `${logicalPath}.${key}` : key;

      const newPhysicalPath = physicalPath ? `${physicalPath}.${key}` : key;

      if (typedSchema.type === 'object' && typedSchema.properties) {
        // 递归处理嵌套对象
        this.transformWithSchema(value, typedSchema, newLogicalPath, newPhysicalPath, result);
      } else if (typedSchema.type === 'array') {
        // 数组字段：使用逻辑路径作为 key，递归处理数组元素
        const outputKey = newLogicalPath || key;
        if (Array.isArray(value)) {
          result[outputKey] = this.transformArrayItems(value, typedSchema);
        } else {
          result[outputKey] = value;
        }
      } else {
        // 基本类型字段：使用逻辑路径作为 key
        const outputKey = newLogicalPath || key;
        result[outputKey] = value;
      }
    });
  }

  /**
   * 递归转换数组元素（处理数组元素内部的 flattenPath）
   */
  private static transformArrayItems(
    items: any[],
    arraySchema: ExtendedJSONSchema
  ): any[] {
    const itemSchema = arraySchema.items as ExtendedJSONSchema;

    if (!itemSchema || itemSchema.type !== 'object' || !itemSchema.properties) {
      return items;
    }

    return items.map(item => {
      if (item === null || item === undefined || typeof item !== 'object') {
        return item;
      }
      // 递归转换数组元素内部的数据
      return this.transformArrayItem(item, itemSchema);
    });
  }

  /**
   * 转换单个数组元素（处理元素内部的 flattenPath）
   */
  private static transformArrayItem(
    item: Record<string, any>,
    itemSchema: ExtendedJSONSchema
  ): Record<string, any> {
    const result: Record<string, any> = {};
    this.flattenItemWithSchema(item, itemSchema, '', result);
    return result;
  }

  /**
   * 递归扁平化数组元素内部的数据
   */
  private static flattenItemWithSchema(
    data: any,
    schema: ExtendedJSONSchema,
    prefix: string,
    result: Record<string, any>
  ): void {
    if (!schema.properties || data === null || data === undefined) {
      return;
    }

    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      if (typeof propSchema === 'boolean') return;

      const typedSchema = propSchema as ExtendedJSONSchema;
      const value = data[key];

      if (value === undefined) return;

      const shouldFlatten = typedSchema.type === 'object' && typedSchema.ui?.flattenPath;

      if (shouldFlatten && typedSchema.properties) {
        // flattenPath: 跳过当前层级，递归处理子属性
        this.flattenItemWithSchema(value, typedSchema, prefix, result);
      } else if (typedSchema.type === 'object' && typedSchema.properties) {
        // 普通对象：递归处理
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        this.flattenItemWithSchema(value, typedSchema, newPrefix, result);
      } else if (typedSchema.type === 'array' && Array.isArray(value)) {
        // 嵌套数组：递归处理
        const outputKey = prefix ? `${prefix}.${key}` : key;
        result[outputKey] = this.transformArrayItems(value, typedSchema);
      } else {
        // 基本类型
        const outputKey = prefix ? `${prefix}.${key}` : key;
        result[outputKey] = value;
      }
    });
  }

  /**
   * 基于 Schema 的反向路径映射转换
   * 将表单数据（逻辑路径）转换回原始嵌套结构（物理路径）
   *
   * @param flatData - 表单数据（逻辑路径作为 key）
   * @param schema - Schema 定义
   * @returns 转换后的数据（物理路径嵌套结构）
   */
  static flatToNestedWithSchema(
    flatData: Record<string, any>,
    schema: ExtendedJSONSchema
  ): Record<string, any> {
    const result: Record<string, any> = {};
    this.reverseTransformWithSchema(flatData, schema, '', result);
    return result;
  }

  /**
   * 递归反向转换数据，根据 Schema 的 flattenPath 配置恢复物理路径结构
   */
  private static reverseTransformWithSchema(
    flatData: Record<string, any>,
    schema: ExtendedJSONSchema,
    logicalPrefix: string,
    result: Record<string, any>
  ): void {
    if (!schema.properties) {
      return;
    }

    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      if (typeof propSchema === 'boolean') return;

      const typedSchema = propSchema as ExtendedJSONSchema;
      const shouldFlatten = typedSchema.type === 'object' && typedSchema.ui?.flattenPath;

      if (shouldFlatten && typedSchema.properties) {
        // flattenPath: 创建中间层级，递归处理
        result[key] = {};
        this.reverseTransformWithSchema(flatData, typedSchema, logicalPrefix, result[key]);
      } else {
        // 计算逻辑路径
        const logicalPath = logicalPrefix ? `${logicalPrefix}.${key}` : key;

        if (typedSchema.type === 'object' && typedSchema.properties) {
          // 普通对象：递归处理
          result[key] = {};
          this.reverseTransformWithSchema(flatData, typedSchema, logicalPath, result[key]);
        } else if (typedSchema.type === 'array') {
          // 数组字段：从 flatData 获取并反向转换数组元素
          const value = flatData[logicalPath];
          if (value !== undefined) {
            result[key] = this.reverseTransformArrayItems(value, typedSchema);
          }
        } else {
          // 基本类型：从 flatData 获取
          const value = flatData[logicalPath];
          if (value !== undefined) {
            result[key] = value;
          }
        }
      }
    });
  }

  /**
   * 反向转换数组元素（恢复数组元素内部的物理路径结构）
   */
  private static reverseTransformArrayItems(
    items: any[],
    arraySchema: ExtendedJSONSchema
  ): any[] {
    if (!Array.isArray(items)) {
      return items;
    }

    const itemSchema = arraySchema.items as ExtendedJSONSchema;

    if (!itemSchema || itemSchema.type !== 'object' || !itemSchema.properties) {
      return items;
    }

    return items.map(item => {
      if (item === null || item === undefined || typeof item !== 'object') {
        return item;
      }
      return this.reverseTransformArrayItem(item, itemSchema);
    });
  }

  /**
   * 反向转换单个数组元素
   */
  private static reverseTransformArrayItem(
    item: Record<string, any>,
    itemSchema: ExtendedJSONSchema
  ): Record<string, any> {
    const result: Record<string, any> = {};
    this.reverseTransformItemWithSchema(item, itemSchema, '', result);
    return result;
  }

  /**
   * 递归反向转换数组元素内部的数据
   */
  private static reverseTransformItemWithSchema(
    flatItem: Record<string, any>,
    schema: ExtendedJSONSchema,
    logicalPrefix: string,
    result: Record<string, any>
  ): void {
    if (!schema.properties) {
      return;
    }

    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      if (typeof propSchema === 'boolean') return;

      const typedSchema = propSchema as ExtendedJSONSchema;
      const shouldFlatten = typedSchema.type === 'object' && typedSchema.ui?.flattenPath;

      if (shouldFlatten && typedSchema.properties) {
        // flattenPath: 创建中间层级
        result[key] = {};
        this.reverseTransformItemWithSchema(flatItem, typedSchema, logicalPrefix, result[key]);
      } else {
        const logicalPath = logicalPrefix ? `${logicalPrefix}.${key}` : key;

        if (typedSchema.type === 'object' && typedSchema.properties) {
          result[key] = {};
          this.reverseTransformItemWithSchema(flatItem, typedSchema, logicalPath, result[key]);
        } else if (typedSchema.type === 'array') {
          const value = flatItem[logicalPath];
          if (value !== undefined) {
            result[key] = this.reverseTransformArrayItems(value, typedSchema);
          }
        } else {
          const value = flatItem[logicalPath];
          if (value !== undefined) {
            result[key] = value;
          }
        }
      }
    });
  }
}
