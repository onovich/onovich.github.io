# 下一任 Agent 接手说明（HANDOFF_NEXT）

> 更新于 2026-06-10。目标：让后续 agent 不重复踩坑，直接从正确状态继续。

---

## 0. 当前线上与本地状态

### 线上状态

- `https://blog.onovich.com` 由 GitHub Pages 部署 `site/` 构建结果。
- 域名必须保持 `blog.onovich.com`；不要把 Pages CNAME 改成主域名 `onovich.com`。
- 2026-06-10 已通过 `visual:check` 确认线上 `blog.onovich.com/codes` 保留左侧导航；下一轮重点转向整体视觉残差和断点列数。

### 本地工作区状态

旧 Electron `admin/` 后台已移除，后续只沿站内 `/cms` 网页 CMS 演进。CMS 已拆出样式、浏览器 client、状态 helper、预览渲染、草稿校验、发布包构造、导入包解析、发布应用计划、资产路径校验、缺失资产阻止、富文本工具栏命令、富文本选区保存/恢复、粘贴清洗、允许标签白名单、富文本链接 UI、上传资源共享契约、上传 UI 和上传资源 apply 落盘；`cms:publish:smoke` 已能用真实构建 seed 跑发布包 dry-run；`cms:apply` 写入前会备份覆盖目标到 `site/.cms-backups/`，`cms:restore` 可按备份恢复。下一步优先回到视觉 P0/P1。提交前仍要注意：`.claude/settings.local.json` 是本地设置变化，不要随手提交。

---

## 1. 当前最高优先级问题

用户此前明确指出：

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

本项已在 2026-06-10 回归确认：

```txt
npm run visual:diff -- --clone=http://127.0.0.1:4350 --pages=home,codes,pixel
npm run visual:check -- --clone=http://127.0.0.1:4350 --pages=home,codes,pixel --viewports=desktop --targets=clone
npm run visual:check -- --pages=codes --viewports=desktop --targets=original,clone
```

`codes.desktop.clone.png` 已人工查看，左侧导航存在；线上 `blog.onovich.com/codes` 与原站同样通过布局框检查。`visual:measure` 已新增 `mainAnchor`，旧 `main.y` 只是右栏列盒位置，不再单独作为视觉残差依据；`mainColumn` 现在取右栏最右候选，codes/graphic desktop/wide 的 `main.x` 与 `main.width` 已归零级别。wide root font-size 已修到原站实测 `15.55px`；codes/pixel 标准 gallery 顶部也已按 5 断点收敛；pixel mobile 横向溢出已修；pixel 第二段 natural/flush gallery 已收敛；tight gallery 顶部和 game/gif/illustrator 断点列数已收敛；illustrator 5 断点缩略图尺寸已收齐；graphic 已恢复原站首张 `graphic-06.jpg` 全栏图、后续长图顺序、laptop 2 列和 5 断点图片宽度；Cargo grid 横向 gutter / main width 已收敛；home wide avatar 已收敛；gif hero/natural media 尺寸已收敛；GIF gallery 已接入轻量 WebP poster；旧 `photos.json` / `/images/photos/*` 链路已移除；illustrator 3 个大候选已接入轻量 WebP poster；`assets:check` 已确认 234 个真实内容图片引用 0 缺失且无大候选 warning；`visual:diff` 已增加 lazy image 预热和 `images=loaded/total` 日志。当前最高优先级改为：**用图片加载统计复核剩余 gallery 慢加载体验**，同时把 `visual:check` + `visual:measure` + `visual:diff` + `assets:check` 作为相关变更门禁。

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
npm run visual:check -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
  ↓
npm run visual:measure -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
  ↓
npm run visual:diff -- --clone=http://localhost:4350 --pages=home,codes,pixel
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

### Step 1 — 跑视觉门禁和截图

先本地 build：

```bash
cd <PROJECT_ROOT>/site
npm run build
```

启动本地预览：

```bash
npm run preview -- --host 127.0.0.1 --port 4350
```

另一个终端跑：

```bash
cd <PROJECT_ROOT>/site
npm run visual:check -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
npm run visual:measure -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
npm run visual:diff -- --clone=http://localhost:4350 --pages=home,codes,pixel
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

继续复核剩余 gallery 资源加载与大缩略图候选。Codes caption 已在 2026-06-10 切为 Cargo 风格 12px HTML caption；bodycopy / main content 行高也已同步为原站 `16px`，codes 5 断点列数 delta 为 0，wide root font-size 已修到 `15.55px`，home wide avatar 宽高与首个内容 y 已收敛，pixel mobile 横向溢出已修，pixel 第二段 natural/flush gallery 的 `g2` 列数与 desktop/wide 图片宽高也已收敛，game/gif/illustrator mobile/tablet/laptop/desktop/wide 列数与 tight 顶部已收敛，illustrator 5 断点首组 `thumbImage` width delta 已收齐，graphic 已恢复首张全栏图 `graphic-06.jpg`、后续长图顺序、laptop 2 列和 5 断点图片宽度，desktop/wide 首张 width delta 已从 `+2.88/+3.43px` 收到 `+0.02/0px`，Cargo grid 横向 gutter / main width 已归零级别，gif hero 在 mobile/tablet 的宽度 delta 已从 `-69.86/-151.95px` 收到 `+0.95/+1.36px`，GIF gallery 已用 13 张 WebP poster + `eagerThumbs` 避免缩略图慢加载。注意：旧 `main.y` 测的是右栏列盒，不等于首个可见内容起点；继续看 `mainAnchor.y` / `thumbnails.y`，图片尺寸看 `thumbImage.width/height`。

先跑 `npm run assets:check`：当前结果应为 234 个真实内容图片引用 0 缺失、0 大候选 warning。旧 `photos.json` / `/images/photos/*` 已移除；photo 运行时以 `photoAlbums.json` 和 `/images/photo-albums/*` 为准，不要再按缺图任务处理。illustrator 的 `128.gif`、`ref-18.png`、`ref-20.png` 已有 `thumbSrc` poster。长 gallery 先用 `visual:image-audit --imageTimeout=25000 --scrollPasses=3` 做无截图加载审计；当前 gallery + photo detail desktop clone 基线为 `217/217` 图片加载，mobile+desktop 扩展审计为 `434/434`。有 WARN 时再用 `visual:diff --targets=clone --imageTimeout=25000 --scrollPasses=3` 定向截图。可用 `--pages=photo-details` 单独复核 8 个相册详情页。

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

- P0：执行并扩展视觉验证门禁（不要再绕过）
- P1：消除整体缩放、列对齐残差
- P1：用 `visual:image-audit` 先复核剩余 gallery 慢加载体验，有 WARN 再定向截图
- P2：如 clone 长 gallery 仍不能 `images=loaded/total` 全加载，再按页面补更多 `thumbSrc` poster 或提高首屏 eager 范围
- P3：继续扩展发布/恢复校验覆盖

---

## 9. 不要忘记

- `diff-screenshots/` 是 gitignored，不会提交
- `site/public/images/games/ninja-ming-orig.png` 是备份，也 gitignored
- `.claude/settings.local.json` 是本地设置变化，不要提交
- `site/package.json` / lock 里已经新增 `playwright` dev dependency，这是为了视觉验证，应该保留
- 若后续 agent 用 GitHub Copilot，不一定能跑 Playwright；需要用户/Claude Code 本地跑截图验证
