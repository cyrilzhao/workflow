# 动态表单组件技术方案 - Part 4

## 代码实现示例

### 7.1 主组件实现

```typescript
// src/components/DynamicForm/DynamicForm.tsx

import React, { useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { SchemaParser } from './core/SchemaParser';
import { FormField } from './layout/FormField';
import { ErrorList } from './components/ErrorList';
import { DynamicFormProps } from './types';
import './styles/DynamicForm.scss';

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  defaultValues = {},
  onSubmit,
  onChange,
  widgets = {},
  layout = 'vertical',
  showErrorList = true,
  validateMode = 'onSubmit',
  loading = false,
  disabled = false,
  readonly = false,
  className,
  style,
}) => {
  // 解析 Schema 生成字段配置
  const fields = useMemo(() => SchemaParser.parse(schema), [schema]);

  // 初始化表单
  const methods = useForm({
    defaultValues,
    mode: validateMode,
  });

  const {
    handleSubmit,
    formState: { errors },
    watch,
  } = methods;

  // 监听表单变化
  React.useEffect(() => {
    if (onChange) {
      const subscription = watch((data) => onChange(data));
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange]);

  // 提交处理
  const onSubmitHandler = async (data: Record<string, any>) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmitHandler)}
        className={`dynamic-form dynamic-form--${layout} ${className || ''}`}
        style={style}
      >
        {/* 错误列表 */}
        {showErrorList && Object.keys(errors).length > 0 && (
          <ErrorList errors={errors} />
        )}

        {/* 表单字段 */}
        <div className="dynamic-form__fields">
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              disabled={disabled || field.disabled || loading}
              readonly={readonly || field.readonly}
              widgets={widgets}
            />
          ))}
        </div>

        {/* 提交按钮 */}
        <div className="dynamic-form__actions">
          <button
            type="submit"
            className="dynamic-form__submit"
            disabled={loading || disabled}
          >
            {loading ? '提交中...' : '提交'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};
```

### 7.2 字段包装器实现

```typescript
// src/components/DynamicForm/layout/FormField.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldLabel } from '../components/FieldLabel';
import { FieldError } from '../components/FieldError';
import { FieldHelp } from '../components/FieldHelp';
import { FieldRegistry } from '../core/FieldRegistry';
import { FieldConfig } from '@/types/schema';

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
    formState: { errors },
  } = useFormContext();

  // 获取字段组件
  const WidgetComponent =
    widgets[field.widget] || FieldRegistry.getWidget(field.widget);

  if (!WidgetComponent) {
    console.warn(`Widget "${field.widget}" not found`);
    return null;
  }

  // 获取错误信息
  const error = errors[field.name]?.message as string | undefined;

  return (
    <div className={`form-field form-field--${field.widget}`}>
      {/* 字段标签 */}
      {field.label && (
        <FieldLabel
          htmlFor={field.name}
          label={field.label}
          required={field.required}
        />
      )}

      {/* 字段组件 */}
      <div className="form-field__widget">
        <WidgetComponent
          {...register(field.name, field.validation)}
          name={field.name}
          placeholder={field.placeholder}
          disabled={disabled}
          readonly={readonly}
          options={field.options}
          error={error}
        />
      </div>

      {/* 帮助文本 */}
      {field.description && <FieldHelp text={field.description} />}

      {/* 错误提示 */}
      {error && <FieldError message={error} />}
    </div>
  );
};
```

### 7.3 字段组件示例

#### 7.3.1 文本输入组件

```typescript
// src/components/DynamicForm/widgets/TextWidget.tsx

import React, { forwardRef } from 'react';
import { FieldWidgetProps } from '../types';

export const TextWidget = forwardRef<HTMLInputElement, FieldWidgetProps>(
  (
    {
      name,
      placeholder,
      disabled,
      readonly,
      error,
      onChange,
      onBlur,
      ...rest
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type="text"
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readonly}
        className={`text-widget ${error ? 'text-widget--error' : ''}`}
        onChange={onChange}
        onBlur={onBlur}
        {...rest}
      />
    );
  }
);

TextWidget.displayName = 'TextWidget';
```

#### 7.3.2 下拉选择组件

```typescript
// src/components/DynamicForm/widgets/SelectWidget.tsx

import React, { forwardRef } from 'react';
import { FieldWidgetProps } from '../types';

export const SelectWidget = forwardRef<HTMLSelectElement, FieldWidgetProps>(
  (
    {
      name,
      placeholder,
      disabled,
      readonly,
      options = [],
      error,
      onChange,
      onBlur,
      ...rest
    },
    ref
  ) => {
    return (
      <select
        ref={ref}
        name={name}
        disabled={disabled || readonly}
        className={`select-widget ${error ? 'select-widget--error' : ''}`}
        onChange={onChange}
        onBlur={onBlur}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

SelectWidget.displayName = 'SelectWidget';
```

#### 7.3.3 单选按钮组

