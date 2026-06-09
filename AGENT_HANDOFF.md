# Agent 接手指南（AGENT_HANDOFF）

> 这一份是给**任何接手这个项目的 agent**（Claude / Copilot / Cursor / 其他）的入口文档。
>
> **如果你是新来的，请先读完这一篇，再决定怎么做。** 全文约 5 分钟读完。

---

## 0. 一句话项目目标

把 `https://onovich.com`（用户的 Cargo 个人作品集）**像素级**复刻到一个独立的 Astro 静态站点，部署到 GitHub Pages 的 `https://blog.onovich.com`，并以站内 `/cms` 网页 CMS 作为内容编辑与发布演进主线。**主域名 `onovich.com` 仍由 Cargo 提供服务，不要动。**

---

## 1. 如果你只有 5 分钟

打开这 4 个文件按顺序读，就够了：

1. `HANDOFF_NEXT.md` — **最新交接状态：当前工作区草稿、P0 问题、下一步操作**
2. `HANDOFF.md` — 当前进度速览（项目状态表、文件路径）
3. `docs/CSS_SPEC.md` — 原站样式规范（事实归档）
4. `docs/RENDERING_REPORT.md` — Playwright 实测渲染数据
5. `docs/OPEN_ISSUES.md` — 当前所有未解决问题

读完之后：

5. `TaskList`（用对应工具/UI 列任务）— 当前 todo
6. `_reference-site/` — 原站 HTML+CSS 归档（本地 + commit 在仓库里）

---

## 2. 项目目录结构（必背）

```
<PROJECT_ROOT>\
├── HANDOFF.md                   ← 简版接手指南
├── AGENT_HANDOFF.md             ← 你正在读的这份（更长更细）
├── docs/
│   ├── CSS_SPEC.md              ← 原站样式规范（事实之源 #1）
│   ├── RENDERING_REPORT.md      ← Playwright 实测数据（事实之源 #2）
│   ├── OPEN_ISSUES.md           ← 当前所有未解决问题
│   ├── LESSONS.md               ← 经验教训（避免重蹈覆辙）
│   └── WORKFLOW.md              ← 抓站 / 部署 / Git / 截图对照工作流
├── _reference-site/             ← 原站 HTML+CSS 归档（commit 进仓库，断会话不丢）
│   ├── stylesheet.css           ← 原站完整 CSS（14KB）
│   ├── index.html / codes.html / ...  ← 11 个页面的真实 HTML
├── _old-site/                   ← 用户先前失败的复刻尝试（gitignore，仅作反例）
├── site/                        ← Astro 静态站
│   ├── astro.config.mjs         ← site: 'https://blog.onovich.com'
│   ├── package.json             ← engines.node ">=22.12.0"
│   ├── public/
│   │   ├── CNAME                ← blog.onovich.com（决定 Pages 域名）
│   │   └── images/              ← 所有媒体文件，已 commit
│   ├── scripts/
│   │   └── visual-diff.mjs      ← Playwright 截图对照脚本
│   └── src/
│       ├── layouts/BaseLayout.astro    ← 全局壳子，home/inner 两 variant
│       ├── components/Gallery.astro    ← 画廊组件（PhotoSwipe 集成）
│       ├── styles/global.css           ← 全局样式
│       ├── content/*.json              ← 内容数据（codes/games/pixel/...）
│       └── pages/*.astro               ← 12 个路由页面
├── diff-screenshots/            ← 截图对照输出（gitignored）
└── .github/workflows/deploy.yml ← Node 22, build site/, deploy to GitHub Pages
```

---

## 3. 关键铁律（必须遵守）

> 这些是用户已经多次强调的硬性规则。违反任何一条都会被回滚 + 教育。

### 铁律 A：原版 onovich.com 是唯一事实之源
- 所有视觉决策都从 `_reference-site/` 或直接 curl 原站。
- **`_old-site/` 是反例**，不能拿它当依据。
- **不要用 web.archive.org**（用户已明确否决，原站还活着就直抓）。

### 铁律 B：`WebFetch` 不可靠
- 原站会 503 屏蔽 WebFetch 的 UA。
- 即便 200，WebFetch 返回的也是 LLM 摘要不是原始 HTML，会幻觉。
- **要原始 HTML 用 `Bash + curl + 浏览器 UA`**：
  ```bash
  curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
       --max-time 30 "https://onovich.com/codes" -o page.html
  ```

### 铁律 C：要看真实视觉，必须真渲染
- 原站很多布局靠 Cargo runtime JS 注入 inline style，单看 HTML/CSS 推不出来。
- 用 Playwright + Chromium 截图 + `getComputedStyle()`。
- 脚本已就绪：`site/scripts/visual-diff.mjs`。

