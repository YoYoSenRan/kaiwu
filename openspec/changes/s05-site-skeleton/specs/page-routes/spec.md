## ADDED Requirements

### Requirement: 所有路由占位页面

以下路由 SHALL 有占位页面，每个页面包含标题和"施工中..."提示：
- `/`（首页）
- `/stories`（造物志列表）
- `/stories/[id]`（造物志详情）
- `/stories/[id]/flow`（对话流）
- `/agents`（局中人总览）
- `/agents/[id]`（局中人详情）
- `/trends`（物帖墙）
- `/pipeline`（造物坊）
- `/behind`（内坊）
- `/about`（关于）

#### Scenario: 所有路由可访问
- **WHEN** 浏览器访问上述任一路由
- **THEN** 返回 200，页面显示对应标题

#### Scenario: 页面有 metadata
- **WHEN** 查看页面 HTML head
- **THEN** 每个页面有独立的 title（如"造物志 | 开物局"）
