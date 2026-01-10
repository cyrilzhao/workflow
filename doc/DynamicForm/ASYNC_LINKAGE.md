# 异步联动实现方案

## 1. 概述

异步联动是动态表单系统的重要特性，允许联动函数执行异步操作（如 API 调用、复杂计算等）。本文档介绍异步联动的完整实现方案，包括竞态条件处理、串行依赖执行和死循环防护。

### 本文档内容结构

- **2. 竞态条件处理** - 使用序列号管理器确保异步结果的正确性
- **3. 串行依赖执行** - 使用任务队列管理器处理复杂的依赖关系
- **4. 死循环防护** - 防止 setValue 触发 watch 导致的无限循环
- **5. 开发者最佳实践** - 使用异步联动时的注意事项

### 核心设计原则

1. **结果正确性**：确保只应用最新的异步结果，丢弃过期结果
2. **执行顺序**：保证串行依赖按正确顺序执行，后续字段使用最新值
3. **性能优化**：合并重复任务，避免不必要的计算
4. **稳定性**：防止死循环和无限递归

---

## 2. 竞态条件处理

### 2.1 使用场景

当用户快速切换依赖字段时，可能会同时触发多个异步联动函数。由于异步操作的完成顺序不确定，可能导致旧的结果覆盖新的结果。

**示例场景**：动态加载产品配置 schema

```typescript
const linkageFunctions = {
  loadProductSchema: async (formData: any) => {
    const productType = formData?.productType;
    const response = await fetch(`/api/products/${productType}/schema`);
    return await response.json();
  },
};
```

**执行时间线**：

```
t0: 用户选择 "laptop"
  → 发起请求 A（耗时 200ms）

t1: 用户快速切换到 "smartphone"（50ms 后）
  → 发起请求 B（耗时 100ms）

t2: 请求 B 完成（150ms）
  → 显示 smartphone 的 schema ✅

t3: 请求 A 完成（200ms）
  → 如果没有保护机制，会错误地显示 laptop 的 schema ❌
```

---

### 2.2 解决方案：AsyncSequenceManager

使用**序列号管理器**为每个字段的异步操作分配递增的序列号，只应用最新序列号的结果。

**核心实现**：

```typescript
class AsyncSequenceManager {
  private sequences: Map<string, number> = new Map();

  // 为字段生成新的序列号
  next(fieldName: string): number {
    const current = this.sequences.get(fieldName) || 0;
    const next = current + 1;
    this.sequences.set(fieldName, next);
    return next;
  }

  // 检查序列号是否是最新的
  isLatest(fieldName: string, sequence: number): boolean {
    const current = this.sequences.get(fieldName) || 0;
    return sequence === current;
  }
}
```

**使用方式**：

```typescript
// 1. 在调用异步函数之前生成序列号
const sequence = asyncSequenceManager.next(fieldPath);

// 2. 执行异步函数
const fnResult = await fn(formData, context);

// 3. 异步函数返回后，检查序列号是否仍然是最新的
if (!asyncSequenceManager.isLatest(fieldPath, sequence)) {
  // 丢弃过期的结果
  return {};
}

// 4. 只有最新的结果才会被应用
result.schema = fnResult;
```

**执行效果**：

```
t0: 用户选择 "laptop"
  → 生成序列号 1，发起请求 A

t1: 用户快速切换到 "smartphone"
  → 生成序列号 2，发起请求 B

t2: 请求 B 完成
  → 检查序列号 2 是最新的 ✅
  → 更新 schema

t3: 请求 A 完成
  → 检查序列号 1 不是最新的 ❌
  → 丢弃结果
```

**适用范围**：所有异步联动类型（schema、options、value 等）

---

## 3. 串行依赖执行

### 3.1 使用场景

在串行依赖场景中（例如 B 依赖 A，C 依赖 A 和 B），当 A 变化时，系统需要：

1. 先计算 B 的联动
2. 等待 B 完成后，再计算 C 的联动（使用最新的 B 值）

**挑战**：

- React Hook Form 的 `watch` 会在每次 `setValue` 时触发，可能导致多个联动链并行执行
- 需要确保后续字段使用最新的依赖字段值
- 用户可能在联动执行期间快速连续修改字段

---

### 3.2 解决方案：任务队列管理

使用**任务队列**确保联动按正确顺序串行执行，并自动合并重复任务。

**核心思想**：

