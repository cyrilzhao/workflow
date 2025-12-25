import React, { forwardRef } from 'react';
import { Switch } from '@blueprintjs/core';
import type { FieldWidgetProps } from '../types';

export const SwitchWidget = forwardRef<HTMLInputElement, FieldWidgetProps>(
  ({ name, label, disabled, readonly, error, ...rest }, ref) => {
    return (
      <Switch inputRef={ref} name={name} label={label} disabled={disabled || readonly} {...rest} />
    );
  }
);

SwitchWidget.displayName = 'SwitchWidget';
