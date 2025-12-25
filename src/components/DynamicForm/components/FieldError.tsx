import React from 'react';
import { Callout } from '@blueprintjs/core';

interface FieldErrorProps {
  message: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ message }) => {
  return (
    <div className="field-error" style={{ marginTop: '5px' }}>
      <small style={{ color: '#db3737' }}>{message}</small>
    </div>
  );
};
