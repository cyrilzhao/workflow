import React from 'react';
import { CheckCircle2, XCircle, Clock, RotateCcw, Filter, Calendar } from 'lucide-react';
import type { WorkflowExecutionSnapshot, ExecutionStatus } from './types';
import './WorkflowIDE.scss';

interface ExecutionsListProps {
  executions: WorkflowExecutionSnapshot[];
  selectedExecutionId: string | null;
  onSelect: (executionId: string) => void;
  onRefresh?: () => void;
}

type StatusFilter = 'all' | ExecutionStatus;

type TimeRangeFilter = 'all' | 'today' | 'last7days' | 'last30days' | 'custom';

interface DateRange {
  startDate: string;
  endDate: string;
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

/**
 * 获取时间范围的开始时间戳
 */
const getTimeRangeStart = (range: TimeRangeFilter): number | null => {
  const now = new Date();
  switch (range) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    case 'last7days':
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    case 'last30days':
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
};

export const ExecutionsList: React.FC<ExecutionsListProps> = ({
  executions,
  selectedExecutionId,
  onSelect,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [timeRangeFilter, setTimeRangeFilter] = React.useState<TimeRangeFilter>('all');
  const [customDateRange, setCustomDateRange] = React.useState<DateRange>({
    startDate: '',
    endDate: '',
  });

  const filteredExecutions = executions.filter(ex => {
    // 状态筛选
    if (statusFilter !== 'all' && ex.status !== statusFilter) {
      return false;
    }

    // 时间范围筛选
    if (timeRangeFilter !== 'all') {
      if (timeRangeFilter === 'custom') {
        if (customDateRange.startDate) {
          const startTime = new Date(customDateRange.startDate).getTime();
          if (ex.startTime < startTime) return false;
        }
        if (customDateRange.endDate) {
          const endTime = new Date(customDateRange.endDate).getTime();
          if (ex.startTime > endTime) return false;
        }
      } else {
        const rangeStart = getTimeRangeStart(timeRangeFilter);
        if (rangeStart && ex.startTime < rangeStart) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <div className="executions-list">
      <div className="executions-list-header">
        <div className="filters-container">
          <div className="filter-bar">
            <Filter size={14} style={{ color: '#9ca3af', marginRight: 8 }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          <div className="filter-bar">
            <Calendar size={14} style={{ color: '#9ca3af', marginRight: 8 }} />
            <select
              value={timeRangeFilter}
              onChange={e => setTimeRangeFilter(e.target.value as TimeRangeFilter)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {onRefresh && (
          <button className="refresh-btn" onClick={onRefresh} title="Refresh">
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {timeRangeFilter === 'custom' && (
        <div className="custom-date-range">
          <div className="date-input-group">
            <label>From:</label>
            <input
              type="datetime-local"
              value={customDateRange.startDate}
              onChange={e =>
                setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))
              }
              className="date-input"
            />
          </div>
          <div className="date-input-group">
            <label>To:</label>
            <input
              type="datetime-local"
              value={customDateRange.endDate}
              onChange={e => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="date-input"
            />
          </div>
        </div>
      )}
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
