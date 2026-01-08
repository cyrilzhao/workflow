import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  onChange: (value: string) => void;
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
  placeholder = 'Type {{ to select variable...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [filteredVars, setFilteredVars] = useState<Variable[]>([]);
  const [activeVarIndex, setActiveVarIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Syntax Highlighting Logic ---
  const highlights = useMemo(() => {
    // Simple regex to find {{ ... }} blocks
    // We split by the regex and keep delimiters to map them back
    const regex = /({{[^}]+}})/g;
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

  // --- Scroll Sync ---
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // --- Autocomplete Logic ---
  // Parse the context at cursor to determine what to show
  const getContextAtCursor = (text: string, cursor: number) => {
    // Look backwards from cursor for "{{"
    const textBefore = text.slice(0, cursor);
    const lastOpenBrace = textBefore.lastIndexOf('{{');
    const lastCloseBrace = textBefore.lastIndexOf('}}');

    // If we are not inside {{ ... }} (open brace found after last close brace)
    if (lastOpenBrace === -1 || lastOpenBrace < lastCloseBrace) {
      return null;
    }

    // Extract the content inside {{ up to cursor
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

        const suffix = rawPath.slice(searchText.length);
        // Find next dot
        const firstDot = suffix.indexOf('.');

        let labelToShow = '';
        let valueToInsert = '';
        let typeToShow = v.type;

        if (firstDot === -1) {
          // No more dots, this is the leaf or full match
          labelToShow = rawPath;
          valueToInsert = rawPath;
        } else {
          // There are more segments
          // Segment is the part of rawPath up to the dot
          // e.g. searchText="Start.", rawPath="Start.data.id"
          // suffix="data.id"
          // firstDot=4
          // segment="data"
          // fullSegment = "Start.data"

          const segment = suffix.slice(0, firstDot);
          // Only show the segment name in the list? Or full path?
          // Usually list shows "data", but insertion needs to append "data".

          // Let's simplify: Display the full path option that matches,
          // but maybe grouped or filtered?
          // N8n style: Show cascading.

          // Simple Cascade Implementation:
          // We suggest the *full path* of the variable, but filtered.
          // User selects "Start.data.id".
          labelToShow = v.label; // Use original label
          valueToInsert = rawPath;
        }

        // If we want true cascading (showing only "data" when "Start." is typed), logic is complex.
        // For this demo, let's just filter the flat list of variables by prefix.
        suggestions.set(v.value, v);
      }
    });

    setFilteredVars(Array.from(suggestions.values()));
    setActiveVarIndex(0);
  }, [value, cursorPos, isOpen, variables]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newPos = e.target.selectionStart;
    onChange(newValue);
    setCursorPos(newPos);

    // Auto-open triggers
    const charBefore = newValue.slice(newPos - 1, newPos);
    const twoCharsBefore = newValue.slice(newPos - 2, newPos);

    // Trigger on "{{" or "." (if inside braces)
    if (twoCharsBefore === '{{' || charBefore === '.') {
      setIsOpen(true);
    }
  };

  const insertVariable = (variableValue: string) => {
    const rawVar = variableValue.replace(/^{{|}}$/g, '');
    const context = getContextAtCursor(value, cursorPos) || '';

    // We want to replace the current "context" (what user typed) with the selected variable
    // value = "Hello {{St|}}" (cursor at |)
    // context = "St"
    // variable = "Start.data"
    // Result should be "Hello {{Start.data}}"

    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);

    // Find where context started
    const contextStart = textBefore.lastIndexOf(context);
    const prefix = textBefore.slice(0, contextStart);

    // If context was empty, we just append.
    // If context was "Start.", we replace "Start." with "Start.data"?
    // Wait, if I select "Start.data", I want the full thing.

    const newText = prefix + rawVar + '}}' + textAfter;
    // Note: we close the braces automatically if we are inserting a full variable
    // But if we were already editing inside braces "}}", we might duplicate }}
    // Let's check textAfter.

    let finalAfter = textAfter;
    if (textAfter.trim().startsWith('}}')) {
      // Remove existing closing braces if we added them
      finalAfter = textAfter.trim().replace(/^}}/, '');
    } else {
      // If we created the {{ via button, maybe we don't have }} yet.
      // The regex split logic suggests we just insert the var inside {{ }}
    }

    // Simplest logic:
    // If we are inside {{ }}, replace everything inside with the variable.
    // Actually standard behavior: Autocomplete replaces the *current token*.

    onChange(newText);
    setIsOpen(false);

    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = prefix.length + rawVar.length + 2; // +2 for }}
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveVarIndex(prev => (prev + 1) % filteredVars.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveVarIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredVars[activeVarIndex]) {
        insertVariable(filteredVars[activeVarIndex].value);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
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
          onClick={e => setCursorPos(e.currentTarget.selectionStart)}
          onKeyUp={e => setCursorPos(e.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
        />
        <button
          className="variable-trigger-btn"
          onClick={() => {
            // Insert {{ at cursor and open
            const textBefore = value.slice(0, cursorPos);
            const textAfter = value.slice(cursorPos);
            onChange(textBefore + '{{' + textAfter);
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

      {isOpen && filteredVars.length > 0 && (
        <div className="variable-picker-popover">
          <div className="variable-group">
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
        </div>
      )}
    </div>
  );
};
