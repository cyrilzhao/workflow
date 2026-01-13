import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseUndoRedoOptions {
  maxHistorySize?: number; // 最大历史记录数，默认 50
}

export interface UseUndoRedoReturn<T> {
  present: T;
  past: T[];
  future: T[];
  set: (newState: T, checkpoint?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  reset: (newState: T) => void;
}

/**
 * 用于管理 undo/redo 功能的自定义 Hook
 * 基于快照机制，维护历史状态栈
 *
 * @param initialState 初始状态
 * @param options 配置选项
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistorySize = 50 } = options;

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // 用于防止在 undo/redo 时记录历史
  const isUndoRedoRef = useRef(false);

  // 设置新状态
  const set = useCallback(
    (newState: T, checkpoint = true) => {
      // 如果正在执行 undo/redo，不记录历史
      if (isUndoRedoRef.current) {
        setHistory(prev => ({
          ...prev,
          present: newState,
        }));
        return;
      }

      // 如果不需要记录检查点，只更新当前状态
      if (!checkpoint) {
        setHistory(prev => ({
          ...prev,
          present: newState,
        }));
        return;
      }

      setHistory(prev => {
        // 检查状态是否真的发生了变化
        if (JSON.stringify(prev.present) === JSON.stringify(newState)) {
          return prev;
        }

        const newPast = [...prev.past, prev.present];
        // 限制历史记录大小
        const trimmedPast =
          newPast.length > maxHistorySize
            ? newPast.slice(newPast.length - maxHistorySize)
            : newPast;

        return {
          past: trimmedPast,
          present: newState,
          future: [], // 新操作会清空 future
        };
      });
    },
    [maxHistorySize]
  );

  // 撤销
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);

      isUndoRedoRef.current = true;

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });

    // 重置标志
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, []);

  // 重做
  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      isUndoRedoRef.current = true;

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });

    // 重置标志
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, []);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory(prev => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);

  // 重置状态和历史记录（用于接口数据加载完成后初始化）
  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    present: history.present,
    past: history.past,
    future: history.future,
    set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory,
    reset,
  };
}
