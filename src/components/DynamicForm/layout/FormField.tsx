import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { FormGroup } from '@blueprintjs/core';
import { FieldLabel } from '../components/FieldLabel';
import { FieldError } from '../components/FieldError';
import { FieldHelp } from '../components/FieldHelp';
import { FieldRegistry } from '../core/FieldRegistry';
import type { FieldConfig } from '@/types/schema';
import type { LinkageResult } from '@/types/linkage';

interface FormFieldProps {
  field: FieldConfig;
  disabled?: boolean;
  readonly?: boolean;
  widgets?: Record<string, React.ComponentType<any>>;
  linkageState?: LinkageResult;
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number | string;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  disabled,
  readonly,
  widgets = {},
  linkageState,
  layout = 'vertical',
  labelWidth,
}) => {
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext();

  // 当联动状态中有值时，自动设置字段值
  React.useEffect(() => {
    if (linkageState?.value !== undefined) {
      setValue(field.name, linkageState.value);
    }
  }, [linkageState?.value, field.name, setValue]);

  const WidgetComponent = widgets[field.widget] || FieldRegistry.getWidget(field.widget);

  if (!WidgetComponent) {
    console.warn(`Widget "${field.widget}" not found`);
    return null;
  }

  const error = errors[field.name]?.message as string | undefined;

  // 计算 layout 的优先级：字段级 > 父级 > 全局级
  const effectiveLayout = field.schema?.ui?.layout ?? layout;

  // 计算 labelWidth 的优先级：字段级 > 全局级
  const effectiveLabelWidth = field.schema?.ui?.labelWidth ?? labelWidth;

  // 构建 FormGroup 的样式，需要覆盖 Blueprint 的默认样式
  const formGroupStyle: React.CSSProperties = {};
  if (effectiveLayout === 'horizontal') {
    formGroupStyle.flexDirection = 'row';  // 覆盖 Blueprint 的 column
    formGroupStyle.alignItems = 'flex-start';
  } else if (effectiveLayout === 'inline') {
    formGroupStyle.display = 'inline-flex';
    formGroupStyle.marginRight = '15px';
  }

  // 构建 label 的样式
  const labelStyle: React.CSSProperties = {};
  if (effectiveLayout === 'horizontal' && effectiveLabelWidth) {
    labelStyle.width = typeof effectiveLabelWidth === 'number' ? `${effectiveLabelWidth}px` : effectiveLabelWidth;
    labelStyle.flexShrink = 0;
    labelStyle.marginRight = '12px';
  }

  return (
    <FormGroup
      label={
        field.label ? (
          <div style={labelStyle}>
            <FieldLabel htmlFor={field.name} label={field.label} required={field.required} />
          </div>
        ) : undefined
      }
      labelFor={field.name}
      helperText={field.description ? <FieldHelp text={field.description} /> : undefined}
      intent={error ? 'danger' : 'none'}
      style={formGroupStyle}
    >
      <Controller
        name={field.name}
        control={control}
        rules={field.validation}
        render={({ field: controllerField }) => (
          <WidgetComponent
            {...controllerField}
            placeholder={field.placeholder}
            disabled={disabled || field.disabled}
            readonly={readonly || field.readonly}
            options={field.options}
            error={error}
            schema={field.schema}
            layout={effectiveLayout}
            labelWidth={effectiveLabelWidth}
          />
        )}
      />
      {error && <FieldError message={error} />}
    </FormGroup>
  );
};
