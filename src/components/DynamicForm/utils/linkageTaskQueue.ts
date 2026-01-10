/**
 * 联动任务队列管理器
 * 用于解决串行依赖执行和死循环防护问题
 */
export class LinkageTaskQueue {
  private queue: Array<{ fieldName: string; timestamp: number }> = [];
  private isProcessing = false;
  private updatingForm = false; // 标记是否正在批量更新表单
  private latestTaskMap = new Map<string, number>();

  /**
   * 将字段任务加入队列
   * 如果队列中已有相同字段的任务，更新其 timestamp（任务合并）
   */
  enqueue(fieldName: string): void {
    const timestamp = Date.now();
    const existingIndex = this.queue.findIndex(t => t.fieldName === fieldName);

    if (existingIndex >= 0) {
      // 队列中已有该字段的任务，更新 timestamp
      this.queue[existingIndex].timestamp = timestamp;
    } else {
      // 队列中没有该字段的任务，添加新任务
      this.queue.push({ fieldName, timestamp });
    }

    // 记录该字段的最新 timestamp
    this.latestTaskMap.set(fieldName, timestamp);
  }

  /**
   * 从队列中取出下一个任务
   */
  dequeue(): { fieldName: string; timestamp: number } | undefined {
    return this.queue.shift();
  }

  /**
   * 检查任务是否有效（是否是该字段的最新任务）
   * 用于处理任务合并：只有最新的 timestamp 才有效
   */
  isTaskValid(fieldName: string, timestamp: number): boolean {
    return this.latestTaskMap.get(fieldName) === timestamp;
  }

  /**
   * 检查队列是否为空
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 获取队列处理状态
   */
  getProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * 设置队列处理状态
   */
  setProcessing(value: boolean): void {
    this.isProcessing = value;
  }

  /**
   * 获取表单更新状态
   */
  isUpdatingForm(): boolean {
    return this.updatingForm;
  }

  /**
   * 设置表单更新状态
   */
  setUpdatingForm(value: boolean): void {
    this.updatingForm = value;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    this.latestTaskMap.clear();
  }

  /**
   * 获取队列状态（用于调试）
   */
  getStatus(): {
    queueLength: number;
    isProcessing: boolean;
    isUpdatingForm: boolean;
    tasks: Array<{ fieldName: string; timestamp: number }>;
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      isUpdatingForm: this.updatingForm,
      tasks: [...this.queue],
    };
  }
}
