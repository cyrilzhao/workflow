import React, { forwardRef, useMemo, useState } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import {
  Button,
  Card,
  Tooltip,
  Checkbox,
  Popover,
  PopoverInteractionKind,
} from '@blueprintjs/core';
import type { FieldWidgetProps } from '../types';
import type { ExtendedJSONSchema, WidgetType } from '@/types/schema';
import { FieldRegistry } from '../core/FieldRegistry';
import { SchemaParser } from '../core/SchemaParser';

export interface ArrayFieldWidgetProps extends FieldWidgetProps {
  schema: ExtendedJSONSchema & {
    type: 'array';
    items: ExtendedJSONSchema;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
  };
  value?: any[];
  onChange?: (value: any[]) => void;
  disabled?: boolean;
  readonly?: boolean;
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number | string;
}

/**
 * 根据 items schema 决定使用什么 widget 渲染数组元素
 */
function determineItemWidget(itemsSchema: ExtendedJSONSchema): WidgetType {
  // 优先级 1: 显式指定了 widget
  if (itemsSchema.ui?.widget) {
    return itemsSchema.ui.widget;
  }

  // 优先级 2: 对象类型 → 嵌套表单
  if (itemsSchema.type === 'object') {
    return 'nested-form';
  }

  // 优先级 3: 基本类型 → 对应的基础 widget
  switch (itemsSchema.type) {
    case 'string':
      // 根据 format 进一步判断
      if (itemsSchema.format === 'email') return 'email';
      if (itemsSchema.format === 'uri') return 'url';
      if (itemsSchema.format === 'date') return 'date';
      if (itemsSchema.format === 'date-time') return 'datetime';
      if (itemsSchema.format === 'time') return 'time';
      return 'text';

    case 'number':
    case 'integer':
      return 'number';

    case 'boolean':
      return 'checkbox';

    default:
      return 'text';
  }
}

/**
 * 判断应该使用哪种渲染模式
 */
function determineArrayMode(schema: ExtendedJSONSchema): 'static' | 'dynamic' {
  // 1. 显式指定了 arrayMode
  if (schema.ui?.arrayMode) {
    return schema.ui.arrayMode;
  }

  // 2. 如果 items 有 enum，默认使用 static 模式（多选框组，不可增删）
  if (schema.items && typeof schema.items === 'object') {
    const items = schema.items as ExtendedJSONSchema;
    if (items.enum && items.enum.length > 0) {
      return 'static';
    }
  }

  // 3. 默认使用 dynamic 模式（可增删的列表）
  return 'dynamic';
}

/**
 * 判断是否为基本类型（需要包装的类型）
 */
function isPrimitiveType(schema: ExtendedJSONSchema): boolean {
  const type = schema.type;
  return type === 'string' || type === 'number' || type === 'integer' || type === 'boolean';
}

/**
 * 获取基本类型的默认值
 */
function getDefaultPrimitiveValue(schema: ExtendedJSONSchema): any {
  switch (schema.type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    default:
      return null;
  }
}

/**
 * 获取数组元素的默认值
 * 对于基本类型，包装成 { value: xxx } 以避免被 useFieldArray 过滤
 */
function getDefaultValue(itemsSchema: ExtendedJSONSchema): any {
  // 如果是基本类型，包装成对象
  if (isPrimitiveType(itemsSchema)) {
    const defaultVal =
      itemsSchema.default !== undefined
        ? itemsSchema.default
        : getDefaultPrimitiveValue(itemsSchema);
    return { value: defaultVal };
  }

  // 对象类型，正常处理
  if (itemsSchema.default !== undefined) {
    return itemsSchema.default;
  }

  if (itemsSchema.type === 'object') {
    // 为对象类型生成默认值
    if (itemsSchema.properties) {
      const defaultObj: any = {};
      Object.entries(itemsSchema.properties).forEach(([key, propSchema]) => {
        const prop = propSchema as ExtendedJSONSchema;
        if (prop.default !== undefined) {
          defaultObj[key] = prop.default;
        } else if (prop.type === 'string') {
          defaultObj[key] = '';
        } else if (prop.type === 'number' || prop.type === 'integer') {
          defaultObj[key] = 0;
        } else if (prop.type === 'boolean') {
          defaultObj[key] = false;
        } else if (prop.type === 'array') {
          defaultObj[key] = [];
        } else if (prop.type === 'object') {
          defaultObj[key] = {};
        }
      });
      return defaultObj;
    }
    return {};
  }

  if (itemsSchema.type === 'array') {
    return [];
  }

  return null;
}

