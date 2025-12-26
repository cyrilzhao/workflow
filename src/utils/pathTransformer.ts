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
}
