import type { SupportedLanguage } from './types';

/**
 * 根据语言类型获取语言显示名称
 */
export const getLanguageDisplayName = (language: SupportedLanguage): string => {
  const displayNames: Record<SupportedLanguage, string> = {
    javascript: 'JavaScript',
    json: 'JSON',
    python: 'Python',
    sql: 'SQL',
    yaml: 'YAML',
    markdown: 'Markdown',
    html: 'HTML',
    css: 'CSS',
  };
  return displayNames[language] || language.toUpperCase();
};

/**
 * JSON 验证器
 */
export const jsonValidator = (code: string): string | null => {
  // 允许空字符串
  if (!code || code.trim() === '') {
    return null;
  }

  try {
    JSON.parse(code);
    return null;
  } catch (error) {
    return `Invalid JSON: ${(error as Error).message}`;
  }
};

/**
 * JSON 格式化器
 */
export const jsonFormatter = (code: string): string => {
  try {
    return JSON.stringify(JSON.parse(code), null, 2);
  } catch {
    return code;
  }
};

/**
 * 计算代码行数
 */
export const countLines = (code: string): number => {
  return code.split('\n').length;
};

/**
 * 截取代码的前 N 行
 */
export const truncateLines = (code: string, maxLines: number): string => {
  const lines = code.split('\n');
  if (lines.length <= maxLines) {
    return code;
  }
  return lines.slice(0, maxLines).join('\n') + '\n...';
};
