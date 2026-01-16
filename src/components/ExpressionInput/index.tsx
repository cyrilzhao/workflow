import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Braces } from 'lucide-react';
import './index.scss';

export interface Variable {
  label: string;
  value: string; // The full path, e.g. "Start.data.id"
  type?: string;
  group?: string;
}

interface ExpressionInputProps {
  value?: string;
  onChange?: (value: string) => void;
  variables?: Variable[];
  placeholder?: string;
}

// Enhanced mock variables with dot notation
const DEFAULT_VARIABLES: Variable[] = [
  { label: 'Start Data', value: 'Start.data', type: 'object', group: 'Start Node' },
  { label: 'Start Body', value: 'Start.data.body', type: 'object', group: 'Start Node' },
  { label: 'User ID', value: 'Start.data.userId', type: 'string', group: 'Start Node' },
  { label: 'User Name', value: 'Start.data.userName', type: 'string', group: 'Start Node' },
  { label: 'Loop Item', value: 'loop.item', type: 'any', group: 'Loop Context' },
  { label: 'Loop Index', value: 'loop.index', type: 'number', group: 'Loop Context' },
  { label: 'Env API Key', value: 'env.API_KEY', type: 'string', group: 'Environment' },
];

export const ExpressionInput: React.FC<ExpressionInputProps> = ({
  value = '',
  onChange,
  variables = DEFAULT_VARIABLES,
  placeholder = 'Type ${ to select variable...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [filteredVars, setFilteredVars] = useState<Variable[]>([]);
  const [activeVarIndex, setActiveVarIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const variableListRef = useRef<HTMLDivElement>(null);

  // --- Syntax Highlighting Logic ---
  const highlights = useMemo(() => {
    // Simple regex to find ${ ... } blocks
    // We split by the regex and keep delimiters to map them back
    const regex = /(\$\{[^}]+\})/g;
    const parts = value.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className="token-variable">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [value]);

  // --- Helper: Find variable boundaries at cursor position ---
  const findVariableAtCursor = (
    text: string,
    cursor: number
  ): { start: number; end: number } | null => {
    // Find all variables in the text
    const regex = /\$\{[^}]+\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Check if cursor is at the boundaries or inside the variable
      if (cursor >= start && cursor <= end) {
        return { start, end };
      }
    }

    return null;
  };

  // --- Scroll Sync ---
  const handleScroll = useCallback(() => {
    if (textareaRef.current && backdropRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;

      // Calculate scrollbar width
      const scrollbarWidth = textareaRef.current.offsetWidth - textareaRef.current.clientWidth;

      // Use transform to move the backdrop content
      const highlightsDiv = backdropRef.current.querySelector('.highlights') as HTMLElement;
      if (highlightsDiv) {
        highlightsDiv.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;

        // Adjust padding to keep visual consistency when scrollbar appears
        // Reduce padding-right to compensate for scrollbar width
        if (scrollbarWidth > 0) {
          const adjustedPadding = Math.max(8, 30 - scrollbarWidth);
          textareaRef.current.style.paddingRight = `${adjustedPadding}px`;
          // highlightsDiv.style.paddingRight = `${adjustedPadding + 10}px`;
          highlightsDiv.style.paddingRight = '30px';

          // Adjust button position when scrollbar appears
          if (buttonRef.current) {
            buttonRef.current.style.right = `${scrollbarWidth}px`;
          }
        } else {
          textareaRef.current.style.paddingRight = '30px';
          highlightsDiv.style.paddingRight = '30px';

          // Reset button position
          if (buttonRef.current) {
            buttonRef.current.style.right = '8px';
          }
        }
      }
    }
  }, []);

  // --- Autocomplete Logic ---
  // Parse the context at cursor to determine what to show
  const getContextAtCursor = (text: string, cursor: number) => {
    // Look backwards from cursor for "${"
    const textBefore = text.slice(0, cursor);
    const lastOpenBrace = textBefore.lastIndexOf('${');
    const lastCloseBrace = textBefore.lastIndexOf('}');

    // If we are not inside ${ ... } (open brace found after last close brace)
    if (lastOpenBrace === -1 || lastOpenBrace < lastCloseBrace) {
      return null;
    }

    // Extract the content inside ${ up to cursor
    const content = textBefore.slice(lastOpenBrace + 2);
    // Remove leading whitespace
    return content.trimStart();
  };

  // Filter variables based on current input context
  useEffect(() => {
    if (!isOpen) return;

    const context = getContextAtCursor(value, cursorPos);

    if (context === null) {
      // Not inside {{ }}, close popover unless manually opened?
      // Actually if manually opened (via button), we usually insert {{ first.
      // But if we just moved cursor out, close it.
      setIsOpen(false);
      return;
    }

    // Logic:
    // 1. If context is empty, show top-level parts (e.g. "Start", "loop", "env")
    // 2. If context is "Start.", show "data"
    // 3. If context is "Start.da", show "data" (filter)

    // Normalize context
    const searchText = context.trim();

    // Find all variables that start with searchText (or match parts of it)
    // We want to suggest the *next segment*.

    const suggestions = new Map<string, Variable>();

    variables.forEach(v => {
      // Clean variable value just in case (remove {{ }} if present in source, though usually source is raw path)
      const rawPath = v.value.replace(/^{{|}}$/g, '');

      if (rawPath.startsWith(searchText)) {
        // Determine the next segment to show
        // e.g. searchText = "Start.", rawPath = "Start.data.id"
        // remaining = "data.id"
        // nextSegment = "data"

        // e.g. searchText = "St", rawPath = "Start.data"
        // remaining = "Start.data" - we need to complete "Start"

        // Handle exact match case?
        if (rawPath === searchText) {
          // Already matched, maybe show nothing or show it to confirm?
          // Or if it's an object, show dots?
          // Let's just keep suggesting it.
        }

        // For this demo, we just filter the flat list of variables by prefix.
        // True cascading (showing only "data" when "Start." is typed) would require more complex logic.
        suggestions.set(v.value, v);
      }
    });

    setFilteredVars(Array.from(suggestions.values()));
    setActiveVarIndex(0);
  }, [value, cursorPos, isOpen, variables]);

  // Sync scrollbar width when value changes
  useEffect(() => {
    handleScroll();
  }, [value]);

  // Calculate popover position when it opens
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is outside both container and popover
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll active variable item into view
  const scrollActiveItemIntoView = useCallback((index: number) => {
    if (!variableListRef.current) return;

    const listEl = variableListRef.current;
    const items = listEl.querySelectorAll('.variable-item');
    const activeItem = items[index] as HTMLElement;

    if (!activeItem) return;

    activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  // Monitor textarea resize to handle scrollbar changes
  useEffect(() => {
    if (!textareaRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Trigger scroll handler to recalculate padding when size changes
      handleScroll();
    });

    resizeObserver.observe(textareaRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleScroll]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newPos = e.target.selectionStart;
    onChange?.(newValue);
    setCursorPos(newPos);

    // Auto-open triggers
    const charBefore = newValue.slice(newPos - 1, newPos);
    const twoCharsBefore = newValue.slice(newPos - 2, newPos);

    // Trigger on "${" or "." (if inside braces)
    if (twoCharsBefore === '${' || charBefore === '.') {
      setIsOpen(true);
    }
  };

  const insertVariable = (variableValue: string) => {
    const rawVar = variableValue.replace(/^\$\{|\}$/g, '');
    const context = getContextAtCursor(value, cursorPos) || '';

    // We want to replace the current "context" (what user typed) with the selected variable
    // value = "Hello ${St|}" (cursor at |)
    // context = "St"
    // variable = "Start.data"
    // Result should be "Hello ${Start.data}"

    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);

    // Find where context started
    const contextStart = textBefore.lastIndexOf(context);
    const prefix = textBefore.slice(0, contextStart);

    // If context was empty, we just append.
    // If context was "Start.", we replace "Start." with "Start.data"?
    // Wait, if I select "Start.data", I want the full thing.

    // Handle duplicate closing braces
    let finalAfter = textAfter;
    if (textAfter.trim().startsWith('}')) {
      // Remove existing closing brace to avoid duplication
      finalAfter = textAfter.trim().replace(/^\}/, '');
    }

    const newText = prefix + rawVar + '}' + finalAfter;

    onChange?.(newText);
    setIsOpen(false);

    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = prefix.length + rawVar.length + 1; // +1 for }
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const clickPos = textarea.selectionStart;

    // Check if click is inside a variable
    const variable = findVariableAtCursor(value, clickPos);

    if (variable && clickPos > variable.start && clickPos < variable.end) {
      // Click is inside variable, move cursor to the right edge
      setTimeout(() => {
        textarea.setSelectionRange(variable.end, variable.end);
        setCursorPos(variable.end);
      }, 0);
    } else {
      setCursorPos(clickPos);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const textarea = e.currentTarget as HTMLTextAreaElement;
    const currentPos = textarea.selectionStart;

    // Handle autocomplete popover navigation
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = (activeVarIndex + 1) % filteredVars.length;
        setActiveVarIndex(newIndex);
        scrollActiveItemIntoView(newIndex);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = (activeVarIndex - 1 + filteredVars.length) % filteredVars.length;
        setActiveVarIndex(newIndex);
        scrollActiveItemIntoView(newIndex);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredVars[activeVarIndex]) {
          insertVariable(filteredVars[activeVarIndex].value);
        }
        return;
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
    }

    // Handle variable navigation and deletion
    const variable = findVariableAtCursor(value, currentPos);

    if (variable) {
      // ArrowLeft: Jump to the left of the variable
      if (e.key === 'ArrowLeft' && currentPos > variable.start && currentPos <= variable.end) {
        e.preventDefault();
        setTimeout(() => {
          textarea.setSelectionRange(variable.start, variable.start);
          setCursorPos(variable.start);
        }, 0);
        return;
      }

      // ArrowRight: Jump to the right of the variable
      if (e.key === 'ArrowRight' && currentPos >= variable.start && currentPos < variable.end) {
        e.preventDefault();
        setTimeout(() => {
          textarea.setSelectionRange(variable.end, variable.end);
          setCursorPos(variable.end);
        }, 0);
        return;
      }

      // Backspace: Delete entire variable when cursor is at the right edge
      if (e.key === 'Backspace' && currentPos === variable.end) {
        e.preventDefault();
        const newValue = value.slice(0, variable.start) + value.slice(variable.end);
        onChange?.(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(variable.start, variable.start);
          setCursorPos(variable.start);
        }, 0);
        return;
      }

      // Delete: Delete entire variable when cursor is at the left edge
      if (e.key === 'Delete' && currentPos === variable.start) {
        e.preventDefault();
        const newValue = value.slice(0, variable.start) + value.slice(variable.end);
        onChange?.(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(variable.start, variable.start);
          setCursorPos(variable.start);
        }, 0);
        return;
      }
    }
  };

  return (
    <div className="expression-input-container" ref={containerRef}>
      <div className="editor-wrapper">
        <div className="backdrop" ref={backdropRef}>
          <div className="highlights">
            {highlights}
            {/* Ending space to ensure height matches if text ends with newline */}
            <br />
          </div>
        </div>
        <textarea
          ref={textareaRef}
          className="expression-textarea"
          value={value}
          onChange={handleInputChange}
          onScroll={handleScroll}
          onClick={handleClick}
          onKeyUp={e => setCursorPos(e.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
        />
        <button
          ref={buttonRef}
          className="variable-trigger-btn"
          onClick={() => {
            // Insert ${ at cursor and open
            const textBefore = value.slice(0, cursorPos);
            const textAfter = value.slice(cursorPos);
            onChange?.(textBefore + '${' + textAfter);
            setTimeout(() => {
              textareaRef.current?.focus();
              setCursorPos(cursorPos + 2);
              textareaRef.current?.setSelectionRange(cursorPos + 2, cursorPos + 2);
              setIsOpen(true);
            }, 0);
          }}
          title="Insert Variable"
          type="button"
        >
          <Braces size={14} />
        </button>
      </div>

      {isOpen &&
        filteredVars.length > 0 &&
        createPortal(
          <div
            ref={popoverRef}
            className="variable-picker-popover"
            style={{
              position: 'fixed',
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
            }}
          >
            <div className="variable-group" ref={variableListRef}>
              {/* Grouping logic simplified for demo: just show filtered list */}
              {filteredVars.map((v, idx) => (
                <div
                  key={v.value}
                  className={`variable-item ${idx === activeVarIndex ? 'active' : ''}`}
                  onClick={() => insertVariable(v.value)}
                  onMouseEnter={() => setActiveVarIndex(idx)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{v.label}</span>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{v.value}</span>
                  </div>
                  {v.type && <span className="var-type">{v.type}</span>}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
