import React, { forwardRef } from 'react';
import { RadioGroup, Radio } from '@blueprintjs/core';
import type { FieldWidgetProps } from '../types';
import type { FieldOption } from '@/types/schema';

export const RadioWidget = forwardRef<HTMLInputElement, FieldWidgetProps>(
  ({ name, disabled, readonly, options = [], value, onChange }, ref) => {
    return (
      <RadioGroup
        name={name}
        disabled={disabled || readonly}
        selectedValue={value}
        onChange={e => {
          // Controller 会直接传递 onChange，我们从事件中提取值
          const target = e.target as HTMLInputElement;
          onChange?.(target.value);
        }}
      >
        {options.map((option: FieldOption) => (
          <Radio
            key={option.value}
            label={option.label}
            value={option.value}
            disabled={option.disabled}
          />
        ))}
      </RadioGroup>
    );
  }
);

RadioWidget.displayName = 'RadioWidget';
