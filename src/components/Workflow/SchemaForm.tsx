import React from 'react';
import type { JsonSchema } from './types';
import './SchemaForm.scss';

interface SchemaFormProps {
  schema: JsonSchema;
  data: any;
  onChange: (data: any) => void;
}

export const SchemaForm: React.FC<SchemaFormProps> = ({ schema, data, onChange }) => {
  const handleChange = (key: string, value: any) => {
    onChange({
      ...data,
      [key]: value,
    });
  };

  return (
    <div className="schema-form">
      {Object.entries(schema.properties).map(([key, property]) => (
        <div key={key} className="form-item">
          <label className="form-label">
            {property.title}
            {schema.required?.includes(key) && <span className="required">*</span>}
          </label>
          {property.description && <div className="form-description">{property.description}</div>}

          <div className="form-control">
            {property.type === 'string' && (
              <input
                type="text"
                value={data[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="input-text"
              />
            )}

            {property.type === 'number' && (
              <input
                type="number"
                value={data[key] || ''}
                onChange={e => handleChange(key, Number(e.target.value))}
                className="input-number"
              />
            )}

            {property.type === 'boolean' && (
              <input
                type="checkbox"
                checked={!!data[key]}
                onChange={e => handleChange(key, e.target.checked)}
                className="input-checkbox"
              />
            )}

            {property.type === 'select' && (
              <select
                value={data[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="input-select"
              >
                <option value="">Select...</option>
                {property.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
