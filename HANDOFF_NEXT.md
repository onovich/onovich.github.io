# 下一任 Agent 接手说明（HANDOFF_NEXT）

> 更新于 2026-06-09。目标：让后续 agent 不重复踩坑，直接从正确状态继续。

---

## 0. 当前线上与本地状态

### 线上状态

- `https://blog.onovich.com` 由 GitHub Pages 部署 `site/` 构建结果。
- 域名必须保持 `blog.onovich.com`；不要把 Pages CNAME 改成主域名 `onovich.com`。
- 下一轮需要重点回归：内页左侧导航是否在线上保留、整体视觉差异是否低于当前门槛。

### 本地工作区状态

旧 Electron `admin/` 后台已移除，后续只沿站内 `/cms` 网页 CMS 演进。CMS 已拆出样式、浏览器 client、状态 helper、预览渲染、草稿校验、发布包构造、导入包解析、发布应用计划、资产路径校验和缺失资产阻止；`cms:publish:smoke` 已能用真实构建 seed 跑发布包 dry-run；`cms:apply` 写入前会备份覆盖目标到 `site/.cms-backups/`，`cms:restore` 可按备份恢复。下一步优先打磨富文本编辑和资源上传落地。提交前仍要注意：`.claude/settings.local.json` 是本地设置变化，不要随手提交。

---

## 1. 当前最高优先级问题

用户最新明确指出：

> 目前侧边栏在点击其中任意选项进入子页面后会消失，和原版网页完全不符，相差甚远。

这个判断是正确的。原站真实行为如下：

- 每个页面都有左侧 Onovich + 分类导航区，不只首页有。
- 内页右侧才是内容（`< HOME` + gallery / text）。
- 这是 Cargo 的 pinned overlay / grid，不是传统 `position: fixed` sidebar，也不是只在首页显示的菜单。

我用 Playwright 实测 `https://onovich.com/codes` 的可见元素后确认：

```txt
Onovich               x≈112 y≈58
CODES active          x≈112 y≈125
GAMES                 x≈112 y≈155
PIXEL ARTS            x≈112 y≈184
...
MESSAGE               x≈112 y≈450
右侧内容区             x≈514 起
```

所以后续第一件事是：**把内页左侧导航做线上和截图回归确认**。代码当前已经按 v2.3.0 风格渲染左侧导航，但仍要用 visual-diff 和线上页面确认。

---

## 2. 后续 agent 接手必须遵守的工作流

不要直接修改 → push。必须执行视觉验证门禁：

```txt
edit code
  ↓
npm run build
  ↓
本地预览 dist / astro preview
  ↓
node scripts/visual-diff.mjs --clone=http://localhost:4350 --pages=home,codes,pixel
  ↓
Read 关键截图：
  diff-screenshots/home.desktop.original.png
  diff-screenshots/home.desktop.clone.png
  diff-screenshots/codes.desktop.original.png
  diff-screenshots/codes.desktop.clone.png
  diff-screenshots/pixel.mobile.original.png
  diff-screenshots/pixel.mobile.clone.png
  ↓
写出可见差异清单
  ↓
不通过则继续改，不允许 push
  ↓
通过后 commit + push
```

**不允许再出现**：build 通过就 claim done / push 后才让用户指出样式错。

---

## 3. 原站事实之源

一定要读这些：

```txt
_reference-site/stylesheet.css
_reference-site/index.html
_reference-site/codes.html
_reference-site/game.html
```

再读文档：

```txt
AGENT_HANDOFF.md
HANDOFF.md
docs/CSS_SPEC.md
docs/RENDERING_REPORT.md
docs/OPEN_ISSUES.md
docs/LESSONS.md
docs/WORKFLOW.md
```

**不要用 `_old-site/` 作为样式参考**。那是用户自己的失败复刻，只能作为反例。

---

## 4. 对原站布局的最新正确认知

### 原站不是：

- 不是单纯顶部导航
- 不是只在首页出现左导航
- 不是 `_old-site` 那种全站 flex sidebar

### 原站是：

Cargo grid / pinned overlay 风格：

