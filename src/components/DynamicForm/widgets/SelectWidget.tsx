import React, { forwardRef } from 'react';
import { HTMLSelect } from '@blueprintjs/core';
import type { FieldWidgetProps } from '../types';

export const SelectWidget = forwardRef<HTMLSelectElement, FieldWidgetProps>(
  ({ name, placeholder, disabled, readonly, options = [], error, ...rest }, ref) => {
    return (
      <HTMLSelect
        elementRef={ref}
        name={name}
        disabled={disabled || readonly}
        intent={error ? 'danger' : 'none'}
        fill
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </HTMLSelect>
    );
  }
);

SelectWidget.displayName = 'SelectWidget';
