import type { ExtendedJSONSchema, LinkageConfig } from '@/types/schema';

/**
 * 路径透明化分隔符
 * 用于在逻辑路径中保留被透明化的路径段，避免不同物理路径产生相同逻辑路径的冲突
 *
 * 例如：
 * - 物理路径: group.category.contacts (group 和 category 都设置了 flattenPath)
 * - 逻辑路径: group~~category~~contacts
 */
export const FLATTEN_PATH_SEPARATOR = '~~';

/**
 * 路径映射信息
 * 用于处理 flattenPath 导致的逻辑路径和物理路径不一致问题
 */
export interface PathMapping {
  /** 逻辑路径（Schema 中定义的路径，跳过 flattenPath 的层级） */
  logicalPath: string;
  /** 物理路径（表单数据中的实际路径，包含所有层级） */
  physicalPath: string;
  /** 是否是数组字段 */
  isArray?: boolean;
  /** 被跳过的路径段（flattenPath 的字段名） */
  skippedSegments?: string[];
}

/**
 * 解析结果
 */
export interface ParsedLinkages {
  /** 联动配置（使用逻辑路径作为 key） */
  linkages: Record<string, LinkageConfig>;
  /** 路径映射表（逻辑路径 -> 物理路径） */
  pathMappings: PathMapping[];
  /** 是否使用了路径透明化 */
  hasFlattenPath: boolean;
}

/**
 * 解析 Schema 中的联动配置
 *
 * 注意：所有类型的联动（包括 value、visibility、disabled、readonly、options 等）都统一在 linkages 中返回，
 * 由 useLinkageManager 统一处理。
 */
export function parseSchemaLinkages(schema: ExtendedJSONSchema): ParsedLinkages {
  const linkages: Record<string, LinkageConfig> = {};
  const pathMappings: PathMapping[] = [];
  let hasFlattenPath = false;

  // 递归解析 schema，收集所有联动配置和路径映射
  parseSchemaRecursive(schema, '', '', linkages, pathMappings, [], used => {
    hasFlattenPath = hasFlattenPath || used;
  });

  console.log(
    '[parseSchemaLinkages] 解析完成:',
    JSON.stringify({
      linkagesCount: Object.keys(linkages).length,
      pathMappingsCount: pathMappings.length,
      hasFlattenPath,
    })
  );

  return { linkages, pathMappings, hasFlattenPath };
}

/**
 * 递归解析 schema，收集联动配置和路径映射
 * @param schema - 当前 schema
 * @param logicalParentPath - 逻辑父路径（跳过 flattenPath 的层级）
 * @param physicalParentPath - 物理父路径（包含所有层级）
 * @param linkages - 收集的联动配置
 * @param pathMappings - 收集的路径映射
 * @param skippedSegments - 当前累积的被跳过的路径段
 * @param onFlattenPathUsed - 当检测到使用 flattenPath 时的回调
 */
