# Onovich 复刻项目 — 接手指南（HANDOFF）

> 给将来接手这个项目的 agent / 自己。读这一份就够了，剩下的从这里跳。
>
> **本次会话即将交接，请优先阅读 [`HANDOFF_NEXT.md`](./HANDOFF_NEXT.md)**，里面记录了：
>
> - 当前线上版本与本地工作区差异
> - 用户指出的 P0 问题
> - 下一步推荐操作步骤与当前 TODO 摘要

## 目标

把 **onovich.com**（Cargo 托管的个人作品集）复刻到 **GitHub Pages + Astro 静态站 + 站内网页 CMS**，**像素级一致**。最终域名分工：

- `https://onovich.com` → Cargo 原站（**保留**，作为对照基准）
- `https://blog.onovich.com` → 我们复刻的 Astro 新站（GitHub Pages）

> **原则：原版才是事实之源**。不接受退而求其次的复刻。`_old-site/` 是失败的旧尝试，**只能用作反例**，不能作为样式依据。

---

## 仓库结构（关键路径）

```
<PROJECT_ROOT>\
├── _reference-site/         ← ★ 原站 onovich.com 的 HTML+CSS 归档（事实之源）
│   ├── stylesheet.css       ← 原站完整 CSS（14KB，Cargo 生成）
│   ├── index.html / codes.html / game.html / pixel.html / ...
│   └── （11 个页面 + 1 个 css）
├── _old-site/               ← 旧失败复刻（gitignore，仅作反例参考）
├── site/                    ← Astro 静态站
│   ├── astro.config.mjs     ← site: 'https://blog.onovich.com'
│   ├── public/
│   │   ├── CNAME            ← blog.onovich.com（决定 Pages 域名）
│   │   └── images/          ← 所有媒体文件
│   └── src/
│       ├── layouts/BaseLayout.astro   ← 全局壳子（侧边栏 + 内容）
│       ├── components/Gallery.astro    ← 画廊组件 + PhotoSwipe
│       ├── styles/global.css           ← ★ 当前样式还不像原站，需重写
│       ├── content/*.json              ← 数据
│       └── pages/*.astro               ← 12 个页面
└── .github/workflows/deploy.yml ← Node 22, build site/, deploy to Pages
```

---

## 当前进度（2026-06-10）

| 项 | 状态 |
|---|---|
| GitHub Pages 部署链路 | ✅ 通了。Actions 绿色，blog.onovich.com 已能访问新站 |
| DNS / CNAME | ✅ 主域名继续 Cargo，blog 子域名指向 GitHub Pages |
| 内容数据（codes/games/pixel/illustrations/gifs/graphics/sns/poems） | ✅ 已填 |
| 图片迁移 | ⚠️ photos 02-07 仍缺，需从原站抓 |
| **CSS / 布局** | ⚠️ 已按 Cargo 左侧导航方向重写，仍需线上/截图回归确认和视觉残差修正 |
| 网页 CMS | ✅ 保留为唯一后台演进方向，旧 Electron admin 已移除；已拆出样式、状态、预览、校验、导入/导出包、发布应用计划、资产路径、缺失资产阻止、真实发布 smoke、发布前备份、恢复命令、富文本工具栏命令、选区保存/恢复、粘贴清洗、允许标签白名单和富文本链接 UI |

**TaskList 当前任务**（按优先级）：

- P0：内页左侧导航线上/截图回归确认
- P0：建立并执行视觉验证门禁
- P1：消除整体缩放、字号、行高、列对齐残差，实测 gallery 断点列数
- P2：迁移 photos 02-07 缺失图片（用户说后期手动补）
- P2：CMS 资源上传落地（图片尺寸/MIME 元数据、`site/public/images/uploads/...`、apply/smoke 覆盖）
- P3：继续扩展发布/恢复校验覆盖

---

## 关键决策与约束

1. **样式参考必须是 `_reference-site/`，不是 `_old-site/`**。
   - `_old-site/` 是用户自己之前的失败复刻（左侧 sidebar 没错，但字号/间距/响应式都偏离原站）。
   - 用它就是「在山寨基础上山寨」。

