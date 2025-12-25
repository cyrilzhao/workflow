import React, { useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@blueprintjs/core';
import { SchemaParser } from './core/SchemaParser';
import { FormField } from './layout/FormField';
import type { DynamicFormProps } from './types';
import { parseSchemaLinkages } from '@/utils/schemaLinkageParser';
import { useLinkageManager } from '@/hooks/useLinkageManager';
import '@blueprintjs/core/lib/css/blueprint.css';

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  defaultValues = {},
  onSubmit,
  onChange,
  widgets = {},
  linkageFunctions = {},
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
  const fields = useMemo(() => SchemaParser.parse(schema), [schema]);

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

  const {
    handleSubmit,
    watch,
  } = methods;

  React.useEffect(() => {
    if (onChange) {
      const subscription = watch(data => onChange(data));
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange]);

  const onSubmitHandler = async (data: Record<string, any>) => {
    if (onSubmit) {
      await onSubmit(data);
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
        <form
          onSubmit={handleSubmit(onSubmitHandler)}
          className={formClassName}
          style={style}
        >
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
