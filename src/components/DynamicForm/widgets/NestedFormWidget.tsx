import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card } from '@blueprintjs/core';
import { DynamicForm } from '../DynamicForm';
import type { FieldWidgetProps } from '../types';
import type { ExtendedJSONSchema } from '@/types/schema';
import { PathResolver } from '@/utils/pathResolver';
import { useNestedSchemaRegistry } from '../context/NestedSchemaContext';

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
    const { control, watch, getValues, setValue } = useFormContext();

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
      nestedSchemaRegistry.register(name, currentSchema);
      console.info(`[NestedFormWidget] 注册字段 "${name}" 的 schema 到 Context`);

      return () => {
        nestedSchemaRegistry.unregister(name);
        console.info(`[NestedFormWidget] 注销字段 "${name}" 的 schema`);
      };
    }, [name, currentSchema, nestedSchemaRegistry]);

    // 处理动态 schema 加载
    useEffect(() => {
      if (schemaKey && schemas) {
        // 获取依赖字段的值（支持 JSON Pointer）
        const getSchemaKeyValue = () => {
          const currentFormValues = getValues();
          return PathResolver.resolve(schemaKey, currentFormValues);
        };

        // 初始化时检查当前值
        const currentKey = getSchemaKeyValue();
        if (currentKey && schemas[currentKey]) {
          setCurrentSchema({
            ...schema,
            properties: schemas[currentKey].properties,
            required: schemas[currentKey].required,
          });
          previousKeyRef.current = currentKey;
        }

        // 转换为 react-hook-form 的字段路径用于监听
        const watchFieldPath = PathResolver.toFieldPath(schemaKey);

        // 监听依赖字段变化
        const subscription = watch((_, { name: changedField }) => {
          if (changedField === watchFieldPath) {
            const key = getSchemaKeyValue();
            const dynamicSchema = schemas[key];

            if (dynamicSchema) {
              // 检测到类型切换，保留旧数据（不清除）
              if (previousKeyRef.current && previousKeyRef.current !== key) {
                console.info(
                  `[NestedFormWidget] 类型从 "${previousKeyRef.current}" 切换到 "${key}"，保留字段 "${name}" 的数据`
                );
                // 注意：这里不清除数据，让用户可以自由切换类型而不丢失数据
                // 数据过滤会在表单提交时通过 filterValueBySchema 自动处理
              }

              // 更新 schema
              setCurrentSchema({
                ...schema,
                properties: dynamicSchema.properties,
                required: dynamicSchema.required,
              });

              // 更新当前 key
              previousKeyRef.current = key;
            }
          }
        });
        return () => subscription.unsubscribe();
      }
    }, [schemaKey, schemas, watch, schema, getValues, setValue, name]);

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
          <Card ref={ref} className="nested-form-widget" elevation={1} style={{ padding: '15px' }}>
            <DynamicForm
              schema={currentSchema}
              defaultValues={field.value || {}}
              onChange={field.onChange}
              disabled={disabled}
              readonly={readonly}
              showSubmitButton={false}
              renderAsForm={false}
              onSubmit={() => {}}
            />
          </Card>
        )}
      />
    );
  }
);

NestedFormWidget.displayName = 'NestedFormWidget';
