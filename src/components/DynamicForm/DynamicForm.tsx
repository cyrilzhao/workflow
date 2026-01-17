import React, { useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { Button } from '@blueprintjs/core';
import { SchemaParser } from './core/SchemaParser';
import { FormField } from './layout/FormField';
import { ErrorList } from './components/ErrorList';
import type { DynamicFormProps, DynamicFormRef } from './types';
import { parseSchemaLinkages, transformToAbsolutePaths } from './utils/schemaLinkageParser';
import { useArrayLinkageManager } from './hooks/useArrayLinkageManager';
import type { LinkageConfig } from './types/linkage';
import type { ExtendedJSONSchema } from './types/schema';
import { filterValueWithNestedSchemas } from './utils/filterValueWithNestedSchemas';
import {
  NestedSchemaProvider,
  useNestedSchemaRegistryOptional,
} from './context/NestedSchemaContext';
import { PathPrefixProvider } from './context/PathPrefixContext';
import { LinkageStateProvider, useLinkageStateContext } from './context/LinkageStateContext';
import { WidgetsProvider } from './context/WidgetsContext';
import { wrapPrimitiveArrays, unwrapPrimitiveArrays } from './utils/arrayTransformer';
import '@blueprintjs/core/lib/css/blueprint.css';

// 空对象常量，避免每次渲染创建新对象
const EMPTY_LINKAGE_FUNCTIONS = {};
const EMPTY_WIDGETS = {};
const EMPTY_CUSTOM_FORMATS = {};

/**
 * 转换表单数据：数组解包 + 数据过滤
 *
 * 新方案（v3.0）：
 * - 移除路径转换逻辑，数据保持标准的嵌套格式
 * - 只需要解包基本类型数组和过滤数据
 *
 * @param data - 原始表单数据
 * @param schema - Schema 定义
 * @param nestedSchemaRegistry - 嵌套 Schema 注册表（可选）
 * @param shouldFilter - 是否需要过滤数据（默认 false）
 * @returns 转换后的数据
 */
function transformFormData(
  data: Record<string, any>,
  schema: ExtendedJSONSchema,
  nestedSchemaRegistry?: { getAllSchemas: () => Map<string, ExtendedJSONSchema> },
  shouldFilter: boolean = false
): Record<string, any> {
  // 第一步：解包基本类型数组
  let processedData = unwrapPrimitiveArrays(data, schema);

  // 第二步：根据 schema 过滤数据（仅在需要时执行）
  if (shouldFilter) {
    processedData = nestedSchemaRegistry
      ? filterValueWithNestedSchemas(processedData, schema, nestedSchemaRegistry.getAllSchemas())
      : filterValueWithNestedSchemas(processedData, schema, new Map());
  }

  return processedData;
}

/**
 * 检查字段是否应该被隐藏（包括检查父级路径的联动状态）
 *
 * 新方案（v3.0）：
 * - 使用标准的 . 分隔符
 * - 检查字段自身和所有父级路径的联动状态
 *
 * @param fieldPath - 字段路径，如 'auth.content.key'
 * @param linkageStates - 联动状态映射
 * @returns 如果字段或其任何父级被隐藏，返回 true
 */
function isFieldHiddenByLinkage(
  fieldPath: string,
  linkageStates: Record<string, { visible?: boolean }>
): boolean {
  // 检查字段自身的联动状态
  if (linkageStates[fieldPath]?.visible === false) {
    return true;
  }

  // 使用标准的 . 分隔符拆分路径
  const parts = fieldPath.split('.');

  // 检查每个父级路径的联动状态
  for (let i = 1; i < parts.length; i++) {
    const parentPath = parts.slice(0, i).join('.');
    if (linkageStates[parentPath]?.visible === false) {
      return true;
    }
  }

  return false;
}

// 内层组件：实际的表单逻辑
// ✅ 使用 React.memo 优化，避免不必要的重渲染
const DynamicFormInner = React.memo(
  forwardRef<DynamicFormRef, DynamicFormProps>(
    (
      {
        schema,
        defaultValues = {},
        onSubmit,
        onChange,
        widgets,
        linkageFunctions,
        customFormats,
        layout = 'vertical',
        labelWidth,
        showErrorList = false,
        showSubmitButton = true,
        renderAsForm = true,
        validateMode = 'onSubmit',
        reValidateMode = 'onChange',
        loading = false,
        disabled = false,
        readonly = false,
        className,
        style,
        pathPrefix = '',
        asNestedForm = false,
        enableVirtualScroll = false,
        virtualScrollHeight = 600,
      },
      ref
    ) => {
      // ========== Context 获取（集中管理） ==========
      const parentFormContext = useFormContext();
      const linkageStateContext = useLinkageStateContext();
      const nestedSchemaRegistry = useNestedSchemaRegistryOptional();

      // ========== 空对象常量处理（统一管理） ==========
      const stableLinkageFunctions = linkageFunctions || EMPTY_LINKAGE_FUNCTIONS;
      const stableWidgets = widgets || EMPTY_WIDGETS;
      const stableCustomFormats = customFormats || EMPTY_CUSTOM_FORMATS;

      // 设置自定义格式验证器并解析字段
      // 当 asNestedForm 为 true 时，需要为字段名添加 pathPrefix 前缀
      const fields = useMemo(() => {
        if (stableCustomFormats && Object.keys(stableCustomFormats).length > 0) {
          SchemaParser.setCustomFormats(stableCustomFormats);
        }

        // 从 schema.ui 中读取 prefixLabel（用于 flattenPrefix 场景）
        const prefixLabel = schema.ui?.prefixLabel || '';

        const parsedFields = SchemaParser.parse(schema, {
          prefixLabel,
        });

        // 如果是嵌套表单模式且有路径前缀，为字段名添加前缀
        if (asNestedForm && pathPrefix) {
          return parsedFields.map(field => ({
            ...field,
            name: `${pathPrefix}.${field.name}`,
          }));
        }
        return parsedFields;
      }, [schema, stableCustomFormats, asNestedForm, pathPrefix]);

      // 处理 defaultValues：只需要包装基本类型数组
      // 新方案（v3.0）：数据保持标准嵌套格式，无需路径转换
      const processedDefaultValues = useMemo(() => {
        if (!defaultValues) return undefined;
        return wrapPrimitiveArrays(defaultValues, schema);
      }, [defaultValues, schema]);

      // 只有非嵌套表单模式才创建新的 useForm 实例
      const ownMethods = useForm({
        defaultValues: processedDefaultValues,
        mode: validateMode,
        reValidateMode: reValidateMode,
      });

      // 根据模式选择使用哪个 form methods
      // 嵌套表单模式下复用父表单的 FormContext，否则使用自己的
      const methods = asNestedForm && parentFormContext ? parentFormContext : ownMethods;

      // ✅ 使用 useRef 保持 methods 引用稳定，避免触发不必要的重新计算
      const methodsRef = React.useRef(methods);
      React.useEffect(() => {
        methodsRef.current = methods;
      }, [methods]);

      // ✅ 使用 useRef 保持 refreshLinkage 引用，避免循环依赖
      // const refreshLinkageRef = React.useRef<() => void>(() => {});

      // 解析 schema 中的联动配置
      // 分层计算策略：遇到数组字段时停止递归，数组元素内部由 NestedFormWidget 独立处理
      const { linkages: rawLinkages } = useMemo(() => {
        const parsed = parseSchemaLinkages(schema);
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            '[DynamicForm] 解析 schema 联动配置:',
            JSON.stringify({
              schema: schema.title || 'root',
              pathPrefix,
              asNestedForm,
              linkagesCount: Object.keys(parsed.linkages).length,
            })
          );
        }
        return parsed;
      }, [schema, pathPrefix, asNestedForm]);

      // 统一处理联动配置：路径转换 -> 过滤父级联动
      const { processedLinkages, formToUse, effectiveLinkageFunctions } = useMemo(() => {
        // 步骤1: 路径转换和过滤
        let linkages = rawLinkages;
        if (asNestedForm && pathPrefix) {
          const transformed = transformToAbsolutePaths(rawLinkages, pathPrefix);

          // 如果有父级联动状态，过滤掉已经在父级计算过的联动
          if (linkageStateContext?.parentLinkageStates) {
            const filtered: Record<string, LinkageConfig[]> = {};
            Object.entries(transformed).forEach(([key, value]) => {
              if (!(key in linkageStateContext.parentLinkageStates)) {
                filtered[key] = value;
              }
            });
            if (process.env.NODE_ENV !== 'production') {
              console.log(
                '[DynamicForm] 嵌套表单路径转换（已过滤父级联动）:',
                JSON.stringify({
                  pathPrefix,
                  rawLinkages,
                  transformed,
                  filtered,
                })
              );
            }
            linkages = filtered;
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[DynamicForm] 嵌套表单路径转换:', {
                pathPrefix,
                rawLinkages,
                transformed,
              });
            }
            linkages = transformed;
          }
        }

        // 步骤2: 确定使用的表单实例和联动函数
        // 优先使用自己的 linkageFunctions（如果有内容），否则使用 Context 中的
        const hasOwnFunctions = Object.keys(stableLinkageFunctions).length > 0;
        const finalLinkageFunctions = hasOwnFunctions
          ? stableLinkageFunctions
          : linkageStateContext?.linkageFunctions || EMPTY_LINKAGE_FUNCTIONS;

        if (process.env.NODE_ENV !== 'production') {
          console.log(
            '[DynamicForm] 联动函数解析:',
            JSON.stringify({
              pathPrefix,
              asNestedForm,
              hasOwnFunctions,
              stableLinkageFunctions: Object.keys(stableLinkageFunctions),
              contextLinkageFunctions: linkageStateContext?.linkageFunctions
                ? Object.keys(linkageStateContext.linkageFunctions)
                : null,
              finalLinkageFunctions: Object.keys(finalLinkageFunctions),
            })
          );
        }

        return {
          processedLinkages: linkages,
          formToUse: linkageStateContext?.form || methodsRef.current,
          effectiveLinkageFunctions: finalLinkageFunctions,
        };
      }, [
        rawLinkages,
        asNestedForm,
        pathPrefix,
        linkageStateContext?.parentLinkageStates,
        linkageStateContext?.form,
        linkageStateContext?.linkageFunctions,
        stableLinkageFunctions,
        // 移除 methods 依赖，因为它会在每次表单状态变化时触发重新计算
        // methods 只是用来获取表单实例，不应该触发联动配置的重新计算
      ]);

      // 步骤3: 计算自己的联动状态
      const { linkageStates: ownLinkageStates, refresh: refreshLinkage } = useArrayLinkageManager({
        form: formToUse,
        baseLinkages: processedLinkages,
        linkageFunctions: effectiveLinkageFunctions,
        schema,
      });

      // // 更新 refreshLinkageRef
      // React.useEffect(() => {
      //   refreshLinkageRef.current = refreshLinkage;
      // }, [refreshLinkage]);

      // 步骤4: 合并父级和自己的联动状态
      const linkageStates = useMemo(() => {
        if (linkageStateContext?.parentLinkageStates) {
          const merged = { ...linkageStateContext.parentLinkageStates, ...ownLinkageStates };
          if (process.env.NODE_ENV !== 'production') {
            console.log(
              '[DynamicForm] 合并联动状态:',
              JSON.stringify({
                pathPrefix,
                parentStates: linkageStateContext.parentLinkageStates,
                ownStates: ownLinkageStates,
                merged,
              })
            );
          }
          return merged;
        }
        return ownLinkageStates;
      }, [linkageStateContext?.parentLinkageStates, ownLinkageStates, pathPrefix]);

      const {
        handleSubmit,
        watch,
        formState: { errors },
      } = methods;

      // ========== 暴露外部可访问的 API ==========
      useImperativeHandle(
        ref,
        () => ({
          setValue: (name, value, options) => {
            methods.setValue(name, value, options);
          },
          getValue: (name: string) => {
            return methods.getValues(name as any);
          },
          getValues: () => {
            return methods.getValues();
          },
          setValues: (values, options) => {
            Object.entries(values).forEach(([name, value]) => {
              methods.setValue(name, value, options);
            });
          },
          reset: values => {
            methods.reset(values);
          },
          validate: async name => {
            return methods.trigger(name);
          },
          getErrors: () => {
            return methods.formState.errors;
          },
          clearErrors: name => {
            methods.clearErrors(name);
          },
          setError: (name, error) => {
            methods.setError(name, error);
          },
          getFormState: () => {
            const { isDirty, isValid, isSubmitting, isSubmitted, submitCount } = methods.formState;
            return { isDirty, isValid, isSubmitting, isSubmitted, submitCount };
          },
          refreshLinkage: async () => {
            await refreshLinkage();
          },
        }),
        [methods]
      );

      React.useEffect(() => {
        if (onChange) {
          const subscription = watch(data => {
            const processedData = transformFormData(data, schema);
            onChange(processedData);
          });
          return () => subscription.unsubscribe();
        }
      }, [watch, onChange, schema]);

      // ✅ 使用 useCallback 缓存 onSubmitHandler，避免每次渲染创建新函
      const onSubmitHandler = useCallback(
        async (data: Record<string, any>) => {
          if (onSubmit) {
            if (process.env.NODE_ENV !== 'production') {
              console.info('[DynamicForm] onSubmitHandler - 原始数据:', JSON.stringify(data));
            }

            // 使用公共函数进行数据转换，包含过滤步骤
            const filteredData = transformFormData(
              data,
              schema,
              nestedSchemaRegistry || undefined,
              true // 需要过滤数据
            );

            if (process.env.NODE_ENV !== 'production') {
              console.info('[DynamicForm] onSubmitHandler - 过滤后:', JSON.stringify(filteredData));
            }

            await onSubmit(filteredData);
          }
        },
        [onSubmit, schema, nestedSchemaRegistry]
      );

      // 使用 useMemo 缓存 LinkageStateContext 的 value 对象
      // 避免每次 linkageStates 变化时都创建新对象，导致所有消费该 Context 的组件重新渲染
      const linkageContextValue = useMemo(
        () => ({
          parentLinkageStates: linkageStates,
          form: methodsRef.current, // ✅ 使用 ref 避免 methods 变化触发重新计算
          rootSchema: schema,
          pathPrefix: pathPrefix,
          linkageFunctions: effectiveLinkageFunctions,
        }),
        [linkageStates, schema, pathPrefix, effectiveLinkageFunctions] // ✅ 移除 methods 依赖
      );

      // 使用 useMemo 缓存字段内容，避免每次渲染都创建新的 children
      const fieldsContent = useMemo(
        () => (
          <div className="dynamic-form__fields">
            {fields.map(field => {
              const linkageState = linkageStates[field.name];

              // 如果联动状态指定不可见，则不渲染该字段
              if (isFieldHiddenByLinkage(field.name, linkageStates)) {
                return null;
              }

              // 合并联动状态中的 options 到 field 中
              if (linkageState?.options) {
                field.options = linkageState.options;
              }

              return (
                <FormField
                  key={field.name}
                  field={field}
                  disabled={disabled || field.disabled || loading || linkageState?.disabled}
                  readonly={readonly || field.readonly || linkageState?.readonly}
                  linkageState={linkageState}
                  layout={layout}
                  labelWidth={labelWidth}
                  enableVirtualScroll={enableVirtualScroll}
                  virtualScrollHeight={virtualScrollHeight}
                />
              );
            })}
          </div>
        ),
        [
          fields,
          linkageStates,
          disabled,
          loading,
          readonly,
          layout,
          labelWidth,
          enableVirtualScroll,
          virtualScrollHeight,
        ]
      );

      // 使用 useMemo 缓存带 Provider 的字段内容
      const renderedFields = useMemo(() => {
        // 如果不是嵌套表单，提供 LinkageStateContext
        if (!asNestedForm) {
          return (
            <LinkageStateProvider value={linkageContextValue}>{fieldsContent}</LinkageStateProvider>
          );
        }
        return fieldsContent;
      }, [asNestedForm, linkageContextValue, fieldsContent]);

      // 使用 useMemo 缓存提交按钮
      const submitButton = useMemo(() => {
        if (!showSubmitButton) return null;

        return (
          <div className="dynamic-form__actions" style={{ marginTop: '20px' }}>
            <Button type="submit" intent="primary" loading={loading} disabled={loading || disabled}>
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        );
      }, [showSubmitButton, loading, disabled]);

      const formClassName = `dynamic-form dynamic-form--${layout} ${className || ''}`;

      // 使用 useMemo 缓存表单内容，避免每次渲染都创建新的 children
      const formContent = useMemo(() => {
        const content = (
          <PathPrefixProvider prefix={asNestedForm ? '' : pathPrefix}>
            {renderAsForm ? (
              <form
                onSubmit={handleSubmit(onSubmitHandler)}
                className={formClassName}
                style={style}
              >
                {showErrorList && Object.keys(errors).length > 0 && <ErrorList errors={errors} />}
                {renderedFields}
                {submitButton}
              </form>
            ) : (
              <div className={formClassName} style={style}>
                {showErrorList && Object.keys(errors).length > 0 && <ErrorList errors={errors} />}
                {renderedFields}
                {submitButton}
              </div>
            )}
          </PathPrefixProvider>
        );

        // 只在顶层（非嵌套表单）创建 WidgetsProvider
        if (asNestedForm) {
          return content;
        }

        return <WidgetsProvider widgets={stableWidgets}>{content}</WidgetsProvider>;
      }, [
        asNestedForm,
        pathPrefix,
        renderAsForm,
        handleSubmit,
        onSubmitHandler,
        formClassName,
        style,
        showErrorList,
        errors,
        renderedFields,
        submitButton,
        stableWidgets,
      ]);

      // 嵌套表单模式下不需要再包裹 FormProvider，因为已经复用了父表单的 context
      if (asNestedForm && parentFormContext) {
        return formContent;
      }

      // 非嵌套表单模式，需要提供 FormProvider
      return <FormProvider {...methods}>{formContent}</FormProvider>;
    }
  )
);

// 外层组件：提供 NestedSchemaProvider
export const DynamicForm = forwardRef<DynamicFormRef, DynamicFormProps>((props, ref) => {
  // 如果已经在 NestedSchemaProvider 内部（嵌套表单场景），直接渲染内层组件
  const existingRegistry = useNestedSchemaRegistryOptional();

  if (existingRegistry) {
    return <DynamicFormInner {...props} ref={ref} />;
  }

  // 否则提供新的 NestedSchemaProvider（顶层表单场景）
  return (
    <NestedSchemaProvider>
      <DynamicFormInner {...props} ref={ref} />
    </NestedSchemaProvider>
  );
});
