# XJTU-Links

一个面向西安交通大学学生的信息导航项目，将常用网站、校园服务入口，以及学院和书院的公开信息整理在同一发布目录中。页面主体采用静态资源，页脚浏览量由只读 Pages API 和定时统计 Worker 共同提供。

> 本项目由学生独立维护，并非西安交通大学官方网站。内容可能存在遗漏或错误，请以相关单位最新官方信息为准。

## 页面

- `index.html`：西交常用网站汇总，支持关键词搜索、分类和标签筛选、短域名展示、完整网址复制，以及内网 WebVPN 快捷访问入口。
- `404.html`：让不存在的路径明确返回 404，避免把首页误作敏感文件的成功响应。
- `assets/`：客户端图片和图标资源。
- `SECURITY.md`：安全问题的非公开报告方式和仓库安全边界。
- （暂时移除）`college/index.html`：学院、学部、书院及其公开信息的整理页，此部分仍在开发，所以里面的文字内容只是做了非常粗糙的整理。
- 添加了“合成大西交”游戏和“钱班入学指南”资料站的友情链接。

## 使用方式

### 线上查看

①https://xjtu-links.com/ ：主站

②https://xjtu-links.pages.dev/ ：已配置`301`，访问时会跳转至.com主站

③https://fjinzey-ctrl.github.io/xjtu-links/ ：已停用此Pages，会返回`404`

### 本地预览

下载当前Commit所有文件并解压后，直接打开 `index.html`。

为获得与线上更接近的路径行为，也可以在本目录启动任意静态文件服务器，例如：

```bash
python -m http.server 8000
```

随后访问 `http://localhost:8000/`。

本地静态服务器不会提供 Cloudflare D1 绑定，因此页脚浏览量会显示为 `--`，这是预期行为。

### 手动发布

Cloudflare Pages 的拖拽上传仍然可用，但必须上传本目录整体，不能只把 `index.html` 作为一次完整部署。至少应保留 `index.html`、`assets/`、`_worker.js`、`_routes.json` 和 `_headers`；Cloudflare Dashboard 中的 `VISITS_DB` 绑定无需每次重建。

拖拽本目录只会更新 Pages 网站和只读 API，不会创建或重建独立的定时统计 Worker。已有的统计 Worker 会继续运行；首次部署或 Fork 本项目时，需要按下一节单独配置一次。

生产环境使用的真实 `wrangler.toml`、Wrangler 缓存和 Secret 不属于本公开仓库。仓库只提供脱敏的 `wrangler.example.toml`，Fork 使用者需要配置自己的 Pages 项目和 D1 数据库。

## 浏览量统计部署

统计链路为：Cloudflare GraphQL Visits → 定时 Worker → D1 → Pages `_worker.js` → 页面底部。它按 Asia/Shanghai 自然日保存每日 Visits，同一日期使用 UPSERT，重复运行不会重复累加；每次还会补齐最早的缺失日期并复核最近三天。

首次复用时：

1. 创建 D1 数据库，将 `wrangler.example.toml` 复制为本地 `wrangler.toml` 并配置 Pages 的 `VISITS_DB` 绑定。
2. 应用 `migrations/0001_visit_counter.sql`，再用你自己网站的历史基线和起始日期初始化 `visit_counter`。本仓库刻意不提供本站生产基线。
3. 将 `cloudflare/visit-sync/wrangler.example.toml` 复制为同目录下的 `wrangler.toml`，替换 Worker 名称、Zone ID、域名、同步起始日期、D1 ID 和 Analytics Engine 数据集名称。
4. 创建仅限目标站点的 Cloudflare API Token，至少授予 `Account Analytics: Read` 和 `Zone Analytics: Read`，然后执行 `wrangler secret put CLOUDFLARE_ANALYTICS_TOKEN` 写入加密 Secret；不要把 Token 写进配置文件。
5. 在 `cloudflare/visit-sync` 目录执行 `wrangler deploy`。示例 Cron `15 18 * * *` 使用 UTC，即北京时间次日 02:15。

判断同步是否真正成功时，应查询 D1 的 `daily_visits`、`visit_sync_runs` 和 `visit_counter`，不能只依据 Cron 列表中的表面状态。

## 安全

不要向仓库提交 `.wrangler/`、`.env*`、`.dev.vars*`、API Token、Cookie、私钥、数据库文件或生产部署配置。提交前应检查 `git status` 与暂存区文件；漏洞报告方式见 [SECURITY.md](SECURITY.md)。

## 声明

本项目不代理登录，不保存统一身份认证凭据，也不保证第三方站点持续可用。

通过 WebVPN 访问时，用户仍需在西安交通大学 WebVPN 页面完成正常身份认证，并遵守学校网络与信息系统的使用规定。

学校名称、标识、网站内容以及页面中引用的第三方资源，其权利归各自权利人所有。

本仓库的开源许可证仅覆盖维护者拥有著作权的代码和原创内容。

## 另

`473af4d1743480d09dfb1684b902bdef.txt`文件是为了通过微信浏览器的安全验证，不必理会。

## 致谢

- [ESWZY/webvpn-dlut](https://github.com/ESWZY/webvpn-dlut)：WebVPN 地址转换原理与参考实现。
- [🕳️🕳️](mailto:neixianggonh@gmail.com)同学制作的“合成大西交”游戏。[跳转](http://47.99.48.177/)
- [Hanseason](mailto:hanseason652@gmail.com)同学牵头制作的“钱班新生指南”资料站。[跳转](https://qian-guide.com/)
- [XJTUToolBox](https://github.com/yan-xiaoo/XJTUToolBox)：西交 WebVPN 参数与校园工具项目组织方式参考。
- Cloudflare Pages：提供静态托管服务。

## 许可证

维护者拥有著作权的代码按 [GNU General Public License v3.0](LICENSE) 发布。你可以使用、研究、修改和再分发，但公开分发衍生版本时必须继续遵守 GPL v3.0 的相同开源义务。

**Copyright © 2026 Jinze.**
