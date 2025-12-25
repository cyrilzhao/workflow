import { forwardRef, useState, useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card } from '@blueprintjs/core';
import { DynamicForm } from '../DynamicForm';
import type { FieldWidgetProps } from '../types';
import type { ExtendedJSONSchema } from '@/types/schema';

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
    const { control, watch, getValues } = useFormContext();

    // 从 schema.ui 中获取嵌套表单配置
    const schemaKey = schema.ui?.schemaKey;
    const schemas = schema.ui?.schemas;
    const schemaLoader = schema.ui?.schemaLoader;

    // 处理动态 schema 加载
    useEffect(() => {
      if (schemaKey && schemas) {
        // 初始化时检查当前值
        const currentFormValues = getValues();
        const currentKey = currentFormValues[schemaKey];
        if (currentKey && schemas[currentKey]) {
          setCurrentSchema({
            ...schema,
            properties: schemas[currentKey].properties,
            required: schemas[currentKey].required,
          });
        }

        // 监听依赖字段变化
        const subscription = watch((formValue, { name: changedField }) => {
          console.info('cyril changedField: ', changedField);
          console.info('cyril schemaKey: ', schemaKey);

          if (changedField === schemaKey) {
            const currentFormValues = getValues();
            const key = currentFormValues[schemaKey];
            const dynamicSchema = schemas[key];
            console.info('cyril currentFormValues: ', currentFormValues);
            console.info('cyril key: ', key);
            console.info('cyril dynamicSchema: ', dynamicSchema);
            console.info('cyril schemas: ', schemas);
            if (dynamicSchema) {
              // 合并动态 properties 到当前 schema
              setCurrentSchema({
                ...schema,
                properties: dynamicSchema.properties,
                required: dynamicSchema.required,
              });
            }
          }
        });
        return () => subscription.unsubscribe();
      }
    }, [schemaKey, schemas, watch, schema, getValues]);

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
