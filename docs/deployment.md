# LTZ 访问统计部署与维护

博客：`https://blog.litianzeng.cn`。统计面板：`https://analytics.litianzeng.cn`。

## Cloudflare Pages

- GitHub：`ltz150/han-analytics`，生产分支 `main`。
- Pages 项目：`ltz-analytics`，构建 `pnpm build`，输出目录 `dist`，根目录留空。
- Node 使用 `.node-version`，pnpm 使用 `package.json` 的固定版本。
- 先开启账户 Analytics Engine，配置来自 `wrangler.jsonc`：`AnalyticsBinding` 绑定 `AnalyticsDataset`。
- Pages 项目 Settings → Variables and Secrets → Production 添加加密 Secret：`CLOUDFLARE_API_TOKEN`。
- 令牌在用户自己的 Cloudflare API Tokens 页面创建，权限只有本账户 **Account → Account Analytics → Read**。不使用全局 API Key，不写入 GitHub，不放进浏览器前端。
- 新增或修改 secret 后重新部署。Preview 不配置读取凭据；博客预览不加载生产上报。
- Custom domains 添加 `analytics.litianzeng.cn`，由 Cloudflare 建立 DNS 记录并等待 HTTPS 激活。

## 博客接入

在 Astro 网站 `src/config.ts` 的 `HanAnalytics` 配置中启用，URL 为上述面板地址，websiteId 为 `LTZ-Blog`。Footer 按配置显示链接并加载 tracker。服务未通过验证时保持 enable 为 false。

## 验证顺序

1. 打开统计域名，确认网页能加载。刚创建的数据集没有访问记录属于正常情况。
2. 在正常浏览器打开博客首页，再点进文章，Network 中每次导航只出现一次 POST `/send`，响应为 `success: true`。
3. 等待 Analytics Engine 写入可查询，刷新面板查看 `LTZ-Blog` 数据。历史 Cloudflare Web Analytics 记录不会自动迁入。
4. 点击博客页脚“访问统计”，确认打开自己的面板。
5. 检查原有 Cloudflare Web Analytics 仍正常上报。

## 数据含义和额度

- Views 是页面浏览事件；Visitors 是同一浏览器每天首次访问；Visits 按同一页面 30 分钟间隔去重。访客跨设备不能合并，不等于现实中的人数。
- 今天按上海时区计算。统计记录只保存 pathname、外部来源 origin、浏览器/系统/国家信息，不保存完整查询参数或访客 IP。
- Analytics Engine 数据保留三个月，仪表板最长展示近 90 天；“总浏览量”不是永久累计。
- Free：Functions / Workers 合计每天 100,000 请求；Analytics Engine 每天 100,000 数据点及 10,000 查询。打开仪表板通常发出 1 次列表查询和 7 次指标查询。
- `/api` 与 `/send` 才调用 Functions，其余静态页面和文件不触发 Functions。新增应用后与账户其他 Workers / Functions 共享额度。
- 面板按当前方案公开展示聚合指标；需要私有化可在服务端添加 CLOUDFLARE_WEBSITE_PWD secret。该密码不能写到博客。

## 更新与回退

执行 `pnpm test`、`pnpm build` 验证后推送 main，Pages 自动部署。博客若遇统计问题，可将 HanAnalytics.enable 改为 false 并发布；不会影响文章或 Cloudflare 自带统计。统计服务可在 Pages Deployments 回退上一个部署。

源项目与许可：<https://github.com/uxiaohan/HanAnalytics>，保留根目录 LICENSE。
