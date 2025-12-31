import React, { useMemo } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { Button } from '@blueprintjs/core';
import { SchemaParser } from './core/SchemaParser';
import { FormField } from './layout/FormField';
import { ErrorList } from './components/ErrorList';
import type { DynamicFormProps } from './types';
import { parseSchemaLinkages, transformToAbsolutePaths } from '@/utils/schemaLinkageParser';
import { useArrayLinkageManager } from '@/hooks/useArrayLinkageManager';
import type { LinkageConfig } from '@/types/linkage';
import { filterValueWithNestedSchemas } from './utils/filterValueWithNestedSchemas';
import {
  NestedSchemaProvider,
  useNestedSchemaRegistryOptional,
} from './context/NestedSchemaContext';
import { PathPrefixProvider } from './context/PathPrefixContext';
import { LinkageStateProvider, useLinkageStateContext } from './context/LinkageStateContext';
import { PathTransformer, splitPath, rebuildPath } from '@/utils/pathTransformer';
import { wrapPrimitiveArrays, unwrapPrimitiveArrays } from './utils/arrayTransformer';
import '@blueprintjs/core/lib/css/blueprint.css';

// 空对象常量，避免每次渲染创建新对象
const EMPTY_LINKAGE_FUNCTIONS = {};
const EMPTY_WIDGETS = {};
const EMPTY_CUSTOM_FORMATS = {};

/**
 * 转换表单数据：路径转换 + 数组解包 + 数据过滤
 * @param data - 原始表单数据
 * @param schema - Schema 定义
 * @param useFlattenPath - 是否使用了路径扁平化
 * @param nestedSchemaRegistry - 嵌套 Schema 注册表（可选）
 * @param shouldFilter - 是否需要过滤数据（默认 false）
 * @returns 转换后的数据
 */
function transformFormData(
  data: Record<string, any>,
  schema: ExtendedJSONSchema,
  useFlattenPath: boolean,
  nestedSchemaRegistry?: { getAllSchemas: () => Map<string, ExtendedJSONSchema> },
  shouldFilter: boolean = false
): Record<string, any> {
  // 第一步：如果使用了路径扁平化，将扁平数据转换回嵌套结构
  let processedData = useFlattenPath
    ? PathTransformer.flatToNestedWithSchema(data, schema)
    : data;

  // 第二步：解包基本类型数组
  processedData = unwrapPrimitiveArrays(processedData, schema);

  // 第三步：根据 schema 过滤数据（仅在需要时执行）
  if (shouldFilter) {
    processedData = nestedSchemaRegistry
      ? filterValueWithNestedSchemas(processedData, schema, nestedSchemaRegistry.getAllSchemas())
      : filterValueWithNestedSchemas(processedData, schema, new Map());
  }

  return processedData;
}

