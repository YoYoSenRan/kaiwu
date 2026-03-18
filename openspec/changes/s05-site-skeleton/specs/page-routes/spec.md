## ADDED Requirements

### Requirement: 所有路由占位页面

以下路由 SHALL 有占位页面，每个页面使用 PageHeader 展示东方排版标题 + 副标题，并在内容区显示空状态：

| 路由 | 标题 | 副标题 | 空状态文案 |
|---|---|---|---|
| `/` | 开物局 | （首页不用 PageHeader，用 Hero 区占位） | "造物流尚未开始。静候更鼓响起。" |
| `/stories` | 造物志 | 每个想法的一生。成器或封存，都值得一读。 | "还没有造物志。等第一件器物问世吧。" |
| `/stories/[id]` | （动态标题） | — | "此造物志尚在书写中。" |
| `/stories/[id]/flow` | （对话流） | — | "对话尚未开始。" |
| `/agents` | 局中人 | 各司其职，偶有争执，但造物之心，始终如一。 | "局中人还在赶来的路上。" |
| `/agents/[id]` | （动态标题） | — | "此人尚未留下事迹。" |
| `/trends` | 物帖墙 | 说一个词，看它的命运。 | "物帖墙上空空如也。等着第一个人投进一张物帖。" |
| `/pipeline` | 造物坊 | 此刻，造物流上正在发生的事。 | "造物坊里安安静静。没有正在进行的造物令。" |
| `/behind` | 内坊 | 平时不让看的地方，现在让你看看。 | "内坊暂不开放。" |
| `/about` | 关于 | 开物局是什么，为什么存在。 | （关于页不需要空状态，直接放简要介绍文本占位） |

#### Scenario: 所有路由可访问
- **WHEN** 浏览器访问上述任一路由
- **THEN** 返回 200，页面显示对应标题和空状态

#### Scenario: 页面有 metadata
- **WHEN** 查看页面 HTML head
- **THEN** 每个页面有独立 title（如"造物志 | 开物局"）和 description

#### Scenario: 空状态带东方气质
- **WHEN** 页面无数据
- **THEN** 空状态居中显示：图标占位（64x64 区域，用 emoji 或 Lucide icon）+ 标题（body-lg）+ 描述（body，--muted-fg）

---

### Requirement: 首页 Hero 占位

首页 `/` SHALL 有一个 Hero 区占位，带墨晕背景（--gradient-ink 或 InkWash 组件），居中显示：
- "开 物 局" — font-display，hero 字号 (48px)，weight 700，letter-spacing 0.15em
- "天工开物，每帖必应。" — body-lg，--muted-fg，margin-top 12px
- 底部渐隐过渡到 --background

本阶段不实现横向卷轴，只做氛围感占位。

#### Scenario: 首页氛围感
- **WHEN** 访问首页
- **THEN** 看到墨色背景 + 大标题"开物局" + 口号，有东方调性而非白板

---

### Requirement: 二级页面面包屑

`/stories/[id]`、`/stories/[id]/flow`、`/agents/[id]` SHALL 在 PageHeader 上方显示面包屑导航。

#### Scenario: 造物志详情面包屑
- **WHEN** 访问 /stories/abc
- **THEN** 页面顶部显示 "造物志 / abc"（abc 为占位 ID）
