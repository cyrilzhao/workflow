import type { ExtendedJSONSchema, LinkageConfig } from '@/types/schema';

/**
 * 解析结果
 */
export interface ParsedLinkages {
  linkages: Record<string, LinkageConfig>;
}

/**
 * 解析 Schema 中的联动配置
 *
 * 注意：所有类型的联动（包括 value、visibility、disabled、readonly、options 等）都统一在 linkages 中返回，
 * 由 useLinkageManager 统一处理。
 */
export function parseSchemaLinkages(schema: ExtendedJSONSchema): ParsedLinkages {
  const linkages: Record<string, LinkageConfig> = {};

  if (!schema.properties) {
    return { linkages };
  }

  // 遍历所有字段
  Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
    if (typeof fieldSchema === 'boolean') return;

    const typedSchema = fieldSchema as ExtendedJSONSchema;
    const linkageConfig = typedSchema.ui?.linkage;

    if (linkageConfig) {
      linkages[fieldName] = linkageConfig;
    }
  });

  return { linkages };
}
