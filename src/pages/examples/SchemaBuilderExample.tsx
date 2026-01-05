import React, { useState } from 'react';
import { SchemaBuilder } from '../../components/DynamicForm/SchemaBuilder/SchemaBuilder';
import type { ExtendedJSONSchema } from '../../components/DynamicForm/types/schema';
import { Card, H3, H5, Divider, Button } from '@blueprintjs/core';
import { DynamicForm } from '../../components/DynamicForm';

const initialSchema: ExtendedJSONSchema = {
  type: 'object',
  title: 'User Profile',
  properties: {
    username: {
      type: 'string',
      title: 'Username',
      minLength: 3,
    },
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 0,
    },
  },
  required: ['username'],
};

export const SchemaBuilderExample: React.FC = () => {
  const [schema, setSchema] = useState<ExtendedJSONSchema>(initialSchema);
  const [previewData, setPreviewData] = useState({});

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <H3>Schema Builder</H3>
      <p>Visual editor for ExtendedJSONSchema.</p>

      <div style={{ marginBottom: '20px' }}>
        <SchemaBuilder defaultValue={initialSchema} onChange={setSchema} />
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <Card>
            <H5>Generated Schema (JSON)</H5>
            <pre
              style={{
                background: '#f5f8fa',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '12px',
              }}
            >
              {JSON.stringify(schema, null, 2)}
            </pre>
          </Card>
        </div>
        <div style={{ flex: 1 }}>
          <Card>
            <H5>Live Form Preview</H5>
            <Divider />
            <div style={{ padding: '10px 0' }}>
              <DynamicForm schema={schema} onChange={setPreviewData} />
            </div>
            <Divider />
            <H5>Form Data</H5>
            <pre
              style={{
                background: '#f5f8fa',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '12px',
              }}
            >
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchemaBuilderExample;
