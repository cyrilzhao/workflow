import type { ExtendedJSONSchema, LinkageConfig } from '@/types/schema';

/**
 * 解析结果
 */
export interface ParsedLinkages {
  linkages: Record<string, LinkageConfig>;
  computedFields: Record<string, LinkageConfig>;
}

/**
 * 解析 Schema 中的联动配置
 */
export function parseSchemaLinkages(schema: ExtendedJSONSchema): ParsedLinkages {
  const linkages: Record<string, LinkageConfig> = {};
  const computedFields: Record<string, LinkageConfig> = {};

  if (!schema.properties) {
    return { linkages, computedFields };
  }

  // 遍历所有字段
  Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
    if (typeof fieldSchema === 'boolean') return;

    const typedSchema = fieldSchema as ExtendedJSONSchema;
    const linkageConfig = typedSchema.ui?.linkage;

    if (linkageConfig) {
      // 区分计算字段和其他联动类型
      if (linkageConfig.type === 'computed') {
        computedFields[fieldName] = linkageConfig;
      } else {
        linkages[fieldName] = linkageConfig;
      }
    }
  });

  return { linkages, computedFields };
}
