import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Tabs,
  Tab,
  FormGroup,
  InputGroup,
  TextArea,
  HTMLSelect,
  NumericInput,
  Switch,
  Callout,
  ControlGroup,
  Divider,
} from '@blueprintjs/core';
import { get } from 'lodash';
import { useSchemaBuilder } from './SchemaBuilder';
import type { SchemaNodeType } from './types';

// Helper to get node from path
const getNode = (schema: any, path: string[]) => {
  if (path.length === 0) return schema;
  return get(schema, path);
};

export const PropertyEditor: React.FC = () => {
  const { schema, selectedPath, onUpdate } = useSchemaBuilder();
  const currentNode = getNode(schema, selectedPath);

  // Determine if it's a root node
  const isRoot = selectedPath.length === 0;

  // Determine if it's an object property (to allow renaming key)
  // path: ['properties', 'field1'] -> yes
  // path: ['items'] -> no
  const isObjectProperty =
    selectedPath.length > 0 && selectedPath[selectedPath.length - 2] === 'properties';
  const currentKey = isObjectProperty ? selectedPath[selectedPath.length - 1] : undefined;

  // Determine if it's an array items node
  const parentPath = selectedPath.slice(0, -1);
  const parentNode = getNode(schema, parentPath);
  const isArrayItems =
    selectedPath.length > 0 &&
    selectedPath[selectedPath.length - 1] === 'items' &&
    parentNode?.type === 'array';
  const [selectedTabId, setSelectedTabId] = useState('basic');

  const { control, register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      key: currentKey,
      ...currentNode,
      // flatten nested ui/validation properties for easier form handling if needed,
      // but for now we map directly to schema structure
      ui: currentNode?.ui || {},
    },
    mode: 'onBlur',
  });

  // Watch for changes to update schema
  useEffect(() => {
    if (currentNode) {
      reset({
        key: currentKey,
        ...currentNode,
        ui: currentNode.ui || {},
      });
    }
  }, [currentNode, currentKey, reset]);

  useEffect(() => {
    setSelectedTabId('basic');
  }, [currentKey]);

  if (!currentNode) {
    return (
      <div className="property-editor-empty">
        <Callout intent="primary">Select a node from the tree to edit properties.</Callout>
      </div>
    );
  }

  const handleFieldChange = (field: string, value: any) => {
    onUpdate(selectedPath, { [field]: value });
  };

  const handleUIChange = (field: string, value: any) => {
    onUpdate(selectedPath, { ui: { ...currentNode.ui, [field]: value } });
  };

  const handleKeyChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    if (newKey && newKey !== currentKey) {
      onUpdate(selectedPath, {}, newKey);
    }
  };

  const typeOptions = [
    { label: 'String', value: 'string' },
    { label: 'Number', value: 'number' },
    { label: 'Integer', value: 'integer' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'Object', value: 'object' },
    { label: 'Array', value: 'array' },
  ];

  const widgetOptions = {
    string: ['text', 'textarea', 'password', 'email', 'url', 'date', 'time', 'color', 'file'],
    number: ['number', 'range'],
    integer: ['number', 'range'],
    boolean: ['switch', 'checkbox'],
    array: ['checkboxes', 'nested-form'], // select is default
    object: ['nested-form'],
  };

  const currentType = watch('type') as SchemaNodeType;

  return (
    <div className="property-editor">
      <Tabs
        selectedTabId={selectedTabId}
        id="property-editor-tabs"
        onChange={newTabId => setSelectedTabId(newTabId.toString())}
      >
        <Tab
          id="basic"
          title="Basic"
          panel={
            <div className="editor-panel">
              {isObjectProperty && (
                <FormGroup label="Name" helperText="Unique identifier for this field">
                  <InputGroup key={currentKey} defaultValue={currentKey} onBlur={handleKeyChange} />
                </FormGroup>
              )}

              <FormGroup label="Label">
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      {...field}
                      // disabled={isArrayItems}
                      onChange={e => {
                        field.onChange(e);
                        handleFieldChange('title', e.target.value);
                      }}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup label="Description">
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => {
                    // console.info('cyril field: ', field);
                    return (
                      <TextArea
                        {...field}
                        fill
                        disabled={isArrayItems}
                        onChange={e => {
                          field.onChange(e);
                          handleFieldChange('description', e.target.value);
                        }}
                      />
                    );
                  }}
                />
              </FormGroup>

              <FormGroup label="Type">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <HTMLSelect
                      {...field}
                      options={typeOptions}
                      disabled={isRoot || isArrayItems} // Root type usually shouldn't change easily or needs warning
                      onChange={e => {
                        field.onChange(e);
                        handleFieldChange('type', e.target.value);
                        // TODO: Reset validation rules when type changes?
                      }}
                    />
                  )}
                />
              </FormGroup>

              <Controller
                name="default"
                control={control}
                render={({ field }) => (
                  <FormGroup label="Default Value">
                    {currentType === 'boolean' ? (
                      <Switch
                        checked={!!field.value}
                        disabled={isArrayItems}
                        onChange={e => {
                          field.onChange(e.currentTarget.checked);
                          handleFieldChange('default', e.currentTarget.checked);
                        }}
                      />
                    ) : (
                      <InputGroup
                        {...field}
                        value={field.value || ''}
                        disabled={isArrayItems}
                        onChange={e => {
                          field.onChange(e);
                          handleFieldChange('default', e.target.value);
                        }}
                      />
                    )}
                  </FormGroup>
                )}
              />
            </div>
          }
        />

        <Tab
          id="validation"
          title="Validation"
          panel={
            <div className="editor-panel">
              {currentType === 'string' && (
                <>
                  <FormGroup label="Min Length">
                    <Controller
                      name="minLength"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('minLength', v)}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Max Length">
                    <Controller
                      name="maxLength"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('maxLength', v)}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Pattern (Regex)">
                    <Controller
                      name="pattern"
                      control={control}
                      render={({ field }) => (
                        <InputGroup
                          {...field}
                          onChange={e => handleFieldChange('pattern', e.target.value)}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Format">
                    <Controller
                      name="format"
                      control={control}
                      render={({ field }) => (
                        <HTMLSelect
                          {...field}
                          options={['', 'email', 'uri', 'date', 'date-time', 'time']}
                          onChange={e => handleFieldChange('format', e.target.value)}
                        />
                      )}
                    />
                  </FormGroup>
                </>
              )}

              {(currentType === 'number' || currentType === 'integer') && (
                <>
                  <FormGroup label="Minimum">
                    <Controller
                      name="minimum"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('minimum', v)}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Maximum">
                    <Controller
                      name="maximum"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('maximum', v)}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Multiple Of">
                    <Controller
                      name="multipleOf"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('multipleOf', v)}
                        />
                      )}
                    />
                  </FormGroup>
                </>
              )}

              {currentType === 'array' && (
                <>
                  <FormGroup label="Min Items">
                    <Controller
                      name="minItems"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('minItems', v)}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Max Items">
                    <Controller
                      name="maxItems"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('maxItems', v)}
                        />
                      )}
                    />
                  </FormGroup>
                  <Controller
                    name="uniqueItems"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        label="Unique Items"
                        checked={!!field.value}
                        onChange={e => handleFieldChange('uniqueItems', e.currentTarget.checked)}
                      />
                    )}
                  />
                </>
              )}

              {currentType === 'object' && (
                <>
                  <FormGroup label="Min Properties">
                    <Controller
                      name="minProperties"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('minProperties', v)}
                          disabled={isArrayItems}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Max Properties">
                    <Controller
                      name="maxProperties"
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          {...field}
                          onValueChange={v => handleFieldChange('maxProperties', v)}
                          disabled={isArrayItems}
                        />
                      )}
                    />
                  </FormGroup>
                </>
              )}
            </div>
          }
        />

        <Tab
          id="ui"
          title="UI Config"
          panel={
            <div className="editor-panel">
              <FormGroup label="Widget">
                <Controller
                  name="ui.widget"
                  control={control}
                  render={({ field }) => (
                    <HTMLSelect
                      {...field}
                      options={['', ...(widgetOptions[currentType] || [])]}
                      onChange={e => handleUIChange('widget', e.target.value)}
                      disabled={isArrayItems}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup label="Placeholder">
                <Controller
                  name="ui.placeholder"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      {...field}
                      onChange={e => handleUIChange('placeholder', e.target.value)}
                      disabled={isArrayItems}
                    />
                  )}
                />
              </FormGroup>

              {/* <FormGroup label="Help Text">
                <Controller
                  name="ui.help"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      {...field}
                      onChange={e => handleUIChange('help', e.target.value)}
                      disabled={isArrayItems}
                    />
                  )}
                />
              </FormGroup> */}

              <Controller
                name="ui.hidden"
                control={control}
                render={({ field }) => (
                  <Switch
                    label="Hidden"
                    checked={!!field.value}
                    onChange={e => handleUIChange('hidden', e.currentTarget.checked)}
                    disabled={isArrayItems}
                  />
                )}
              />

              <Controller
                name="ui.disabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    label="Disabled"
                    checked={!!field.value}
                    onChange={e => handleUIChange('disabled', e.currentTarget.checked)}
                    disabled={isArrayItems}
                  />
                )}
              />

              <Controller
                name="ui.readonly"
                control={control}
                render={({ field }) => (
                  <Switch
                    label="Readonly"
                    checked={!!field.value}
                    onChange={e => handleUIChange('readonly', e.currentTarget.checked)}
                    disabled={isArrayItems}
                  />
                )}
              />

              <Divider />

              <FormGroup label="Layout">
                <Controller
                  name="ui.layout"
                  control={control}
                  render={({ field }) => (
                    <HTMLSelect
                      {...field}
                      options={['', 'vertical', 'horizontal', 'inline']}
                      onChange={e => handleUIChange('layout', e.target.value)}
                      disabled={isArrayItems}
                    />
                  )}
                />
              </FormGroup>

              <FormGroup label="Label Width">
                <Controller
                  name="ui.labelWidth"
                  control={control}
                  render={({ field }) => (
                    <InputGroup
                      {...field}
                      onChange={e => handleUIChange('labelWidth', e.target.value)}
                      disabled={isArrayItems}
                    />
                  )}
                />
              </FormGroup>

              <Divider />

              <Controller
                name="ui.flattenPath"
                control={control}
                render={({ field }) => (
                  <Switch
                    label="Flatten Path (Transparent)"
                    checked={!!field.value}
                    onChange={e => handleUIChange('flattenPath', e.currentTarget.checked)}
                    disabled={isArrayItems}
                  />
                )}
              />

              <Controller
                name="ui.flattenPrefix"
                control={control}
                render={({ field }) => (
                  <Switch
                    label="Flatten Prefix"
                    checked={!!field.value}
                    onChange={e => handleUIChange('flattenPrefix', e.currentTarget.checked)}
                    disabled={isArrayItems}
                  />
                )}
              />

              {currentType === 'array' && (
                <>
                  <Divider />
                  <FormGroup label="Array Mode">
                    <Controller
                      name="ui.arrayMode"
                      control={control}
                      render={({ field }) => (
                        <HTMLSelect
                          {...field}
                          options={['dynamic', 'static']}
                          onChange={e => handleUIChange('arrayMode', e.target.value)}
                        />
                      )}
                    />
                  </FormGroup>
                  <FormGroup label="Add Button Text">
                    <Controller
                      name="ui.addButtonText"
                      control={control}
                      render={({ field }) => (
                        <InputGroup
                          {...field}
                          onChange={e => handleUIChange('addButtonText', e.target.value)}
                        />
                      )}
                    />
                  </FormGroup>
                </>
              )}
            </div>
          }
        />
      </Tabs>
    </div>
  );
};
