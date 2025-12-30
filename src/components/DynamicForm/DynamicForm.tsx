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
import { PathTransformer } from '@/utils/pathTransformer';
import { wrapPrimitiveArrays, unwrapPrimitiveArrays } from './utils/arrayTransformer';
import '@blueprintjs/core/lib/css/blueprint.css';

// 空对象常量，避免每次渲染创建新对象
const EMPTY_LINKAGE_FUNCTIONS = {};
const EMPTY_WIDGETS = {};
const EMPTY_CUSTOM_FORMATS = {};

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

  // 检查父级路径的联动状态
  // 需要同时处理 '.' 和 '~~' 两种分隔符
  const parts: string[] = [];
  let currentPart = '';

  for (let i = 0; i < fieldPath.length; i++) {
    // 检查是否是 ~~ 分隔符
    if (fieldPath[i] === '~' && fieldPath[i + 1] === '~') {
      if (currentPart) {
        parts.push(currentPart);
        currentPart = '';
      }
      i++; // 跳过第二个 ~
    } else if (fieldPath[i] === '.') {
      if (currentPart) {
        parts.push(currentPart);
        currentPart = '';
      }
    } else {
      currentPart += fieldPath[i];
    }
  }
  if (currentPart) {
    parts.push(currentPart);
  }

  // 重建路径并检查每个父级
  // 需要保留原始的分隔符类型
  let parentPath = '';
  let pathIndex = 0;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (parentPath) {
      // 找到原始路径中这个 part 之前的分隔符
      const nextPartStart = fieldPath.indexOf(part, pathIndex);
      if (nextPartStart > pathIndex) {
        const separator = fieldPath.substring(pathIndex, nextPartStart);
        parentPath += separator;
      }
      parentPath += part;
      pathIndex = nextPartStart + part.length;
    } else {
      parentPath = part;
      pathIndex = part.length;
    }

    // 检查这个父级路径的联动状态
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
  // 使用稳定的空对象引用，避免每次渲染创建新对象导致 useEffect 重复触发
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

  // 尝试获取父表单的 FormContext（用于嵌套表单模式）
  // 注意：useFormContext 在没有 FormProvider 时返回 null（react-hook-form 7.x）
  const parentFormContext = useFormContext();

  // 只有非嵌套表单模式才创建新的 useForm 实例
  const ownMethods = useForm({
    defaultValues: processedDefaultValues,
    mode: validateMode,
  });

  // 根据模式选择使用哪个 form methods
  // 嵌套表单模式下复用父表单的 FormContext，否则使用自己的
  const methods = asNestedForm && parentFormContext ? parentFormContext : ownMethods;

  // 尝试获取父级 LinkageStateContext
  const linkageStateContext = useLinkageStateContext();

  // 解析 schema 中的联动配置（包含路径映射）
  // 解析 schema 中的联动配置
  // 分层计算策略：遇到数组字段时停止递归，数组元素内部由 NestedFormWidget 独立处理
  const {
    linkages: rawLinkages,
    pathMappings,
    hasFlattenPath,
  } = useMemo(() => {
    const parsed = parseSchemaLinkages(schema);
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
    return parsed;
  }, [schema, pathPrefix, asNestedForm]);

  // 如果是嵌套表单且有路径前缀，转换为绝对路径
  // 同时过滤掉已经在父级计算过的联动配置
  const linkages = useMemo(() => {
    if (asNestedForm && pathPrefix) {
      const transformed = transformToAbsolutePaths(rawLinkages, pathPrefix);

      // 如果有父级联动状态，过滤掉已经在父级计算过的联动
      // 这避免了嵌套表单重复计算数组元素的联动（由顶层 useArrayLinkageManager 统一处理）
      if (linkageStateContext?.parentLinkageStates) {
        const filtered: Record<string, LinkageConfig> = {};
        Object.entries(transformed).forEach(([key, value]) => {
          if (!(key in linkageStateContext.parentLinkageStates)) {
            filtered[key] = value;
          }
        });
        console.log('[DynamicForm] 嵌套表单路径转换（已过滤父级联动）:', {
          pathPrefix,
          rawLinkages,
          transformed,
          filtered,
        });
        return filtered;
      }

      console.log('[DynamicForm] 嵌套表单路径转换:', {
        pathPrefix,
        rawLinkages,
        transformed,
      });
      return transformed;
    }
    return rawLinkages;
  }, [rawLinkages, asNestedForm, pathPrefix, linkageStateContext?.parentLinkageStates]);

  // 统一使用 useArrayLinkageManager 处理所有联动
  // useArrayLinkageManager 已增强，可以同时处理：
  // - 数组元素的联动（动态实例化）
  // - 普通字段的联动（直接处理）
  const formToUse = linkageStateContext?.form || methods;

  // 获取联动函数：优先使用自己的，否则从 Context 继承
  const effectiveLinkageFunctions =
    linkageFunctions || linkageStateContext?.linkageFunctions || EMPTY_LINKAGE_FUNCTIONS;

  // 统一使用 useArrayLinkageManager 处理所有联动（包括数组和非数组）
  // useArrayLinkageManager 已增强，可以同时处理数组元素联动和普通字段联动
  const ownLinkageStates = useArrayLinkageManager({
    form: formToUse,
    baseLinkages: linkages,
    linkageFunctions: effectiveLinkageFunctions,
    schema, // 传递 schema 用于 JSON Pointer 路径解析和数组检测
    pathMappings, // 传递路径映射用于路径转换
  });

  // 合并父级和自己的联动状态
  const linkageStates = useMemo(() => {
    if (linkageStateContext?.parentLinkageStates) {
      const merged = { ...linkageStateContext.parentLinkageStates, ...ownLinkageStates };
      console.log(
        '[DynamicForm] 合并联动状态:',
        JSON.stringify({
          pathPrefix,
          parentStates: linkageStateContext.parentLinkageStates,
          ownStates: ownLinkageStates,
          merged,
        })
      );
      return merged;
    }
    return ownLinkageStates;
  }, [linkageStateContext?.parentLinkageStates, ownLinkageStates, pathPrefix]);

  const {
    handleSubmit,
    watch,
    formState: { errors },
  } = methods;

  // 获取嵌套 schema 注册表（可选，因为可能不在 Provider 内部）
  const nestedSchemaRegistry = useNestedSchemaRegistryOptional();

  React.useEffect(() => {
    if (onChange) {
      const subscription = watch(data => {
        // 第一步：如果使用了路径扁平化，将扁平数据转换回嵌套结构
        // 使用基于 Schema 的转换，正确恢复物理路径结构
        let processedData = useFlattenPath
          ? PathTransformer.flatToNestedWithSchema(data, schema)
          : data;

        // 第二步：解包基本类型数组
        processedData = unwrapPrimitiveArrays(processedData, schema);

        onChange(processedData);
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange, useFlattenPath, schema]);

  const onSubmitHandler = async (data: Record<string, any>) => {
    if (onSubmit) {
      console.info('[DynamicForm] onSubmitHandler - 原始数据:', JSON.stringify(data));
      console.info('[DynamicForm] onSubmitHandler - useFlattenPath:', useFlattenPath);

      // 第一步：如果使用了路径扁平化，将扁平数据转换回嵌套结构
      // 使用基于 Schema 的转换，正确恢复物理路径结构
      let processedData = useFlattenPath
        ? PathTransformer.flatToNestedWithSchema(data, schema)
        : data;

      console.info('[DynamicForm] onSubmitHandler - 路径转换后:', JSON.stringify(processedData));

      // 第二步：解包基本类型数组（将对象数组转换回基本类型数组）
      processedData = unwrapPrimitiveArrays(processedData, schema);

      console.info('[DynamicForm] onSubmitHandler - 解包数组后:', JSON.stringify(processedData));

      // 第三步：根据当前 schema 过滤数据，只保留 schema 中定义的字段
      const filteredData = nestedSchemaRegistry
        ? filterValueWithNestedSchemas(processedData, schema, nestedSchemaRegistry.getAllSchemas())
        : filterValueWithNestedSchemas(processedData, schema, new Map());

      console.info('[DynamicForm] onSubmitHandler - 过滤后:', JSON.stringify(filteredData));

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
