import React from 'react';
import { FormGroup } from '@blueprintjs/core';

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  required?: boolean;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ htmlFor, label, required }) => {
  return (
    <label htmlFor={htmlFor} className="bp5-label">
      {label}
      {required && <span className="bp5-text-muted"> (必填)</span>}
    </label>
  );
};
