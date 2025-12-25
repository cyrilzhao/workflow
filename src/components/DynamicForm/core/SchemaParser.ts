import type {
  ExtendedJSONSchema,
  FieldConfig,
  WidgetType,
  ValidationRules,
  FieldOption,
} from '@/types/schema';

export class SchemaParser {
  /**
   * 解析 Schema 生成字段配置
   */
  static parse(schema: ExtendedJSONSchema): FieldConfig[] {
    const fields: FieldConfig[] = [];

    if (schema.type !== 'object' || !schema.properties) {
      return fields;
    }

    const properties = schema.properties;
    const required = schema.required || [];
    const order = schema.ui?.order || Object.keys(properties);

    for (const key of order) {
      const property = properties[key];
      if (!property || typeof property === 'boolean') continue;

      const fieldConfig = this.parseField(
        key,
        property as ExtendedJSONSchema,
        required.includes(key)
      );

      if (!fieldConfig.hidden) {
        fields.push(fieldConfig);
      }
    }

    return fields;
  }

  /**
   * 解析单个字段
   */
  private static parseField(
    name: string,
    schema: ExtendedJSONSchema,
    required: boolean
  ): FieldConfig {
    const ui = schema.ui || {};

    return {
      name,
      type: schema.type as string,
      widget: this.getWidget(schema),
      label: schema.title,
      placeholder: ui.placeholder,
      description: schema.description,
      defaultValue: schema.default,
      required,
      disabled: ui.disabled,
      readonly: ui.readonly,
      hidden: ui.hidden,
      validation: this.getValidationRules(schema, required),
      options: this.getOptions(schema),
      schema: schema.type === 'object' ? schema : undefined,
    };
  }

  /**
   * 获取 Widget 类型
   */
  private static getWidget(schema: ExtendedJSONSchema): WidgetType {
    if (schema.ui?.widget) {
      return schema.ui.widget;
    }

    const type = schema.type;

    if (type === 'string') {
      if (schema.format === 'email') return 'email';
      if (schema.format === 'date') return 'date';
      if (schema.format === 'date-time') return 'datetime';
      if (schema.format === 'time') return 'time';
      if (schema.enum) return 'select';
      if (schema.maxLength && schema.maxLength > 100) return 'textarea';
      return 'text';
    }

    if (type === 'number' || type === 'integer') {
      return 'number';
    }

    if (type === 'boolean') {
      return 'checkbox';
    }

    if (type === 'array') {
      if (schema.items && typeof schema.items === 'object') {
        const items = schema.items as ExtendedJSONSchema;
        if (items.enum) return 'checkboxes';
      }
      return 'select';
    }

    if (type === 'object') {
      return 'nested-form';
    }

    return 'text';
  }

  /**
   * 获取验证规则
   */
  private static getValidationRules(
    schema: ExtendedJSONSchema,
    required: boolean
  ): ValidationRules {
    const rules: ValidationRules = {};
    const errorMessages = schema.ui?.errorMessages || {};

    if (required) {
      rules.required = errorMessages.required || '此字段为必填项';
    }

    if (schema.minLength) {
      rules.minLength = {
        value: schema.minLength,
        message: errorMessages.minLength || `最小长度为 ${schema.minLength} 个字符`,
      };
    }

    if (schema.maxLength) {
      rules.maxLength = {
        value: schema.maxLength,
        message: errorMessages.maxLength || `最大长度为 ${schema.maxLength} 个字符`,
      };
    }

    if (schema.minimum !== undefined) {
      rules.min = {
        value: schema.minimum,
        message: errorMessages.min || `最小值为 ${schema.minimum}`,
      };
    }

    if (schema.maximum !== undefined) {
      rules.max = {
        value: schema.maximum,
        message: errorMessages.max || `最大值为 ${schema.maximum}`,
      };
    }

    if (schema.pattern) {
      rules.pattern = {
        value: new RegExp(schema.pattern),
        message: errorMessages.pattern || '格式不正确',
      };
    }

    return rules;
  }

  /**
   * 获取选项列表
   */
  private static getOptions(schema: ExtendedJSONSchema): FieldOption[] | undefined {
    if (!schema.enum) return undefined;

    const enumNames = schema.enumNames || schema.enum;

    return schema.enum.map((value, index) => ({
      label: String(enumNames[index]),
      value,
    }));
  }
}
