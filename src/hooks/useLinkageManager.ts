import { useMemo, useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { LinkageConfig, LinkageFunction, ConditionExpression } from '@/types/linkage';
import type { LinkageResult } from '@/types/linkage';
import { ConditionEvaluator } from '@/utils/conditionEvaluator';
import { DependencyGraph } from '@/utils/dependencyGraph';
import { PathResolver } from '@/utils/pathResolver';

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

  // 构建依赖图
  const dependencyGraph = useMemo(() => {
    const graph = new DependencyGraph();

    Object.entries(linkages).forEach(([fieldName, linkage]) => {
      linkage.dependencies.forEach(dep => {
        // 标准化路径并添加依赖关系
        const normalizedDep = PathResolver.toFieldPath(dep);
        graph.addDependency(fieldName, normalizedDep);
      });
    });

    // 检测循环依赖
    const cycle = graph.detectCycle();
    if (cycle) {
      console.error('检测到循环依赖:', cycle.join(' -> '));
    }

    return graph;
  }, [linkages]);

  // 联动状态缓存（使用 useState 而不是 useMemo，以便在 useEffect 中更新）
  // 传入的参数是初始化函数，只在组件首次挂载时调用一次，后续重新渲染时不会执行
  const [linkageStates, setLinkageStates] = useState<Record<string, LinkageResult>>(() => {
    const formData = getValues();
    const states: Record<string, LinkageResult> = {};
    Object.entries(linkages).forEach(([fieldName, linkage]) => {
      states[fieldName] = evaluateLinkage(linkage, formData, linkageFunctions);
    });
    return states;
  });

  // 统一的字段变化监听和联动处理
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;

      console.info('cyril changed field name: ', name);

      // 获取受影响的字段（使用依赖图精确计算）
      const affectedFields = dependencyGraph.getAffectedFields(name);
      console.info('cyril affectedFields: ', affectedFields);
      if (affectedFields.length === 0) return;

      const formData = getValues();
      const newStates: Record<string, LinkageResult> = {};
      let hasStateChange = false;

      // 只重新计算受影响的字段
      affectedFields.forEach(fieldName => {
        const linkage = linkages[fieldName];
        if (!linkage) return;

        const result = evaluateLinkage(linkage, formData, linkageFunctions);
        newStates[fieldName] = result;

        // 处理值联动：自动更新表单字段值
        if (
          (linkage.type === 'computed' || linkage.type === 'value') &&
          result.value !== undefined
        ) {
          const currentValue = formData[fieldName];
          if (currentValue !== result.value) {
            console.info('cyril update value for: ', fieldName, result.value);
            form.setValue(fieldName, result.value, {
              shouldValidate: true,
              shouldDirty: true,
            });
          }
        }

        hasStateChange = true;
      });

      // 批量更新状态（只更新变化的字段）
      if (hasStateChange) {
        console.info('cyril newStates: ', newStates);
        setLinkageStates(prev => ({ ...prev, ...newStates }));
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, form, getValues, linkages, linkageFunctions, dependencyGraph]);

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

  // 支持新的 when/fulfill/otherwise 语法
  if (linkage.when && (linkage.fulfill || linkage.otherwise)) {
    const conditionMet = evaluateCondition(linkage.when, formData, linkageFunctions);
    const effect = conditionMet ? linkage.fulfill : linkage.otherwise;

    if (effect) {
      // 应用状态变更
      if (effect.state) {
        Object.assign(result, effect.state);
      }
      // 应用值变更
      if (effect.value !== undefined) {
        result.value = effect.value;
      }
    }

    return result;
  }

  // 向后兼容：如果指定了自定义函数，优先使用
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

  // 向后兼容：如果有条件表达式，求值条件
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

/**
 * 求值条件（支持表达式对象或函数名）
 */
function evaluateCondition(
  when: ConditionExpression | string,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>
): boolean {
  // 如果是字符串，尝试作为函数名调用
  if (typeof when === 'string') {
    const fn = linkageFunctions[when];
    if (fn) {
      return Boolean(fn(formData));
    }
    console.warn(`Linkage function "${when}" not found`);
    return false;
  }

  // 否则作为条件表达式求值
  return ConditionEvaluator.evaluate(when, formData);
}