1. 将所有联动请求放入队列
2. 确保同一时间只有一个联动链在执行
3. 自动合并相同字段的任务（只保留最新的）
4. 每次处理时获取最新的表单数据

**任务队列管理器实现**：

```typescript
class LinkageTaskQueue {
  private queue: Array<{ fieldName: string; timestamp: number }> = [];
  private isProcessing = false;
  private latestTaskMap = new Map<string, number>();

  /**
   * 将字段任务加入队列
   * 如果队列中已有相同字段的任务，更新其 timestamp（任务合并）
   */
  enqueue(fieldName: string) {
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

  dequeue() {
    return this.queue.shift();
  }

  /**
   * 检查任务是否有效（是否是该字段的最新任务）
   * 用于处理任务合并：只有最新的 timestamp 才有效
   */
  isTaskValid(fieldName: string, timestamp: number) {
    return this.latestTaskMap.get(fieldName) === timestamp;
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  getProcessing() {
    return this.isProcessing;
  }

  setProcessing(value: boolean) {
    this.isProcessing = value;
  }
}
```

**任务合并机制说明**：

`timestamp` 和 `latestTaskMap` 配合实现任务版本控制：

1. **入队时**：
   - 如果队列中已有该字段的任务，更新其 timestamp（任务合并）
   - 如果队列中没有该字段的任务，添加新任务
   - 同时在 `latestTaskMap` 中记录该字段的最新 timestamp

2. **处理时**：
   - 通过 `isTaskValid(fieldName, timestamp)` 检查任务是否有效
   - 只有 timestamp 与 `latestTaskMap` 中记录的最新值相同时才有效
   - 这样确保只处理最新版本的任务

3. **场景示例**：
   - 用户快速修改 A=2 → A=3 → A=4
   - 如果队列正在处理其他任务，新的修改会在队列中累积
   - 队列中可能同时存在多个字段 A 的任务（不同 timestamp）
   - 但只有最新 timestamp 的任务会被真正执行

**队列处理器实现**：

```typescript
async function processQueue() {
  // 如果已经在处理中，直接返回（避免并发执行）
  if (taskQueue.getProcessing()) return;

  taskQueue.setProcessing(true);

  try {
    while (!taskQueue.isEmpty()) {
      const task = taskQueue.dequeue();
      if (!task) break;

      // 检查任务是否仍然有效（可能已被更新的任务替代）
      if (!taskQueue.isTaskValid(task.fieldName, task.timestamp)) {
        continue;
      }

      // 获取最新的表单数据
      const formData = { ...getValues() };

      // 获取受影响的字段并进行拓扑排序
      const affectedFields = dependencyGraph.getAffectedFields(task.fieldName);
      const sortedFields = dependencyGraph.topologicalSort(affectedFields);

      // 串行执行联动，更新 formData
      for (const fieldName of sortedFields) {
        const result = await evaluateLinkage({...});
        if (linkage.type === 'value' && result.value !== undefined) {
          formData[fieldName] = result.value;
        }
      }

      // 批量更新表单和状态
      updateFormAndStates(sortedFields, formData);
    }
  } finally {
    taskQueue.setProcessing(false);
  }
}
```

**关键说明**：

这个实现中，`processQueue()` 会在每次 `enqueue` 后立即被调用。但由于：

1. `isProcessing` 标志位确保同一时间只有一个队列在处理
2. 在处理期间，新的 `enqueue` 会更新队列中已有任务的 timestamp
3. 当第一轮处理完成后，队列中仍有任务（timestamp 已更新），会继续处理
4. 此时获取的是最新的表单数据，确保使用用户的最终输入值

### 3.3 执行流程示例

**场景**：用户快速连续修改同一字段，触发多次联动计算

**依赖关系**：
- A → B → C（A 变化触发 B，B 变化触发 C）

**联动函数**（均为异步，耗时 100ms）：
- B: `b = a * 2`
- C: `c = a + b`

**为什么需要队列？**
- 用户快速修改 A 时，每次修改都会触发 A→B→C 的联动链
- 如果没有队列，多个联动链会并发执行，导致：
  - formData 快照不一致（C 可能使用旧的 B 值）
  - setValue 触发的 watch 导致连锁反应
  - 最终结果不可预测
- 队列确保同一时间只有一个联动链在执行

