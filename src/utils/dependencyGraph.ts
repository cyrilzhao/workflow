/**
 * 依赖图（DAG）管理器
 * 用于优化联动字段的更新顺序和性能
 */
export class DependencyGraph {
  // 依赖关系图：key 是源字段，value 是依赖该字段的目标字段集合
  private graph: Map<string, Set<string>> = new Map();

  /**
   * 添加依赖关系
   * @param target - 目标字段（依赖其他字段的字段）
   * @param source - 源字段（被依赖的字段）
   *
   * @example
   * // total 依赖 price
   * graph.addDependency('total', 'price')
   */
  addDependency(target: string, source: string) {
    if (!this.graph.has(source)) {
      this.graph.set(source, new Set());
    }
    this.graph.get(source)!.add(target);
  }

  /**
   * 获取受影响的字段（拓扑排序）
   * 当某个字段变化时，返回所有需要更新的字段，按依赖顺序排列
   *
   * @param changedField - 变化的字段
   * @returns 受影响的字段列表（按拓扑顺序）
   *
   * @example
   * // price -> total -> discount
   * graph.getAffectedFields('price') // ['total', 'discount']
   */
  getAffectedFields(changedField: string): string[] {
    const affected: string[] = [];
    const visited = new Set<string>();

    const dfs = (field: string) => {
      if (visited.has(field)) return;
      visited.add(field);

      const dependents = this.graph.get(field);
      if (dependents) {
        dependents.forEach(dependent => {
          affected.push(dependent);
          dfs(dependent);
        });
      }
    };

    dfs(changedField);
    return affected;
  }

  /**
   * 检测循环依赖
   * @returns 如果存在循环依赖，返回循环路径；否则返回 null
   */
  detectCycle(): string[] | null {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = this.graph.get(node);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (dfs(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            // 找到循环
            return true;
          }
        }
      }

      recStack.delete(node);
      path.pop();
      return false;
    };

    for (const node of this.graph.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          return path;
        }
      }
    }

    return null;
  }

  /**
   * 获取所有源字段（被依赖的字段）
   */
  getSources(): string[] {
    return Array.from(this.graph.keys());
  }

  /**
   * 获取字段的直接依赖者
   */
  getDirectDependents(field: string): string[] {
    const dependents = this.graph.get(field);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * 清空依赖图
   */
  clear() {
    this.graph.clear();
  }
}
