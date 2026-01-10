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
import { LinkageTaskQueue } from '../utils/linkageTaskQueue';

/**
 * 异步结果过期错误
 * 当异步联动函数的结果因为新的计算而过期时抛出
 */
class StaleResultError extends Error {
  constructor(fieldPath: string, sequence: number) {
    super(`Stale async result for field: ${fieldPath}, sequence: ${sequence}`);
    this.name = 'StaleResultError';
  }
}

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
 * v4.0：集成任务队列管理器，解决串行依赖执行和死循环防护问题
 */
export function useLinkageManager({
  form,
  linkages,
  linkageFunctions = {},
}: LinkageManagerOptions) {
  const { watch, getValues, setValue } = form;

  // 创建异步序列号管理器实例（使用 useRef 保持引用稳定）
  const asyncSequenceManager = useRef(new AsyncSequenceManager()).current;

  // 创建任务队列管理器实例
  const taskQueue = useRef(new LinkageTaskQueue()).current;

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

  /**
   * 队列处理器：串行执行联动任务
   */
  const processQueue = useRef(async () => {
    // 如果已经在处理中，直接返回（避免并发执行）
    if (taskQueue.getProcessing()) return;

    taskQueue.setProcessing(true);

    try {
      while (!taskQueue.isEmpty()) {
        const task = taskQueue.dequeue();
        if (!task) break;

        // 检查任务是否仍然有效（可能已被更新的任务替代）
        if (!taskQueue.isTaskValid(task.fieldName, task.timestamp)) {
          continue;
        }

        // 获取最新的表单数据
        let formData = { ...getValues() };

        // 获取受影响的字段并进行拓扑排序
        const affectedFields = dependencyGraph.getAffectedFields(task.fieldName);
        const sortedFields = dependencyGraph.topologicalSort(affectedFields);

        const newStates: Record<string, LinkageResult> = {};

        // 串行执行联动，更新 formData
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

            // 如果是值联动，更新 formData 以供后续字段使用
            if (linkage.type === 'value' && result.value !== undefined) {
              formData[fieldName] = result.value;
            }
          } catch (error) {
            // 如果是过期的异步结果，跳过该字段的状态更新
            // 但不影响后续字段的计算（使用当前 formData 中的值）
            if (error instanceof StaleResultError) {
              continue;
            }
            console.error('联动计算失败:', fieldName, error);
          }
        }

        // 批量更新状态
        if (Object.keys(newStates).length > 0) {
          setLinkageStates(prev => ({ ...prev, ...newStates }));
        }

        // 批量更新表单（设置标志位防止 watch 触发 processQueue）
        taskQueue.setUpdatingForm(true);
        for (const fieldName of sortedFields) {
          const linkage = linkages[fieldName];
          if (linkage?.type === 'value' && formData[fieldName] !== undefined) {
            const currentValue = getValues(fieldName);
            if (currentValue !== formData[fieldName]) {
              setValue(fieldName, formData[fieldName], {
                shouldValidate: false,
                shouldDirty: false,
              });
            }
          }
        }

        // 使用 Promise 确保 setValue 触发的 watch 都已执行
        await new Promise(resolve => setTimeout(resolve, 0));
        taskQueue.setUpdatingForm(false);
      }
    } finally {
      taskQueue.setProcessing(false);

      // 处理完成后，如果队列中有新任务，继续处理
      if (!taskQueue.isEmpty()) {
        processQueue();
      }
    }
  }).current;

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
          // 如果是过期的异步结果，跳过该字段的状态更新
          if (error instanceof StaleResultError) {
            continue;
          }
          console.error('联动初始化失败:', fieldName, error);
        }
      }

      setLinkageStates(states);

      // 批量更新表单（将计算出的值联动结果写入表单）
      taskQueue.setUpdatingForm(true);
      for (const fieldName of sortedFields) {
        const linkage = linkages[fieldName];
        if (linkage?.type === 'value' && formData[fieldName] !== undefined) {
          const currentValue = getValues(fieldName);
          if (currentValue !== formData[fieldName]) {
            setValue(fieldName, formData[fieldName], {
              shouldValidate: false,
              shouldDirty: false,
            });
          }
        }
      }
      // 使用 Promise 确保 setValue 触发的 watch 都已执行
      await new Promise(resolve => setTimeout(resolve, 0));
      taskQueue.setUpdatingForm(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkages, linkageFunctions, dependencyGraph]);

  // 统一的字段变化监听和联动处理（使用任务队列）
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;

      // 无论是否在批量更新，都将任务加入队列（避免丢失用户修改）
      taskQueue.enqueue(name);

      // 如果队列正在批量更新，不触发 processQueue
      // 批量更新完成后，队列会自动继续处理
      if (taskQueue.isUpdatingForm()) {
        return;
      }

      // 触发队列处理
      processQueue();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, linkages, linkageFunctions, dependencyGraph]);

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

      if (process.env.NODE_ENV !== 'production') {
        console.log('[evaluateLinkage] 函数执行结果:', {
          fieldPath,
          functionName: effect.function,
          linkageType: linkage.type,
          fnResult,
          context,
          formData,
        });
      }

      // 检查序列号是否仍然是最新的（防止竞态条件）
      if (!asyncSequenceManager.isLatest(fieldPath, sequence)) {
        // 抛出过期错误，让调用方决定如何处理
        throw new StaleResultError(fieldPath, sequence);
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
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[evaluateLinkage] 联动函数未找到:', {
          fieldPath,
          functionName: effect.function,
          availableFunctions: Object.keys(linkageFunctions),
        });
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