```
时间线：
t0 (0ms): 用户修改 A = 2
  → watch 触发 → taskQueue.enqueue('a', timestamp=t0)
  → 队列: [{ fieldName: 'a', timestamp: t0 }]
  → latestTaskMap: { 'a': t0 }
  → processQueue() 开始执行
  → 取出任务 { fieldName: 'a', timestamp: t0 }，队列变空
  → 检查 isTaskValid('a', t0) = true ✅
  → 开始计算 A → B → C...

t1 (50ms): 用户修改 A = 3（第一轮联动正在执行中）
  → watch 触发 → taskQueue.enqueue('a', timestamp=t1)
  → 队列: [{ fieldName: 'a', timestamp: t1 }]  ← 新任务入队
  → latestTaskMap: { 'a': t1 }  ← 更新 A 的最新版本
  → processQueue() 正在执行，跳过

t2 (100ms): 用户修改 A = 4（第一轮联动仍在执行）
  → watch 触发 → taskQueue.enqueue('a', timestamp=t2)
  → 队列中已有 'a'，更新其 timestamp
  → 队列: [{ fieldName: 'a', timestamp: t2 }]  ← 任务合并
  → latestTaskMap: { 'a': t2 }  ← 更新 A 的最新版本

t3 (200ms): 第一轮处理完成
  → A → B → C 的计算完成（使用 a=2）
  → 应用结果：b = 4, c = 6
  → while 循环继续，队列不为空
  → 取出任务 { fieldName: 'a', timestamp: t2 }
  → 检查 isTaskValid('a', t2) = true ✅
  → 获取最新的 formData: { a: 4 }
  → 开始计算 A → B → C...

t4 (400ms): 第二轮处理完成
  → 计算完成：b = 8, c = 12
  → 应用结果（覆盖第一轮结果）
  → 队列为空，处理结束

最终结果：a = 4, b = 8, c = 12 ✅
```

**关键机制解释**：

1. **队列的作用**：
   - 防止同一字段的多次修改导致的并发执行
   - 确保同一时间只有一个联动链在执行
   - 通过 `isProcessing` 标志位实现串行控制

2. **任务合并机制**：
   - t1 时创建新任务入队（队列中有 'a'）
   - t2 时队列中已有 'a'，更新其 timestamp（任务合并）
   - 通过 `latestTaskMap` 记录每个字段的最新 timestamp
   - 最终只执行两轮计算（而不是三轮）

3. **执行流程**：
   - t0-t3: 执行第一轮 A→B→C（使用 a=2），应用结果
   - t3-t4: 执行第二轮 A→B→C（使用 a=4），覆盖第一轮结果

4. **为什么需要队列？**
   - 如果没有队列，t0、t1、t2 的三次修改会触发三个并发的联动链
   - 这三个链会同时执行，可能导致：
     - C 使用的 B 值不确定（可能是旧值）
     - formData 快照不一致
     - 最终结果不可预测
   - 队列确保串行执行，每次都使用最新的 formData

**关键特性**：

- ✅ 防止同一字段的并发联动执行
- ✅ 任务合并优化（三次修改只执行两轮）
- ✅ 每条依赖链内部保证串行（C 使用最新的 B 值）
- ⚠️ 中间结果会被应用但随后被覆盖（可通过防抖优化）

---

## 4. 死循环防护

### 4.1 使用场景

值联动（`type: 'value'`）会调用 `form.setValue()` 更新表单字段值。即使设置了 `shouldValidate: false` 和 `shouldDirty: false`，React Hook Form 的 `watch` 仍然会被触发，可能导致死循环：

```
用户修改字段 A
  ↓
watch 触发，计算字段 B 的联动
  ↓
调用 setValue(B, newValue)
  ↓
setValue 触发 watch
  ↓
watch 再次触发，重新计算字段 B
  ↓
无限循环...
```

---

### 4.2 解决方案：与任务队列集成的防护机制

结合任务队列方案，实现完整的死循环防护。

**核心思想**：

1. **批量更新机制**：在一轮联动计算完成后，批量调用 setValue
2. **队列状态控制**：批量更新期间，暂停 watch 的处理
3. **明确的状态管理**：使用队列的 `isProcessing` 状态来控制

**完整实现**：

```typescript
// 在 watch 回调中
const handleFieldChange = (fieldName: string) => {
  // 无论是否在批量更新，都将任务加入队列（避免丢失用户修改）
  taskQueue.enqueue(fieldName);

  // 如果队列正在批量更新，不触发 processQueue
  // 批量更新完成后，队列会自动继续处理
  if (taskQueue.isUpdatingForm()) {
    return;
  }

  // 触发队列处理
  processQueue();
};
```

