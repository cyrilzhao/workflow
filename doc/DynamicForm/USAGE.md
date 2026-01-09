# DynamicForm Component - Usage Guide

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Basic Usage](#basic-usage)
5. [Schema Definition](#schema-definition)
6. [Advanced Features](#advanced-features)
7. [API Reference](#api-reference)
8. [Examples](#examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

DynamicForm is a powerful, configuration-driven form component built on top of `react-hook-form` and standard `JSON Schema`. It enables you to generate complex forms dynamically from JSON Schema definitions, with built-in validation, UI linkage, and extensive customization options.

### Key Features

- **Configuration-Driven**: Generate forms from JSON Schema
- **Type-Safe**: Full TypeScript support
- **Validation**: Automatic validation based on JSON Schema rules
- **High Performance**: Built on react-hook-form's uncontrolled components
- **Extensible**: Support for custom widgets and validation rules
- **UI Linkage**: Dynamic field visibility, disabled states, and computed values
- **Nested Forms**: Support for nested objects and arrays
- **Field Path Flattening**: Simplify deeply nested parameter display

---

## Installation

### Prerequisites

- React 18+
- TypeScript 5+

### Install Dependencies

```bash
npm install react-hook-form
npm install ajv ajv-formats
npm install @types/json-schema
```

### Optional Dependencies

For UI components (Blueprint.js example):

```bash
npm install @blueprintjs/core @blueprintjs/icons
```

---

## Quick Start

Here's a minimal example to get you started:

```typescript
import React from 'react';
import { DynamicForm } from '@/components/DynamicForm';

const schema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      title: 'Username',
      minLength: 3,
      maxLength: 20,
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
    },
  },
  required: ['username', 'email'],
};

function App() {
  const handleSubmit = (data: any) => {
    console.log('Form data:', data);
  };

  return (
    <DynamicForm
      schema={schema}
      onSubmit={handleSubmit}
    />
  );
}

export default App;
```

---

## Basic Usage

### Simple Form with Default Values

```typescript
const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Full Name',
    },
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 0,
      maximum: 120,
    },
  },
  required: ['name'],
};

const defaultValues = {
  name: 'John Doe',
  age: 25,
};

<DynamicForm
  schema={schema}
  defaultValues={defaultValues}
  onSubmit={handleSubmit}
/>
```

### Listening to Form Changes

```typescript
const handleChange = (data: any) => {
  console.log('Form changed:', data);
};

<DynamicForm
  schema={schema}
  onChange={handleChange}
  onSubmit={handleSubmit}
/>
```

### Form Layout Options

DynamicForm supports three layout modes:

```typescript
// Vertical layout (default)
<DynamicForm
  schema={schema}
  layout="vertical"
  onSubmit={handleSubmit}
/>

// Horizontal layout with label width
<DynamicForm
  schema={schema}
  layout="horizontal"
  labelWidth={120}
  onSubmit={handleSubmit}
/>

// Inline layout
<DynamicForm
  schema={schema}
  layout="inline"
  onSubmit={handleSubmit}
/>
```

### Readonly and Disabled States

```typescript
// Readonly form (data included in submission)
<DynamicForm
  schema={schema}
  readonly={true}
  onSubmit={handleSubmit}
/>

// Disabled form (data excluded from submission)
<DynamicForm
  schema={schema}
  disabled={true}
  onSubmit={handleSubmit}
/>
```

---

## Schema Definition

### Basic Field Types

#### String Fields

```typescript
{
  type: 'string',
  title: 'Username',
  description: 'Enter your username',
  minLength: 3,
  maxLength: 20,
  pattern: '^[a-zA-Z0-9_]+$',
  default: '',
  ui: {
    placeholder: 'Enter username',
    widget: 'text'  // or 'textarea', 'password', 'email'
  }
}
```

#### Number Fields

```typescript
{
  type: 'integer',  // or 'number' for decimals
  title: 'Age',
  minimum: 0,
  maximum: 120,
  multipleOf: 1,
  default: 18,
  ui: {
    widget: 'number',  // or 'range' for slider
    step: 1
  }
}
```

#### Boolean Fields

```typescript
{
  type: 'boolean',
  title: 'Accept Terms',
  default: false,
  ui: {
    widget: 'checkbox'  // or 'switch'
  }
}
```

#### Enum Fields (Select/Radio)

```typescript
{
  type: 'string',
  title: 'Gender',
  enum: ['male', 'female', 'other'],
  enumNames: ['Male', 'Female', 'Other'],
  ui: {
    widget: 'select'  // or 'radio'
  }
}
```

#### Array Fields

Arrays can be rendered in different ways depending on the `items` configuration:

**Simple Array (Checkboxes)**:

```typescript
{
  type: 'array',
  title: 'Hobbies',
  items: {
    type: 'string',
    enum: ['reading', 'sports', 'music', 'travel'],
    enumNames: ['Reading', 'Sports', 'Music', 'Travel']
  },
  uniqueItems: true,
  ui: {
    widget: 'checkboxes'  // Auto-inferred when items.enum exists
  }
}
```

**Object Array (Nested Forms)**:

```typescript
{
  type: 'array',
  title: 'Contacts',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      phone: { type: 'string', title: 'Phone' },
      email: { type: 'string', title: 'Email', format: 'email' }
    },
    required: ['name', 'phone']
  },
  minItems: 1,
  ui: {
    addButtonText: 'Add Contact'
  }
}
```

#### Object Fields (Nested Forms)

**Note**: Object fields automatically use the `nested-form` widget by default. You only need to explicitly specify `ui.widget` if you want to use a custom widget.

```typescript
{
  type: 'object',
  title: 'Address',
  properties: {
    street: { type: 'string', title: 'Street' },
    city: { type: 'string', title: 'City' },
    zipCode: { type: 'string', title: 'Zip Code' }
  },
  required: ['city']
}
```

### UI Extensions

The `ui` field provides extensive customization options:

#### Common UI Properties

```typescript
{
  type: 'string',
  title: 'Email',
  ui: {
    widget: 'email',           // Widget type
    placeholder: 'Enter email', // Placeholder text
    disabled: false,            // Disable field
    readonly: false,            // Make field readonly
    hidden: false,              // Hide field
    help: 'We will never share your email', // Help text
    className: 'custom-class',  // CSS class
    layout: 'horizontal',       // Layout override
    labelWidth: 120,            // Label width (horizontal layout)
    errorMessages: {            // Custom error messages
      required: 'Email is required',
      pattern: 'Invalid email format'
    }
  }
}
```

#### Supported Widget Types

| Widget        | Field Type          | Description            |
| ------------- | ------------------- | ---------------------- |
| `text`        | string              | Single-line text input |
| `textarea`    | string              | Multi-line text input  |
| `password`    | string              | Password input         |
| `email`       | string              | Email input            |
| `number`      | number/integer      | Number input           |
| `select`      | string/number/array | Dropdown select        |
| `radio`       | string/number       | Radio buttons          |
| `checkboxes`  | array               | Multiple checkboxes    |
| `checkbox`    | boolean             | Single checkbox        |
| `switch`      | boolean             | Toggle switch          |
| `date`        | string              | Date picker            |
| `nested-form` | object/array        | Nested form            |

### Validation Rules

#### Built-in Validation

```typescript
{
  type: 'string',
  title: 'Username',
  minLength: 3,              // Minimum length
  maxLength: 20,             // Maximum length
  pattern: '^[a-zA-Z0-9_]+$', // Regex pattern
  format: 'email',           // Predefined format
  ui: {
    errorMessages: {
      required: 'Username is required',
      minLength: 'Username must be at least 3 characters',
      maxLength: 'Username cannot exceed 20 characters',
      pattern: 'Username can only contain letters, numbers and underscores'
    }
  }
}
```

#### Conditional Validation

Use JSON Schema's conditional validation keywords:

```typescript
{
  type: 'object',
  properties: {
    hasAddress: {
      type: 'boolean',
      title: 'Provide Address'
    },
    address: {
      type: 'string',
      title: 'Address'
    }
  },
  // If hasAddress is true, address is required
  if: {
    properties: { hasAddress: { const: true } }
  },
  then: {
    required: ['address']
  }
}
```

---

## Advanced Features

### UI Linkage

UI linkage allows fields to dynamically change based on other field values.

#### Field Visibility

```typescript
{
  type: 'object',
  properties: {
    hasAddress: {
      type: 'boolean',
      title: 'Provide Address'
    },
    address: {
      type: 'string',
      title: 'Address',
      ui: {
        linkage: {
          type: 'visibility',
          dependencies: ['#/properties/hasAddress'],
          when: {
            field: '#/properties/hasAddress',
            operator: '==',
            value: true
          },
          fulfill: {
            state: { visible: true }
          },
          otherwise: {
            state: { visible: false }
          }
        }
      }
    }
  }
}
```

#### Computed Values

```typescript
const schema = {
  type: 'object',
  properties: {
    price: {
      type: 'number',
      title: 'Price'
    },
    quantity: {
      type: 'number',
      title: 'Quantity'
    },
    total: {
      type: 'number',
      title: 'Total',
      ui: {
        readonly: true,
        linkage: {
          type: 'value',
          dependencies: ['#/properties/price', '#/properties/quantity'],
          fulfill: {
            function: 'calculateTotal'
          }
        }
      }
    }
  }
};

const linkageFunctions = {
  calculateTotal: (formData: any) => {
    return (formData.price || 0) * (formData.quantity || 0);
  }
};

<DynamicForm
  schema={schema}
  linkageFunctions={linkageFunctions}
  onSubmit={handleSubmit}
/>
```

#### Dynamic Options

```typescript
const schema = {
  type: 'object',
  properties: {
    country: {
      type: 'string',
      title: 'Country',
      enum: ['china', 'usa'],
      enumNames: ['China', 'USA'],
    },
    province: {
      type: 'string',
      title: 'Province/State',
      ui: {
        linkage: {
          type: 'options',
          dependencies: ['#/properties/country'],
          fulfill: {
            function: 'getProvinceOptions',
          },
        },
      },
    },
  },
};

const linkageFunctions = {
  getProvinceOptions: (formData: any) => {
    if (formData.country === 'china') {
      return [
        { label: 'Beijing', value: 'beijing' },
        { label: 'Shanghai', value: 'shanghai' },
      ];
    } else if (formData.country === 'usa') {
      return [
        { label: 'California', value: 'ca' },
        { label: 'New York', value: 'ny' },
      ];
    }
    return [];
  },
};
```

### Nested Forms

#### Static Nested Forms

```typescript
const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Name',
    },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
        zipCode: { type: 'string', title: 'Zip Code' },
      },
      required: ['city'],
    },
  },
};
```

#### Dynamic Nested Forms

Switch between different schemas based on field values using linkage:

```typescript
// Define schemas for different user types
const userSchemas = {
  personal: {
    type: 'object',
    properties: {
      firstName: { type: 'string', title: 'First Name' },
      lastName: { type: 'string', title: 'Last Name' },
    },
  },
  company: {
    type: 'object',
    properties: {
      companyName: { type: 'string', title: 'Company Name' },
      taxId: { type: 'string', title: 'Tax ID' },
    },
  },
};

// Define linkage function to load schema
const linkageFunctions = {
  loadUserSchema: (formData: Record<string, any>) => {
    const userType = formData?.userType;
    return userSchemas[userType] || { type: 'object', properties: {} };
  },
};

const schema = {
  type: 'object',
  properties: {
    userType: {
      type: 'string',
      title: 'User Type',
      enum: ['personal', 'company'],
      enumNames: ['Personal', 'Company'],
    },
    details: {
      type: 'object',
      title: 'Details',
      ui: {
        widget: 'nested-form',
        linkage: {
          type: 'schema',
          dependencies: ['userType'],
          when: { field: 'userType', operator: 'isNotEmpty' },
          fulfill: { function: 'loadUserSchema' },
        },
      },
    },
  },
};

// Use in component
<DynamicForm
  schema={schema}
  linkageFunctions={linkageFunctions}
  onSubmit={handleSubmit}
/>
```

### Field Path Flattening

Simplify deeply nested parameter display:

```typescript
const schema = {
  type: 'object',
  properties: {
    auth: {
      type: 'object',
      title: 'Authentication',
      ui: {
        flattenPath: true,
        flattenPrefix: true,
      },
      properties: {
        content: {
          type: 'object',
          ui: {
            flattenPath: true,
          },
          properties: {
            apiKey: {
              type: 'string',
              title: 'API Key',
            },
          },
        },
      },
    },
  },
};
// Display: "Authentication - API Key"
// Submit: { auth: { content: { apiKey: 'xxx' } } }
```

---

## API Reference

### DynamicForm Props

| Prop               | Type                                            | Required | Default      | Description                     |
| ------------------ | ----------------------------------------------- | -------- | ------------ | ------------------------------- |
| `schema`           | `ExtendedJSONSchema`                            | Yes      | -            | JSON Schema definition          |
| `defaultValues`    | `Record<string, any>`                           | No       | `{}`         | Initial form values             |
| `onSubmit`         | `(data: any) => void \| Promise<void>`          | No       | -            | Submit handler                  |
| `onChange`         | `(data: any) => void`                           | No       | -            | Change handler                  |
| `widgets`          | `Record<string, ComponentType>`                 | No       | `{}`         | Custom widgets                  |
| `linkageFunctions` | `Record<string, Function>`                      | No       | `{}`         | Linkage functions               |
| `customFormats`    | `Record<string, Function>`                      | No       | `{}`         | Custom format validators        |
| `layout`           | `'vertical' \| 'horizontal' \| 'inline'`        | No       | `'vertical'` | Form layout                     |
| `labelWidth`       | `number \| string`                              | No       | -            | Label width (horizontal layout) |
| `showSubmitButton` | `boolean`                                       | No       | `true`       | Show submit button              |
| `renderAsForm`     | `boolean`                                       | No       | `true`       | Render as `<form>` tag          |
| `validateMode`     | `'onSubmit' \| 'onBlur' \| 'onChange' \| 'all'` | No       | `'onSubmit'` | Validation mode                 |
| `loading`          | `boolean`                                       | No       | `false`      | Loading state                   |
| `disabled`         | `boolean`                                       | No       | `false`      | Disable all fields              |
| `readonly`         | `boolean`                                       | No       | `false`      | Make all fields readonly        |
| `className`        | `string`                                        | No       | -            | CSS class name                  |
| `style`            | `React.CSSProperties`                           | No       | -            | Inline styles                   |

---

## Examples

### Complete Registration Form

```typescript
const registrationSchema = {
  type: 'object',
  title: 'User Registration',
  properties: {
    username: {
      type: 'string',
      title: 'Username',
      minLength: 3,
      maxLength: 20,
      pattern: '^[a-zA-Z0-9_]+$',
      ui: {
        placeholder: 'Enter username',
        errorMessages: {
          required: 'Username is required',
          minLength: 'Username must be at least 3 characters',
          pattern: 'Only letters, numbers and underscores allowed'
        }
      }
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
      ui: {
        placeholder: 'example@email.com'
      }
    },
    password: {
      type: 'string',
      title: 'Password',
      minLength: 6,
      ui: {
        widget: 'password',
        placeholder: 'At least 6 characters'
      }
    },
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 18,
      maximum: 100
    },
    gender: {
      type: 'string',
      title: 'Gender',
      enum: ['male', 'female', 'other'],
      enumNames: ['Male', 'Female', 'Other'],
      ui: {
        widget: 'radio'
      }
    },
    agreeTerms: {
      type: 'boolean',
      title: 'I agree to the terms and conditions',
      const: true
    }
  },
  required: ['username', 'email', 'password', 'agreeTerms']
};

function RegistrationForm() {
  const handleSubmit = async (data: any) => {
    try {
      await api.register(data);
      alert('Registration successful!');
    } catch (error) {
      alert('Registration failed');
    }
  };

  return (
    <DynamicForm
      schema={registrationSchema}
      onSubmit={handleSubmit}
      layout="vertical"
    />
  );
}
```

---

## Best Practices

### Schema Design

**1. Keep It Simple**

```typescript
// ✅ Good: Simple and clear
{
  type: 'string',
  title: 'Username',
  minLength: 3
}

// ❌ Avoid: Over-complicated
{
  type: 'string',
  title: 'Username',
  minLength: 3,
  maxLength: 20,
  pattern: '^[a-zA-Z0-9_]+$',
  allOf: [...],
  anyOf: [...]
}
```

**2. Use Meaningful Field Names**

```typescript
// ✅ Good
properties: {
  firstName: { type: 'string' },
  lastName: { type: 'string' }
}

// ❌ Avoid
properties: {
  field1: { type: 'string' },
  field2: { type: 'string' }
}
```

**3. Provide Clear Titles and Descriptions**

```typescript
{
  type: 'string',
  title: 'Email Address',
  description: 'Used for notifications and password recovery',
  ui: {
    placeholder: 'example@email.com'
  }
}
```

### Performance Optimization

**1. Cache Schema with useMemo**

```typescript
const schema = useMemo(
  () => ({
    type: 'object',
    properties: {
      // ... schema definition
    },
  }),
  []
);
```

**2. Debounce onChange Callbacks**

```typescript
const debouncedOnChange = useMemo(
  () => debounce((data) => {
    console.log('Form changed:', data);
  }, 300),
  []
);

<DynamicForm
  schema={schema}
  onChange={debouncedOnChange}
/>
```

**3. Split Large Forms**

For forms with 50+ fields, consider splitting into multiple steps.

### Error Handling

**1. Provide Friendly Error Messages**

```typescript
{
  type: 'string',
  minLength: 6,
  ui: {
    errorMessages: {
      minLength: 'Password must be at least 6 characters'
    }
  }
}
```

**2. Global Error Handling**

```typescript
const handleSubmit = async (data: any) => {
  try {
    await api.submitForm(data);
  } catch (error) {
    toast.error('Submission failed. Please try again.');
  }
};
```

---

## Troubleshooting

### Common Issues

**Q: Fields not rendering**

- Check if `type` is correctly specified in schema
- Verify widget type is supported
- Check console for errors

**Q: Validation not working**

- Ensure `required` fields are in schema's `required` array
- Check validation rules syntax
- Verify custom validators are registered

**Q: Nested forms not displaying**

- Object fields automatically use `nested-form` widget by default
- For arrays of objects, ensure `items.type: 'object'` is set
- Check schema structure is correct

**Q: Linkage not working**

- Verify dependencies use correct path format
- Check linkage functions are registered
- Use JSON Pointer format for nested fields

---

## Related Documentation

- [Technical Design (Chinese)](./DYNAMIC_FORM_PART1.md)
- [JSON Schema Specification (Chinese)](./DYNAMIC_FORM_PART2.md)
- [Component Architecture (Chinese)](./DYNAMIC_FORM_PART3.md)
- [UI Linkage Design (Chinese)](./UI_LINKAGE_DESIGN.md)
- [Nested Forms (Chinese)](./NESTED_FORM.md)
- [Field Path Flattening (Chinese)](./FIELD_PATH_FLATTENING.md)

---
