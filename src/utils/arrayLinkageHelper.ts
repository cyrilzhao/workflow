import type { LinkageConfig } from '@/types/linkage';
import type { ExtendedJSONSchema } from '@/types/schema';
import { FLATTEN_PATH_SEPARATOR, type PathMapping } from './schemaLinkageParser';
import { SchemaParser } from '@/components/DynamicForm/core/SchemaParser';

/**
 * 数组联动辅助工具
 * 用于处理数组元素内部的相对路径联动和 JSON Pointer 路径解析
 */

/**
 * 将路径按层级分割（支持 . 和 ~~ 分隔符）
 * @example
 * splitPath('group~~category~~contacts.0.name')
 * // => ['group', 'category', 'contacts', '0', 'name']
 */
function splitPath(path: string): string[] {
  // 先将 ~~ 替换为 .，然后按 . 分割
  return path.replace(new RegExp(FLATTEN_PATH_SEPARATOR, 'g'), '.').split('.');
}

/**
 * 检查路径是否是数组元素路径
 * @example
 * isArrayElementPath('contacts.0.name') // true
 * isArrayElementPath('group~~category~~contacts.0.name') // true
 * isArrayElementPath('contacts.name') // false
 */
export function isArrayElementPath(path: string): boolean {
  const parts = splitPath(path);
  return parts.some(part => /^\d+$/.test(part));
}

/**
 * 从数组元素路径中提取数组路径和索引
 * 支持包含 ~~ 分隔符的逻辑路径
 * @example
 * extractArrayInfo('contacts.0.name') // { arrayPath: 'contacts', index: 0, fieldPath: 'name' }
 * extractArrayInfo('group~~category~~contacts.0.name') // { arrayPath: 'group~~category~~contacts', index: 0, fieldPath: 'name' }
 */