**任务队列管理器增强**：

```typescript
class LinkageTaskQueue {
  private queue: Array<{ fieldName: string; timestamp: number }> = [];
  private isProcessing = false;
  private isUpdatingForm = false; // 新增：标记是否正在批量更新表单
  private latestTaskMap = new Map<string, number>();

  // ... 其他方法 ...

  isUpdatingForm() {
    return this.isUpdatingForm;
  }

  setUpdatingForm(value: boolean) {
    this.isUpdatingForm = value;
  }
}
```

**队列处理器中的批量更新**：

```typescript
async function processQueue() {
  if (taskQueue.getProcessing()) return;

  taskQueue.setProcessing(true);

  try {
    while (!taskQueue.isEmpty()) {
      const task = taskQueue.dequeue();
      if (!task) break;

      if (!taskQueue.isTaskValid(task.fieldName, task.timestamp)) {
        continue;
      }

      const formData = { ...getValues() };
      const affectedFields = dependencyGraph.getAffectedFields(task.fieldName);
      const sortedFields = dependencyGraph.topologicalSort(affectedFields);

      // 串行执行联动，更新 formData
      for (const fieldName of sortedFields) {
        const result = await evaluateLinkage({...});
        if (linkage.type === 'value' && result.value !== undefined) {
          formData[fieldName] = result.value;
        }
      }

      // 批量更新表单（设置标志位防止 watch 触发 processQueue）
      taskQueue.setUpdatingForm(true);
      try {
        for (const fieldName of sortedFields) {
          if (formData[fieldName] !== undefined) {
            form.setValue(fieldName, formData[fieldName], {
              shouldValidate: false,
              shouldDirty: false,
            });
          }
        }
      } finally {
        // 使用 setTimeout 确保所有 watch 回调都能看到标志位
        setTimeout(() => {
          taskQueue.setUpdatingForm(false);
          // 批量更新完成后，如果队列中有新任务，继续处理
          if (!taskQueue.isEmpty()) {
            processQueue();
          }
        }, 0);
      }
    }
  } finally {
    taskQueue.setProcessing(false);
  }
}
```

---

### 4.3 防护机制的完整性保证

**为什么这个方案能确保不会死循环且不丢失用户修改**：

1. **队列状态控制**：
   - `isUpdatingForm` 标志位在批量更新期间为 `true`
   - watch 回调检查到该标志位时，仍然加入队列，但不触发 `processQueue()`
   - 这样确保用户的修改不会丢失

2. **批量更新原子性**：
   - 所有 setValue 在一个 try-finally 块中执行
   - 即使出现异常，finally 块也会重置标志位并继续处理队列

3. **自动恢复处理**：
   - 批量更新完成后，检查队列是否为空
   - 如果队列中有新任务（用户在批量更新期间的修改），自动调用 `processQueue()`
   - 确保所有用户修改都会被处理

4. **测试场景覆盖**：
   - 同步联动：标志位立即生效，不会触发新的 processQueue
   - 异步联动：任务队列确保串行执行，不会并发
   - 快速连续输入：任务合并机制避免重复计算
   - 批量更新期间的用户修改：加入队列，批量更新完成后自动处理

**执行流程示例**：

```
t0: 联动计算完成，开始批量更新
  → setUpdatingForm(true)
  → setValue('b', 4)  ← 触发 watch
    → watch: enqueue('b')，但不调用 processQueue()
  → setValue('c', 6)  ← 触发 watch
    → watch: enqueue('c')，但不调用 processQueue()

t1: 用户在批量更新期间修改 A = 10
  → watch 触发
  → enqueue('a')  ← 加入队列，不丢失
  → isUpdatingForm() = true，不调用 processQueue()

t2: 批量更新完成
  → setUpdatingForm(false)
  → 检查队列不为空
  → 自动调用 processQueue()  ← 处理用户的修改
  → 执行 A=10 的联动链
```

**与原方案的对比**：

| 维度       | 原方案（useRef + setTimeout） | 新方案（队列集成） |
| ---------- | ----------------------------- | ------------------ |
| 依赖时序   | ✅ 依赖 setTimeout 时序       | ✅ 明确的状态管理  |
| 异步安全   | ⚠️ 可能失效                   | ✅ 完全安全        |
| 测试稳定性 | ❌ 需要等待时间               | ✅ 不需要等待      |
| 代码复杂度 | 低                            | 中                 |
| 维护性     | 中                            | 高                 |

