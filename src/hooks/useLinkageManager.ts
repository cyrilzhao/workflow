import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { LinkageConfig, LinkageFunction } from '@/types/linkage';
import type { LinkageResult } from '@/types/linkage';
import { ConditionEvaluator } from '@/utils/conditionEvaluator';

interface LinkageManagerOptions {
  form: UseFormReturn<any>;
  linkages: Record<string, LinkageConfig>;
  linkageFunctions?: Record<string, LinkageFunction>;
}

/**
 * 联动管理器 Hook
 */
export function useLinkageManager({
  form,
  linkages,
  linkageFunctions = {},
}: LinkageManagerOptions) {
  const { watch, getValues } = form;

  // 收集所有需要监听的字段
  const watchFields = useMemo(() => {
    const fields = new Set<string>();
    Object.values(linkages).forEach(linkage => {
      linkage.dependencies.forEach(dep => fields.add(dep));
    });

    // 同时监听所有有值联动的字段本身，因为它们的值可能被其他联动修改
    Object.entries(linkages).forEach(([fieldName, linkage]) => {
      if (linkage.type === 'value') {
        fields.add(fieldName);
      }
    });

    return Array.from(fields);
  }, [linkages]);

  // 监听所有依赖字段
  const watchedValues = watch(watchFields);

  // 计算每个字段的联动状态
  const linkageStates = useMemo(() => {
    const formData = getValues();
    const states: Record<string, LinkageResult> = {};

    Object.entries(linkages).forEach(([fieldName, linkage]) => {
      states[fieldName] = evaluateLinkage(linkage, formData, linkageFunctions);
    });

    return states;
  }, [watchedValues, linkages, linkageFunctions, getValues]);

  return linkageStates;
}

/**
 * 求值单个联动配置
 */
function evaluateLinkage(
  linkage: LinkageConfig,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>
): LinkageResult {
  const result: LinkageResult = {};

  // 如果指定了自定义函数，优先使用
  if (linkage.function && linkageFunctions[linkage.function]) {
    const fnResult = linkageFunctions[linkage.function](formData);

    // 根据联动类型处理返回值
    switch (linkage.type) {
      case 'visibility':
        result.visible = Boolean(fnResult);
        break;
      case 'disabled':
        result.disabled = Boolean(fnResult);
        break;
      case 'readonly':
        result.readonly = Boolean(fnResult);
        break;
      case 'computed':
        result.value = fnResult;
        break;
      case 'options':
        result.options = fnResult;
        break;
    }

    return result;
  }

  // 如果有条件表达式，求值条件
  if (linkage.condition) {
    const conditionMet = ConditionEvaluator.evaluate(linkage.condition, formData);

    switch (linkage.type) {
      case 'visibility':
        result.visible = conditionMet;
        break;
      case 'disabled':
        result.disabled = conditionMet;
        break;
      case 'readonly':
        result.readonly = conditionMet;
        break;
      case 'value':
        // 当条件满足时，设置目标值
        if (conditionMet && linkage.targetValue !== undefined) {
          result.value = linkage.targetValue;
        }
        break;
    }
  }

  return result;
}
