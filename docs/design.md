# LTZ 博客访问统计部署设计

确认日期：2026-10-02。用户同意独立部署 HanAnalytics，域名改用 `analytics.litianzeng.cn`，博客页脚增加访问统计入口，保留 Cloudflare Web Analytics。

## 结构与范围

- 复用 `uxiaohan/HanAnalytics` 的 Vue 仪表板、Pages Functions 和 Analytics Engine 数据结构。
- 独立 GitHub 仓库 `ltz150/han-analytics`，独立 Pages 项目 `ltz-analytics`，构建输出 `dist`。
- 仅允许生产博客 `blog.litianzeng.cn`、站点标识 `LTZ-Blog` 上报；预览和本地浏览不写入生产统计。
- 页脚展示“访问统计”链接，不嵌入完整仪表板；跟踪器按首次加载和 Swup 切页上报，每次导航一次。
- 数据从新服务启用后开始记录，不迁入 Cloudflare Web Analytics 历史数据。Analytics Engine 保留三个月，仪表板显示最多近 90 天。
- 使用账户 `f64001310a9dfa3e502fc6617acef621` 的 Analytics Engine，绑定 `AnalyticsBinding` / 数据集 `AnalyticsDataset`。
- 服务读取凭据仅作为 Pages 加密秘密保存，权限限定本账户 Account Analytics Read；不写进仓库、前端或聊天。创建凭据由用户完成。
- 保留 MIT 许可与项目出处；界面标题与说明改为 LTZ。

## 必要修补

跨域 OPTIONS 预检正常返回；按完整域名和站点标识匹配白名单；拒绝不合法查询站点与 SQL 注入；统计存储不可用时不影响博客显示；来源仅存 origin，页面只存 pathname；不存访客 IP。空数据查询显示 0 / 空列表。统一上海时区，抽样数据按权重计算。

## 验收

本地后端与浏览器跟踪器回归测试通过；两个项目构建成功；Cloudflare 绑定和秘密存在；域名 HTTPS 有效；真实浏览器访问博客首页并切换文章，上报成功且无重复；仪表板出现博客数据；页脚链接可打开统计面板；保留现有 Cloudflare 统计。若凭据未配置，保持博客集成关闭，明确报告未上线。
