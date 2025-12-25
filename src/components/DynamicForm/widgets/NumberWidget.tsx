import React, { forwardRef } from 'react';
import { NumericInput } from '@blueprintjs/core';
import type { FieldWidgetProps } from '../types';

export const NumberWidget = forwardRef<HTMLInputElement, FieldWidgetProps>(
  ({ name, placeholder, disabled, readonly, error, ...rest }, ref) => {
    return (
      <NumericInput
        inputRef={ref}
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readonly}
        intent={error ? 'danger' : 'none'}
        fill
        {...rest}
      />
    );
  }
);

NumberWidget.displayName = 'NumberWidget';
