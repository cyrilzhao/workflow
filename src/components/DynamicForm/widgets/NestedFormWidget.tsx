import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card } from '@blueprintjs/core';
import { DynamicForm } from '../DynamicForm';
import type { FieldWidgetProps } from '../types';
import type { ExtendedJSONSchema } from '../types/schema';
import { PathResolver } from '../utils/pathResolver';
import { useNestedSchemaRegistry } from '../context/NestedSchemaContext';
import { usePathPrefix, joinPath, removePrefix } from '../context/PathPrefixContext';
import { useLinkageStateContext } from '../context/LinkageStateContext';

export interface NestedFormWidgetProps extends FieldWidgetProps {
  // 当前字段的 schema（包含 properties）
  schema: ExtendedJSONSchema;

  // 当前字段值（对象）
  value?: Record<string, any>;

  // 值变化回调
  onChange?: (value: Record<string, any>) => void;

  // 其他配置
  disabled?: boolean;
  readonly?: boolean;
  layout?: 'vertical' | 'horizontal' | 'inline'; // 布局方式
  labelWidth?: number | string; // 标签宽度

  // 是否不渲染 Card 容器（用于 ArrayFieldWidget 调用时避免双层 Card）
  noCard?: boolean;
}

export const NestedFormWidget = forwardRef<HTMLDivElement, NestedFormWidgetProps>(
  ({ name, value = {}, schema, disabled, readonly, layout, labelWidth, noCard = false }, ref) => {
    const [currentSchema, setCurrentSchema] = useState<ExtendedJSONSchema>(schema);
    const [loading, setLoading] = useState(false);
    // 保存外层表单的 context
    // const parentFormContext = useFormContext();
    // const { watch, getValues } = parentFormContext;

    // 获取父级路径前缀
    const parentPathPrefix = usePathPrefix();
    // 计算当前字段的完整路径
    const fullPath = joinPath(parentPathPrefix, name);

    // 获取嵌套 schema 注册表
    const nestedSchemaRegistry = useNestedSchemaRegistry();

    // 获取联动状态 Context
    const linkageStateContext = useLinkageStateContext();

    // 保存当前的 schema key 值，用于检测切换
    // const previousKeyRef = useRef<string | undefined>();

    // 保存上次的 value 序列化值，用于检测 value 是否真正变化
    // const previousValueRef = useRef<string>('');

    // 注册当前 schema 到 Context（当 currentSchema 变化时更新）
    useEffect(() => {
      nestedSchemaRegistry.register(fullPath, currentSchema);
      console.info(`[NestedFormWidget] 注册字段 "${fullPath}" 的 schema 到 Context`);

      return () => {
        nestedSchemaRegistry.unregister(fullPath);
        console.info(`[NestedFormWidget] 注销字段 "${fullPath}" 的 schema`);
      };
    }, [fullPath, currentSchema, nestedSchemaRegistry]);

    // 处理 schema 联动（新的联动系统）
    useEffect(() => {
      // 如果没有联动状态 Context，说明不在联动环境中
      if (!linkageStateContext) return;

      const { parentLinkageStates } = linkageStateContext;

      // 获取当前字段的联动状态
      const linkageState = parentLinkageStates[fullPath];

      // 如果有 schema 联动结果，更新 currentSchema
      if (linkageState?.schema) {
        console.log('[NestedFormWidget] 检测到 schema 联动，更新 schema:', linkageState.schema);

        // 选择性合并 schema，只更新 properties 和校验相关字段
        // 保留原有的 ui 配置（包括 ui.linkage）
        setCurrentSchema(prevSchema => ({
          ...prevSchema,
          // 更新 properties
          properties: linkageState.schema.properties || prevSchema.properties,
          // 更新校验相关字段
          required: linkageState.schema.required,
          minProperties: linkageState.schema.minProperties,
          maxProperties: linkageState.schema.maxProperties,
          dependencies: linkageState.schema.dependencies,
          if: linkageState.schema.if,
          then: linkageState.schema.then,
          else: linkageState.schema.else,
          allOf: linkageState.schema.allOf,
          anyOf: linkageState.schema.anyOf,
          oneOf: linkageState.schema.oneOf,
          not: linkageState.schema.not,
          // 保留原有的 ui 配置
          ui: prevSchema.ui,
        }));
      }
    }, [linkageStateContext, fullPath]);

    if (loading) {
      return (
        <div ref={ref} className="nested-form-loading">
          Loading...
        </div>
      );
    }

    if (!currentSchema || !currentSchema.properties) {
      return null;
    }

    // 内部表单内容
    const formContent = (
      <DynamicForm
        schema={currentSchema}
        disabled={disabled}
        readonly={readonly}
        layout={layout}
        labelWidth={labelWidth}
        showSubmitButton={false}
        renderAsForm={false}
        onSubmit={() => {}}
        pathPrefix={fullPath}
        asNestedForm={true}
      />
    );

    // 检查是否使用 flattenPath（路径透明化）
    const useFlattenPath = schema.ui?.flattenPath;

    // 根据 flattenPath 或 noCard 决定渲染方式
    if (useFlattenPath || noCard) {
      // 透明容器：无 Card、无 padding、无标题
      return (
        <div
          ref={ref}
          className="nested-form-widget--flatten"
          data-name={name}
        >
          {formContent}
        </div>
      );
    }

    // 标准容器：有 Card、有 padding、有标题
    return (
      <Card
        ref={ref}
        className="nested-form-widget"
        data-name={name}
        elevation={1}
        style={{ padding: '15px' }}
      >
        {formContent}
      </Card>
    );
  }
);

NestedFormWidget.displayName = 'NestedFormWidget';