export function extractArrayInfo(path: string): {
  arrayPath: string;
  index: number;
  fieldPath: string;
} | null {
  // 使用统一的分割方式找到索引位置
  const normalizedParts = splitPath(path);
  const indexPos = normalizedParts.findIndex(part => /^\d+$/.test(part));

  if (indexPos === -1) {
    return null;
  }

  // 需要从原始路径中提取 arrayPath，保留原始分隔符
  // 策略：找到第 indexPos 个分隔符的位置
  let separatorCount = 0;
  let arrayPathEndPos = 0;

  for (let i = 0; i < path.length; i++) {
    if (path.substring(i, i + 2) === FLATTEN_PATH_SEPARATOR) {
      separatorCount++;
      if (separatorCount === indexPos) {
        arrayPathEndPos = i;
        break;
      }
      i++; // 跳过 ~~ 的第二个字符
    } else if (path[i] === '.') {
      separatorCount++;
      if (separatorCount === indexPos) {
        arrayPathEndPos = i;
        break;
      }
    }
  }

  const arrayPath = path.substring(0, arrayPathEndPos);
  const index = parseInt(normalizedParts[indexPos], 10);
  const fieldPath = normalizedParts.slice(indexPos + 1).join('.');

  return { arrayPath, index, fieldPath };
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
 * 支持包含 ~~ 分隔符的逻辑路径
 * @param relativePath - 相对路径（如 './type'）
 * @param currentPath - 当前字段的完整路径（如 'contacts.0.companyName' 或 'group~~category~~contacts.0.companyName'）
 * @returns 解析后的绝对路径（如 'contacts.0.type' 或 'group~~category~~contacts.0~~type'）
 */
export function resolveRelativePath(relativePath: string, currentPath: string): string {
  if (!relativePath.startsWith('./')) {
    throw new Error(`不支持的相对路径格式: ${relativePath}。只允许使用 './fieldName' 引用同级字段`);
  }

  const fieldName = relativePath.slice(2);

  // 找到实际最后一个分隔符的位置（. 或 ~~）
  // 需要从后往前扫描，找到最后出现的分隔符
  let lastSeparatorPos = -1;
  let lastSeparatorType: '.' | '~~' | null = null;

  // 从后往前扫描
  for (let i = currentPath.length - 1; i >= 0; i--) {
    // 检查是否是 ~~ 分隔符（需要检查当前位置和前一个位置）
    if (i > 0 && currentPath[i - 1] === '~' && currentPath[i] === '~') {
      lastSeparatorPos = i - 1; // ~~ 的起始位置
      lastSeparatorType = '~~';
      break;
    }
    // 检查是否是 . 分隔符
    if (currentPath[i] === '.') {
      lastSeparatorPos = i;
      lastSeparatorType = '.';
      break;
    }
  }

  if (lastSeparatorPos === -1) {
    return fieldName;
  }

  // 获取父路径
  const parentPath = currentPath.substring(0, lastSeparatorPos);

  // 判断是否在 flattenPath 链中（如果最后一个分隔符是 ~~）
  const isParentInFlattenChain = lastSeparatorType === '~~';

  // 使用 SchemaParser.buildFieldPath 来构建路径，确保逻辑一致
  return SchemaParser.buildFieldPath(parentPath, fieldName, isParentInFlattenChain);
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
  const depSegments = splitPath(depLogicalPath);
  const currentSegments = splitPath(currentPath);

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
  if (currentSegments.length > depSegments.length && commonPrefix.length > 0) {
    return { type: 'child-to-parent', commonPrefix };
  }

  // 判断是否是父数组到子数组的关系
  if (depSegments.length > currentSegments.length && commonPrefix.length > 0) {
    return { type: 'parent-to-child', commonPrefix };
  }

  return { type: 'other', commonPrefix };
}

/**
 * 解析子数组到父数组的依赖
 * 支持包含 ~~ 分隔符的逻辑路径
 * @example
 * // 普通路径
 * depPath: 'departments.type'
 * currentPath: 'departments.0.employees.1.techStack'
 * 返回: 'departments.0.type'
 *
 * // 包含 ~~ 分隔符的路径
 * depPath: 'group~~category~~departments.type'
 * currentPath: 'group~~category~~departments.0.employees.1.techStack'
 * 返回: 'group~~category~~departments.0.type'
 */
function resolveChildToParent(
  depLogicalPath: string,
  currentPath: string,
  relationship: PathRelationship
): string {
  const depSegments = splitPath(depLogicalPath);
  const currentSegments = splitPath(currentPath);

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
 * 支持包含 ~~ 分隔符的逻辑路径
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
  const depSegments = splitPath(depLogicalPath);
  const currentSegments = splitPath(currentPath);

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

  // 3. 已经是运行时的绝对路径（如 contacts.0.type），直接返回
  // 这种情况发生在联动配置已经被实例化后再次调用 resolveArrayElementLinkage 时
  console.log('[resolveDependencyPath] 路径已是运行时格式，直接返回:', depPath);
  return depPath;
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
  console.info('cyril resolved: ', resolved);

  // 解析 field 字段
  if (resolved.field) {
    const originalField = resolved.field;
    if (schema) {
      resolved.field = resolveDependencyPath(resolved.field, currentPath, schema);
      console.log(
        '[resolveConditionPaths] 解析条件字段路径:',
        JSON.stringify({
          originalField,
          currentPath,
          resolvedField: resolved.field,
        })
      );
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

/**
 * 从联动配置路径中提取数组信息（基于 schema 解析）
 *
 * @param fieldPath - 联动配置的字段路径（如 'group~~category.contacts~~category~~group.vipLevel'）
 * @param schema - Schema 定义
 * @returns 数组信息，如果路径中包含数组则返回相关信息，否则返回 null
 *
 * @example
 * // 输入: 'group~~category.contacts~~category~~group.vipLevel'
 * // 输出: { arrayPath: 'group~~category.contacts', fieldPathInArray: 'category~~group.vipLevel' }
 */
export function findArrayInPath(
  fieldPath: string,
  schema: ExtendedJSONSchema
): { arrayPath: string; fieldPathInArray: string } | null {
  // 递归遍历 schema，找到路径中的数组字段
  return findArrayInPathRecursive(fieldPath, schema, '');
}

/**
/**
 * 递归查找路径中的数组字段
 */
function findArrayInPathRecursive(
  targetPath: string,
  schema: ExtendedJSONSchema,
  currentLogicalPath: string
): { arrayPath: string; fieldPathInArray: string } | null {
  if (!schema.properties) {
    return null;
  }

  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    if (typeof fieldSchema === 'boolean') continue;

    const typedSchema = fieldSchema as ExtendedJSONSchema;
    const shouldFlatten = typedSchema.type === 'object' && typedSchema.ui?.flattenPath;

    // 计算当前字段的逻辑路径
    // 使用与 SchemaParser.buildFieldPath 相同的逻辑
    let newLogicalPath: string;
    if (!currentLogicalPath) {
      // 根节点
      newLogicalPath = fieldName;
    } else {
      // 检查父路径的最后一个分隔符类型
      const lastDotIndex = currentLogicalPath.lastIndexOf('.');
      const lastSepIndex = currentLogicalPath.lastIndexOf(FLATTEN_PATH_SEPARATOR);

      // 如果最后一个分隔符是 ~~，说明父级在 flattenPath 链中
      const isParentInFlattenChain = lastSepIndex > lastDotIndex;

      // 规则：如果父级在 flattenPath 链中，或当前字段是 flattenPath，使用 ~~
      if (isParentInFlattenChain || shouldFlatten) {
        newLogicalPath = `${currentLogicalPath}${FLATTEN_PATH_SEPARATOR}${fieldName}`;
      } else {
        newLogicalPath = `${currentLogicalPath}.${fieldName}`;
      }
    }

    // 检查目标路径是否以当前逻辑路径开头
    if (!targetPath.startsWith(newLogicalPath)) {
      continue;
    }

    // 如果是数组类型，检查是否匹配
    if (typedSchema.type === 'array') {
      // 数组后面可能跟 '.' 或 '~~'（如果数组元素内部第一层是 flattenPath）
      const arrayPathWithDot = newLogicalPath + '.';
      const arrayPathWithSeparator = newLogicalPath + FLATTEN_PATH_SEPARATOR;

      if (targetPath.startsWith(arrayPathWithDot)) {
        const fieldPathInArray = targetPath.slice(arrayPathWithDot.length);
        return { arrayPath: newLogicalPath, fieldPathInArray };
      }
      if (targetPath.startsWith(arrayPathWithSeparator)) {
        const fieldPathInArray = targetPath.slice(arrayPathWithSeparator.length);
        return { arrayPath: newLogicalPath, fieldPathInArray };
      }
    }

    // 递归处理嵌套对象
    if (typedSchema.type === 'object' && typedSchema.properties) {
      const result = findArrayInPathRecursive(targetPath, typedSchema, newLogicalPath);
      if (result) return result;
    }

    // 递归处理数组元素内部
    if (typedSchema.type === 'array' && typedSchema.items) {
      const itemsSchema = typedSchema.items as ExtendedJSONSchema;
      if (itemsSchema.type === 'object' && itemsSchema.properties) {
        const result = findArrayInPathRecursive(targetPath, itemsSchema, newLogicalPath);
        if (result) return result;
      }
    }
  }

  return null;
}
