import { useMemo, useEffect, useState, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type {
  LinkageConfig,
  LinkageFunction,
  ConditionExpression,
  LinkageFunctionContext,
} from '../types/linkage';
import type { LinkageResult } from '../types/linkage';
import { ConditionEvaluator } from '../utils/conditionEvaluator';
import { DependencyGraph } from '../utils/dependencyGraph';
import { PathResolver } from '../utils/pathResolver';

/**
 * 异步请求序列号管理器
 * 用于解决异步联动函数的竞态条件问题
 */
class AsyncSequenceManager {
  private sequences: Map<string, number> = new Map();

  /**
   * 为指定字段生成新的序列号
   */
  next(fieldName: string): number {
    const current = this.sequences.get(fieldName) || 0;
    const next = current + 1;
    this.sequences.set(fieldName, next);
    return next;
  }

  /**
   * 检查序列号是否是最新的
   */
  isLatest(fieldName: string, sequence: number): boolean {
    const current = this.sequences.get(fieldName) || 0;
    return sequence === current;
  }

  /**
   * 清除指定字段的序列号
   */
  clear(fieldName: string): void {
    this.sequences.delete(fieldName);
  }

  /**
   * 清除所有序列号
   */
  clearAll(): void {
    this.sequences.clear();
  }
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
  if (!path) return obj;
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result == null) return undefined;
    result = result[key];
  }
  return result;
}

/**
 * 设置嵌套对象的值
 */
function setNestedValue(obj: any, path: string, value: any): void {
  if (!path) return;
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * 从字段路径中提取数组上下文信息
 * 例如: 'contacts.0.showCompany' => { arrayPath: 'contacts', arrayIndex: 0 }
 */
function extractArrayContext(fieldPath: string): { arrayPath?: string; arrayIndex?: number } {
  const parts = fieldPath.split('.');
  for (let i = 0; i < parts.length; i++) {
    const index = parseInt(parts[i], 10);
    if (!isNaN(index) && i > 0) {
      return {
        arrayPath: parts.slice(0, i).join('.'),
        arrayIndex: index,
      };
    }
  }
  return {};
}

interface LinkageManagerOptions {
  form: UseFormReturn<any>;
  linkages: Record<string, LinkageConfig>;
  linkageFunctions?: Record<string, LinkageFunction>;
}

/**
 * 联动管理器 Hook
 *
 * 新方案（v3.0）：移除 pathMappings，使用标准路径
 */
export function useLinkageManager({
  form,
  linkages,
  linkageFunctions = {},
}: LinkageManagerOptions) {
  const { watch, getValues } = form;

  // 创建异步序列号管理器实例（使用 useRef 保持引用稳定）
  const asyncSequenceManager = useRef(new AsyncSequenceManager()).current;

  // 标志位：防止 setValue 触发的 watch 导致死循环
  const isUpdatingFromLinkage = useRef(false);

  // 防抖定时器：用于处理快速连续修改
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map()).current;

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
          const result = await evaluateLinkage({
            linkage,
            formData,
            linkageFunctions,
            fieldPath: fieldName,
            asyncSequenceManager,
          });
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

      // 防止死循环：如果是联动触发的 setValue，跳过处理
      if (isUpdatingFromLinkage.current) {
        return;
      }

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
            const result = await evaluateLinkage({
              linkage,
              formData,
              linkageFunctions,
              fieldPath: fieldName,
              asyncSequenceManager,
            });
            newStates[fieldName] = result;

            // 处理值联动：自动更新表单字段值和 formData
            if (linkage.type === 'value' && result.value !== undefined) {
              const currentValue = formData[fieldName];
              if (currentValue !== result.value) {
                // 更新 formData 以供后续字段使用
                formData[fieldName] = result.value;

                // 设置标志位，防止 setValue 触发的 watch 导致死循环
                isUpdatingFromLinkage.current = true;
                try {
                  form.setValue(fieldName, result.value, {
                    shouldValidate: false,
                    shouldDirty: false,
                  });
                } finally {
                  // 使用 setTimeout 确保在下一个事件循环中重置标志位
                  // 这样可以让当前的 setValue 完全完成（包括触发 watch）
                  setTimeout(() => {
                    isUpdatingFromLinkage.current = false;
                  }, 0);
                }
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
async function evaluateLinkage({
  linkage,
  formData,
  linkageFunctions,
  fieldPath,
  asyncSequenceManager,
}: {
  linkage: LinkageConfig;
  formData: Record<string, any>;
  linkageFunctions: Record<string, LinkageFunction>;
  fieldPath: string;
  asyncSequenceManager: AsyncSequenceManager;
}): Promise<LinkageResult> {
  const result: LinkageResult = {};

  // 构建联动函数上下文
  const { arrayPath, arrayIndex } = extractArrayContext(fieldPath);
  const context: LinkageFunctionContext = {
    fieldPath,
    arrayPath,
    arrayIndex,
  };

  // 如果没有 when 条件，默认使用 fulfill
  const shouldFulfill = linkage.when
    ? await evaluateCondition(linkage.when, formData, linkageFunctions, context)
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
      // 生成新的序列号（在调用异步函数之前）
      const sequence = asyncSequenceManager.next(fieldPath);

      // 使用 await 支持异步函数，传递 context
      const fnResult = await fn(formData, context);

      // 检查序列号是否仍然是最新的（防止竞态条件）
      if (!asyncSequenceManager.isLatest(fieldPath, sequence)) {
        console.log(
          `[useLinkageManager] 检测到过期的异步结果，字段: ${fieldPath}, 序列号: ${sequence}`
        );
        // 返回空结果，不更新状态
        return {};
      }

      // 根据 linkage.type 决定将结果赋值给哪个字段
      switch (linkage.type) {
        case 'value':
          result.value = fnResult;
          break;
        case 'options':
          result.options = fnResult;
          break;
        case 'schema':
          result.schema = fnResult;
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
  linkageFunctions: Record<string, LinkageFunction>,
  context: LinkageFunctionContext
): Promise<boolean> {
  // 如果是字符串，尝试作为函数名调用
  if (typeof when === 'string') {
    const fn = linkageFunctions[when];
    if (fn) {
      // 使用 await 支持异步函数，传递 context
      const result = await fn(formData, context);
      return Boolean(result);
    }
    console.warn(`Linkage function "${when}" not found`);
    return false;
  }

  // 否则作为条件表达式求值
  return ConditionEvaluator.evaluate(when, formData);
}
