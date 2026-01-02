import type { ExtendedJSONSchema } from '../types/schema';

/**
 * 判断是否为基本类型
 */
function isPrimitiveType(schema: ExtendedJSONSchema): boolean {
  const type = schema.type;
  return type === 'string' || type === 'number' || type === 'integer' || type === 'boolean';
}

/**
 * 将基本类型数组包装成对象数组
 * 例如：['a', 'b'] => [{ value: 'a' }, { value: 'b' }]
 */
function wrapPrimitiveArray(array: any[]): any[] {
  if (!array || !Array.isArray(array)) return [];
  return array.map(item => ({ value: item }));
}

/**
 * 将对象数组解包回基本类型数组
 * 例如：[{ value: 'a' }, { value: 'b' }] => ['a', 'b']
 */
function unwrapPrimitiveArray(array: any[]): any[] {
  if (!array || !Array.isArray(array)) return [];
  return array.map(item => item?.value);
}

/**
 * 递归转换数据：将基本类型数组包装成对象数组（用于初始化）
 */
export function wrapPrimitiveArrays(data: any, schema: ExtendedJSONSchema): any {
  if (!data || !schema) return data;

  // 处理对象
  if (schema.type === 'object' && schema.properties) {
    const result: any = {};
    Object.keys(data).forEach(key => {
      const fieldSchema = schema.properties![key] as ExtendedJSONSchema;
      if (fieldSchema) {
        result[key] = wrapPrimitiveArrays(data[key], fieldSchema);
      } else {
        result[key] = data[key];
      }
    });
    return result;
  }

  // 处理数组
  if (schema.type === 'array' && schema.items) {
    const itemsSchema = schema.items as ExtendedJSONSchema;

    // 确保 data 是数组
    if (!Array.isArray(data)) {
      return data;
    }

    const arrayData = data as any[];

    // 如果是基本类型数组，包装成对象数组
    if (isPrimitiveType(itemsSchema)) {
      return wrapPrimitiveArray(arrayData);
    }

    // 如果是对象数组，递归处理每个元素
    if (itemsSchema.type === 'object') {
      return arrayData.map(item => wrapPrimitiveArrays(item, itemsSchema));
    }

    // 如果是嵌套数组（数组的数组），递归处理
    if (itemsSchema.type === 'array') {
      return arrayData.map(item => wrapPrimitiveArrays(item, itemsSchema));
    }

    return arrayData;
  }

  return data;
}

/**
 * 递归转换数据：将对象数组解包回基本类型数组（用于提交）
 */
export function unwrapPrimitiveArrays(data: any, schema: ExtendedJSONSchema): any {
  if (!data || !schema) return data;

  // 处理对象
  if (schema.type === 'object' && schema.properties) {
    const result: any = {};
    Object.keys(data).forEach(key => {
      const fieldSchema = schema.properties![key] as ExtendedJSONSchema;
      if (fieldSchema) {
        result[key] = unwrapPrimitiveArrays(data[key], fieldSchema);
      } else {
        result[key] = data[key];
      }
    });
    return result;
  }

  // 处理数组
  if (schema.type === 'array' && schema.items) {
    const itemsSchema = schema.items as ExtendedJSONSchema;

    // 确保 data 是数组
    if (!Array.isArray(data)) {
      return data;
    }

    const arrayData = data as any[];

    // 如果是基本类型数组，解包回基本类型
    if (isPrimitiveType(itemsSchema)) {
      return unwrapPrimitiveArray(arrayData);
    }

    // 如果是对象数组，递归处理每个元素
    if (itemsSchema.type === 'object') {
      return arrayData.map(item => unwrapPrimitiveArrays(item, itemsSchema));
    }

    // 如果是嵌套数组（数组的数组），递归处理
    if (itemsSchema.type === 'array') {
      return arrayData.map(item => unwrapPrimitiveArrays(item, itemsSchema));
    }

    return arrayData;
  }

  return data;
}
