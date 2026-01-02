import { SchemaValidator } from '../core/SchemaValidator';
import type { ExtendedJSONSchema } from '../types/schema';

/**
 * 创建 Schema 验证 Resolver
 * 用于与 react-hook-form 集成
 */
export const createSchemaResolver = (schema: ExtendedJSONSchema) => {
  const validator = new SchemaValidator(schema);

  return async (formData: Record<string, any>) => {
    // 执行 Schema 级别验证
    const schemaErrors = validator.validate(formData);

    // 转换为 react-hook-form 的错误格式
    if (Object.keys(schemaErrors).length > 0) {
      return {
        values: {},
        errors: Object.entries(schemaErrors).reduce((acc, [field, message]) => {
          acc[field] = {
            type: 'schema',
            message,
          };
          return acc;
        }, {} as any),
      };
    }

    // 验证通过
    return {
      values: formData,
      errors: {},
    };
  };
};
