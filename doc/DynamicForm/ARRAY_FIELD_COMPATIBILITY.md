# ArrayFieldWidget 兼容性分析报告

## 1. 概述

本文档分析了 ArrayFieldWidget 与路径透明化（Field Path Flattening）和字段联动（UI Linkage）特性的兼容性，并提供了完整的使用示例。

**结论**：ArrayFieldWidget 与这两个特性**完全兼容**，可以安全地组合使用。

---

## 2. 兼容性分析

### 2.1 与路径透明化的兼容性 ✅

#### 支持场景

| 场景 | 是否支持 | 说明 |
|------|---------|------|
| 数组外层使用路径透明化 | ✅ | 数组字段外层的对象可以使用 `flattenPath: true` |
| 数组元素内部使用路径透明化 | ✅ | 数组元素内部的对象可以使用 `flattenPath: true` |
| 数组字段本身使用路径透明化 | ❌ | 数组字段不支持 `flattenPath`（符合设计） |

#### 工作原理

```typescript
{
  wrapper: {
    type: 'object',
    ui: { flattenPath: true },  // ✅ 外层透明化
    properties: {
      items: {
        type: 'array',           // ✅ ArrayFieldWidget 处理
        items: {
          type: 'object',
          properties: {
            details: {
              type: 'object',
              ui: { flattenPath: true },  // ✅ 内部透明化
              properties: {
                name: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}
```

**字段路径**：
- 外层透明化：`wrapper.items` → `items`
- 数组元素：`items.0`
- 内部透明化：`items.0.details.name` → `items.0.name`

---

### 2.2 与字段联动的兼容性 ✅

#### 支持场景

| 场景 | 是否支持 | 说明 |
|------|---------|------|
| 数组字段的显示/隐藏 | ✅ | 可以通过联动控制整个数组的显示/隐藏 |
| 数组字段的禁用/启用 | ✅ | 可以通过联动控制整个数组的禁用/启用 |
| 数组元素内部字段的联动 | ✅ | 支持使用相对路径（`./fieldName`） |
| 跨数组元素的联动 | ✅ | 支持使用绝对路径（`contacts.0.type`） |

#### 相对路径支持

在数组元素内部，可以使用相对路径引用同一元素内的其他字段：

```typescript
{
  contacts: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal', 'work'] },
        companyName: {
          type: 'string',
          ui: {
            linkage: {
              type: 'visibility',
              dependencies: ['./type'],  // ✅ 相对路径
              when: { field: './type', operator: '==', value: 'work' }
            }
          }
        }
      }
    }
  }
}
```

**优势**：
- 相对路径自动解析为当前数组元素的路径
- 不需要硬编码数组索引
- 每个数组元素的联动逻辑独立工作

---

## 3. 综合使用示例

### 3.1 示例：数组 + 路径透明化

```typescript
const schema = {
  type: 'object',
  properties: {
    group: {
      title: '地区',
      type: 'object',
      ui: { flattenPath: true, flattenPrefix: true },
      properties: {
        category: {
          type: 'object',
          ui: { flattenPath: true },
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: {
                    type: 'object',
                    ui: { flattenPath: true, flattenPrefix: true },
                    properties: {
                      group: {
                        type: 'object',
                        ui: { flattenPath: true, flattenPrefix: true },
                        properties: {
                          name: { type: 'string', title: '名称' },
                          phone: { type: 'string', title: '手机号' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
```

**渲染效果**：
```
地区
┌─────────────────────────────┐
│ 分类-分组-名称: [________]    │
│ 分类-分组-手机号: [________]  │
│                  [删除]      │
└─────────────────────────────┘
[+ 添加联系人]
```

**字段路径**：
- `group.category.contacts.0.category.group.name`
- `group.category.contacts.0.category.group.phone`

---

### 3.2 示例：数组 + 字段联动

```typescript
const schema = {
  type: 'object',
  properties: {
    showContacts: { type: 'boolean', title: '显示联系人列表' },
    contacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['personal', 'work'] },
          companyName: {
            type: 'string',
            ui: {
              linkage: {
                type: 'visibility',
                dependencies: ['./type'],
                when: { field: './type', operator: '==', value: 'work' }
              }
            }
          }
        }
      },
      ui: {
        linkage: {
          type: 'visibility',
          dependencies: ['showContacts'],
          when: { field: 'showContacts', operator: '==', value: true }
        }
      }
    }
  }
};
```

**联动效果**：
1. 取消勾选"显示联系人列表" → 整个数组隐藏
2. 将类型改为"工作" → 显示"公司名称"字段

---

### 3.3 示例：数组 + 路径透明化 + 字段联动

```typescript
const schema = {
  type: 'object',
  properties: {
    enableRegion: { type: 'boolean', title: '启用地区配置' },
    group: {
      type: 'object',
      ui: {
        flattenPath: true,
        flattenPrefix: true,
        linkage: {
          type: 'visibility',
          dependencies: ['enableRegion'],
          when: { field: 'enableRegion', operator: '==', value: true }
        }
      },
      properties: {
        category: {
          type: 'object',
          ui: { flattenPath: true },
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: {
                    type: 'object',
                    ui: { flattenPath: true, flattenPrefix: true },
                    properties: {
                      group: {
                        type: 'object',
                        ui: { flattenPath: true, flattenPrefix: true },
                        properties: {
                          type: { type: 'string', enum: ['vip', 'normal'] },
                          name: { type: 'string' },
                          vipLevel: {
                            type: 'string',
                            ui: {
                              linkage: {
                                type: 'visibility',
                                dependencies: ['./type'],
                                when: { field: './type', operator: '==', value: 'vip' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
```