export const ArrayFieldWidget = forwardRef<HTMLDivElement, ArrayFieldWidgetProps>(
  ({ name, schema, disabled, readonly, layout, labelWidth }, ref) => {
    const { control, formState } = useFormContext();
    const { fields, append, remove, move } = useFieldArray({
      control,
      name,
    });

    // 获取数组项的 schema
    const itemSchema = schema.items as ExtendedJSONSchema;

    if (!itemSchema || typeof itemSchema !== 'object') {
      console.warn(`ArrayFieldWidget: schema.items is required for array field "${name}"`);
      return null;
    }

    // 判断渲染模式
    const arrayMode = useMemo(() => determineArrayMode(schema), [schema]);

    // 从 schema.ui 中获取配置
    const addButtonText = schema.ui?.addButtonText || '添加';
    const emptyText = schema.ui?.emptyText;
    const minItems = schema.minItems || 0;
    const maxItems = schema.maxItems;

    // 判断是否可以增删
    const canAddRemove = !disabled && !readonly && arrayMode === 'dynamic';

    // 添加新项
    const handleAdd = () => {
      const defaultValue = getDefaultValue(itemSchema);
      append(defaultValue);
    };

    // 删除项
    const handleRemove = (index: number) => {
      // 删除项时不触发验证
      remove(index);
    };

    // 上移
    const handleMoveUp = (index: number) => {
      if (index > 0) {
        // 移动项时不触发验证
        move(index, index - 1);
      }
    };

    // 下移
    const handleMoveDown = (index: number) => {
      if (index < fields.length - 1) {
        // 移动项时不触发验证
        move(index, index + 1);
      }
    };

    // 如果是 static 模式（枚举数组），渲染为多选框组
    if (arrayMode === 'static' && itemSchema.enum) {
      return (
        <div ref={ref} className="array-field-widget array-field-widget--static">
          <Controller
            name={name}
            control={control}
            render={({ field }) => {
              const currentValue = field.value || [];
              const enumValues = itemSchema.enum || [];
              const enumNames = itemSchema.enumNames || enumValues;

              return (
                <div className="checkbox-group">
                  {enumValues.map((enumValue, index) => {
                    const isChecked = currentValue.includes(enumValue);
                    const label = String(enumNames[index]);

                    return (
                      <Checkbox
                        key={String(enumValue)}
                        label={label}
                        checked={isChecked}
                        disabled={disabled || readonly}
                        onChange={e => {
                          const checked = e.currentTarget.checked;
                          let newValue: any[];

                          if (checked) {
                            // 添加选项
                            newValue = [...currentValue, enumValue];
                          } else {
                            // 移除选项
                            newValue = currentValue.filter((v: any) => v !== enumValue);
                          }

                          field.onChange(newValue);
                        }}
                        style={{ marginBottom: '8px' }}
                      />
                    );
                  })}
                </div>
              );
            }}
          />
        </div>
      );
    }

    // dynamic 模式：可增删的列表
    return (
      <div ref={ref} className="array-field-widget">
        {/* 数组项列表 */}
        {fields.map((field, index) => (
          <ArrayItem
            key={field.id}
            name={`${name}.${index}`}
            index={index}
            schema={itemSchema}
            onRemove={canAddRemove ? () => handleRemove(index) : undefined}
            onMoveUp={canAddRemove ? () => handleMoveUp(index) : undefined}
            onMoveDown={canAddRemove ? () => handleMoveDown(index) : undefined}
            statusMap={{
              isAtMinLimit: fields.length <= minItems,
              isFirstItem: index === 0,
              isLastItem: index === fields.length - 1,
            }}
            disabled={disabled}
            readonly={readonly}
            layout={layout}
            labelWidth={labelWidth}
          />
        ))}

        {/* 空状态提示 */}
        {fields.length === 0 && emptyText && (
          <div
            className="array-empty-text"
            style={{ color: '#999', padding: '10px', textAlign: 'center' }}
          >
            {emptyText}
          </div>
        )}

        {/* 添加按钮 */}
        {canAddRemove && (
          <Tooltip
            content={maxItems && fields.length >= maxItems ? '已达到最大数量限制' : ''}
            disabled={!maxItems || fields.length < maxItems}
          >
            <Button
              icon="add"
              intent="primary"
              onClick={handleAdd}
              disabled={maxItems !== undefined && fields.length >= maxItems}
              style={{ marginTop: fields.length > 0 ? '10px' : '0' }}
            >
              {addButtonText}
            </Button>
          </Tooltip>
        )}
      </div>
    );
  }
);

