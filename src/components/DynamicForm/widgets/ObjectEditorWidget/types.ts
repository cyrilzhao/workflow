import type { FieldWidgetProps } from '../../types/index';
import type { CodeEditorConfig, EditorTheme } from '../../../CodeEditor';

/**
 * ObjectEditorWidget Props
 * 基于 CodeEditor 的对象编辑器，支持 JSON 格式编辑
 */
export interface ObjectEditorWidgetProps extends FieldWidgetProps {
  /** 对象值 */
  value?: Record<string, unknown>;

  /** 值变化回调，返回解析后的对象 */
  onChange?: (value: Record<string, unknown> | undefined) => void;

  /** 编辑器配置 */
  config?: CodeEditorConfig;

  /** 主题 */
  theme?: EditorTheme;

  /** JSON 缩进空格数，默认 2 */
  indent?: number;
}