/**
 * 检查字段是否应该被隐藏（包括检查父级路径的联动状态）
 * 对于 flattenPath 场景，联动配置可能在父级路径上，需要检查所有父级
 *
 * @param fieldPath - 字段路径，如 'group~~category.contacts'
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

  // 使用统一的路径工具拆分路径
  const parts = splitPath(fieldPath);

  // 检查每个父级路径的联动状态
  for (let i = 0; i < parts.length - 1; i++) {
    const parentPath = rebuildPath(fieldPath, parts, i + 1);
    if (linkageStates[parentPath]?.visible === false) {
      return true;
    }
  }

  return false;
}

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
  labelWidth,
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
  asNestedForm = false,
}) => {
  // ========== Context 获取（集中管理） ==========
  const parentFormContext = useFormContext();
  const linkageStateContext = useLinkageStateContext();
  const nestedSchemaRegistry = useNestedSchemaRegistryOptional();

  // ========== 空对象常量处理（统一管理） ==========
  const stableLinkageFunctions = linkageFunctions || EMPTY_LINKAGE_FUNCTIONS;
  const stableWidgets = widgets || EMPTY_WIDGETS;
  const stableCustomFormats = customFormats || EMPTY_CUSTOM_FORMATS;

  // 检查是否使用了路径扁平化
  const useFlattenPath = useMemo(() => SchemaParser.hasFlattenPath(schema), [schema]);

  // 设置自定义格式验证器并解析字段
  // 当 asNestedForm 为 true 时，需要为字段名添加 pathPrefix 前缀
  const fields = useMemo(() => {
    if (stableCustomFormats && Object.keys(stableCustomFormats).length > 0) {
      SchemaParser.setCustomFormats(stableCustomFormats);
    }
    const parsedFields = SchemaParser.parse(schema);

    // 如果是嵌套表单模式且有路径前缀，为字段名添加前缀
    if (asNestedForm && pathPrefix) {
      return parsedFields.map(field => ({
        ...field,
        name: `${pathPrefix}.${field.name}`,
      }));
    }
    return parsedFields;
  }, [schema, stableCustomFormats, asNestedForm, pathPrefix]);

  // 处理 defaultValues：包装基本类型数组 + 路径扁平化
  const processedDefaultValues = useMemo(() => {
    if (!defaultValues) return undefined;

    // 第一步：包装基本类型数组
    const wrappedData = wrapPrimitiveArrays(defaultValues, schema);

    // 第二步：如果使用了路径扁平化，使用基于 Schema 的转换
    // 这会将物理路径的数据转换到逻辑路径的 key 下
    if (!useFlattenPath) return wrappedData;
    return PathTransformer.nestedToFlatWithSchema(wrappedData, schema);
  }, [defaultValues, useFlattenPath, schema]);

  // 只有非嵌套表单模式才创建新的 useForm 实例
  const ownMethods = useForm({
    defaultValues: processedDefaultValues,
    mode: validateMode,
  });

  // 根据模式选择使用哪个 form methods
  // 嵌套表单模式下复用父表单的 FormContext，否则使用自己的
  const methods = asNestedForm && parentFormContext ? parentFormContext : ownMethods;

  // 解析 schema 中的联动配置（包含路径映射）
  // 解析 schema 中的联动配置
  // 分层计算策略：遇到数组字段时停止递归，数组元素内部由 NestedFormWidget 独立处理
  const {
    linkages: rawLinkages,
    pathMappings,
    hasFlattenPath,
  } = useMemo(() => {
    const parsed = parseSchemaLinkages(schema);
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DynamicForm] 解析 schema 联动配置:',
        JSON.stringify({
          schema: schema.title || 'root',
          pathPrefix,
          asNestedForm,
          rawLinkages: parsed.linkages,
          pathMappingsCount: parsed.pathMappings.length,
          hasFlattenPath: parsed.hasFlattenPath,
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
        const filtered: Record<string, LinkageConfig> = {};
        Object.entries(transformed).forEach(([key, value]) => {
          if (!(key in linkageStateContext.parentLinkageStates)) {
            filtered[key] = value;
          }
        });
        if (process.env.NODE_ENV !== 'production') {
          console.log('[DynamicForm] 嵌套表单路径转换（已过滤父级联动）:', {
            pathPrefix,
            rawLinkages,
            transformed,
            filtered,
          });
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
    return {
      processedLinkages: linkages,
      formToUse: linkageStateContext?.form || methods,
      effectiveLinkageFunctions:
        linkageFunctions || linkageStateContext?.linkageFunctions || EMPTY_LINKAGE_FUNCTIONS,
    };
  }, [
    rawLinkages,
    asNestedForm,
    pathPrefix,
    linkageStateContext?.parentLinkageStates,
    linkageStateContext?.form,
    linkageStateContext?.linkageFunctions,
    linkageFunctions,
    methods,
  ]);

  // 步骤3: 计算自己的联动状态
  const ownLinkageStates = useArrayLinkageManager({
    form: formToUse,
    baseLinkages: processedLinkages,
    linkageFunctions: effectiveLinkageFunctions,
    schema,
    pathMappings,
  });

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

  React.useEffect(() => {
    if (onChange) {
      const subscription = watch(data => {
        const processedData = transformFormData(data, schema, useFlattenPath);
        onChange(processedData);
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange, useFlattenPath, schema]);

  const onSubmitHandler = async (data: Record<string, any>) => {
    if (onSubmit) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[DynamicForm] onSubmitHandler - 原始数据:', JSON.stringify(data));
        console.info('[DynamicForm] onSubmitHandler - useFlattenPath:', useFlattenPath);
      }

      // 使用公共函数进行数据转换，包含过滤步骤
      const filteredData = transformFormData(
        data,
        schema,
        useFlattenPath,
        nestedSchemaRegistry,
        true // 需要过滤数据
      );

      if (process.env.NODE_ENV !== 'production') {
        console.info('[DynamicForm] onSubmitHandler - 过滤后:', JSON.stringify(filteredData));
      }

      await onSubmit(filteredData);
    }
  };

  // 渲染表单字段
  const renderFields = () => {
    const fieldsContent = (
      <div className="dynamic-form__fields">
        {fields.map(field => {
          const linkageState = linkageStates[field.name];

          // 调试日志：检查字段联动状态
          // if (asNestedForm) {
          //   console.log(
          //     '[DynamicForm renderFields] 嵌套表单字段:',
          //     JSON.stringify({
          //       fieldName: field.name,
          //       linkageState,
          //       allLinkageStates: linkageStates,
          //     })
          //   );
          // }

          // 如果联动状态指定不可见，则不渲染该字段
          // 需要检查字段自身和所有父级路径的联动状态（支持 flattenPath 场景）
          if (isFieldHiddenByLinkage(field.name, linkageStates)) {
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
              layout={layout}
              labelWidth={labelWidth}
            />
          );
        })}
      </div>
    );

    // 如果不是嵌套表单，提供 LinkageStateContext
    if (!asNestedForm) {
      return (
        <LinkageStateProvider
          value={{
            parentLinkageStates: linkageStates,
            form: methods,
            rootSchema: schema,
            pathPrefix: pathPrefix,
            linkageFunctions: effectiveLinkageFunctions,
          }}
        >
          {fieldsContent}
        </LinkageStateProvider>
      );
    }

    return fieldsContent;
  };

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

  // 渲染表单内容（不包含 FormProvider）
  // 注意：在 asNestedForm 模式下，字段名已经通过 pathPrefix 参数添加了前缀，
  // 所以不应该再通过 PathPrefixProvider 提供前缀，否则会导致路径重复
  const renderFormContent = () => (
    <PathPrefixProvider prefix={asNestedForm ? '' : pathPrefix}>
      {renderAsForm ? (
        <form onSubmit={handleSubmit(onSubmitHandler)} className={formClassName} style={style}>
          {showErrorList && Object.keys(errors).length > 0 && <ErrorList errors={errors} />}
          {renderFields()}
          {renderSubmitButton()}
        </form>
      ) : (
        <div className={formClassName} style={style}>
          {showErrorList && Object.keys(errors).length > 0 && <ErrorList errors={errors} />}
          {renderFields()}
          {renderSubmitButton()}
        </div>
      )}
    </PathPrefixProvider>
  );

  // 嵌套表单模式下不需要再包裹 FormProvider，因为已经复用了父表单的 context
  if (asNestedForm && parentFormContext) {
    return renderFormContent();
  }

  // 非嵌套表单模式，需要提供 FormProvider
  return <FormProvider {...methods}>{renderFormContent()}</FormProvider>;
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
