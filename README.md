# Donglin Li · 个人学术主页

Astro 在构建时生成中英文首页和六个功能页。英文首页在 `/`，中文首页在 `/zh/`。两页共用布局、玻璃卡片样式和机器人动画。

## 本地开发

使用 `.node-version` 中的 Node.js 版本，在仓库根目录运行：

```sh
npm ci
npm run dev
```

编辑 `src/data/en.json` 和 `src/data/zh.json` 更新两种语言的简介、研究、论文和经历。公共邮箱及直接附在标题上的项目、论文与履历链接统一在 `src/data/publicLinks.ts` 中维护。标题链接优先指向出版社的论文页、会议官网的具体条目、主办方赛题或项目仓库。没有对应官方网页时，标题保留为普通文字。栏目和条目的 `id` 用于站内锚点。布局和各节的排版都在 `src/components/HomePage.astro`。首页样式写在 `HomePage.astro` 内（颜色和字体变量在 `:root`），首屏动画在 `src/lib/heroField.ts`，头像与图标在 `public/images/`。

## 预览 Cloudflare 静态站

```sh
npm run build
npm run preview
```

打开 <http://127.0.0.1:4321/zh/> 或 <http://127.0.0.1:4321/>。Wrangler 在本机提供 `dist/` 下的文件，并执行 `public/_redirects` 中的旧网址跳转。按 Ctrl+C 关闭。

## 生产站点

