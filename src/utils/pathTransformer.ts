import type { ExtendedJSONSchema } from '@/types/schema';
import { FLATTEN_PATH_SEPARATOR } from './schemaLinkageParser';

/**
 * 判断父级路径是否在 flattenPath 链中
 * @param parentPath - 父级路径
 * @returns 如果父级路径包含 ~~ 分隔符，说明在 flattenPath 链中
 */
function isInFlattenPathChain(parentPath: string): boolean {
  return parentPath.includes(FLATTEN_PATH_SEPARATOR);
}

/**
 * 统一的逻辑路径生成函数
 * 根据父级路径是否在 flattenPath 链中，自动选择正确的分隔符
 *
 * @param parentPath - 父级路径
 * @param fieldName - 当前字段名
 * @param isFlattenPath - 当前字段是否设置了 flattenPath: true
 * @returns 生成的逻辑路径
 *
 * @example
 * buildLogicalPath('', 'group', true) // → 'group'
 * buildLogicalPath('group', 'category', true) // → 'group~~category'
 * buildLogicalPath('group~~category', 'contacts', false) // → 'group~~category~~contacts'
 * buildLogicalPath('user', 'name', false) // → 'user.name'
 */
function buildLogicalPath(
  parentPath: string,
  fieldName: string,
  isFlattenPath: boolean
): string {
  if (!parentPath) {
    return fieldName;
  }

  // 如果父级路径在 flattenPath 链中，或当前字段是 flattenPath，使用 ~~ 分隔符
  if (isInFlattenPathChain(parentPath) || isFlattenPath) {
    return `${parentPath}${FLATTEN_PATH_SEPARATOR}${fieldName}`;
  }

  // 否则使用 . 分隔符
  return `${parentPath}.${fieldName}`;
}

/**
 * 统一的物理路径生成函数
 * 物理路径始终使用 . 分隔符
 *
 * @param parentPath - 父级路径
 * @param fieldName - 当前字段名
 * @returns 生成的物理路径
 *
 * @example
 * buildPhysicalPath('', 'group') // → 'group'
 * buildPhysicalPath('group', 'category') // → 'group.category'
 * buildPhysicalPath('group.category', 'contacts') // → 'group.category.contacts'
 */
function buildPhysicalPath(parentPath: string, fieldName: string): string {
  if (!parentPath) {
    return fieldName;
  }
  return `${parentPath}.${fieldName}`;
}

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

      // 使用统一的路径生成函数
      const newLogicalPath = buildLogicalPath(logicalPath, key, shouldFlatten);
      const newPhysicalPath = buildPhysicalPath(physicalPath, key);

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

      if (typedSchema.type === 'object' && typedSchema.properties) {
        if (shouldFlatten) {
          // flattenPath 对象：递归扁平化
          const newPrefix = buildLogicalPath(prefix, key, true);
          this.flattenItemWithSchema(value, typedSchema, newPrefix, result);
        } else {
          // 普通嵌套对象：直接保存整个对象，不进行扁平化
          const outputKey = buildLogicalPath(prefix, key, false);
          result[outputKey] = value;
        }
      } else if (typedSchema.type === 'array' && Array.isArray(value)) {
        // 嵌套数组：使用统一的路径生成函数
        const outputKey = buildLogicalPath(prefix, key, false);
        result[outputKey] = this.transformArrayItems(value, typedSchema);
      } else {
        // 基本类型：使用统一的路径生成函数
        const outputKey = buildLogicalPath(prefix, key, false);
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
        // flattenPath: 创建中间层级，使用统一的路径生成函数
        const newLogicalPrefix = buildLogicalPath(logicalPrefix, key, true);
        result[key] = {};
        this.reverseTransformWithSchema(flatData, typedSchema, newLogicalPrefix, result[key]);
      } else {
        // 使用统一的路径生成函数计算逻辑路径
        const logicalPath = buildLogicalPath(logicalPrefix, key, false);

        if (typedSchema.type === 'object' && typedSchema.properties) {
          // 普通对象：检查数据是否已经是嵌套对象
          const value = flatData[logicalPath];

          if (value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
            // 数据已经是嵌套对象（如使用 nested-form widget 的字段）
            // 但对象内部可能还有扁平化的字段，需要递归处理
            result[key] = {};
            this.reverseTransformWithSchema(value, typedSchema, '', result[key]);
          } else {
            // 数据是扁平化的，需要递归处理
            result[key] = {};
            this.reverseTransformWithSchema(flatData, typedSchema, logicalPath, result[key]);
          }
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
        // flattenPath: 创建中间层级，使用统一的路径生成函数
        const newLogicalPrefix = buildLogicalPath(logicalPrefix, key, true);
        result[key] = {};
        this.reverseTransformItemWithSchema(flatItem, typedSchema, newLogicalPrefix, result[key]);
      } else {
        // 使用统一的路径生成函数计算逻辑路径
        const logicalPath = buildLogicalPath(logicalPrefix, key, false);

        if (typedSchema.type === 'object' && typedSchema.properties) {
          // 普通嵌套对象：直接从 flatItem 获取整个对象
          const value = flatItem[logicalPath];
          if (value !== undefined) {
            result[key] = value;
          }
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
