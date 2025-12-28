import { useMemo, useEffect, useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { LinkageConfig, LinkageFunction } from '@/types/linkage';
import type { LinkageResult } from '@/types/linkage';
import type { ExtendedJSONSchema } from '@/types/schema';
import { useLinkageManager as useBaseLinkageManager } from './useLinkageManager';
import {
  isArrayElementPath,
  extractArrayInfo,
  resolveArrayElementLinkage,
} from '@/utils/arrayLinkageHelper';
import type { PathMapping } from '@/utils/schemaLinkageParser';
import { DependencyGraph } from '@/utils/dependencyGraph';
import { PathResolver } from '@/utils/pathResolver';

interface ArrayLinkageManagerOptions {
  form: UseFormReturn<any>;
  baseLinkages: Record<string, LinkageConfig>;
  linkageFunctions?: Record<string, LinkageFunction>;
  schema?: ExtendedJSONSchema; // 用于完整的路径解析
  pathMappings?: PathMapping[]; // 路径映射表
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
  pathMappings = [],
  onCycleDetected,
  throwOnCycle = false,
}: ArrayLinkageManagerOptions) {
  const { watch, getValues } = form;

  // 动态联动配置（包含运行时生成的数组元素联动）
  const [dynamicLinkages, setDynamicLinkages] = useState<Record<string, LinkageConfig>>({});

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
  }, [baseLinkages, dynamicLinkages, onCycleDetected, throwOnCycle]);

  // 使用基础联动管理器（传递路径映射）
  const linkageStates = useBaseLinkageManager({
    form,
    linkages: allLinkages,
    linkageFunctions,
    pathMappings,
  });

  // 监听表单数据变化，动态注册数组元素的联动
  useEffect(() => {
    const subscription = watch(() => {
      const formData = getValues();
      const newDynamicLinkages: Record<string, LinkageConfig> = {};

      console.log('[useArrayLinkageManager] 表单数据变化:', JSON.stringify(formData));
      console.log('[useArrayLinkageManager] baseLinkages:', JSON.stringify(baseLinkages));

      // 遍历基础联动配置，找出数组相关的联动
      Object.entries(baseLinkages).forEach(([fieldPath, linkage]) => {
        console.log('[useArrayLinkageManager] 处理字段路径:', fieldPath);

        // 检查是否是数组元素的联动配置（路径中不包含数字索引）
        if (!isArrayElementPath(fieldPath) && fieldPath.includes('.')) {
          // 尝试从 formData 中找到对应的数组
          const parts = fieldPath.split('.');

          // 查找可能的数组路径
          for (let i = 0; i < parts.length - 1; i++) {
            const possibleArrayPath = parts.slice(0, i + 1).join('.');
            const value = getNestedValue(formData, possibleArrayPath);

            console.log(
              '[useArrayLinkageManager] 检查路径:',
              possibleArrayPath,
              '是否为数组:',
              Array.isArray(value)
            );

            if (Array.isArray(value)) {
              // 找到数组，为每个元素生成联动配置
              const fieldPathInArray = parts.slice(i + 1).join('.');

              console.log(
                '[useArrayLinkageManager] 找到数组:',
                possibleArrayPath,
                '元素数量:',
                value.length
              );
              console.log('[useArrayLinkageManager] 数组内字段路径:', fieldPathInArray);

              value.forEach((_, index) => {
                const elementFieldPath = `${possibleArrayPath}.${index}.${fieldPathInArray}`;
                // 传递 schema 参数以支持完整的路径解析（包括 JSON Pointer）
                const resolvedLinkage = resolveArrayElementLinkage(
                  linkage,
                  elementFieldPath,
                  schema
                );
                newDynamicLinkages[elementFieldPath] = resolvedLinkage;

                console.log('[useArrayLinkageManager] 生成联动配置:', elementFieldPath);
                console.log(
                  '[useArrayLinkageManager] 解析后的联动:',
                  JSON.stringify(resolvedLinkage)
                );
              });

              break;
            }
          }
        }
      });

      console.log(
        '[useArrayLinkageManager] 最终生成的动态联动配置:',
        JSON.stringify(newDynamicLinkages)
      );
      setDynamicLinkages(newDynamicLinkages);
    });

    return () => subscription.unsubscribe();
  }, [watch, getValues, baseLinkages, schema]);

  return linkageStates;
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
