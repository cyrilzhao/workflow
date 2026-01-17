import React, { forwardRef, useCallback, useMemo } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Button } from '@blueprintjs/core';
import { Trash2, Plus } from 'lucide-react';
import type { FieldWidgetProps } from '../types';
import type { ExtendedJSONSchema } from '../types/schema';
import './KeyValueArrayWidget.scss';

export interface KeyValueArrayWidgetProps extends FieldWidgetProps {
  schema: ExtendedJSONSchema & {
    type: 'array';
    items: ExtendedJSONSchema;
  };
  value?: any[];
  onChange?: (value: any[]) => void;
  disabled?: boolean;
  readonly?: boolean;
  /**
   * 键字段名称（默认：'key'）
   */
  keyField?: string;
  /**
   * 值字段名称（默认：'value'）
   */
  valueField?: string;
  /**
   * 键列标题（默认：'Key'）
   */
  keyLabel?: string;
  /**
   * 值列标题（默认：'Value'）
   */
  valueLabel?: string;
  /**
   * 键输入框占位符
   */
  keyPlaceholder?: string;
  /**
   * 值输入框占位符
   */
  valuePlaceholder?: string;
  /**
   * 添加按钮文本（默认：'Add'）
   */
  addButtonText?: string;
  /**
   * 空状态提示文本
   */
  emptyText?: string;
}

/**
 * KeyValueArrayWidget - 键值对数组组件
 *
 * 用于渲染和编辑键值对数组，适用于配置映射、参数设置等场景。
 *
 * @example
 * ```json
 * {
 *   "type": "array",
 *   "title": "Output Mappings",
 *   "items": {
 *     "type": "object",
 *     "properties": {
 *       "source": { "type": "string" },
 *       "target": { "type": "string" }
 *     }
 *   },
 *   "ui": {
 *     "widget": "key-value-array",
 *     "widgetProps": {
 *       "keyField": "target",
 *       "valueField": "source",
 *       "keyLabel": "Variable Name",
 *       "valueLabel": "Expression"
 *     }
 *   }
 * }
 * ```
 */
export const KeyValueArrayWidget = forwardRef<HTMLDivElement, KeyValueArrayWidgetProps>(
  (
    {
      name,
      schema,
      disabled,
      readonly,
      keyField = 'key',
      valueField = 'value',
      keyLabel = 'Key',
      valueLabel = 'Value',
      keyPlaceholder,
      valuePlaceholder,
      addButtonText = 'Add',
      emptyText,
    },
    ref
  ) => {
    const { control, register } = useFormContext();
    const { fields, append, remove } = useFieldArray({
      control,
      name,
    });

    // 从 schema.ui.widgetProps 中获取配置（优先级更高）
    const widgetProps = schema.ui?.widgetProps || {};
    const finalKeyField = widgetProps.keyField || keyField;
    const finalValueField = widgetProps.valueField || valueField;
    const finalKeyLabel = widgetProps.keyLabel || keyLabel;
    const finalValueLabel = widgetProps.valueLabel || valueLabel;
    const finalKeyPlaceholder = widgetProps.keyPlaceholder || keyPlaceholder || finalKeyLabel;
    const finalValuePlaceholder = widgetProps.valuePlaceholder || valuePlaceholder || finalValueLabel;
    const finalAddButtonText = widgetProps.addButtonText || addButtonText;
    const finalEmptyText = widgetProps.emptyText || emptyText;

    // 判断是否可以增删
    const canAddRemove = !disabled && !readonly;

    // 获取最小/最大项数限制
    const minItems = schema.minItems || 0;
    const maxItems = schema.maxItems;

    // 添加新项
    const handleAdd = useCallback(() => {
      const newItem = {
        [finalKeyField]: '',
        [finalValueField]: '',
      };
      append(newItem);
    }, [finalKeyField, finalValueField, append]);

    // 删除项
    const handleRemove = useCallback(
      (index: number) => {
        remove(index);
      },
      [remove]
    );

    // 判断是否可以删除
    const canRemove = useCallback(
      (index: number) => {
        return canAddRemove && fields.length > minItems;
      },
      [canAddRemove, fields.length, minItems]
    );

    // 判断是否可以添加
    const canAdd = useMemo(() => {
      return canAddRemove && (maxItems === undefined || fields.length < maxItems);
    }, [canAddRemove, maxItems, fields.length]);

    return (
      <div ref={ref} className="key-value-array-widget">
        {/* 表头 */}
        {fields.length > 0 && (
          <div className="key-value-array-header">
            <div className="col-key">{finalKeyLabel}</div>
            <div className="col-arrow"></div>
            <div className="col-value">{finalValueLabel}</div>
            <div className="col-action"></div>
          </div>
        )}

        {/* 列表 */}
        <div className="key-value-array-list">
          {fields.length === 0 && finalEmptyText ? (
            <div className="key-value-array-empty">{finalEmptyText}</div>
          ) : (
            fields.map((field, index) => (
              <div key={field.id} className="key-value-array-item">
                {/* 键输入框 */}
                <div className="field-group">
                  <input
                    type="text"
                    {...register(`${name}.${index}.${finalKeyField}`)}
                    placeholder={finalKeyPlaceholder}
                    disabled={disabled}
                    readOnly={readonly}
                  />
                </div>

                {/* 分隔符 */}
                <div className="arrow">=</div>

                {/* 值输入框 */}
                <div className="field-group">
                  <input
                    type="text"
                    {...register(`${name}.${index}.${finalValueField}`)}
                    placeholder={finalValuePlaceholder}
                    disabled={disabled}
                    readOnly={readonly}
                  />
                </div>

                {/* 删除按钮 */}
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleRemove(index)}
                  disabled={!canRemove(index)}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 添加按钮 */}
        {canAdd && (
          <Button
            icon={<Plus size={14} />}
            onClick={handleAdd}
            disabled={!canAdd}
            style={{ marginTop: fields.length > 0 ? '10px' : '0' }}
          >
            {finalAddButtonText}
          </Button>
        )}
      </div>
    );
  }
);

KeyValueArrayWidget.displayName = 'KeyValueArrayWidget';
