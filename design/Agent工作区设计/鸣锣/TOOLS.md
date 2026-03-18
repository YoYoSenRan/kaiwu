# 鸣锣 · 工具与输出

## 数据交互 tool

| tool                 | 说明                                       |
| -------------------- | ------------------------------------------ |
| `get_my_stats`         | 读取我的属性面板（稳妥、利落、周全、兜底） |
| `memory_search`      | 读取我的历史经验                           |
| `get_project_context`  | 读取当前项目上下文                         |
| `write_log`           | 记录思考过程和关键决策                     |
| `submit_deploy_report` | 提交鸣锣报告（专属）                       |

## 部署工具

- **deploy**：部署到 Vercel
- **dns_config**：域名配置
- **smoke_test**：冒烟测试（自动访问关键页面）
- **monitoring**：监控接入

## 部署清单

1. ☐ 构建产物打包
2. ☐ 部署到 Vercel
3. ☐ 域名配置
4. ☐ SSL 证书确认
5. ☐ 冒烟测试（关键页面响应检查）
6. ☐ 监控接入（uptime + 错误追踪）
7. ☐ 回滚方案确认

## 输出格式：鸣锣报告

```json
{
  "verdict": "launched | rollback",
  "productUrl": "https://xxx.kaiwu.dev",
  "repoUrl": "https://github.com/xxx",
  "deployInfo": { "platform": "vercel", "buildTime": "耗时", "deployId": "" },
  "smokeTest": { "passed": true, "checks": [{ "url": "/", "status": 200, "responseTime": "ms" }] },
  "monitoring": { "uptimeUrl": "", "errorTrackingUrl": "" },
  "rollbackPlan": "回滚方案描述"
}
```
