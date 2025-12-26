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
  const [linkageStates, setLinkageStates] = useState<Record<string, LinkageResult>>({});

  // 初始化联动状态
  useEffect(() => {
    (async () => {
      const formData = getValues();
      const states: Record<string, LinkageResult> = {};

      // 并行计算所有字段的初始联动状态（使用 allSettled 避免单个失败阻塞其他字段）
      const results = await Promise.allSettled(
        Object.entries(linkages).map(async ([fieldName, linkage]) => ({
          fieldName,
          result: await evaluateLinkage(linkage, formData, linkageFunctions),
        }))
      );

      // 处理结果，忽略失败的字段
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          states[result.value.fieldName] = result.value.result;
        } else {
          console.error('联动初始化失败:', result.reason);
        }
      });

      setLinkageStates(states);
    })();
  }, [linkages, linkageFunctions, getValues]);

  // 统一的字段变化监听和联动处理
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;
      // 获取受影响的字段（使用依赖图精确计算）
      const affectedFields = dependencyGraph.getAffectedFields(name);
      if (affectedFields.length === 0) return;

      const formData = getValues();

      // 异步处理联动逻辑
      (async () => {
        const newStates: Record<string, LinkageResult> = {};
        let hasStateChange = false;

        // 并行计算所有受影响字段的联动结果（使用 allSettled 避免单个失败阻塞其他字段）
        const results = await Promise.allSettled(
          affectedFields.map(async fieldName => {
            const linkage = linkages[fieldName];
            if (!linkage) return null;

            const result = await evaluateLinkage(linkage, formData, linkageFunctions);
            return { fieldName, linkage, result };
          })
        );

        // 处理结果，忽略失败的字段
        results.forEach(promiseResult => {
          if (promiseResult.status === 'fulfilled' && promiseResult.value) {
            const { fieldName, linkage, result } = promiseResult.value;
            newStates[fieldName] = result;

            // 处理值联动：自动更新表单字段值
            if (
              (linkage.type === 'computed' || linkage.type === 'value') &&
              result.value !== undefined
            ) {
              const currentValue = formData[fieldName];
              if (currentValue !== result.value) {
                form.setValue(fieldName, result.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
            }

            hasStateChange = true;
          } else if (promiseResult.status === 'rejected') {
            console.error('联动计算失败:', promiseResult.reason);
          }
        });

        // 批量更新状态（只更新变化的字段）
        if (hasStateChange) {
          setLinkageStates(prev => ({ ...prev, ...newStates }));
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [watch, form, getValues, linkages, linkageFunctions, dependencyGraph]);

  return linkageStates;
}

/**
 * 求值单个联动配置（支持异步函数）
 */
async function evaluateLinkage(
  linkage: LinkageConfig,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>
): Promise<LinkageResult> {
  const result: LinkageResult = {};

  // 如果没有 when 条件，默认使用 fulfill
  const shouldFulfill = linkage.when
    ? await evaluateCondition(linkage.when, formData, linkageFunctions)
    : true;

  const effect = shouldFulfill ? linkage.fulfill : linkage.otherwise;

  if (!effect) return result;

  // 1. 应用状态变更
  if (effect.state) {
    Object.assign(result, effect.state);
  }

  // 2. 应用函数计算
  if (effect.function) {
    const fn = linkageFunctions[effect.function];
    if (fn) {
      // 使用 await 支持异步函数
      const fnResult = await fn(formData);

      // 根据 linkage.type 决定将结果赋值给哪个字段
      switch (linkage.type) {
        case 'computed':
        case 'value':
          result.value = fnResult;
          break;
        case 'options':
          result.options = fnResult;
          break;
        case 'visibility':
          result.visible = Boolean(fnResult);
          break;
        case 'disabled':
          result.disabled = Boolean(fnResult);
          break;
        case 'readonly':
          result.readonly = Boolean(fnResult);
          break;
      }
    }
  }

  // 3. 应用直接指定的值（优先级低于函数）
  if (effect.value !== undefined && !effect.function) {
    result.value = effect.value;
  }

  // 4. 应用直接指定的选项（优先级低于函数）
  if (effect.options !== undefined && !effect.function) {
    result.options = effect.options;
  }

  return result;
}

/**
 * 求值条件（支持表达式对象或函数名，支持异步函数）
 */
async function evaluateCondition(
  when: ConditionExpression | string,
  formData: Record<string, any>,
  linkageFunctions: Record<string, LinkageFunction>
): Promise<boolean> {
  // 如果是字符串，尝试作为函数名调用
  if (typeof when === 'string') {
    const fn = linkageFunctions[when];
    if (fn) {
      // 使用 await 支持异步函数
      const result = await fn(formData);
      return Boolean(result);
    }
    console.warn(`Linkage function "${when}" not found`);
    return false;
  }

  // 否则作为条件表达式求值
  return ConditionEvaluator.evaluate(when, formData);
}