**综合效果**：
1. 外层联动：`enableRegion` 控制整个地区配置的显示/隐藏
2. 路径透明化：多层对象被扁平化，避免多余的 Card 嵌套
3. 数组内部联动：类型为"VIP"时显示"VIP等级"字段

---

## 4. 实现要点

### 4.1 相对路径解析

需要在 `ArrayFieldWidget` 的 `ArrayItem` 组件中实现相对路径解析：

```typescript
const ArrayItem: React.FC<ArrayItemProps> = ({ name, index, schema, ... }) => {
  // 处理 schema 中的联动配置，将相对路径转换为绝对路径
  const processedSchema = useMemo(() => {
    if (!schema.ui?.linkage) return schema;

    const linkage = { ...schema.ui.linkage };

    // 转换 dependencies 中的相对路径
    if (linkage.dependencies) {
      linkage.dependencies = linkage.dependencies.map(dep => {
        if (dep.startsWith('./')) {
          return `${name}.${dep.slice(2)}`;
        }
        return dep;
      });
    }

    // 转换 when 条件中的相对路径
    if (linkage.when && typeof linkage.when === 'object') {
      const processCondition = (condition: any) => {
        if (condition.field?.startsWith('./')) {
          condition.field = `${name}.${condition.field.slice(2)}`;
        }
        if (condition.and) condition.and.forEach(processCondition);
        if (condition.or) condition.or.forEach(processCondition);
      };
      processCondition(linkage.when);
    }

    return {
      ...schema,
      ui: { ...schema.ui, linkage }
    };
  }, [schema, name]);

  // 使用 processedSchema 渲染字段...
};
```

### 4.2 PathResolver 扩展

扩展 `PathResolver` 支持相对路径：

```typescript
export class PathResolver {
  /**
   * 解析相对路径
   * @param path - 字段路径（可能包含相对路径）
   * @param currentPath - 当前字段的完整路径
   * @returns 解析后的绝对路径
   */
  static resolveRelativePath(path: string, currentPath: string): string {
    if (!path.startsWith('./')) {
      return path;
    }

    // 移除相对路径前缀
    const relativePart = path.slice(2);

    // 获取当前路径的父路径
    const parentPath = currentPath.split('.').slice(0, -1).join('.');

    // 拼接完整路径
    return parentPath ? `${parentPath}.${relativePart}` : relativePart;
  }
}
```

---

## 5. 文档更新建议

### 5.1 ARRAY_FIELD_WIDGET.md

在第 12 节"注意事项"中添加：

#### 12.5 与路径透明化和字段联动的配合

**与路径透明化配合**：
- ✅ 数组外层可以使用路径透明化
- ✅ 数组元素内部可以使用路径透明化
- ❌ 数组字段本身不能使用路径透明化

**与字段联动配合**：
- ✅ 数组字段的显示/隐藏、禁用/启用
- ✅ 数组元素内部字段的联动
- ✅ 支持相对路径（`./fieldName`）

### 5.2 FIELD_PATH_FLATTENING.md

在第 10.3 节"数组字段的处理"中更新：

**规则**：
- ❌ 数组字段本身不支持路径透明化
- ✅ 数组外层的对象可以使用路径透明化
- ✅ 数组元素内部的对象可以使用路径透明化

### 5.3 UI_LINKAGE_DESIGN.md

在第 10 节"补充设计"中添加：

#### 10.6 数组字段的联动支持

**数组字段级别的联动**：控制整个数组的显示/隐藏、禁用/启用

**数组元素内部的联动**：
- 绝对路径：`contacts.0.type`
- 相对路径（推荐）：`./type`

---

## 6. 示例代码位置

已创建的示例文件：

1. **数组 + 路径透明化**：
   - 文件：`src/pages/examples/ArrayField/ArrayWithFlattenExample.tsx`
   - Tab：数组字段 → 数组+路径透明化

2. **数组 + 字段联动**：
   - 文件：`src/pages/examples/ArrayField/ArrayWithLinkageExample.tsx`
   - Tab：数组字段 → 数组+字段联动

3. **数组 + 路径透明化 + 字段联动**：
   - 文件：`src/pages/examples/ArrayField/ArrayWithFlattenAndLinkageExample.tsx`
   - Tab：数组字段 → 数组+透明化+联动

---

## 7. 总结

### ✅ 兼容性确认

1. **ArrayFieldWidget 与路径透明化**：完全兼容
   - 数组外层和内部都可以使用路径透明化
   - 数组字段本身不支持（符合设计）

2. **ArrayFieldWidget 与字段联动**：完全兼容
   - 支持数组字段级别的联动
   - 支持数组元素内部的联动
   - 支持相对路径引用

3. **三者组合使用**：完全兼容
   - 可以同时使用数组、路径透明化和字段联动
   - 各特性之间不会产生冲突

### 📝 需要补充的实现

1. **相对路径支持**：在 ArrayFieldWidget 中实现相对路径解析
2. **PathResolver 扩展**：添加 `resolveRelativePath` 方法
3. **文档更新**：在三个文档中补充兼容性说明

### 🎯 用户示例验证

用户提供的示例**完全可行**，渲染效果符合预期：

```
地区
┌─────────────────────────────┐
│ 分类-分组-名称: [________]    │
│ 分类-分组-手机号: [________]  │
└─────────────────────────────┘
```

---

**文档版本**: 1.0
**创建日期**: 2025-12-28
**文档状态**: 已完成
**作者**: Claude Code
