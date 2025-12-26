import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card } from '@blueprintjs/core';
import { DynamicForm } from '../DynamicForm';
import type { FieldWidgetProps } from '../types';
import type { ExtendedJSONSchema } from '@/types/schema';
import { PathResolver } from '@/utils/pathResolver';
import { useNestedSchemaRegistry } from '../context/NestedSchemaContext';
import { usePathPrefix, joinPath, removePrefix } from '../context/PathPrefixContext';

export interface NestedFormWidgetProps extends FieldWidgetProps {
  // 当前字段的 schema（包含 properties）
  schema: ExtendedJSONSchema;

  // 动态 Schema 配置（可选）
  schemaKey?: string;
  schemas?: Record<
    string,
    {
      properties?: Record<string, ExtendedJSONSchema>;
      required?: string[];
    }
  >;
  schemaLoader?: (value: any) => Promise<ExtendedJSONSchema>;

  // 当前字段值（对象）
  value?: Record<string, any>;

  // 值变化回调
  onChange?: (value: Record<string, any>) => void;

  // 其他配置
  disabled?: boolean;
  readonly?: boolean;
}

export const NestedFormWidget = forwardRef<HTMLDivElement, NestedFormWidgetProps>(
  ({ name, value = {}, schema, disabled, readonly }, ref) => {
    const [currentSchema, setCurrentSchema] = useState(schema);
    const [loading, setLoading] = useState(false);
    // 保存外层表单的 context，避免被内部嵌套表单覆盖
    const parentFormContext = useFormContext();
    const { control, watch, getValues, setValue } = parentFormContext;

    // 获取父级路径前缀
    const parentPathPrefix = usePathPrefix();
    // 计算当前字段的完整路径
    const fullPath = joinPath(parentPathPrefix, name);

    // 获取嵌套 schema 注册表
    const nestedSchemaRegistry = useNestedSchemaRegistry();

    // 从 schema.ui 中获取嵌套表单配置
    const schemaKey = schema.ui?.schemaKey;
    const schemas = schema.ui?.schemas;
    const schemaLoader = schema.ui?.schemaLoader;

    // 保存当前的 schema key 值，用于检测切换
    const previousKeyRef = useRef<string | undefined>();

    // 注册当前 schema 到 Context（当 currentSchema 变化时更新）
    useEffect(() => {
      nestedSchemaRegistry.register(fullPath, currentSchema);
      console.info(`[NestedFormWidget] 注册字段 "${fullPath}" 的 schema 到 Context`);

      return () => {
        nestedSchemaRegistry.unregister(fullPath);
        console.info(`[NestedFormWidget] 注销字段 "${fullPath}" 的 schema`);
      };
    }, [fullPath, currentSchema, nestedSchemaRegistry]);

    // 处理动态 schema 加载
    useEffect(() => {
      if (!schemaKey || !schemas) return;

      // 转换为 react-hook-form 的字段路径用于监听
      const watchFieldPath = PathResolver.toFieldPath(schemaKey);
      console.info(
        '[NestedFormWidget] 初始化监听 - schemaKey:',
        schemaKey,
        'watchFieldPath:',
        watchFieldPath
      );

      // 获取依赖字段的值（支持 JSON Pointer）
      const getSchemaKeyValue = () => {
        const currentFormValues = getValues();
        console.info('[NestedFormWidget] currentFormValues:', currentFormValues);
        console.info('[NestedFormWidget] name:', name);
        // const value = PathResolver.resolve(schemaKey, currentFormValues);

        const fullFieldPath = PathResolver.toFieldPath(schemaKey);
        const value = PathResolver.getNestedValue(
          currentFormValues,
          removePrefix(fullFieldPath, parentPathPrefix)
        );

        console.info('[NestedFormWidget] 获取依赖字段值:', value, 'from path:', schemaKey);

        return value;
      };

      // 初始化时检查当前值
      const currentKey = getSchemaKeyValue();
      console.info(
        '[NestedFormWidget] 初始 currentKey:',
        currentKey,
        'schemas:',
        Object.keys(schemas)
      );

      if (currentKey && schemas[currentKey]) {
        console.info('[NestedFormWidget] 设置初始 schema for key:', currentKey);
        setCurrentSchema({
          ...schema,
          properties: schemas[currentKey].properties,
          required: schemas[currentKey].required,
        });
        previousKeyRef.current = currentKey;
      }

      // 监听依赖字段变化
      const subscription = watch((formValues, { name: changedField }) => {
        // 拼接完整的 changedField 路径（如果有父级前缀）
        const fullChangedField = parentPathPrefix
          ? joinPath(parentPathPrefix, changedField || '')
          : changedField;

        console.info(
          '[NestedFormWidget] watch 回调触发 - changedField:',
          changedField,
          ', fullChangedField:',
          fullChangedField,
          ', watchFieldPath:',
          watchFieldPath,
          ', parentPathPrefix:',
          parentPathPrefix
        );

        // 检查变化的字段是否是我们监听的字段
        if (fullChangedField === watchFieldPath) {
          const key = getSchemaKeyValue();
          console.info(
            '[NestedFormWidget] 依赖字段匹配！新值:',
            key,
            '旧值:',
            previousKeyRef.current
          );

          const dynamicSchema = schemas[key];

          if (dynamicSchema) {
            // 检测到类型切换，保留旧数据（不清除）
            if (previousKeyRef.current && previousKeyRef.current !== key) {
              console.info(
                `[NestedFormWidget] 类型从 "${previousKeyRef.current}" 切换到 "${key}"，保留字段 "${name}" 的数据`
              );
            }

            // 更新 schema
            console.info('[NestedFormWidget] 更新 schema to:', key);
            setCurrentSchema({
              ...schema,
              properties: dynamicSchema.properties,
              required: dynamicSchema.required,
            });

            // 更新当前 key
            previousKeyRef.current = key;
          } else {
            console.warn('[NestedFormWidget] 未找到对应的 schema for key:', key);
          }
        }
      });

      return () => {
        console.info('[NestedFormWidget] 取消订阅 watch');
        subscription.unsubscribe();
      };
    }, [schemaKey, schemas, watch, schema, getValues, name]);

    // 处理异步 schema 加载
    useEffect(() => {
      if (schemaLoader && value) {
        setLoading(true);
        schemaLoader(value)
          .then(setCurrentSchema)
          .finally(() => setLoading(false));
      }
    }, [schemaLoader, value]);

    if (loading) {
      return (
        <div ref={ref} className="nested-form-loading">
          加载中...
        </div>
      );
    }

    if (!currentSchema || !currentSchema.properties) {
      return null;
    }

    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Card
            ref={ref}
            className="nested-form-widget"
            data-name={name}
            elevation={1}
            style={{ padding: '15px' }}
          >
            <DynamicForm
              schema={currentSchema}
              defaultValues={field.value || {}}
              onChange={field.onChange}
              disabled={disabled}
              readonly={readonly}
              showSubmitButton={false}
              renderAsForm={false}
              onSubmit={() => {}}
              pathPrefix={fullPath}
            />
          </Card>
        )}
      />
    );
  }
);

NestedFormWidget.displayName = 'NestedFormWidget';