function parseSchemaRecursive(
  schema: ExtendedJSONSchema,
  logicalParentPath: string,
  physicalParentPath: string,
  linkages: Record<string, LinkageConfig>,
  pathMappings: PathMapping[],
  skippedSegments: string[],
  onFlattenPathUsed: (used: boolean) => void
): void {
  if (!schema.properties) {
    return;
  }

  console.log(
    '[parseSchemaRecursive] 开始解析:',
    JSON.stringify({
      logicalParentPath,
      physicalParentPath,
      properties: Object.keys(schema.properties),
      skippedSegments,
    })
  );

  // 遍历所有字段
  Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
    if (typeof fieldSchema === 'boolean') return;

    const typedSchema = fieldSchema as ExtendedJSONSchema;

    // 检查是否使用了路径透明化
    const shouldSkipInPath = typedSchema.type === 'object' && typedSchema.ui?.flattenPath;

    if (shouldSkipInPath) {
      onFlattenPathUsed(true);
    }

    // 构建逻辑路径和物理路径
    let logicalPath: string;
    let physicalPath: string;
    let currentSkippedSegments: string[];

    if (shouldSkipInPath) {
      // 透明化层级：使用 ~~ 分隔符将字段名连接到逻辑路径，避免冲突
      logicalPath = logicalParentPath
        ? `${logicalParentPath}${FLATTEN_PATH_SEPARATOR}${fieldName}`
        : fieldName;
      physicalPath = physicalParentPath ? `${physicalParentPath}.${fieldName}` : fieldName;
      currentSkippedSegments = [...skippedSegments, fieldName];
    } else {
      // 正常添加：逻辑路径和物理路径都添加字段名
      logicalPath = logicalParentPath ? `${logicalParentPath}.${fieldName}` : fieldName;
      physicalPath = physicalParentPath ? `${physicalParentPath}.${fieldName}` : fieldName;
      currentSkippedSegments = [];
    }

    console.log(
      '[parseSchemaRecursive] 处理字段:',
      JSON.stringify({
        fieldName,
        type: typedSchema.type,
        shouldSkipInPath,
        logicalPath,
        physicalPath,
        hasLinkage: !!typedSchema.ui?.linkage,
      })
    );

    // 添加路径映射（如果逻辑路径和物理路径不同）
    if (logicalPath !== physicalPath) {
      pathMappings.push({
        logicalPath,
        physicalPath,
        isArray: typedSchema.type === 'array',
        skippedSegments: currentSkippedSegments.length > 0 ? currentSkippedSegments : undefined,
      });
    }

    // 收集当前字段的联动配置（使用逻辑路径）
    if (typedSchema.ui?.linkage) {
      console.log(
        '[parseSchemaRecursive] 找到联动配置:',
        JSON.stringify({
          logicalPath,
          physicalPath,
          linkage: typedSchema.ui.linkage,
        })
      );
      linkages[logicalPath] = typedSchema.ui.linkage;
    }

    // 递归处理嵌套对象
    if (typedSchema.type === 'object' && typedSchema.properties) {
      parseSchemaRecursive(
        typedSchema,
        logicalPath,
        physicalPath,
        linkages,
        pathMappings,
        currentSkippedSegments,
        onFlattenPathUsed
      );
    }

    // 递归处理数组元素
    if (typedSchema.type === 'array' && typedSchema.items) {
      const itemsSchema = typedSchema.items as ExtendedJSONSchema;
      if (itemsSchema.type === 'object' && itemsSchema.properties) {
        console.log(
          '[parseSchemaRecursive] 处理数组元素:',
          JSON.stringify({
            fieldName,
            logicalPath,
            physicalPath,
          })
        );
        parseSchemaRecursive(
          itemsSchema,
          logicalPath,
          physicalPath,
          linkages,
          pathMappings,
          currentSkippedSegments,
          onFlattenPathUsed
        );
      }
    }
  });
}

/**
 * 根据路径映射表转换物理路径为逻辑路径
 * @param physicalPath - 物理路径（表单数据中的实际路径）
 * @param pathMappings - 路径映射表
 * @returns 逻辑路径（Schema 中定义的路径）
 */
export function physicalToLogicalPath(physicalPath: string, pathMappings: PathMapping[]): string {
  // 如果没有路径映射，直接返回
  if (pathMappings.length === 0) {
    return physicalPath;
  }

  // 查找匹配的路径映射
  for (const mapping of pathMappings) {
    if (physicalPath === mapping.physicalPath) {
      return mapping.logicalPath;
    }
    // 处理数组元素路径（如 group.category.contacts.0 -> contacts.0）
    if (physicalPath.startsWith(mapping.physicalPath + '.')) {
      const suffix = physicalPath.slice(mapping.physicalPath.length);
      return mapping.logicalPath + suffix;
    }
  }

  return physicalPath;
}

