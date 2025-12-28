import type { LinkageConfig } from '@/types/linkage';
import type { ExtendedJSONSchema } from '@/types/schema';

/**
 * 数组联动辅助工具
 * 用于处理数组元素内部的相对路径联动和 JSON Pointer 路径解析
 */

/**
 * 检查路径是否是数组元素路径
 * @example
 * isArrayElementPath('contacts.0.name') // true
 * isArrayElementPath('contacts.name') // false
 */
export function isArrayElementPath(path: string): boolean {
  const parts = path.split('.');
  return parts.some(part => /^\d+$/.test(part));
}

/**
 * 从数组元素路径中提取数组路径和索引
 * @example
 * extractArrayInfo('contacts.0.name') // { arrayPath: 'contacts', index: 0, fieldPath: 'name' }
 * extractArrayInfo('contacts.0.category.group.name') // { arrayPath: 'contacts', index: 0, fieldPath: 'category.group.name' }
 */
export function extractArrayInfo(path: string): {
  arrayPath: string;
  index: number;
  fieldPath: string;
} | null {
  const parts = path.split('.');
  const indexPos = parts.findIndex(part => /^\d+$/.test(part));

  if (indexPos === -1) {
    return null;
  }

  return {
    arrayPath: parts.slice(0, indexPos).join('.'),
    index: parseInt(parts[indexPos], 10),
    fieldPath: parts.slice(indexPos + 1).join('.'),
  };
}

/**
 * 解析 JSON Pointer 为逻辑路径
 * @param pointer - JSON Pointer（如 '#/properties/contacts/items/properties/type'）
 * @returns 逻辑路径（如 'contacts.type'）
 */
export function parseJsonPointer(pointer: string): string {
  if (!pointer.startsWith('#/')) {
    throw new Error(`无效的 JSON Pointer: ${pointer}`);
  }

  // 移除 '#/' 前缀
  const segments = pointer.slice(2).split('/');

  // 过滤掉 'properties' 和 'items' 标记
  const logicalSegments = segments.filter(s => s !== 'properties' && s !== 'items');

  return logicalSegments.join('.');
}

/**
 * 解析相对路径为绝对路径（仅支持同级字段）
 * @param relativePath - 相对路径（如 './type'）
 * @param currentPath - 当前字段的完整路径（如 'contacts.0.companyName'）
 * @returns 解析后的绝对路径（如 'contacts.0.type'）
 */
export function resolveRelativePath(relativePath: string, currentPath: string): string {
  if (!relativePath.startsWith('./')) {
    throw new Error(`不支持的相对路径格式: ${relativePath}。只允许使用 './fieldName' 引用同级字段`);
  }

  const fieldName = relativePath.slice(2);
  const parts = currentPath.split('.');
  const parentPath = parts.slice(0, -1).join('.');

  return parentPath ? `${parentPath}.${fieldName}` : fieldName;
}

/**
 * 路径关系类型
 */
interface PathRelationship {
  type: 'child-to-parent' | 'parent-to-child' | 'same-level' | 'other';
  commonPrefix?: string[];
}

/**
 * 分析路径关系
 */
function analyzePathRelationship(
  depLogicalPath: string,
  currentPath: string,
  schema: ExtendedJSONSchema
): PathRelationship {
  const depSegments = depLogicalPath.split('.');
  const currentSegments = currentPath.split('.');

  // 找到共同前缀
  const commonPrefix: string[] = [];
  for (let i = 0; i < Math.min(depSegments.length, currentSegments.length); i++) {
    if (depSegments[i] === currentSegments[i]) {
      commonPrefix.push(depSegments[i]);
    } else {
      break;
    }
  }

  // 判断是否是子数组到父数组的关系
  // 例如：depPath='departments.type', currentPath='departments.0.employees.1.techStack'
  if (currentSegments.length > depSegments.length && commonPrefix.length > 0) {
    return { type: 'child-to-parent', commonPrefix };
  }

  // 判断是否是父数组到子数组的关系
  // 例如：depPath='departments.employees', currentPath='departments.0.totalSalary'
  if (depSegments.length > currentSegments.length && commonPrefix.length > 0) {
    return { type: 'parent-to-child', commonPrefix };
  }

  return { type: 'other', commonPrefix };
}

/**
 * 解析子数组到父数组的依赖
 * @example
 * depPath: 'departments.type'
 * currentPath: 'departments.0.employees.1.techStack'
 * 返回: 'departments.0.type'
 */
function resolveChildToParent(
  depLogicalPath: string,
  currentPath: string,
  relationship: PathRelationship
): string {
  const depSegments = depLogicalPath.split('.');
  const currentSegments = currentPath.split('.');

  // 找到父数组的索引位置（第一个数字索引）
  const parentArrayIndexPos = currentSegments.findIndex(seg => /^\d+$/.test(seg));

  if (parentArrayIndexPos === -1) {
    return depLogicalPath;
  }

  // 插入索引到依赖路径中
  const result = [
    ...depSegments.slice(0, depSegments.length - 1),
    currentSegments[parentArrayIndexPos],
    depSegments[depSegments.length - 1],
  ].join('.');

  return result;
}

