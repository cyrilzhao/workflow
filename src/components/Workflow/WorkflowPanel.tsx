import React, { useState } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  GitBranch,
  Box,
  ChevronDown,
  ChevronUp,
  MessageSquare,
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
    items: [{ type: 'message', label: 'Message', icon: <MessageSquare size={16} /> }],
  },
];

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({ groups = defaultGroups }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        <div className="workflow-panel-content">
          {groups.map(group => (
            <div key={group.id} className="workflow-panel-group">
              <div className="workflow-panel-group-title">{group.title}</div>
              <div className="workflow-panel-items">
                {group.items.map(item => (
                  <div
                    key={item.type}
                    className="workflow-panel-item"
                    draggable
                    onDragStart={event => onDragStart(event, item.type)}
                  >
                    <div className="workflow-panel-item-icon">{item.icon || <Box size={16} />}</div>
                    <span className="workflow-panel-item-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
