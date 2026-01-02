import type { ExtendedJSONSchema, LinkageConfig } from '../types/schema';
import { SchemaParser } from '@/components/DynamicForm';
import {
  isInFlattenPathChain,
  isLastSeparatorFlatten,
  resolveRelativePath,
} from './pathTransformer';

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
 * 统一的逻辑路径生成函数
 */
function buildLogicalPath(parentPath: string, fieldName: string, isFlattenPath: boolean): string {
  if (!parentPath) {
    return fieldName;
  }
  if (isInFlattenPathChain(parentPath) || isFlattenPath) {
    return `${parentPath}${FLATTEN_PATH_SEPARATOR}${fieldName}`;
  }
  return `${parentPath}.${fieldName}`;
}

/**
 * 统一的物理路径生成函数
 */
function buildPhysicalPath(parentPath: string, fieldName: string): string {
  if (!parentPath) {
    return fieldName;
  }
  return `${parentPath}.${fieldName}`;
}

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
 *
 * 分层计算策略：
 * - 解析所有字段的联动配置，但在遇到数组字段时停止递归
 * - 数组字段本身的联动会被收集，但数组元素内部的字段不会被解析
 * - 数组元素内部的联动由 NestedFormWidget 创建的子 DynamicForm 独立解析
 * - 这样每层 DynamicForm 只负责自己这一层的联动，实现真正的分层计算
 *
 * @param schema - JSON Schema
 */
export function parseSchemaLinkages(schema: ExtendedJSONSchema): ParsedLinkages {
  const linkages: Record<string, LinkageConfig> = {};
  const pathMappings: PathMapping[] = [];
  let hasFlattenPath = false;

  // 递归解析 schema，收集所有联动配置和路径映射
  parseSchemaRecursive(schema, '', '', linkages, pathMappings, [], used => {
    hasFlattenPath = hasFlattenPath || used;
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[parseSchemaLinkages] 解析完成:',
      JSON.stringify({
        linkagesCount: Object.keys(linkages).length,
        pathMappingsCount: pathMappings.length,
        hasFlattenPath,
      })
    );
  }

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

    // 使用统一的路径生成函数
    const logicalPath = buildLogicalPath(logicalParentPath, fieldName, shouldSkipInPath || false);
    const physicalPath = buildPhysicalPath(physicalParentPath, fieldName);
    const currentSkippedSegments = shouldSkipInPath ? [...skippedSegments, fieldName] : [];

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
    // 关键：在遇到数组字段时停止递归，不解析数组元素内部的字段
    // 数组元素内部的联动由 NestedFormWidget 创建的子 DynamicForm 独立解析
    if (typedSchema.type === 'array' && typedSchema.items) {
      console.log(
        '[parseSchemaRecursive] 遇到数组字段，停止递归（数组元素内部由 NestedFormWidget 处理）:',
        JSON.stringify({
          fieldName,
          logicalPath,
          physicalPath,
        })
      );
      // 不递归解析数组元素内部，直接返回
      // 数组字段本身的联动配置已经在上面收集了
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
 * @param pathPrefix - 路径前缀（如 'contacts.0' 或 'region~~market~~contacts.0'）
 * @returns 转换后的联动配置（绝对路径）
 *
 * @example
 * // 输入：{ 'companyName': {...}, 'department': {...} }
 * // pathPrefix: 'contacts.0'
 * // 输出：{ 'contacts.0.companyName': {...}, 'contacts.0.department': {...} }
 *
 * @example
 * // 输入：{ 'category~~group~~vipLevel': {...} }
 * // pathPrefix: 'region~~market~~contacts.0'
 * // 输出：{ 'region~~market~~contacts.0.category~~group~~vipLevel': {...} }
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
    // 构建绝对路径：pathPrefix 和 fieldPath 之间始终使用 . 连接
    // 因为 pathPrefix 是数组元素路径（如 region~~market~~contacts.0）
    // fieldPath 是元素内部的字段路径（如 category~~group~~vipLevel）
    const absolutePath = fieldPath ? `${pathPrefix}.${fieldPath}` : pathPrefix;

    // 深拷贝联动配置并转换内部的路径引用
    // 传递 absolutePath 作为完整字段路径，用于相对路径解析
    const transformedLinkage = transformLinkageConfigPaths(linkage, pathPrefix, absolutePath);

    result[absolutePath] = transformedLinkage;
  });

  return result;
}

/**
 * 转换联动配置内部的路径引用
 * @param linkage - 原始联动配置
 * @param pathPrefix - 路径前缀
 * @param fieldPath - 当前字段的完整路径（用于相对路径解析）
 * @returns 转换后的联动配置
 */
function transformLinkageConfigPaths(
  linkage: LinkageConfig,
  pathPrefix: string,
  fieldPath: string
): LinkageConfig {
  const result = { ...linkage };

  // 转换 dependencies 中的相对路径
  if (result.dependencies) {
    result.dependencies = result.dependencies.map(dep => {
      if (dep.startsWith('./')) {
        // 相对路径：使用统一的 resolveRelativePath 函数
        console.log(
          '[transformLinkageConfigPaths] 处理相对路径:',
          JSON.stringify({
            dep,
            fieldPath,
          })
        );

        const resolvedPath = resolveRelativePath(dep, fieldPath);

        console.log(
          '[transformLinkageConfigPaths] 相对路径解析结果:',
          JSON.stringify({
            resolvedPath,
          })
        );

        return resolvedPath;
      }
      // 绝对路径（JSON Pointer）保持不变
      return dep;
    });
  }

  // 转换 when 条件中的路径
  if (result.when && typeof result.when === 'object') {
    result.when = transformConditionPaths(result.when, pathPrefix, fieldPath);
  }

  return result;
}

/**
 * 递归转换条件表达式中的路径
 */
function transformConditionPaths(condition: any, pathPrefix: string, fieldPath: string): any {
  const result = { ...condition };

  // 转换 field 字段
  if (result.field && typeof result.field === 'string') {
    if (result.field.startsWith('./')) {
      // 相对路径：使用统一的 resolveRelativePath 函数
      console.log(
        '[transformConditionPaths] 处理相对路径:',
        JSON.stringify({
          originalField: result.field,
          fieldPath,
        })
      );

      result.field = resolveRelativePath(result.field, fieldPath);

      console.log(
        '[transformConditionPaths] 相对路径解析结果:',
        JSON.stringify({
          resolvedField: result.field,
        })
      );
    }
    // 绝对路径（JSON Pointer）保持不变
  }

  // 递归处理 and/or
  if (result.and && Array.isArray(result.and)) {
    result.and = result.and.map((c: any) => transformConditionPaths(c, pathPrefix, fieldPath));
  }
  if (result.or && Array.isArray(result.or)) {
    result.or = result.or.map((c: any) => transformConditionPaths(c, pathPrefix, fieldPath));
  }

  return result;
}
