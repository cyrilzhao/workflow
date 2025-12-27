import type {
  ExtendedJSONSchema,
  FieldConfig,
  WidgetType,
  ValidationRules,
  FieldOption,
} from '@/types/schema';

/**
 * Schema 解析配置
 */
interface ParseOptions {
  parentPath?: string;
  prefixLabel?: string;
  inheritedUI?: {
    layout?: 'vertical' | 'horizontal' | 'inline';
    labelWidth?: number | string;
  };
}

export class SchemaParser {
  private static customFormats: Record<string, (value: string) => boolean> = {};

  /**
   * 设置自定义格式验证器
   */
  static setCustomFormats(formats: Record<string, (value: string) => boolean>) {
    this.customFormats = formats;
  }

  /**
   * 检查 schema 中是否使用了路径扁平化
   */
  static hasFlattenPath(schema: ExtendedJSONSchema): boolean {
    if (schema.type !== 'object' || !schema.properties) {
      return false;
    }

    const properties = schema.properties;

    for (const key of Object.keys(properties)) {
      const property = properties[key];
      if (!property || typeof property === 'boolean') continue;

      const fieldSchema = property as ExtendedJSONSchema;

      // 如果当前字段使用了 flattenPath
      if (fieldSchema.type === 'object' && fieldSchema.ui?.flattenPath) {
        return true;
      }

      // 递归检查子字段
      if (fieldSchema.type === 'object' && this.hasFlattenPath(fieldSchema)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 解析 Schema 生成字段配置（支持路径扁平化）
   */
  static parse(schema: ExtendedJSONSchema, options: ParseOptions = {}): FieldConfig[] {
    const { parentPath = '', prefixLabel = '', inheritedUI } = options;
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

      const fieldSchema = property as ExtendedJSONSchema;
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      // 检查是否需要路径扁平化
      if (fieldSchema.type === 'object' && fieldSchema.ui?.flattenPath) {
        // 确定是否需要添加前缀
        const newPrefixLabel =
          fieldSchema.ui.flattenPrefix && fieldSchema.title
            ? prefixLabel
              ? `${prefixLabel} - ${fieldSchema.title}`
              : fieldSchema.title
            : prefixLabel;

        // 准备要继承的 UI 配置（父级配置 + 当前层级配置）
        const newInheritedUI = {
          layout: fieldSchema.ui.layout ?? inheritedUI?.layout,
          labelWidth: fieldSchema.ui.labelWidth ?? inheritedUI?.labelWidth,
        };

        // 递归解析子字段，跳过当前层级，但传递 UI 配置
        const nestedFields = this.parse(fieldSchema, {
          parentPath: currentPath,
          prefixLabel: newPrefixLabel,
          inheritedUI: newInheritedUI,
        });
        fields.push(...nestedFields);
      } else {
        // 正常解析字段
        const fieldConfig = this.parseField(
          currentPath,
          fieldSchema,
          required.includes(key),
          prefixLabel,
          inheritedUI
        );

        if (!fieldConfig.hidden) {
          fields.push(fieldConfig);
        }
      }
    }

    return fields;
  }

  /**
   * 解析单个字段（支持嵌套路径和标签前缀）
   */
  private static parseField(
    path: string,
    schema: ExtendedJSONSchema,
    required: boolean,
    prefixLabel: string = '',
    inheritedUI?: ParseOptions['inheritedUI']
  ): FieldConfig {
    const ui = schema.ui || {};

    // 如果有前缀标签，添加到字段标签前
    const label = prefixLabel && schema.title ? `${prefixLabel} - ${schema.title}` : schema.title;

    // 如果有继承的 UI 配置，需要合并到 schema 中
    let finalSchema = schema;
    if (inheritedUI && (inheritedUI.layout || inheritedUI.labelWidth)) {
      finalSchema = {
        ...schema,
        ui: {
          ...ui,
          // 只有当字段自己没有配置时，才使用继承的配置
          layout: ui.layout ?? inheritedUI.layout,
          labelWidth: ui.labelWidth ?? inheritedUI.labelWidth,
        },
      };
    }

    return {
      name: path, // 使用完整路径作为字段名
      type: schema.type as string,
      widget: this.getWidget(schema),
      label,
      placeholder: ui.placeholder,
      description: schema.description,
      defaultValue: schema.default,
      required,
      disabled: ui.disabled,
      readonly: ui.readonly,
      hidden: ui.hidden,
      validation: this.getValidationRules(schema, required),
      options: this.getOptions(schema),
      schema: finalSchema, // 保留完整的 schema（包含 ui 配置和继承的配置）
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
        // 特殊情况：枚举数组 → 直接使用 checkboxes（多选框组）
        // 注意：只有在没有显式指定 arrayMode 时才使用 checkboxes
        if (items.enum && items.enum.length > 0 && !schema.ui?.arrayMode) {
          return 'checkboxes';
        }
      }
      // 默认使用 ArrayFieldWidget 处理所有数组类型
      return 'array';
    }

    if (type === 'object') {
      return 'nested-form';
    }

    return 'text';
  }

  /**
   * 获取验证规则
   */
  static getValidationRules(
    schema: ExtendedJSONSchema,
    required: boolean = false
  ): ValidationRules {
    const rules: ValidationRules = {};
    const errorMessages = schema.ui?.errorMessages || {};

    if (required) {
      rules.required = errorMessages.required || '此字段为必填项';
    }

    if (schema.minLength) {
      // react-hook-form 的 minLength 规则默认不会对空值进行校验，
      // 这里使用自定义 validate 规则，确保空值也会触发 minLength 校验
      rules.validate = rules.validate || {};
      rules.validate.minLength = (value: any) => {
        if (value === null || value === undefined) {
          return errorMessages.minLength || `最小长度为 ${schema.minLength} 个字符`;
        }
        const strValue = String(value);
        if (strValue.length < schema.minLength!) {
          return errorMessages.minLength || `最小长度为 ${schema.minLength} 个字符`;
        }
        return true;
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

    // 处理 format 验证
    if (schema.format) {
      // 优先使用自定义格式验证器
      if (this.customFormats[schema.format]) {
        const formatName = schema.format;
        rules.validate = rules.validate || {};
        rules.validate[formatName] = (value: string) => {
          if (!value) return true; // 空值由 required 规则处理
          const isValid = this.customFormats[formatName](value);
          return isValid || errorMessages.format || `${formatName} 格式不正确`;
        };
      } else if (schema.format === 'email') {
        // 内置邮箱格式验证
        rules.pattern = {
          value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
          message: errorMessages.format || '请输入有效的邮箱地址',
        };
      }
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
