import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { NodeConfigSchema } from './types';
import './SchemaForm.scss';

interface SchemaFormProps {
  schema: NodeConfigSchema;
  data: any;
  onChange: (data: any) => void;
  formComponents?: Record<string, React.ComponentType<any>>;
}

export const SchemaForm: React.FC<SchemaFormProps> = ({
  schema,
  data,
  onChange,
  formComponents = {},
}) => {
  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: data,
    mode: 'onChange',
  });

  // Watch for changes and propagate to parent
  useEffect(() => {
    const subscription = watch(value => {
      onChange(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  // Reset form when data changes externally (e.g. switching nodes)
  useEffect(() => {
    reset(data);
  }, [data, reset]);

  const renderField = (key: string, property: NodeConfigSchema) => {
    const {
      widget,
      type,
      title,
      description,
      enum: enumOptions,
      enumNames,
      props = {},
      rules,
    } = property;

    // Determine widget type
    let widgetType = widget;
    if (!widgetType) {
      if (enumOptions) widgetType = 'select';
      else if (type === 'boolean') widgetType = 'checkbox';
      else widgetType = 'input';
    }

    const CustomComponent = formComponents[widgetType];

    return (
      <div key={key} className="form-item">
        <label className="form-label">
          {title || key}
          {rules?.required && <span className="required">*</span>}
        </label>
        {description && <div className="form-description">{description}</div>}

        <div className="form-control">
          <Controller
            name={key}
            control={control}
            rules={rules}
            render={({ field, fieldState }) => {
              if (CustomComponent) {
                return <CustomComponent {...field} {...props} error={fieldState.error} />;
              }

              switch (widgetType) {
                case 'select':
                  return (
                    <select {...field} className="input-select" {...props}>
                      <option value="">Select...</option>
                      {enumOptions?.map((opt: any, idx: number) => (
                        <option key={String(opt)} value={opt}>
                          {enumNames?.[idx] || opt}
                        </option>
                      ))}
                    </select>
                  );
                case 'radio':
                  return (
                    <div className="radio-group" {...props}>
                      {enumOptions?.map((opt: any, idx: number) => (
                        <label key={String(opt)} className="radio-item">
                          <input
                            type="radio"
                            {...field}
                            value={opt}
                            checked={field.value === opt}
                          />
                          {enumNames?.[idx] || opt}
                        </label>
                      ))}
                    </div>
                  );
                case 'checkbox':
                  return (
                    <input
                      type="checkbox"
                      checked={!!field.value}
                      onChange={e => field.onChange(e.target.checked)}
                      className="input-checkbox"
                      {...props}
                    />
                  );
                case 'textarea':
                  return <textarea {...field} className="input-textarea" {...props} />;
                default: // input
                  return (
                    <input
                      type={type === 'number' ? 'number' : 'text'}
                      {...field}
                      onChange={e => {
                        const val = type === 'number' ? Number(e.target.value) : e.target.value;
                        field.onChange(val);
                      }}
                      className="input-text"
                      {...props}
                    />
                  );
              }
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <form className="schema-form" onSubmit={handleSubmit(onChange)}>
      {schema.properties &&
        Object.entries(schema.properties).map(([key, property]) =>
          renderField(key, property as NodeConfigSchema)
        )}
    </form>
  );
};