### 铁律 D：域名归属
- `site/public/CNAME` **必须是 `blog.onovich.com`**，不能是 `onovich.com`。
- `astro.config.mjs` 的 `site` 字段也必须同步是 `https://blog.onovich.com`。
- DNS 已配：`@/www → cargo`，`blog → onovich.github.io`。

### 铁律 E：不要为难得的"小聪明"丢精度
- "差不多" 不可接受。
- 用 Playwright 5 断点截图（375/768/1024/1440/1920）逐页比对，差异要可量化。

### 铁律 F：CI Node 版本
- Workflow 必须 `node-version: '22'`，因为 `package.json` 写了 `engines.node: '>=22.12.0'`。Node 20 会失败。

### 铁律 G：Git 推送
- 远端 `git@github.com:onovich/onovich.github.io.git`（User Pages 仓库）
- **不要 force push**（已经强制推过一次，覆盖了用户先前的旧仓库历史）
- `git add` 用具体文件名，不要 `git add .`
- `_old-site/`、`diff-screenshots/`、`site/public/images/games/ninja-ming-orig.png` 都已 gitignore

---

## 4. 当前状态（2026-06-10）

### 已完成
- ✅ `_reference-site/` 抓取归档（11 页 HTML + CSS）
- ✅ DNS / Pages / Actions 部署链路全通，blog.onovich.com 能访问
- ✅ 内容数据 codes/games/pixel/illustrations/gifs/graphics/sns/poems 完整
- ✅ 图片迁移（除 photos 02-07 缺）
- ✅ Layout 重写为 Cargo 风格（右上角浮动汉堡 + 滑入黑色面板 + home 4/8 grid）
- ✅ root font-size 设为 12.96px 与原站一致
- ✅ Playwright 截图对照基础设施
- ✅ 文档体系（HANDOFF / CSS_SPEC / RENDERING_REPORT / OPEN_ISSUES / LESSONS / WORKFLOW）
- ✅ 旧 Electron admin 已移除；后续只沿站内 `/cms` 网页 CMS 演进
- ✅ CMS 已拆出页面样式、浏览器 client、状态 helper、预览渲染、草稿校验、发布包构造、导入包解析、发布应用计划、资产路径校验、缺失资产阻止、真实发布包 smoke、发布前备份、备份恢复命令、富文本工具栏命令、选区保存/恢复、粘贴清洗、允许标签白名单、富文本链接 UI、上传资源共享契约、上传 UI 和上传资源 apply 落盘

### 进行中 / 待做
- 🟡 视觉残差消除（clone 字号略大、列对齐略偏；下一轮迭代用 `getComputedStyle` 对照清单逐项修）
- 🟡 photos 02-07 缺图（用户说非关键路径，后期手动补）
- 🟡 网页 CMS 后续增强：围绕 `/cms`，但优先级低于视觉 P0/P1

### 已知风险
- Cargo runtime JS 注入的 inline style 单看 CSS 推不全
- Cargo `html { font-size }` 是按视口动态算的，clone 无法 1:1 复刻，用 clamp/媒体查询近似即可

---

## 5. 怎么验证一次改动是否成功

每次动 `BaseLayout.astro` / `global.css` / 任何 page 后：

```bash
# 1. 本地 build 不能错
cd site && npm run build

# 2. 启 dist 静态预览
node site/node_modules/.bin/http-server site/dist -p 4350 -s &

# 3. 跑 Playwright 截图对照（用本地预览作为 clone）
cd site && node scripts/visual-diff.mjs --clone=http://localhost:4350

# 4. 用 Read 工具看 diff-screenshots/{slug}.{vp}.original.png 与 .clone.png
#    至少检查 home.desktop / codes.desktop / pixel.desktop 三处

# 5. 搞定后 commit + push
git add site/...
git commit -m "..."
git push

# 6. 等 Actions 绿
curl -s "https://api.github.com/repos/onovich/onovich.github.io/actions/runs?per_page=1" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).workflow_runs[0];console.log(r.status,r.conclusion,r.head_sha.slice(0,7));});"

# 7. 抓线上验证版本号
curl -sL -A "Mozilla/5.0 ..." "https://blog.onovich.com/" | grep "build-version"
```

---

## 6. 怎么读取真实原站数据