/**
 * 根据路径映射表转换逻辑路径为物理路径
 * @param logicalPath - 逻辑路径（Schema 中定义的路径）
 * @param pathMappings - 路径映射表
 * @returns 物理路径（表单数据中的实际路径）
 */
export function logicalToPhysicalPath(logicalPath: string, pathMappings: PathMapping[]): string {
  // 如果没有路径映射，直接返回
  if (pathMappings.length === 0) {
    return logicalPath;
  }

  // 查找匹配的路径映射
  for (const mapping of pathMappings) {
    if (logicalPath === mapping.logicalPath) {
      return mapping.physicalPath;
    }
    // 处理数组元素路径（如 contacts.0 -> group.category.contacts.0）
    if (logicalPath.startsWith(mapping.logicalPath + '.')) {
      const suffix = logicalPath.slice(mapping.logicalPath.length);
      return mapping.physicalPath + suffix;
    }
  }

  return logicalPath;
}

/**
 * 将联动配置的字段路径转换为绝对路径
 * @param linkages - 原始联动配置（相对路径）
 * @param pathPrefix - 路径前缀（如 'contacts.0'）
 * @returns 转换后的联动配置（绝对路径）
 *
 * @example
 * // 输入：{ 'companyName': {...}, 'department': {...} }
 * // pathPrefix: 'contacts.0'
 * // 输出：{ 'contacts.0.companyName': {...}, 'contacts.0.department': {...} }
 */
export function transformToAbsolutePaths(
  linkages: Record<string, LinkageConfig>,
  pathPrefix: string
): Record<string, LinkageConfig> {
  if (!pathPrefix) {
    return linkages;
  }

  const result: Record<string, LinkageConfig> = {};

  Object.entries(linkages).forEach(([fieldPath, linkage]) => {
    const absolutePath = fieldPath ? `${pathPrefix}.${fieldPath}` : pathPrefix;

    // 深拷贝联动配置并转换内部的路径引用
    const transformedLinkage = transformLinkageConfigPaths(linkage, pathPrefix);

    result[absolutePath] = transformedLinkage;
  });

  return result;
}

/**
 * 转换联动配置内部的路径引用
 * @param linkage - 原始联动配置
 * @param pathPrefix - 路径前缀
 * @returns 转换后的联动配置
 */
function transformLinkageConfigPaths(linkage: LinkageConfig, pathPrefix: string): LinkageConfig {
  const result = { ...linkage };

  // 转换 dependencies 中的相对路径
  if (result.dependencies) {
    result.dependencies = result.dependencies.map(dep => {
      if (dep.startsWith('./')) {
        // 相对路径：./fieldName -> pathPrefix.fieldName
        const fieldName = dep.slice(2);
        return `${pathPrefix}.${fieldName}`;
      }
      // 绝对路径（JSON Pointer）保持不变
      return dep;
    });
  }

  // 转换 when 条件中的路径
  if (result.when && typeof result.when === 'object') {
    result.when = transformConditionPaths(result.when, pathPrefix);
  }

  return result;
}

/**
 * 递归转换条件表达式中的路径
 */
function transformConditionPaths(condition: any, pathPrefix: string): any {
  const result = { ...condition };

  // 转换 field 字段
  if (result.field && typeof result.field === 'string') {
    if (result.field.startsWith('./')) {
      // 相对路径：./fieldName -> pathPrefix.fieldName
      const fieldName = result.field.slice(2);
      result.field = `${pathPrefix}.${fieldName}`;
    }
    // 绝对路径（JSON Pointer）保持不变
  }

  // 递归处理 and/or
  if (result.and && Array.isArray(result.and)) {
    result.and = result.and.map((c: any) => transformConditionPaths(c, pathPrefix));
  }
  if (result.or && Array.isArray(result.or)) {
    result.or = result.or.map((c: any) => transformConditionPaths(c, pathPrefix));
  }

  return result;
}
