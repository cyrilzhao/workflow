import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CodeMirrorView } from './CodeMirrorView';
import type { CodeEditorModalProps } from './types';

/**
 * 代码编辑器模态组件
 * 使用 Portal 渲染全屏模态编辑器
 */
export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  value,
  language,
  theme,
  config,
  disabled,
  readonly,
  onSave,
  onCancel,
  validator,
  formatter,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [validationError, setValidationError] = useState<string | null>(null);
  const lineCount = internalValue.split('\n').length;
  const modalPadding = config.modalPadding || 40;

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && config.closeOnEscape !== false) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [config.closeOnEscape, onCancel]);

  // 验证代码
  useEffect(() => {
    if (validator) {
      const error = validator(internalValue);
      setValidationError(error);
    } else {
      setValidationError(null);
    }
  }, [internalValue, validator]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && config.closeOnBackdropClick !== false) {
        onCancel();
      }
    },
    [config.closeOnBackdropClick, onCancel]
  );

  const handleFormat = useCallback(() => {
    if (formatter) {
      const formatted = formatter(internalValue);
      setInternalValue(formatted);
    }
  }, [formatter, internalValue]);

  const handleSave = useCallback(() => {
    if (!validationError) {
      onSave(internalValue);
    }
  }, [internalValue, onSave, validationError]);

  const modalContent = (
    <div
      className="code-editor-modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        background: `rgba(0, 0, 0, ${config.backdropOpacity || 0.5})`,
      }}
    >
      <div
        className="code-editor-modal-container"
        style={{
          width: `calc(100vw - ${modalPadding * 2}px)`,
          height: `calc(100vh - ${modalPadding * 2}px)`,
        }}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="language-badge">{language.toUpperCase()}</span>
            <span className="line-count">{lineCount} lines</span>
          </div>
          <div className="modal-actions">
            {formatter && (
              <button
                className="format-button"
                onClick={handleFormat}
                disabled={disabled || readonly}
              >
                Format
              </button>
            )}
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={!!validationError || disabled}
            >
              Save
            </button>
          </div>
        </div>
        <div className="modal-content">
          <CodeMirrorView
            value={internalValue}
            language={language}
            theme={theme}
            readonly={readonly || disabled}
            onChange={setInternalValue}
            validator={validator}
          />
        </div>
        {validationError && (
          <div className="modal-footer">
            <div className="validation-error">{validationError}</div>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