```bash
# 静态 HTML/CSS
curl -sL -A "Mozilla/5.0 ..." "https://onovich.com/codes" -o page.html

# 真实渲染指标（getComputedStyle / boundingClientRect / 字体加载后）
cd site && node - <<'NODE'
import { chromium } from 'playwright';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('https://onovich.com/codes', {waitUntil:'networkidle'});
await page.waitForTimeout(3000);  // Cargo 注入还需要时间
const data = await page.evaluate(() => {
  // ...你想读的指标
});
console.log(JSON.stringify(data,null,2));
await browser.close();
NODE
```

---

## 7. 已经踩过的坑（速查）

详见 `docs/LESSONS.md`。摘要：

| 坑 | 别再踩 |
|---|---|
| 把 `_old-site` 当样式参考 | 只用 `_reference-site/` 和原站直抓 |
| 用 WebFetch 验证页面内容 | 用 curl 拿 HTML，用 Playwright 验证渲染 |
| 提议用 web.archive.org | 直抓原站，原站还活着 |
| 单看 HTML 推断布局 | 必须真渲染（Cargo 有 runtime JS） |
| sed 批量改 12 个文件 | 用 Edit 工具逐个改 |
| 改 CNAME 不改 astro.config 的 site | 两个一起改 |
| Force push | 不要做 |
| `git add .` | 用具体文件名 |
| Workflow 用 Node 20 | 用 Node 22 |

---

## 8. 给 GitHub Copilot 的特别说明

如果你接手这个项目的 agent 是 GitHub Copilot 或类似 Web IDE 内的助手：

1. **不要相信 Copilot 自带的"代码补全"猜测样式**——这个项目所有视觉决策必须从 `docs/CSS_SPEC.md` 和 `_reference-site/` 推导。
2. Copilot 没法跑 Playwright 截图，请把"截图对照"这一步交给本地 Claude Code / 命令行执行，再把生成的 PNG 给你或者用户判断。
3. Copilot 编辑文件时**先读后写**（Astro 文件特别敏感，半行 bug 整页崩）。
4. 如果你不确定一个改动是否正确，**保留原始版本**，把新版本写到一个 sibling 文件（如 `BaseLayout.new.astro`）让用户对比，不要直接覆盖。

---

## 9. 如何继续工作（建议优先级）

### P0：消除当前视觉残差（基于已有截图）
- 看 `diff-screenshots/home.desktop.*.png` 找差异
- 用 Playwright `getComputedStyle` 拿原站精确数值
- 修 `global.css` 直到 5 个断点都能通过截图对照

### P1：缩略图列数响应式
- 原站缩略图列数依赖 Cargo JS 注入 `[thumbnails-cols]` 属性
- 我们用 `grid-template-columns: repeat(N, 1fr)` 在媒体查询里写死即可
- 用 Playwright 测原站每个断点实际列数（375/768/1024/1440/1920），写进 CSS

### P2：补 photos 02-07
- 按 `docs/WORKFLOW.md` E 节方法，从 `_reference-site/photo.html` 提取 freight.cargo.site URL
- curl 下载到 `site/public/images/photos/`

### P3：网页 CMS 继续演进
- 保留 `site/src/pages/cms.astro` 作为唯一后台入口
- 已拆出样式、状态管理、预览、草稿校验、导入/导出包、发布应用计划、资产路径校验、缺失资产阻止、富文本工具栏命令、选区保存/恢复、粘贴清洗、允许标签白名单、富文本链接 UI、上传资源共享契约、上传 UI 和上传资源 apply 落盘
- `npm run cms:publish:smoke` 已覆盖真实构建 seed → 发布包 → apply dry-run
- `cms:apply` 写入前会备份覆盖目标到 `site/.cms-backups/` 并输出回滚提示，`npm run cms:restore -- .cms-backups/<timestamp>` 可恢复
- 下一步优先回到视觉 P0/P1；CMS 后续增强继续围绕 `/cms`
- 发布链路继续围绕 `site/scripts/apply-cms-publish.mjs`、`npm run cms:check`、`npm run cms:apply:smoke`、`npm run cms:publish:smoke` 完善

---

## 10. 联系点

- 用户偏好与硬性规则记录在 Claude memory：`~/.claude/projects/D--WebProjects-Onovich/memory/`
  - `onovich_clone_principles.md`：5 条铁律（原版唯一、禁 archive、WebFetch 不靠谱、必须真渲染、不接受差不多）
  - `onovich_site_rebuild_context.md`：项目背景
  - `onovich_handoff_pointer.md`：续接会话时先读哪些文档
- 用户的全局工作流知识库：`<GLOBAL_DOCS>`（远端 git@github.com:onovich/CommonGameDevVibeCodingDocSystem.git）