```txt
全页面共同结构：

90% container
  3.1rem padding
    12列 grid row
      左 4列：Onovich + 分类导航（每页都显示）
      右 8列：当前页面内容
```

右上角还有 Cargo 原生 hamburger menu，但它不是替代左侧导航，而是额外菜单。

### 首页右栏内容：

```txt
头像 72px
hr 横线
small bio：
  沼蛙奥诺维奇，在沙发上创作游戏。
  天生的法兰左和 BTV（但不会潜水）。
```

### 内页右栏内容：

```txt
右上：< HOME
下方：gallery / text / sns links / contact form
```

---

## 5. 真实渲染指标（必须记住）

来自 Playwright `getComputedStyle()`：

```txt
1440 desktop:
  html font-size = 12.96px
  container x=72 width=1296 (90%)
  content padding ≈ 40.17px = 3.1rem
  left col x≈112 width≈392~412
  right col x≈514 width≈823
  h1 fs=20.736px = 1.6rem
  h2 fs=15.552px = 1.2rem, lh=29.5488px = 1.9
  bodycopy fs=16.848px = 1.3rem, lh=16px
```

移动断点：

```txt
viewport <= 768 → body.mobile full_width
375 mobile html font-size = 10.8px
768 mobile html font-size = 15.7989px
1024 desktop html font-size = 11.0592px
1440 desktop html font-size = 12.96px
```

---

## 6. 推荐下一步具体操作

### Step 1 — 回归确认内页导航和视觉差异

先本地 build：

```bash
cd <PROJECT_ROOT>/site
npm run build
```

启动本地预览：

```bash
node node_modules/.bin/http-server dist -p 4350 -s
```

另一个终端跑：

```bash
cd <PROJECT_ROOT>/site
node scripts/visual-diff.mjs --clone=http://localhost:4350 --pages=home,codes,pixel
```

然后用 Read 工具看：

```txt
<PROJECT_ROOT>/diff-screenshots/codes.desktop.original.png
<PROJECT_ROOT>/diff-screenshots/codes.desktop.clone.png
<PROJECT_ROOT>/diff-screenshots/home.desktop.original.png
<PROJECT_ROOT>/diff-screenshots/home.desktop.clone.png
<PROJECT_ROOT>/diff-screenshots/pixel.mobile.original.png
<PROJECT_ROOT>/diff-screenshots/pixel.mobile.clone.png
```

### Step 2 — 继续缩小视觉差异

如果 `codes` clone 有左侧导航，就继续处理字号、行高、列间距、缩略图断点列数这些残差。

### Step 3 — 如果仍偏差大

不要 push。继续从原站读 computedStyle：

```bash
# 用 Playwright 对 onovich.com/codes 读 h1/h2/right column bbox
```

---

## 7. 本轮对工作流的结论

之前失败的原因不是技术不可行，而是：

1. 没有把真实原站作为事实之源
2. 误用了 `_old-site` 作为参考
3. WebFetch 返回摘要/幻觉，误导判断
4. build 通过就 push，没有先本地截图验证
5. 没有把每页内页结构实测清楚

后续要严格遵守：

> **没截图对照，不算完成。没读原站真实 DOM + computedStyle，不要做样式判断。**

---

## 8. 当前 Task 状态建议

建议把已有任务调整为：

- P0：内页左侧导航线上/截图回归确认
- P0：建立并执行视觉验证门禁（不要再绕过）
- P1：消除整体缩放、字号、行高、列对齐残差
- P1：实测并复刻 gallery 每个断点列数
- P2：photos 02-07 缺图（用户说后期手动补）
- P2：继续模块化网页 CMS：优先打磨富文本编辑和资源上传落地
- P3：继续扩展发布/恢复校验覆盖

---

## 9. 不要忘记

- `diff-screenshots/` 是 gitignored，不会提交
- `site/public/images/games/ninja-ming-orig.png` 是备份，也 gitignored
- `.claude/settings.local.json` 是本地设置变化，不要提交
- `site/package.json` / lock 里已经新增 `playwright` dev dependency，这是为了视觉验证，应该保留
- 若后续 agent 用 GitHub Copilot，不一定能跑 Playwright；需要用户/Claude Code 本地跑截图验证