```typescript
// src/components/DynamicForm/widgets/RadioWidget.tsx

import React, { forwardRef } from 'react';
import { FieldWidgetProps } from '../types';

export const RadioWidget = forwardRef<HTMLInputElement, FieldWidgetProps>(
  (
    {
      name,
      disabled,
      readonly,
      options = [],
      error,
      onChange,
      ...rest
    },
    ref
  ) => {
    return (
      <div className={`radio-widget ${error ? 'radio-widget--error' : ''}`}>
        {options.map((option, index) => (
          <label
            key={option.value}
            className={`radio-widget__option ${
              option.disabled ? 'radio-widget__option--disabled' : ''
            }`}
          >
            <input
              ref={index === 0 ? ref : undefined}
              type="radio"
              name={name}
              value={option.value}
              disabled={disabled || readonly || option.disabled}
              onChange={onChange}
              {...rest}
            />
            <span className="radio-widget__label">{option.label}</span>
          </label>
        ))}
      </div>
    );
  }
);

RadioWidget.displayName = 'RadioWidget';
```

### 7.4 字段注册表

```typescript
// src/components/DynamicForm/core/FieldRegistry.ts

import { WidgetType } from '@/types/schema';
import { TextWidget } from '../widgets/TextWidget';
import { TextareaWidget } from '../widgets/TextareaWidget';
import { NumberWidget } from '../widgets/NumberWidget';
import { SelectWidget } from '../widgets/SelectWidget';
import { RadioWidget } from '../widgets/RadioWidget';
import { CheckboxWidget } from '../widgets/CheckboxWidget';
import { SwitchWidget } from '../widgets/SwitchWidget';

export class FieldRegistry {
  private static widgets: Map<WidgetType, React.ComponentType<any>> = new Map([
    ['text', TextWidget],
    ['textarea', TextareaWidget],
    ['password', TextWidget],
    ['email', TextWidget],
    ['number', NumberWidget],
    ['select', SelectWidget],
    ['radio', RadioWidget],
    ['checkbox', CheckboxWidget],
    ['switch', SwitchWidget],
  ]);

  /**
   * 注册自定义 Widget
   */
  static register(type: WidgetType, component: React.ComponentType<any>) {
    this.widgets.set(type, component);
  }

  /**
   * 获取 Widget 组件
   */
  static getWidget(type: WidgetType): React.ComponentType<any> | undefined {
    return this.widgets.get(type);
  }

  /**
   * 批量注册 Widgets
   */
  static registerBatch(widgets: Record<string, React.ComponentType<any>>) {
    Object.entries(widgets).forEach(([type, component]) => {
      this.register(type as WidgetType, component);
    });
  }
}
```

### 7.5 条件渲染实现

#### 7.5.1 扩展 UIConfig 类型

```typescript
// src/types/schema.ts

export interface UIConfig {
  // ... 其他属性

  // 条件渲染配置
  visibleWhen?: VisibilityCondition;
}

export interface VisibilityCondition {
  field: string;                    // 依赖的字段名
  equals?: any;                     // 等于某个值
  notEquals?: any;                  // 不等于某个值
  in?: any[];                       // 在某个数组中
  notIn?: any[];                    // 不在某个数组中
  custom?: (value: any, formValues: Record<string, any>) => boolean; // 自定义判断函数
}
```

#### 7.5.2 条件渲染 Hook

```typescript
// src/components/DynamicForm/hooks/useConditionalRender.ts

import { useFormContext } from 'react-hook-form';
import { VisibilityCondition } from '@/types/schema';

export const useConditionalRender = (condition?: VisibilityCondition): boolean => {
  const { watch } = useFormContext();

  if (!condition) return true;

  const dependentValue = watch(condition.field);

  // 等于判断
  if (condition.equals !== undefined) {
    return dependentValue === condition.equals;
  }

  // 不等于判断
  if (condition.notEquals !== undefined) {
    return dependentValue !== condition.notEquals;
  }

  // 在数组中判断
  if (condition.in) {
    return condition.in.includes(dependentValue);
  }

  // 不在数组中判断
  if (condition.notIn) {
    return !condition.notIn.includes(dependentValue);
  }

  // 自定义判断
  if (condition.custom) {
    const formValues = watch();
    return condition.custom(dependentValue, formValues);
  }

  return true;
};
```

#### 7.5.3 在 FormField 中集成条件渲染

```typescript
// src/components/DynamicForm/layout/FormField.tsx (更新版本)

import { useConditionalRender } from '../hooks/useConditionalRender';

export const FormField: React.FC<FormFieldProps> = ({
  field,
  disabled,
  readonly,
  widgets = {},
}) => {
  const { register, formState: { errors } } = useFormContext();

  // 条件渲染判断
  const isVisible = useConditionalRender(field.visibleWhen);

  // 如果不可见，直接返回 null
  if (!isVisible) {
    return null;
  }

  // ... 其余代码保持不变
};
```

---

**下一部分**: 使用指南和最佳实践
