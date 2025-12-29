import { useMemo, useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type {
  LinkageConfig,
  LinkageFunction,
  ConditionExpression,
  LinkageFunctionContext,
} from '@/types/linkage';
import type { LinkageResult } from '@/types/linkage';
import { ConditionEvaluator } from '@/utils/conditionEvaluator';
import { DependencyGraph } from '@/utils/dependencyGraph';
import { PathResolver } from '@/utils/pathResolver';
import type { PathMapping } from '@/utils/schemaLinkageParser';
import { physicalToLogicalPath } from '@/utils/schemaLinkageParser';

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
  pathMappings?: PathMapping[]; // 新增：路径映射表
}

/**
 * 联动管理器 Hook
 */
export function useLinkageManager({
  form,
  linkages,
  linkageFunctions = {},
  pathMappings = [], // 新增：路径映射表
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

  // 将物理路径的表单数据转换为逻辑路径（用于路径透明化场景）
  const transformFormData = (physicalData: any): any => {
    if (pathMappings.length === 0) {
      return physicalData;
    }

    const logicalData: any = { ...physicalData };

    // 遍历路径映射，将物理路径的数据复制到逻辑路径
    pathMappings.forEach(mapping => {
      const physicalValue = getNestedValue(physicalData, mapping.physicalPath);
      if (physicalValue !== undefined) {
        setNestedValue(logicalData, mapping.logicalPath, physicalValue);
      }
    });

    return logicalData;
  };

  // 初始化联动状态
  useEffect(() => {
    (async () => {
      const physicalFormData = { ...getValues() };
      // 转换为逻辑路径的数据
      const formData = transformFormData(physicalFormData);
      const states: Record<string, LinkageResult> = {};

      // 获取拓扑排序后的字段列表
      const sortedFields = dependencyGraph.topologicalSort(Object.keys(linkages));

      // 按拓扑顺序依次计算联动状态
      for (const fieldName of sortedFields) {
        const linkage = linkages[fieldName];
        if (!linkage) continue;

        try {
          const result = await evaluateLinkage(linkage, formData, linkageFunctions, fieldName);
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
  }, [linkages, linkageFunctions, dependencyGraph, pathMappings]);

  // 统一的字段变化监听和联动处理
  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (!name) return;

      // 将物理路径转换为逻辑路径（用于依赖图查找）
      const logicalName = physicalToLogicalPath(name, pathMappings);

      // 获取受影响的字段（使用依赖图精确计算）
      const affectedFields = dependencyGraph.getAffectedFields(logicalName);
      if (affectedFields.length === 0) return;

      // 异步处理联动逻辑
      (async () => {
        const physicalFormData = { ...getValues() };
        // 转换为逻辑路径的数据
        const formData = transformFormData(physicalFormData);
        const newStates: Record<string, LinkageResult> = {};
        let hasStateChange = false;

        // 对受影响的字段进行拓扑排序，确保按依赖顺序计算
        const sortedFields = dependencyGraph.topologicalSort(affectedFields);

        // 按拓扑顺序依次计算联动结果
        for (const fieldName of sortedFields) {
          const linkage = linkages[fieldName];
          if (!linkage) continue;

          try {
            const result = await evaluateLinkage(linkage, formData, linkageFunctions, fieldName);
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
  linkageFunctions: Record<string, LinkageFunction>,
  fieldPath: string
): Promise<LinkageResult> {
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
      // 使用 await 支持异步函数，传递 context
      const fnResult = await fn(formData, context);

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
