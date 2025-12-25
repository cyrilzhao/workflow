import type { WidgetType } from '@/types/schema';
import {
  TextWidget,
  TextareaWidget,
  NumberWidget,
  SelectWidget,
  RadioWidget,
  CheckboxWidget,
  SwitchWidget,
  NestedFormWidget,
} from '../widgets';

export class FieldRegistry {
  private static widgets: Map<WidgetType, React.ComponentType<any>> = new Map<WidgetType, React.ComponentType<any>>([
    ['text', TextWidget],
    ['textarea', TextareaWidget],
    ['password', TextWidget],
    ['email', TextWidget],
    ['number', NumberWidget],
    ['select', SelectWidget],
    ['radio', RadioWidget],
    ['checkbox', CheckboxWidget],
    ['switch', SwitchWidget],
    ['nested-form', NestedFormWidget],
  ]);

  static register(type: WidgetType, component: React.ComponentType<any>) {
    this.widgets.set(type, component);
  }

  static getWidget(type: WidgetType): React.ComponentType<any> | undefined {
    return this.widgets.get(type);
  }

  static registerBatch(widgets: Record<string, React.ComponentType<any>>) {
    Object.entries(widgets).forEach(([type, component]) => {
      this.register(type as WidgetType, component);
    });
  }
}
