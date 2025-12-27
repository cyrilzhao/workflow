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
  linkageFunctions = {},
  customFormats = {},
  layout = 'vertical',
  showErrorList = false,
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
  // 检查是否使用了路径扁平化
  const useFlattenPath = useMemo(() => SchemaParser.hasFlattenPath(schema), [schema]);

  // 设置自定义格式验证器并解析字段
  const fields = useMemo(() => {
    if (customFormats && Object.keys(customFormats).length > 0) {
      SchemaParser.setCustomFormats(customFormats);
    }
    return SchemaParser.parse(schema);
  }, [schema, customFormats]);

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
      // 如果使用了路径扁平化，将扁平数据转换回嵌套结构
      const processedData = useFlattenPath ? PathTransformer.flatToNested(data) : data;
      await onSubmit(processedData);
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
        {showSubmitButton && (
          <div className="dynamic-form__actions">
            <button
              type="submit"
              className="dynamic-form__submit"
              disabled={loading || disabled}
            >
              {loading ? '提交中...' : '提交'}
            </button>
          </div>
        )}
      </form>
    </FormProvider>
  );
};
```

### 7.2 字段包装器实现

```typescript
// src/components/DynamicForm/layout/FormField.tsx

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

### 7.5 JSON Schema 标准条件渲染实现

#### 7.5.1 条件渲染说明

动态表单支持 JSON Schema 标准的条件渲染方式：

- `if/then/else` - 条件分支
- `dependencies` - 字段依赖

这些是 JSON Schema 规范的一部分，无需额外的 UI 扩展。

#### 7.5.2 SchemaParser 处理条件逻辑

```typescript
// src/components/DynamicForm/core/SchemaParser.ts (扩展)

export class SchemaParser {
  /**
   * 解析 Schema 时处理条件逻辑
   */
  static parse(schema: ExtendedJSONSchema): FieldConfig[] {
    const fields: FieldConfig[] = [];

    if (schema.type !== 'object' || !schema.properties) {
      return fields;
    }

    // 解析基础字段
    const baseFields = this.parseProperties(schema);

    // 处理 if/then/else 条件
    if (schema.if) {
      const conditionalFields = this.parseConditionalSchema(schema);
      return [...baseFields, ...conditionalFields];
    }

    return baseFields;
  }

  /**
   * 解析条件 Schema
   */
  private static parseConditionalSchema(schema: ExtendedJSONSchema): FieldConfig[] {
    // 条件渲染由表单运行时动态处理
    // SchemaParser 只负责解析所有可能的字段
    const thenFields = schema.then ? this.parseProperties(schema.then) : [];
    const elseFields = schema.else ? this.parseProperties(schema.else) : [];

    return [...thenFields, ...elseFields];
  }
}
```

---

**说明**:

- JSON Schema 的条件逻辑在运行时由表单动态处理
- SchemaParser 负责解析所有可能出现的字段
- 字段的显示/隐藏由 JSON Schema 验证引擎控制

**下一部分**: 使用指南和最佳实践