---

## 5. 开发者最佳实践

### 5.1 性能优化建议

**1. 为慢速异步联动添加防抖**

对于执行时间较长的异步联动（> 500ms），建议添加防抖机制：

```typescript
import { debounce } from 'lodash';

const linkageFunctions = {
  // 为慢速 API 调用添加防抖
  loadProductSchema: debounce(async (formData: any) => {
    const response = await fetch(`/api/products/${formData.productType}/schema`);
    return await response.json();
  }, 300),
};
```

**2. 使用缓存减少重复计算**

```typescript
const cache = new Map();

const linkageFunctions = {
  calculateTotal: async (formData: any) => {
    const cacheKey = `${formData.price}-${formData.quantity}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const result = await expensiveCalculation(formData);
    cache.set(cacheKey, result);
    return result;
  },
};
```

**3. 添加 loading 状态提示**

对于用户可感知的异步操作，建议添加 loading 状态：

```typescript
const linkageFunctions = {
  loadOptions: async (formData: any, context: any) => {
    context.setLoading?.(true);
    try {
      const options = await fetchOptions(formData.category);
      return options;
    } finally {
      context.setLoading?.(false);
    }
  },
};
```

---

### 5.2 常见场景处理

**场景 1：串行依赖的异步联动**

✅ **推荐**：使用任务队列方案（本章介绍的方案）

```typescript
// B 依赖 A，C 依赖 A 和 B
const linkages = {
  b: {
    type: 'value',
    dependencies: ['a'],
    fulfill: { function: 'calculateB' },
  },
  c: {
    type: 'value',
    dependencies: ['a', 'b'],
    fulfill: { function: 'calculateC' },
  },
};
```

任务队列会自动处理串行依赖，确保 C 使用最新的 B 值。

---

**场景 2：用户快速连续输入**

✅ **推荐**：为输入字段添加防抖

```typescript
// 在 DynamicForm 组件中
const debouncedHandleChange = useMemo(
  () =>
    debounce((fieldName: string) => {
      taskQueue.enqueue(fieldName);
      processQueue();
    }, 300),
  []
);
```

---

**场景 3：复杂的异步依赖**

❌ **避免**：过深的嵌套依赖（> 3 层）

```typescript
// 不推荐：A → B → C → D → E
```

✅ **推荐**：扁平化依赖结构

```typescript
// 推荐：A → B, A → C, A → D
```

---

### 5.3 调试和监控

**1. 启用调试日志**

```typescript
// 在开发环境启用详细日志
if (process.env.NODE_ENV === 'development') {
  console.log('Linkage executed:', fieldName, result);
  console.log('Queue status:', taskQueue.getStatus());
}
```

**2. 监控异步结果过期**

如果控制台频繁出现"检测到过期的异步结果"，说明：

- 异步函数执行时间过长
- 用户输入过快
- 需要添加防抖机制

**3. 性能分析**

```typescript
const startTime = performance.now();
const result = await linkageFunction(formData);
const duration = performance.now() - startTime;

if (duration > 500) {
  console.warn(`Slow linkage function: ${fieldName}, duration: ${duration}ms`);
}
```

---

### 5.4 最佳实践总结

**✅ 推荐做法**：

- 使用本文档介绍的三个核心方案（序列号管理、任务队列、死循环防护）
- 为慢速异步函数添加防抖和 loading 状态
- 使用缓存减少重复计算
- 保持依赖结构扁平化（不超过 3 层）
- 在开发环境启用调试日志

**❌ 避免做法**：

- 执行时间过长的异步函数（> 1s）
- 过深的嵌套依赖（> 3 层）
- 在联动函数中执行副作用操作
- 忽略控制台中的性能警告

---

## 总结

本文档介绍了异步联动的完整实现方案：

1. **竞态条件处理**：使用 AsyncSequenceManager 确保只应用最新的异步结果
2. **串行依赖执行**：使用任务队列管理器确保正确的执行顺序和任务合并
3. **死循环防护**：通过队列状态控制防止 setValue 触发 watch 导致的无限循环

这三个方案相互配合，构成了一个完整、稳定、高性能的异步联动系统。开发者在使用时应遵循最佳实践，确保系统的稳定性和性能。
