import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { FormGroup } from '@blueprintjs/core';
import { FieldLabel } from '../components/FieldLabel';
import { FieldError } from '../components/FieldError';
import { FieldHelp } from '../components/FieldHelp';
import { FieldRegistry } from '../core/FieldRegistry';
import type { FieldConfig } from '@/types/schema';

interface FormFieldProps {
  field: FieldConfig;
  disabled?: boolean;
  readonly?: boolean;
  widgets?: Record<string, React.ComponentType<any>>;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  disabled,
  readonly,
  widgets = {},
}) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const WidgetComponent = widgets[field.widget] || FieldRegistry.getWidget(field.widget);

  if (!WidgetComponent) {
    console.warn(`Widget "${field.widget}" not found`);
    return null;
  }

  const error = errors[field.name]?.message as string | undefined;

  return (
    <FormGroup
      label={
        field.label ? (
          <FieldLabel htmlFor={field.name} label={field.label} required={field.required} />
        ) : undefined
      }
      labelFor={field.name}
      helperText={field.description ? <FieldHelp text={field.description} /> : undefined}
      intent={error ? 'danger' : 'none'}
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
          />
        )}
      />
      {error && <FieldError message={error} />}
    </FormGroup>
  );
};
