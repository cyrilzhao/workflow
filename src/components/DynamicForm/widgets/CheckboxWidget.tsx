import React, { forwardRef } from 'react';
import { Checkbox } from '@blueprintjs/core';
import type { FieldWidgetProps } from '../types';

export const CheckboxWidget = forwardRef<HTMLInputElement, FieldWidgetProps>(
  ({ name, label, disabled, readonly, error, ...rest }, ref) => {
    return (
      <Checkbox
        inputRef={ref}
        name={name}
        label={label}
        disabled={disabled || readonly}
        {...rest}
      />
    );
  }
);

CheckboxWidget.displayName = 'CheckboxWidget';
