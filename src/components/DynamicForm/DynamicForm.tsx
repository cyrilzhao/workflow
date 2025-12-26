import React, { useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@blueprintjs/core';
import { SchemaParser } from './core/SchemaParser';
import { FormField } from './layout/FormField';
import type { DynamicFormProps } from './types';
import { parseSchemaLinkages } from '@/utils/schemaLinkageParser';
import { useLinkageManager } from '@/hooks/useLinkageManager';
import { filterValueWithNestedSchemas } from './utils/filterValueWithNestedSchemas';
import {
  NestedSchemaProvider,
  useNestedSchemaRegistryOptional,
} from './context/NestedSchemaContext';
import { PathPrefixProvider } from './context/PathPrefixContext';
import '@blueprintjs/core/lib/css/blueprint.css';

// 空对象常量，避免每次渲染创建新对象
const EMPTY_LINKAGE_FUNCTIONS = {};
const EMPTY_WIDGETS = {};
const EMPTY_CUSTOM_FORMATS = {};

// 内层组件：实际的表单逻辑
const DynamicFormInner: React.FC<DynamicFormProps> = ({
  schema,
  defaultValues = {},
  onSubmit,
  onChange,
  widgets,
  linkageFunctions,
  customFormats,
  layout = 'vertical',
  showSubmitButton = true,
  renderAsForm = true,
  validateMode = 'onSubmit',
  loading = false,
  disabled = false,
  readonly = false,
  className,
  style,
  pathPrefix = '',
}) => {
  // 使用稳定的空对象引用，避免每次渲染创建新对象导致 useEffect 重复触发
  const stableLinkageFunctions = linkageFunctions || EMPTY_LINKAGE_FUNCTIONS;
  const stableWidgets = widgets || EMPTY_WIDGETS;
  const stableCustomFormats = customFormats || EMPTY_CUSTOM_FORMATS;
  // 设置自定义格式验证器并解析字段
  const fields = useMemo(() => {
    if (stableCustomFormats && Object.keys(stableCustomFormats).length > 0) {
      SchemaParser.setCustomFormats(stableCustomFormats);
    }
    return SchemaParser.parse(schema);
  }, [schema, stableCustomFormats]);

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
    linkageFunctions: stableLinkageFunctions,
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
      console.info('cyril data: ', data);
      console.info('cyril nestedSchemaRegistry: ', nestedSchemaRegistry);
      console.info('cyril schema: ', schema);
      console.info(
        'cyril nestedSchemaRegistry.getAllSchemas(): ',
        nestedSchemaRegistry?.getAllSchemas()
      );
      // 根据当前 schema 过滤数据，只保留 schema 中定义的字段
      // 如果有嵌套 schema 注册表，使用它来正确过滤动态嵌套表单的数据
      const filteredData = nestedSchemaRegistry
        ? filterValueWithNestedSchemas(data, schema, nestedSchemaRegistry.getAllSchemas())
        : filterValueWithNestedSchemas(data, schema, new Map());

      console.info('cyril filteredData: ', filteredData);
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
            widgets={stableWidgets}
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
      <PathPrefixProvider prefix={pathPrefix}>
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
      </PathPrefixProvider>
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
