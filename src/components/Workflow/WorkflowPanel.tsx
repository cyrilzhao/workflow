import React, { useState, useMemo } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  GitBranch,
  Box,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  Bot,
} from 'lucide-react';
import './WorkflowPanel.scss';

export interface WorkflowPanelItem {
  type: string;
  label: string;
  icon?: React.ReactNode;
}

export interface WorkflowPanelGroup {
  id: string;
  title: string;
  items: WorkflowPanelItem[];
}

interface WorkflowPanelProps {
  groups?: WorkflowPanelGroup[];
}

const defaultGroups: WorkflowPanelGroup[] = [
  {
    id: 'built-in',
    title: 'Built-in Nodes',
    items: [
      { type: 'start', label: 'Start', icon: <Play size={16} /> },
      { type: 'end', label: 'End', icon: <Square size={16} /> },
      { type: 'loop', label: 'Loop', icon: <RefreshCw size={16} /> },
      { type: 'switch', label: 'Switch', icon: <GitBranch size={16} /> },
    ],
  },
  {
    id: 'custom',
    title: 'Custom Nodes',
    items: [{ type: 'agent', label: 'Agent', icon: <Bot size={16} /> }],
  },
];

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({ groups = defaultGroups }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;

    return groups
      .map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.label.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      }))
      .filter(group => group.items.length > 0);
  }, [groups, searchTerm]);

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`workflow-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="workflow-panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="workflow-panel-title">Components</div>
        <div className="workflow-panel-toggle">
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {!isCollapsed && (
        <div className="workflow-panel-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="workflow-panel-content">
        {filteredGroups.length === 0 && searchTerm && (
          <div className="no-results">No components found</div>
        )}
        {filteredGroups.map(group => (
          <div
            key={group.id}
            className={`workflow-panel-group ${collapsedGroups[group.id] ? 'group-collapsed' : ''}`}
          >
            <div className="workflow-panel-group-header" onClick={e => toggleGroup(group.id, e)}>
              <div className="workflow-panel-group-title">{group.title}</div>
              <div className="workflow-panel-group-toggle">
                {collapsedGroups[group.id] ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </div>
            </div>
            {!collapsedGroups[group.id] && (
              <div className="workflow-panel-items">
                {group.items.map(item => (
                  <div
                    key={item.type}
                    className="workflow-panel-item"
                    draggable
                    onDragStart={event => onDragStart(event, item.type)}
                    title={item.label}
                  >
                    <div className="workflow-panel-item-icon">{item.icon || <Box size={16} />}</div>
                    <span className="workflow-panel-item-label">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
