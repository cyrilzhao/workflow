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
      const formData = { ...getValues() };
      const states: Record<string, LinkageResult> = {};

      // 获取拓扑排序后的字段列表
      const sortedFields = dependencyGraph.topologicalSort(Object.keys(linkages));

      // 按拓扑顺序依次计算联动状态
      for (const fieldName of sortedFields) {
        const linkage = linkages[fieldName];
        if (!linkage) continue;

        try {
          const result = await evaluateLinkage(linkage, formData, linkageFunctions);
          states[fieldName] = result;

          // 如果是值联动，更新 formData 以供后续字段使用
          if (linkage.type === 'value' && result.value !== undefined) {
            formData[fieldName] = result.value;
          }
        } catch (error) {
          console.error('联动初始化失败:', fieldName, error);
        }
      }

      setLinkageStates(states);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkages, linkageFunctions, dependencyGraph]);

  // 统一的字段变化监听和联动处理
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;
      // 获取受影响的字段（使用依赖图精确计算）
      const affectedFields = dependencyGraph.getAffectedFields(name);
      if (affectedFields.length === 0) return;

      // 异步处理联动逻辑
      (async () => {
        const formData = { ...getValues() };
        const newStates: Record<string, LinkageResult> = {};
        let hasStateChange = false;

        // 对受影响的字段进行拓扑排序，确保按依赖顺序计算
        const sortedFields = dependencyGraph.topologicalSort(affectedFields);

        // 按拓扑顺序依次计算联动结果
        for (const fieldName of sortedFields) {
          const linkage = linkages[fieldName];
          if (!linkage) continue;

          try {
            const result = await evaluateLinkage(linkage, formData, linkageFunctions);
            newStates[fieldName] = result;

            // 处理值联动：自动更新表单字段值和 formData
            if (linkage.type === 'value' && result.value !== undefined) {
              const currentValue = formData[fieldName];
              if (currentValue !== result.value) {
                // 更新 formData 以供后续字段使用
                formData[fieldName] = result.value;
                // 使用 shouldValidate: false 和 shouldDirty: false 避免触发额外的验证和变化事件
                form.setValue(fieldName, result.value, {
                  shouldValidate: false,
                  shouldDirty: false,
                });
              }
            }

            hasStateChange = true;
          } catch (error) {
            console.error('联动计算失败:', fieldName, error);
          }
        }

        // 批量更新状态（只更新变化的字段）
        if (hasStateChange) {
          setLinkageStates(prev => ({ ...prev, ...newStates }));
        }
      })();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, form, linkages, linkageFunctions, dependencyGraph]);

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
