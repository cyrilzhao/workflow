import { forwardRef, useState, useCallback, useEffect, useMemo } from 'react';
import { CodeEditorPreview } from './CodeEditorPreview';
import { CodeEditorModal } from './CodeEditorModal';
import type { CodeEditorProps } from './types';
import { jsonValidator, jsonFormatter } from './utils';
import './styles.css';
import './modal.css';

/**
 * 通用代码编辑器组件
 * 管理预览态和编辑态的切换，处理值的读写
 */
export const CodeEditor = forwardRef<HTMLDivElement, CodeEditorProps>(
  (
    {
      value = '',
      onChange,
      onBlur,
      disabled = false,
      readonly = false,
      error,
      language = 'javascript',
      config = {},
      theme = 'light',
      validator,
      formatter,
    },
    ref
  ) => {
    const [isModalOpen, setIsModalOpen] = useState(config.initialMode === 'edit');
    const [internalValue, setInternalValue] = useState(value);

    // 根据语言类型自动选择验证器和格式化器
    const actualValidator = useMemo(() => {
      if (validator !== undefined) return validator;
      return language === 'json' ? jsonValidator : undefined;
    }, [validator, language]);

    const actualFormatter = useMemo(() => {
      if (formatter !== undefined) return formatter;
      return language === 'json' ? jsonFormatter : undefined;
    }, [formatter, language]);

    // 打开模态时锁定 body 滚动
    useEffect(() => {
      if (isModalOpen) {
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = '';
        };
      }
    }, [isModalOpen]);

    // 同步外部值变化
    useEffect(() => {
      setInternalValue(value);
    }, [value]);

    const handleEdit = useCallback(() => {
      setInternalValue(value);
      setIsModalOpen(true);
    }, [value]);

    const handleClose = useCallback(() => {
      setIsModalOpen(false);
      onBlur?.();
    }, [onBlur]);

    const handleSave = useCallback(
      (newValue: string) => {
        onChange?.(newValue);
        setIsModalOpen(false);
        onBlur?.();
      },
      [onChange, onBlur]
    );

    const handleCancel = useCallback(() => {
      setIsModalOpen(false);
      onBlur?.();
    }, [onBlur]);

    return (
      <>
        <div ref={ref}>
          <CodeEditorPreview
            value={value}
            language={language}
            theme={theme}
            config={config}
            disabled={disabled}
            readonly={readonly}
            error={error}
            onEdit={handleEdit}
          />
        </div>

        {isModalOpen && (
          <CodeEditorModal
            value={internalValue}
            language={language}
            theme={theme}
            config={config}
            disabled={disabled}
            readonly={readonly}
            onSave={handleSave}
            onCancel={handleCancel}
            onClose={handleClose}
            validator={actualValidator}
            formatter={actualFormatter}
          />
        )}
      </>
    );
  }
);

CodeEditor.displayName = 'CodeEditor';
