# XJTU-Links

一个面向西安交通大学学生的信息导航项目，将常用网站、校园服务入口，以及学院和书院的公开信息整理在同一发布目录中。页面主体采用静态资源，页脚浏览量由一个只读 Pages API 提供。

> 本项目由学生独立维护，并非西安交通大学官方网站。内容可能存在遗漏或错误，请以相关单位最新官方信息为准。

## 页面

- `index.html`：西交常用网站汇总，支持关键词搜索、分类和标签筛选、短域名展示、完整网址复制，以及内网 WebVPN 快捷访问入口。
- `_worker.js`：只处理 `/api/visits`，从 D1 返回已经汇总好的 Cloudflare Visits；不在访问请求中实时查询 Cloudflare Analytics。
- `_routes.json`：将 Worker 调用限制在 `/api/*`，普通页面和静态资源不进入 Pages Function。
- `_headers`：为静态页面设置内容安全策略、禁止嵌入和最小权限浏览器策略。
- `404.html`：让不存在的路径明确返回 404，避免把首页误作敏感文件的成功响应。
- `assets/`：客户端图片和图标资源。
- `wrangler.example.toml`：供复用项目结构时参考的脱敏配置，不包含生产资源编号。
- `SECURITY.md`：安全问题的非公开报告方式和仓库安全边界。
- （暂时移除）`college/index.html`：学院、学部、书院及其公开信息的整理页，此部分仍在开发，所以里面的文字内容只是做了非常粗糙的整理。
- 添加了“合成大西交”游戏的友情链接。

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

生产环境使用的真实 `wrangler.toml`、Wrangler 缓存和 Secret 不属于本公开仓库。仓库只提供脱敏的 `wrangler.example.toml`，Fork 使用者需要配置自己的 Pages 项目和 D1 数据库。

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
