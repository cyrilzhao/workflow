import type { ExtendedJSONSchema } from '../types/schema';

export interface SchemaBuilderProps {
  /**
   * The initial schema to edit.
   */
  defaultValue?: ExtendedJSONSchema;

  /**
   * Callback fired when the schema changes.
   */
  onChange?: (schema: ExtendedJSONSchema) => void;

  /**
   * Optional custom class name.
   */
  className?: string;

  /**
   * Optional custom styles.
   */
  style?: React.CSSProperties;
}

export type SchemaNodeType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

export interface SchemaNode extends ExtendedJSONSchema {
  key?: string; // For object properties
}

export interface SchemaBuilderContextType {
  schema: ExtendedJSONSchema;
  selectedPath: string[]; // Path to the currently selected node
  expandedPaths: Record<string, boolean>;
  onSelect: (path: string[]) => void;
  onUpdate: (path: string[], updates: Partial<SchemaNode>, newKey?: string) => void;
  onAddChild: (path: string[], type: SchemaNodeType) => void;
  onAddSibling: (path: string[], type: SchemaNodeType) => void;
  onDelete: (path: string[]) => void;
  onToggleExpand: (path: string[], expanded: boolean) => void;
}
