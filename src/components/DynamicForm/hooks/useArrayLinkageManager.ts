import { useMemo, useEffect, useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { LinkageConfig, LinkageFunction } from '../types/linkage';
import type { ExtendedJSONSchema } from '../types/schema';
import { useLinkageManager as useBaseLinkageManager } from './useLinkageManager';
import {
  isArrayElementPath,
  resolveArrayElementLinkage,
  findArrayInPath,
} from '../utils/arrayLinkageHelper';
import { DependencyGraph } from '../utils/dependencyGraph';
import { PathResolver } from '../utils/pathResolver';

interface ArrayLinkageManagerOptions {
  form: UseFormReturn<any>;
  baseLinkages: Record<string, LinkageConfig>;
  linkageFunctions?: Record<string, LinkageFunction>;
  schema?: ExtendedJSONSchema; // 用于完整的路径解析
  /** 检测到循环依赖时的回调 */
  onCycleDetected?: (cycle: string[]) => void;
  /** 是否在检测到循环依赖时抛出错误（默认 false） */
  throwOnCycle?: boolean;
}

/**
 * 数组联动管理器 Hook
 *
 * 扩展基础联动管理器，支持数组元素内部的相对路径联动和 JSON Pointer 路径解析
 */
export function useArrayLinkageManager({
  form,
  baseLinkages,
  linkageFunctions = {},
  schema,
  onCycleDetected,
  throwOnCycle = false,
}: ArrayLinkageManagerOptions) {
  const { watch, getValues } = form;

  // 动态联动配置（包含运行时生成的数组元素联动）
  const [dynamicLinkages, setDynamicLinkages] = useState<Record<string, LinkageConfig>>({});

  // 强制刷新计数器，用于触发联动重新初始化
  const [refreshCounter, setRefreshCounter] = useState(0);

  /**
   * 根据当前表单数据生成动态联动配置
   * 这个函数会被 watch 回调和 refresh 函数调用
   */
  const generateDynamicLinkages = useCallback((): Record<string, LinkageConfig> => {
    if (!schema || Object.keys(baseLinkages).length === 0) {
      return {};
    }

    const formData = getValues();
    const newDynamicLinkages: Record<string, LinkageConfig> = {};

    // 遍历基础联动配置，找出数组相关的联动
    Object.entries(baseLinkages).forEach(([fieldPath, linkage]) => {
      // 如果路径已经包含数字索引（已实例化的联动），需要解析内部的 JSON Pointer 路径
      if (isArrayElementPath(fieldPath)) {
        const resolvedLinkage = resolveArrayElementLinkage(linkage, fieldPath, schema);
        newDynamicLinkages[fieldPath] = resolvedLinkage;
        return;
      }

      // 使用 schema 查找路径中的数组字段
      const arrayInfo = findArrayInPath(fieldPath, schema);

      if (!arrayInfo) {
        // 非数组字段的联动直接添加到 newDynamicLinkages
        newDynamicLinkages[fieldPath] = linkage;
        return;
      }

      const { arrayPath, fieldPathInArray } = arrayInfo;

      // 从 formData 中获取数组值
      const arrayValue = formData[arrayPath];

      if (!Array.isArray(arrayValue)) {
        return;
      }

      // 为每个数组元素生成联动配置
      arrayValue.forEach((_, index) => {
        const elementFieldPath = `${arrayPath}.${index}.${fieldPathInArray}`;
        const resolvedLinkage = resolveArrayElementLinkage(linkage, elementFieldPath, schema);
        newDynamicLinkages[elementFieldPath] = resolvedLinkage;
      });
    });

    return newDynamicLinkages;
  }, [baseLinkages, schema, getValues]);

  // 合并基础联动和动态联动，并进行循环依赖检测
  const allLinkages = useMemo(() => {
    const merged = { ...baseLinkages, ...dynamicLinkages };

    // 构建临时依赖图进行循环依赖检测
    const tempGraph = new DependencyGraph();
    Object.entries(merged).forEach(([fieldName, linkage]) => {
      linkage.dependencies.forEach(dep => {
        const normalizedDep = PathResolver.toFieldPath(dep);
        tempGraph.addDependency(fieldName, normalizedDep);
      });
    });

    // 检测循环依赖
    const validation = tempGraph.validate();
    if (!validation.isValid && validation.cycle) {
      console.error('[useArrayLinkageManager] 检测到循环依赖:', validation.cycle.join(' -> '));

      if (onCycleDetected) {
        onCycleDetected(validation.cycle);
      }

      if (throwOnCycle) {
        throw new Error(`循环依赖: ${validation.cycle.join(' -> ')}`);
      }
    }

    return merged;
  }, [baseLinkages, dynamicLinkages, onCycleDetected, throwOnCycle, refreshCounter]);

  // 使用基础联动管理器
  const { linkageStates, refresh: baseLinkageRefresh } = useBaseLinkageManager({
    form,
    linkages: allLinkages,
    linkageFunctions,
  });

  // 监听表单数据变化，动态注册数组元素的联动
  useEffect(() => {
    // ✅ 如果没有基础联动配置，不需要监听字段变化
    if (Object.keys(baseLinkages).length === 0) {
      return;
    }

    const subscription = watch(() => {
      const newDynamicLinkages = generateDynamicLinkages();
      setDynamicLinkages(newDynamicLinkages);
    });

    return () => subscription.unsubscribe();
  }, [watch, baseLinkages, generateDynamicLinkages]);

  /**
   * 刷新联动状态
   * 1. 重新生成动态联动配置（基于当前表单数据和最新的异步数据）
   * 2. 更新 refreshCounter 触发 allLinkages 重新计算
   * 3. 调用基础联动管理器的 refresh 触发联动重新初始化
   */
  const refresh = useCallback(() => {
    // 步骤1: 重新生成动态联动配置
    const newDynamicLinkages = generateDynamicLinkages();
    setDynamicLinkages(newDynamicLinkages);

    // 步骤2: 更新计数器，触发 allLinkages 重新计算
    setRefreshCounter(prev => prev + 1);

    // 步骤3: 调用基础联动管理器的 refresh
    // 注意：需要在下一个 tick 执行，确保 allLinkages 已经重新计算
    setTimeout(() => {
      baseLinkageRefresh();
    }, 0);
  }, [generateDynamicLinkages, baseLinkageRefresh]);

  return { linkageStates, refresh };
}
