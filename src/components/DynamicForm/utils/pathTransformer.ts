/**
 * 解析相对路径为绝对路径（仅支持同级字段）
 *
 * 新方案（v3.0）：
 * - 使用标准的 . 分隔符
 * - 简化路径解析逻辑
 *
 * @param relativePath - 相对路径（如 './type'）
 * @param currentPath - 当前字段的完整路径（如 'contacts.0.companyName'）
 * @returns 解析后的绝对路径（如 'contacts.0.type'）
 */
export function resolveRelativePath(relativePath: string, currentPath: string): string {
  if (!relativePath.startsWith('./')) {
    throw new Error(`不支持的相对路径格式: ${relativePath}。只允许使用 './fieldName' 引用同级字段`);
  }

  const fieldName = relativePath.slice(2);

  // 使用标准的 . 分隔符查找最后一个分隔符
  const lastSeparatorPos = currentPath.lastIndexOf('.');

  if (lastSeparatorPos === -1) {
    return fieldName;
  }

  // 获取父路径
  const parentPath = currentPath.substring(0, lastSeparatorPos);

  // 使用标准的 . 分隔符构建路径
  return `${parentPath}.${fieldName}`;
}