ArrayFieldWidget.displayName = 'ArrayFieldWidget';

/**
 * 删除确认 Popover 内容组件
 */
interface DeleteConfirmPopoverProps {
  onConfirm: () => void;
  onCancel: () => void;
  itemIndex: number;
}

const DeleteConfirmPopover: React.FC<DeleteConfirmPopoverProps> = ({
  onConfirm,
  onCancel,
  itemIndex,
}) => {
  return (
    <div style={{ padding: '10px', maxWidth: '250px' }}>
      <div style={{ marginBottom: '10px', fontSize: '14px' }}>
        确定要删除第 {itemIndex + 1} 项吗？
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button small onClick={onCancel}>
          取消
        </Button>
        <Button small intent="danger" onClick={onConfirm}>
          删除
        </Button>
      </div>
    </div>
  );
};

/**
 * ArrayItem 状态映射
 */
interface ArrayItemStatusMap {
  isAtMinLimit?: boolean; // 是否达到最小数量限制
  isFirstItem?: boolean; // 是否是第一项
  isLastItem?: boolean; // 是否是最后一项
}

/**
 * ArrayItem 子组件
 */
interface ArrayItemProps {
  name: string;
  index: number;
  schema: ExtendedJSONSchema;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  statusMap?: ArrayItemStatusMap;
  disabled?: boolean;
  readonly?: boolean;
  layout?: 'vertical' | 'horizontal' | 'inline';
  labelWidth?: number | string;
}