[English](https://donglinli.com/) · [中文](https://donglinli.com/zh/)

生产 Worker 为 `donglin-li-homepage`。根域和 `www` 均绑定此 Worker。Cloudflare 区域规则把根域的 HTTP 访问和全部 `www` 访问用 301 转到 HTTPS 根域，保留路径和查询参数。旧入口由 `public/_redirects` 处理。

## 更新部署

首次发布通过 Cloudflare 控制台上传了 `dist/`。更新现有站点时，使用 Wrangler 在同一 Worker 发布。只更新静态文件可在构建后执行 `npx wrangler versions upload`，再用 `npx wrangler versions deploy <版本ID>@100%` 发布该版本。含 Worker 代码或 Durable Object 迁移的改动用 `npx wrangler deploy`（`versions upload` 不能上传迁移）。发布后打开两个生产链接并检查新的静态文件。

Astro 源码分支为 `astro-site`。如以后启用 GitHub 自动部署，可在 Workers Builds 连接该分支。根目录选仓库根目录，Worker 名称填 `donglin-li-homepage`，构建命令填 `npm run build`，部署命令填 `npx wrangler deploy`。GitHub Pages 从 `main` 根目录发布同一份静态构建。更新镜像时复制 `dist/` 中除 `_redirects` 外的发布文件，保留 `.nojekyll`，并将两种语言的首页分别复制到旧地址 `index.htm` 和 `index-zh.htm`。两个站点都使用 donglinli.com 作为规范网址。

曼彻斯特大学 `public_html` 个人主页由 `scripts/build-uom.mjs` 从同一套公开数据（`en.json`/`zh.json`、`publicLinks.ts`、`publicationCitations.ts`、`projects.ts`、`projectContent.ts` 与 `public/images/avatar-256.jpg`）直接生成自包含的 `default.htm` 与 `default-zh.htm`（内联样式与 Base64 头像，中英文互链，无外部依赖）。运行 `npm run build:uom` 默认输出到 `dist-uom/`，也可传入 `--out-dir <目录>` 直接写入待上传目录。上传到曼大 P 盘 `public_html` 时只放这两份 `.htm` 文件。

双语 LaTeX 简历由 `scripts/build-latex-cv.mjs` 从同一套核定公开数据（`en.json`/`zh.json`、`profile.ts`、`publicLinks.ts`、`publicationCitations.ts`、`projects.ts`、`projectContent.ts`）确定性生成到 `cv-latex/cv-en.tex` 与 `cv-latex/cv-zh.tex`。运行 `npm run build:latex` 重新生成（可加 `--compile` 用 XeLaTeX 临时编译校验），运行 `npm run check:latex`（已并入 `npm run check`）检查核定数据与 `.tex` 源码是否发生漂移。

[Astro 部署指南](https://docs.astro.build/en/guides/deploy/cloudflare/) · [Cloudflare 静态托管计费](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

## 互动页面

中英文首页可进入机器人寻源（`/lab/`）、PID 调参挑战（`/pid/`）和电子名片（`/hi/`）。中文地址在前面加 `/zh`。两项模拟在浏览器内运行。寻源页的 `#challenge` 入口供访客与机器人使用同一组读数定位信号源。PID 分享链接保存控制参数和可选的 MONA 载荷、对比设置。切换语言会保留网址中的实验参数和所在栏目。电子名片的二维码指向固定的 `https://donglinli.com/hi/`，vCard 使用与首页相同的公开邮箱。运行 `npm test`（`node --test tests/*.test.mjs`）执行全部单元测试，运行 `npm run check` 依次完成单元测试、Astro 构建与曼大单页构建。

“项目”一节只由 `ProjectShowcase.astro` 渲染（JSON 里 projects 的 entries 留空）。新增项目时先在 `src/data/projects.ts` 登记：每个项目只有一个分类（`CATEGORIES`），一至三个主题标签（`TAGS` 受控列表，列表和详情里可见，可按标签筛选），精选只用 `featured`（写明理由，页面上显示）；再在 `ProjectShowcase.astro` 的 `content` 数组里加内容：`id` 即页面锚点，`stack` 是“技术栈”一行，`steps` 三步说明对应 SVG 里 `.s1/.s2/.s3` 三组图形，`part` 写“负责”一行，事实只写能在原始记录里找到的。SVG 动画由 `src/lib/projectArt.ts` 按 `data-anim`（follow、flow、pulse、blink、draw）和 `data-on`（第几步时播放）驱动；pulse 会覆盖元素自身的 transform，位移要放在外层 `<g>`。每个项目的小游戏在 `src/lib/games/<名字>.ts`（界面）和 `<名字>.logic.ts`（规则，`tests/game-*.test.mjs` 覆盖），`gamesClient.ts` 在面板打开时按需加载、关闭时停止。导航 `menu` 的文字必须与对应小节的 `heading` 完全一致。`node tests-e2e/showcase.mjs` 检查项目和锚点，`node tests-e2e/games.mjs` 在浏览器里把每个游戏打开玩一遍，`node tests-e2e/touch.mjs` 用真实触摸事件（含双指同按）玩推车、排课、交通锥、小车整定和标志识别。`tests/projects.test.mjs` 在项目缺分类、用了未登记标签、缺解说、缺游戏或缺游戏规则测试时失败。深浅色由 `src/lib/theme.ts` 切换并记在 localStorage `dl-theme`，颜色变量在 `HomePage.astro` 与 `ToolPage.astro` 的 `:root`（两处取值一致，工具页面板、表单都用这些变量）；示意图和游戏画面两种主题下都保持深色，工具页里的地图、曲线和结果板加 `screen` 类即沿用深色变量。留言和意见箱的字段错误显示在字段下方（`src/lib/formErrors.ts`）。未知地址返回 `src/pages/404.astro`（`wrangler.jsonc` 的 `not_found_handling: "404-page"`）。玻璃面板、背景群体动画和光标效果在 `public/assets/effects.js`。论文的 BibTeX 数据在 `src/data/publicationCitations.ts`，更新时核对作者顺序、题名和官方出版记录。

简历页 `/cv/`、`/zh/cv/`（`src/components/CvPage.astro`）直接读 `en.json`/`zh.json`、`src/data/projects.ts` 和 `src/data/projectContent.ts`（项目解说，首页项目区也从这里取），不另存一份；“打印或存为 PDF”按钮调用浏览器打印，打印样式为 A4 白底。每篇论文可复制纯文本引用（`src/lib/citation.ts`，英文按 IEEE 格式，DOI 取自 BibTeX）和 BibTeX，`/publications.bib` 是全部记录。`/sitemap.xml`（`src/pages/sitemap.xml.ts`）列出两种语言的公开页面，新增公开页时一并登记；首页和简历页带 schema.org Person 结构化数据（`src/data/profile.ts`，只写页面已有的事实）。vCard 由 `src/lib/vcard.ts` 生成，含首页联系栏的各个主页链接。`#<项目id>-game` 打开该项目并启动小游戏。`node tests-e2e/upgrade.mjs` 检查简历、引用复制、联系操作、游戏链接和光标效果（触摸滑动不产生涟漪）。

## 留言与工作台（Worker + Durable Object）

`src/worker/` 是同一个 Worker 的动态部分，只处理 `/api/*`，其余路径仍由静态资源直接提供。所有数据存放在一个 SQLite Durable Object（`Hub`）里：访客留言、工作台的待办与便签、通行密钥和登录会话。

- 访客页：`/message/`、`/zh/message/`。留言默认只有本人可见。访客勾选“同意公开”并且本人在工作台放上留言墙后，才会出现在公开的留言墙，联系方式永远不公开。防刷屏用蜜罐、签名的工作量证明（15 位，一次有效）、按天更换的匿名 IP 摘要限流和重复内容过滤，网络地址本身不入库。新留言可发邮件提醒（`src/worker/notify.ts`）：需要在 Cloudflare 给子域开通 Email Routing，再加 `send_email` 绑定 `NOTIFY`、变量 `NOTIFY_FROM` 和 Secret `NOTIFY_TO`；没有绑定时不发信。
- 博士生意见箱：`/pgr/`、`/zh/pgr/`，从首页“EEE PGR Representative”条目进入，不在工具页导航里。页面右侧的角色说明直接读 `en.json`/`zh.json` 里 `phd-representative` 条目，改履历即同步。表单：类别（六类，定义在 `src/worker/feedback.ts`）、内容（≤3000 字）、可选称呼和邮箱、是否允许匿名引用（默认否）。每条只存类别、内容、时间、是否可引用、称呼和邮箱，不存地址，也不存地址摘要：按发送者的限流（`FEEDBACK_PER_HOUR`，默认每小时 10 条、每天 20 条，校园网多人共用一个地址）只在 Durable Object 内存里，键为内存中随机盐的 HMAC，每个 UTC 日更换，对象被回收即消失。全站上限每小时 30 条、每天 100 条；工作量证明难度随最近一小时条数提高（每 5 条加 1 位，最多加 5 位）；蜜罐、同一发送者同日重复内容只收一次、Origin 校验、跨站请求拿不到验证题。提醒邮件主题为 `[PGR feedback] <类别>`，正文只写类别、是否留邮箱、是否可引用，不含内容和联系方式，与留言提醒分开计每天 30 封。工作台“意见箱”标签：按状态（待处理/已处理/全部/垃圾）和类别筛选、标为已处理、私人备注、导出 CSV 或 Markdown（按当前筛选），以及“导出可引用内容”（只含允许引用的条目，只有月份、类别和正文）。
- 工作台：`/desk/`（中文界面，`noindex`，严格 CSP）。登录用通行密钥（Touch ID 等，ES256）或访问密钥。访问密钥是 125 位随机串，服务端只存它的 SHA-256；同一网络地址 15 分钟内连错 5 次即锁定。会话是 `__Host-dl_desk` Cookie（HttpOnly、Secure、SameSite=Strict，14 天），服务端只存哈希。所有写请求都要求 `Origin` 为 `https://donglinli.com`，路径、方法、来源不对的请求在 Worker 入口就被拒绝，不会进入 Durable Object；`workers.dev` 地址上的接口一律 404。
- 工作台功能：留言筛选/搜索/已读/星标/归档/垃圾/删除/公开回复/上留言墙/邮件回复/导出 CSV 与 JSON，待办（截止日、置顶），自动保存的便签，通行密钥管理，退出全部设备，常用入口。快捷键 `j`/`k` 切换、`s` 星标、`e` 归档、`u` 标为未读。
- 授权范围：Wrangler 登录只用 `workers_scripts:write`。Durable Object、Secret 和静态资源都在这个范围内，不需要 D1 或 KV 权限。

两个 Secret 随 `wrangler deploy --secrets-file` 上传，不进 Git：`SESSION_SECRET`（32 字节随机数）和 `DESK_KEY_SHA256`（访问密钥规范化后的 SHA-256 十六进制，规范化即大写并去掉连字符）。变量 `RP_ID`、`ORIGIN` 写在 `wrangler.jsonc`。换访问密钥时生成新密钥，用 `{"DESK_KEY_SHA256": "…"}` 做 secrets 文件重新部署，旧会话在“退出所有设备”后失效。怀疑登录被盗用时，用工作台“设置 → 安全”里的“退出所有设备并移除全部通行密钥”，再换访问密钥。添加通行密钥要求 10 分钟内登录过。丢了所有通行密钥和访问密钥时，也用同样方式换密钥。

本地测试：

```sh
npm run build
printf 'SESSION_SECRET=local-test-secret-not-for-production\nDESK_KEY_SHA256=%s\nRP_ID=localhost\nORIGIN=http://localhost:8787\nMSG_PER_HOUR=6\nFEEDBACK_PER_HOUR=3\n' \
  "$(printf %s AAAAABBBBBCCCCCDDDDDEEEEE | shasum -a 256 | cut -d' ' -f1)" > tests-e2e/.dev.vars
tests-e2e/dev.sh &            # 空白存储的本地 Worker，端口 8787
node tests-e2e/api.mjs        # 接口：限流、锁定、CSRF、隐私规则，意见箱（读本地 SQLite 确认不存地址）
node tests-e2e/browser.mjs    # 浏览器：表单、意见箱页、工作台、虚拟通行密钥（需要 Playwright 与 Chrome）
```

`api.mjs` 和 `browser.mjs` 各需一个全新的本地存储（各自之前重新运行 `tests-e2e/dev.sh`）。本地 `wrangler dev` 会原样转发请求里的 `cf-connecting-ip`，`api.mjs` 借此模拟不同发送者；线上由 Cloudflare 自行设置该头。

`tests-e2e/wrangler.dev.jsonc` 不含自定义域名路由，因为带路由的 `wrangler dev` 会改写 `Origin`。`.dev.vars*` 已被 Git 忽略。镜像站（GitHub Pages）上的留言和工作台页面会自动跳转到 donglinli.com，因为接口只在正式域名上存在。
