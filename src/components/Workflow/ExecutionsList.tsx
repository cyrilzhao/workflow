import React from 'react';
import { CheckCircle2, XCircle, Clock, Search, RotateCcw } from 'lucide-react';
import type { WorkflowExecutionSnapshot, ExecutionStatus } from './types';
import './WorkflowIDE.scss';

interface ExecutionsListProps {
  executions: WorkflowExecutionSnapshot[];
  selectedExecutionId: string | null;
  onSelect: (executionId: string) => void;
  onRefresh?: () => void;
}

const StatusIcon: React.FC<{ status: ExecutionStatus }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 size={16} className="status-icon success" />;
    case 'failure':
      return <XCircle size={16} className="status-icon failure" />;
    case 'running':
      return <RotateCcw size={16} className="status-icon running animate-spin" />;
    default:
      return <Clock size={16} className="status-icon pending" />;
  }
};

export const ExecutionsList: React.FC<ExecutionsListProps> = ({
  executions,
  selectedExecutionId,
  onSelect,
  onRefresh,
}) => {
  const [filter, setFilter] = React.useState('');

  const filteredExecutions = executions.filter(
    ex =>
      ex.executionId.includes(filter) || new Date(ex.startTime).toLocaleString().includes(filter)
  );

  return (
    <div className="executions-list">
      <div className="executions-list-header">
        <div className="search-bar">
          <Search size={14} style={{ color: '#9ca3af', marginRight: 8 }} />
          <input
            type="text"
            placeholder="Search executions..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        {onRefresh && (
          <button className="refresh-btn" onClick={onRefresh} title="Refresh">
            <RotateCcw size={14} />
          </button>
        )}
      </div>
      <div className="executions-list-content">
        {filteredExecutions.length === 0 ? (
          <div className="empty-state">No executions found</div>
        ) : (
          filteredExecutions.map(ex => {
            const duration = ex.endTime ? `${ex.endTime - ex.startTime}ms` : 'Running...';
            const startTimeStr = new Date(ex.startTime).toLocaleString();

            return (
              <div
                key={ex.executionId}
                className={`execution-item ${ex.executionId === selectedExecutionId ? 'selected' : ''}`}
                onClick={() => onSelect(ex.executionId)}
              >
                <div className="execution-status">
                  <StatusIcon status={ex.status} />
                </div>
                <div className="execution-info">
                  <div className="execution-time">{startTimeStr}</div>
                  <div className="execution-meta">
                    <span className={`status-text ${ex.status}`}>{ex.status}</span>
                    <span className="separator">•</span>
                    <span className="duration">{duration}</span>
                  </div>
                  <div className="execution-id">ID: {ex.executionId}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