/**
 * 解析父数组到子数组的依赖
 * @example
 * depPath: 'departments.employees'
 * currentPath: 'departments.0.totalSalary'
 * 返回: 'departments.0.employees'
 */
function resolveParentToChild(
  depLogicalPath: string,
  currentPath: string,
  relationship: PathRelationship
): string {
  const depSegments = depLogicalPath.split('.');
  const currentSegments = currentPath.split('.');

  // 找到当前元素的索引
  const arrayIndexPos = currentSegments.findIndex(seg => /^\d+$/.test(seg));

  if (arrayIndexPos === -1) {
    return depLogicalPath;
  }

  const arrayIndex = currentSegments[arrayIndexPos];

  // 在依赖路径中插入索引
  const result = [
    ...depSegments.slice(0, depSegments.length - 1),
    arrayIndex,
    depSegments[depSegments.length - 1],
  ].join('.');

  return result;
}

/**
 * 解析 JSON Pointer 依赖路径
 */
function resolveJsonPointerDependency(
  pointer: string,
  currentPath: string,
  schema: ExtendedJSONSchema
): string {
  // 1. 解析 JSON Pointer 为逻辑路径
  const logicalPath = parseJsonPointer(pointer);

  // 2. 检查是否需要索引匹配
  const needsIndexMatching = pointer.includes('/items/');

  if (!needsIndexMatching) {
    // 顶层字段，直接返回
    return logicalPath;
  }

  // 3. 分析依赖路径和当前路径的关系
  const relationship = analyzePathRelationship(logicalPath, currentPath, schema);

  switch (relationship.type) {
    case 'child-to-parent':
      // 子数组元素依赖父数组元素字段
      return resolveChildToParent(logicalPath, currentPath, relationship);

    case 'parent-to-child':
      // 父数组元素依赖子数组
      return resolveParentToChild(logicalPath, currentPath, relationship);

    case 'same-level':
      // 同级数组元素（同一数组的不同元素）
      return logicalPath;

    default:
      return logicalPath;
  }
}

/**
 * 解析依赖路径为运行时绝对路径（核心算法）
 * @param depPath - 依赖路径（相对路径或 JSON Pointer）
 * @param currentPath - 当前字段的完整路径（如 'contacts.0.companyName'）
 * @param schema - Schema 对象（用于识别数组字段）
 * @returns 解析后的绝对路径
 */
export function resolveDependencyPath(
  depPath: string,
  currentPath: string,
  schema: ExtendedJSONSchema
): string {
  // 1. 相对路径：同级字段
  if (depPath.startsWith('./')) {
    return resolveRelativePath(depPath, currentPath);
  }

  // 2. JSON Pointer：绝对路径
  if (depPath.startsWith('#/')) {
    return resolveJsonPointerDependency(depPath, currentPath, schema);
  }

  throw new Error(`不支持的路径格式: ${depPath}`);
}

/**
 * 为数组元素的联动配置解析路径
 * @param linkage - 原始联动配置
 * @param currentPath - 当前字段的完整路径
 * @param schema - Schema 对象
 * @returns 解析后的联动配置
 */
export function resolveArrayElementLinkage(
  linkage: LinkageConfig,
  currentPath: string,
  schema?: ExtendedJSONSchema
): LinkageConfig {
  const resolved = { ...linkage };

  // 解析 dependencies 中的路径
  if (resolved.dependencies) {
    resolved.dependencies = resolved.dependencies.map(dep => {
      // 如果有 schema，使用完整的路径解析
      if (schema) {
        return resolveDependencyPath(dep, currentPath, schema);
      }
      // 否则只处理相对路径（向后兼容）
      if (dep.startsWith('./')) {
        return resolveRelativePath(dep, currentPath);
      }
      return dep;
    });
  }

  // 解析 when 条件中的路径
  if (resolved.when && typeof resolved.when === 'object') {
    resolved.when = resolveConditionPaths(resolved.when, currentPath, schema);
  }

  return resolved;
}

/**
 * 递归解析条件表达式中的路径
 */
function resolveConditionPaths(
  condition: any,
  currentPath: string,
  schema?: ExtendedJSONSchema
): any {
  const resolved = { ...condition };

  // 解析 field 字段
  if (resolved.field) {
    if (schema) {
      resolved.field = resolveDependencyPath(resolved.field, currentPath, schema);
    } else if (resolved.field.startsWith('./')) {
      resolved.field = resolveRelativePath(resolved.field, currentPath);
    }
  }

  // 递归处理 and/or
  if (resolved.and) {
    resolved.and = resolved.and.map((c: any) => resolveConditionPaths(c, currentPath, schema));
  }
  if (resolved.or) {
    resolved.or = resolved.or.map((c: any) => resolveConditionPaths(c, currentPath, schema));
  }

  return resolved;
}
