# TODO LIST

- [x] 选中 Loop 节点时，其当前循环内的所有 Edges 都高亮，但不包括内层循环
- [x] 支持展示编辑状态和回溯状态
- [x] 支持展示历史记录
- [x] 优化历史记录查询的参数，改为使用运行结果状态和时间区间来查询
- [x] component list 改为一维列表，支持按名称搜索
- [x] Node 配置弹窗支持 Tabs 分页（General/Parameters），并展示 Inputs/Outputs
- [x] 为内置节点 (Start/End/Loop/Switch) 补充完整的 JSON Schema 定义
- [x] 将 Message Node 替换为 Agent Node (入参 Prompt，出参 Result)
- [x] Node 配置弹窗支持 Output Variable Mapping (将节点运行结果绑定到全局变量)
- [x] 优化 Node 配置弹窗 Tabs 顺序：Parameters > Output > Configuration
- [x] 优化 Undo/Redo 逻辑，过滤掉 ReactFlow 内部属性 (width/height/measured等) 避免选中时产生冗余快照