const ArrayItem: React.FC<ArrayItemProps> = ({
  name,
  index,
  schema,
  onRemove,
  onMoveUp,
  onMoveDown,
  statusMap,
  disabled,
  readonly,
  layout,
  labelWidth,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  // 删除确认 Popover 的状态
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

  // 处理删除确认
  const handleConfirmDelete = () => {
    setIsDeletePopoverOpen(false);
    onRemove?.();
  };

  // 处理取消删除
  const handleCancelDelete = () => {
    setIsDeletePopoverOpen(false);
  };

  // 根据 schema 获取对应的 Widget
  const itemWidget = useMemo(() => determineItemWidget(schema), [schema]);
  const WidgetComponent = FieldRegistry.getWidget(itemWidget);

  if (!WidgetComponent) {
    console.error(`Widget "${itemWidget}" not found in registry`);
    return null;
  }

  // 如果是对象类型，使用特殊渲染
  if (schema.type === 'object') {
    return (
      <Card
        className="array-item array-item-object"
        elevation={1}
        style={{ marginBottom: '15px', padding: '15px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>
            {schema.title || 'Item'} {index + 1}
          </span>
          {(onMoveUp || onMoveDown || onRemove) && (
            <div className="array-item-actions" style={{ display: 'flex', gap: '5px' }}>
              {onMoveUp && (
                <Tooltip
                  content={statusMap?.isFirstItem ? '已是第一项' : ''}
                  disabled={!statusMap?.isFirstItem}
                >
                  <Button
                    icon="arrow-up"
                    minimal
                    small
                    onClick={onMoveUp}
                    disabled={disabled || statusMap?.isFirstItem}
                    title="上移"
                  />
                </Tooltip>
              )}
              {onMoveDown && (
                <Tooltip
                  content={statusMap?.isLastItem ? '已是最后一项' : ''}
                  disabled={!statusMap?.isLastItem}
                >
                  <Button
                    icon="arrow-down"
                    minimal
                    small
                    onClick={onMoveDown}
                    disabled={disabled || statusMap?.isLastItem}
                    title="下移"
                  />
                </Tooltip>
              )}
              {onRemove && (
                <Popover
                  content={
                    <DeleteConfirmPopover
                      onConfirm={handleConfirmDelete}
                      onCancel={handleCancelDelete}
                      itemIndex={index}
                    />
                  }
                  isOpen={isDeletePopoverOpen}
                  onInteraction={nextOpenState => {
                    // 如果按钮被禁用，不允许打开 Popover
                    if (disabled || statusMap?.isAtMinLimit) {
                      return;
                    }
                    setIsDeletePopoverOpen(nextOpenState);
                  }}
                  interactionKind={PopoverInteractionKind.CLICK}
                  placement="top"
                >
                  <Tooltip
                    content={statusMap?.isAtMinLimit ? '已达到最小数量限制' : ''}
                    disabled={!statusMap?.isAtMinLimit}
                  >
                    <Button
                      icon="trash"
                      minimal
                      small
                      intent="danger"
                      disabled={disabled || statusMap?.isAtMinLimit}
                      title="删除"
                    />
                  </Tooltip>
                </Popover>
              )}
            </div>
          )}
        </div>

        {/* 直接渲染 NestedFormWidget，不再使用 Controller 包裹 */}
        {/* NestedFormWidget 内部使用 asNestedForm 模式，子字段会直接注册到父表单 */}
        {/* 传递 noCard={true} 避免双层 Card 嵌套 */}
        <WidgetComponent
          name={name}
          schema={schema}
          disabled={disabled}
          readonly={readonly}
          layout={layout}
          labelWidth={labelWidth}
          noCard={true}
        />
      </Card>
    );
  }

  // 基本类型：渲染为简单的输入框 + 操作按钮
  // 为基础类型生成校验规则
  const validationRules = useMemo(() => SchemaParser.getValidationRules(schema, false), [schema]);

  // 获取错误信息（需要从嵌套的 errors 对象中提取）
  const getFieldError = (fieldPath: string): string | undefined => {
    const pathParts = fieldPath.split('.');
    let errorObj: any = errors;

    for (const part of pathParts) {
      if (!errorObj) return undefined;
      errorObj = errorObj[part];
    }

    return errorObj?.message as string | undefined;
  };

  const fieldError = getFieldError(`${name}.value`);

  return (
    <div
      className="array-item array-item-simple"
      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}
    >
      {/* 索引标签 */}
      <div className="array-item-index" style={{ minWidth: '30px', color: '#999' }}>
        #{index + 1}
      </div>

      {/* 字段内容 */}
      <div className="array-item-field" style={{ flex: 1 }}>
        <Controller
          name={`${name}.value`}
          control={control}
          rules={validationRules}
          render={({ field: controllerField }) => (
            <>
              <WidgetComponent
                name={`${name}.value`}
                schema={schema}
                value={controllerField.value}
                onChange={controllerField.onChange}
                disabled={disabled}
                readonly={readonly}
              />
              {fieldError && (
                <div style={{ color: '#DB3737', fontSize: '12px', marginTop: '5px' }}>
                  {fieldError}
                </div>
              )}
            </>
          )}
        />
      </div>

      {/* 操作按钮 */}
      {(onMoveUp || onMoveDown || onRemove) && (
        <div
          className="array-item-actions"
          style={{ display: 'flex', height: '30px', gap: '5px', alignItems: 'center' }}
        >
          {onMoveUp && (
            <Tooltip
              content={statusMap?.isFirstItem ? '已是第一项' : ''}
              disabled={!statusMap?.isFirstItem}
            >
              <Button
                icon="arrow-up"
                minimal
                small
                onClick={onMoveUp}
                disabled={disabled || statusMap?.isFirstItem}
                title="上移"
              />
            </Tooltip>
          )}
          {onMoveDown && (
            <Tooltip
              content={statusMap?.isLastItem ? '已是最后一项' : ''}
              disabled={!statusMap?.isLastItem}
            >
              <Button
                icon="arrow-down"
                minimal
                small
                onClick={onMoveDown}
                disabled={disabled || statusMap?.isLastItem}
                title="下移"
              />
            </Tooltip>
          )}
          {onRemove && (
            <Popover
              content={
                <DeleteConfirmPopover
                  onConfirm={handleConfirmDelete}
                  onCancel={handleCancelDelete}
                  itemIndex={index}
                />
              }
              isOpen={isDeletePopoverOpen}
              onInteraction={nextOpenState => {
                // 如果按钮被禁用，不允许打开 Popover
                if (disabled || statusMap?.isAtMinLimit) {
                  return;
                }
                setIsDeletePopoverOpen(nextOpenState);
              }}
              interactionKind={PopoverInteractionKind.CLICK}
              placement="top"
            >
              <Tooltip
                content={statusMap?.isAtMinLimit ? '已达到最小数量限制' : ''}
                disabled={!statusMap?.isAtMinLimit}
              >
                <Button
                  icon="trash"
                  minimal
                  small
                  intent="danger"
                  disabled={disabled || statusMap?.isAtMinLimit}
                  title="删除"
                />
              </Tooltip>
            </Popover>
          )}
        </div>
      )}
    </div>
  );
};