2. **不要把项目样式硬塞成 `_old-site/styles.css` 的数值**，那是上一轮翻车的根因。

3. **font-family**：原站是 `Nunito` + `PingFangSC-Light`（从 stylesheet.css 第一行 `link href="//fonts.googleapis.com/css?family=PingFangSC-Light:400|Nunito:300,400,700"` 可证）。继续用 `@fontsource/nunito` 自托管 Nunito，PingFangSC-Light 留给系统中文字体降级。

4. **域名分工**：
   - `site/public/CNAME` 必须是 `blog.onovich.com`，**不能写 onovich.com**，否则 Pages 会抢占主域名。
   - `astro.config.mjs` 的 `site` 也要是 `https://blog.onovich.com`。

5. **CI 用 Node 22**：`site/package.json` 的 `engines.node` 是 `>=22.12.0`，`.github/workflows/deploy.yml` 也写死 `node-version: '22'`。Node 20 会构建失败。

6. **Git 推送**：远端是 `git@github.com:onovich/onovich.github.io.git`（User Pages 仓库）。当前 `main` 分支强制覆盖了原仓库历史。**不要再 force push**，正常 commit + push 即可。

---

## 怎么访问原站

**关键发现**：
- `WebFetch` 工具会被 Cargo 拒绝（503/UA 屏蔽）。
- **`Bash` + `curl` + 浏览器 UA 可以**：

```bash
curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
     -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
     --max-time 30 "https://onovich.com/codes" -o codes.html
```

**不要用 WebArchive**——用户已明确否决（onovich.com 当下还活着，应直接抓真版）。

---

## 怎么验证部署

```bash
# 1. 看最近 5 次 Actions（无需 gh CLI，用 GitHub 公共 API）
curl -s "https://api.github.com/repos/onovich/onovich.github.io/actions/runs?per_page=5" \
  | python -c "import sys,json; [print(r['conclusion'],r['head_sha'][:7],r['html_url']) for r in json.load(sys.stdin)['workflow_runs']]"

# 2. 抓线上 HTML 验证版本
curl -sL -A "Mozilla/5.0 ..." "https://blog.onovich.com/" | grep -E "build-version|navbar|sidebar"
```

**版本号印记**：BaseLayout.astro footer 里有 `<span class="build-version">v2.0.x-astro · YYYY-MM-DD</span>`，每次重大改版手动 +1，方便从源码层面区分线上是不是新版。

---

## 推荐继续工作的步骤

1. **视觉回归**：本地 build 后跑 `visual-diff`，重点看 `codes.desktop.clone.png` 是否保留左侧导航，再处理字号、行高、列对齐残差。

2. **gallery 断点列数**：用 Playwright 实测原站 375 / 768 / 1024 / 1440 / 1920 每个断点列数，写入 CSS 媒体查询。

3. **photos 02-07**：从 `_reference-site/photo.html` 提取 `freight.cargo.site` 的真实图片 URL，curl 下载。

4. **网页 CMS 演进**：围绕 `/cms` 继续做资源上传落地；不再维护旧 Electron admin。

---

## 关联文档

- `AGENT_HANDOFF.md` — **★ 给任何接手 agent（包括 GitHub Copilot）的入口指南**
- `docs/CSS_SPEC.md` — **★ 原站样式规范（事实归档）**
- `docs/RENDERING_REPORT.md` — **★ Playwright 实测渲染数据 + 自适应规则**
- `docs/OPEN_ISSUES.md` — 当前所有未解决问题（断会话不丢）
- `docs/LESSONS.md` — 经验教训（避免重蹈覆辙）
- `docs/WORKFLOW.md` — 工作流（抓站 / 部署 / 截图对照 / Git）
- `_reference-site/` — 原站 HTML + CSS 归档（事实之源）
- `site/scripts/visual-diff.mjs` — Playwright 截图对照脚本
- `MEMORY.md` 索引 → `~/.claude/projects/D--WebProjects-Onovich/memory/`（Claude 全局记忆）
- 全局知识库 → `<GLOBAL_DOCS>`（跨项目的工作流方法）
