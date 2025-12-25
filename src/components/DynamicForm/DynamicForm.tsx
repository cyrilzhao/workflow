import React, { useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@blueprintjs/core';
import { SchemaParser } from './core/SchemaParser';
import { FormField } from './layout/FormField';
import type { DynamicFormProps } from './types';
import { parseSchemaLinkages } from '@/utils/schemaLinkageParser';
import { useLinkageManager } from '@/hooks/useLinkageManager';
import { filterValueWithNestedSchemas } from './utils/filterValueWithNestedSchemas';
import { NestedSchemaProvider, useNestedSchemaRegistryOptional } from './context/NestedSchemaContext';
import '@blueprintjs/core/lib/css/blueprint.css';

// 内层组件：实际的表单逻辑
const DynamicFormInner: React.FC<DynamicFormProps> = ({
  schema,
  defaultValues = {},
  onSubmit,
  onChange,
  widgets = {},
  linkageFunctions = {},
  customFormats = {},
  layout = 'vertical',
  showSubmitButton = true,
  renderAsForm = true,
  validateMode = 'onSubmit',
  loading = false,
  disabled = false,
  readonly = false,
  className,
  style,
}) => {
  // 设置自定义格式验证器并解析字段
  const fields = useMemo(() => {
    if (customFormats && Object.keys(customFormats).length > 0) {
      SchemaParser.setCustomFormats(customFormats);
    }
    return SchemaParser.parse(schema);
  }, [schema, customFormats]);

  const methods = useForm({
    defaultValues,
    mode: validateMode,
  });

  // 解析 schema 中的联动配置
  const { linkages } = useMemo(() => parseSchemaLinkages(schema), [schema]);

  // 使用联动管理器
  const linkageStates = useLinkageManager({
    form: methods,
    linkages,
    linkageFunctions,
  });

  const { handleSubmit, watch } = methods;

  // 获取嵌套 schema 注册表（可选，因为可能不在 Provider 内部）
  const nestedSchemaRegistry = useNestedSchemaRegistryOptional();

  React.useEffect(() => {
    if (onChange) {
      const subscription = watch(data => onChange(data));
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange]);

  const onSubmitHandler = async (data: Record<string, any>) => {
    if (onSubmit) {
      // 根据当前 schema 过滤数据，只保留 schema 中定义的字段
      // 如果有嵌套 schema 注册表，使用它来正确过滤动态嵌套表单的数据
      const filteredData = nestedSchemaRegistry
        ? filterValueWithNestedSchemas(data, schema, nestedSchemaRegistry.getAllSchemas())
        : filterValueWithNestedSchemas(data, schema, new Map());

      await onSubmit(filteredData);
    }
  };

  // 渲染表单字段
  const renderFields = () => (
    <div className="dynamic-form__fields">
      {fields.map(field => {
        const linkageState = linkageStates[field.name];

        // 如果联动状态指定不可见，则不渲染该字段
        if (linkageState?.visible === false) {
          return null;
        }

        return (
          <FormField
            key={field.name}
            field={field}
            disabled={disabled || field.disabled || loading || linkageState?.disabled}
            readonly={readonly || field.readonly || linkageState?.readonly}
            widgets={widgets}
            linkageState={linkageState}
          />
        );
      })}
    </div>
  );

  // 渲染提交按钮
  const renderSubmitButton = () => {
    if (!showSubmitButton) return null;

    return (
      <div className="dynamic-form__actions" style={{ marginTop: '20px' }}>
        <Button type="submit" intent="primary" loading={loading} disabled={loading || disabled}>
          {loading ? '提交中...' : '提交'}
        </Button>
      </div>
    );
  };

  const formClassName = `dynamic-form dynamic-form--${layout} ${className || ''}`;

  return (
    <FormProvider {...methods}>
      {renderAsForm ? (
        <form onSubmit={handleSubmit(onSubmitHandler)} className={formClassName} style={style}>
          {renderFields()}
          {renderSubmitButton()}
        </form>
      ) : (
        <div className={formClassName} style={style}>
          {renderFields()}
          {renderSubmitButton()}
        </div>
      )}
    </FormProvider>
  );
};

// 外层组件：提供 NestedSchemaProvider
export const DynamicForm: React.FC<DynamicFormProps> = props => {
  // 如果已经在 NestedSchemaProvider 内部（嵌套表单场景），直接渲染内层组件
  const existingRegistry = useNestedSchemaRegistryOptional();

  if (existingRegistry) {
    return <DynamicFormInner {...props} />;
  }

  // 否则提供新的 NestedSchemaProvider（顶层表单场景）
  return (
    <NestedSchemaProvider>
      <DynamicFormInner {...props} />
    </NestedSchemaProvider>
  );
};
