# 真实渲染调研报告（RENDERING_REPORT）

> 用 Playwright 在 Chromium 真实渲染原站 onovich.com，多视口采集渲染指标。
> 本文档**断会话不丢**，是 #16/#18 的实证基础。

---

## 1. 调研方法

```bash
cd site && node scripts/visual-diff.mjs                # 全量截图
cd site && node scripts/visual-diff.mjs --pages=home   # 单页截图
cd site && node scripts/visual-diff.mjs --clone=http://localhost:4350  # 用本地 dist 对照
cd site && npm run visual:check -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
cd site && npm run visual:measure -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
```

视口（VIEWPORTS）：
| 名称 | 宽 × 高 |
|---|---|
| mobile  | 375×800 |
| tablet  | 768×1024 |
| laptop  | 1024×768 |
| desktop | 1440×900 |
| wide    | 1920×1080 |

每个视口对原站 + clone 各 fullPage screenshot，输出 `diff-screenshots/{slug}.{vp}.{label}.png`（gitignored）。

页面（PAGES）：home, codes, game, pixel, illustrator, gif, graphic, photo, poem, sns, links, contact（contact 在原站路径是 `/contact-form`）。

`visual:check` 是截图前的快速布局门禁：它用 Playwright 读取真实布局框，检查左侧 Onovich 导航、当前分类链接和内页 `< HOME` 返回链接是否仍在预期区域。它不能替代人工看截图，但能提前阻止内页导航消失这类 P0 回归。

`visual:measure` 是数值探针：它复用同一套页面/视口/加载等待逻辑，输出原站和 clone 的 bbox、font-size、line-height、`mainAnchor`、gallery columns 和 delta。先跑 measure，再决定 CSS 改哪里。

---

## 2. 真实自适应规则

**这是这次调研最关键的发现，否决了之前所有"按固定 16px root"的假设。**

| 视口 | UA | body class | html font-size | 备注 |
|---|---|---|---|---|
| 375  | iPhone  | `mobile full_width` | **10.8px**     | 移动 |
| 768  | iPhone  | `mobile full_width` | **15.7989px** | 移动 |
| 768  | desktop | `mobile full_width` | **15.7989px** | 768 触发 mobile，UA 不影响 |
| 1024 | desktop | `""`                | **11.0592px** | desktop 但字号小 |
| 1440 | desktop | `""`                | **12.96px**   | desktop 标准 |

**结论 A**：Cargo 用 `body.mobile / body.full_width` 切移动布局，触发条件是 `viewport ≤ 768`（不依赖 UA）。

**结论 B**：`html { font-size }` 不是固定值，是 Cargo 用 JS 按视口动态算出来的（不是单纯 viewport-width 比例，规律不太规整）。我们的 clone **不需要 1:1 复刻这个曲线**，用 `clamp()` 做平滑响应即可，因为它是视觉缩放手段而非语义规则。

---

## 3. 渲染指标（1440 desktop）

```text
.bodycopy 容器:    x=72,    width=1296   → 视口 1440 的 90%，左右 margin 72
.bodycopy padding: 容器内的 div x=112.17 → padding-left ≈ 40.17 ≈ 3.1rem (root 12.96)
home grid 左列:    x=102.45 width=411.69
home grid 右列:    x=514.14 width=823.39   → 列间距 0（gutter 包在 padding 里）
头像:              72.34px 正方形
hr:                width=803.95, height=1
h1:                font-size 20.736px = 1.6rem
h2:                font-size 15.552px = 1.2rem, line-height 29.5488 = 1.9
bodycopy:          font-size 16.848px = 1.3rem, line-height 16px (绝对值)
font-family bodycopy/h1: "PingFangSC-Light, sans-serif, Icons"
font-family h2:    "Nunito, Icons"
颜色 bodycopy:     rgb(42,42,42), font-weight 200
颜色 h1:           rgb(0,0,0), font-weight 400
颜色 h2:           rgba(54,54,54,0.85), font-weight 300
```

> bodycopy 的 line-height **是绝对像素 16px** 而不是相对值。2026-06-10 已将 clone 的 `bodycopy` / main content 行高同步为 `16px`，codes 5 断点 `bodycopy.lineHeight` delta 均为 0。

---

## 4. 各页面布局对照（基于 diff-screenshots）

### Home `/`
- 原站：左 4/12 列导航（按 H2 + H1），右 8/12 列 头像 + HR + small bio
- Clone v2.2.0：基本一致（参见 `diff-screenshots/home.desktop.*.png`）
- 残差：clone 字号略大、列上下对齐位置略偏

### Codes / Game `/codes` `/game`
- 原站：缩略图网格，宽度 58%，3 列布局（待 networkidle 长等才能加载缩略图）
- Clone：3 列宽 `--thumbnails-width: 58%`，已对齐
- 2026-06-10 更新：`codes` 实际运行时使用 `.gallery_image_caption` 小字 caption，而不是 `.thumbnails .title/.tags` 大字号。clone 已切到 `captionMode="title-desc-links"`，`visual:measure` desktop 下 title/tags font-size 和 line-height delta 为 0。
- 2026-06-10 更新：`bodycopy` / main content 行高已改回原站 `16px`；codes 5 断点 `bodycopy.lineHeight` delta 均为 0。
- 2026-06-10 更新：`visual:measure` 已新增 `mainAnchor`。旧 `main.y` 是右栏列盒位置，不再单独作为视觉残差依据；桌面 codes/pixel 的 `< HOME` anchor delta 约 `-4.51px`，gallery 顶部 `thumbnails.y` delta 约 `-10.96px`。
- 2026-06-10 5 断点复核：codes `mainAnchor.y` delta 约 mobile `-33.32px`、tablet `-25.54px`、laptop `-18.56px`、desktop `-4.51px`、wide `-27.44px`。
- 2026-06-10 更新：wide 断点 root font-size 上限已调到原站实测 `15.55px`；desktop 仍为 `12.96px`，wide `html.fontSize` / `bodycopy.fontSize` delta 均为 0，wide `mainAnchor.y` 从约 `-27.44px` 收到 `-8.24px`。
- 2026-06-10 更新：codes/pixel 已标记为 `page-gallery-standard`，并按 5 断点校准右栏顶部与 `< HOME` 到 gallery 的间距；标准 gallery 的 `mainAnchor.y` / `thumbnails.y` delta 在 5 断点均约为 0。
- 2026-06-10 更新：gallery grid item 增加 `min-width: 0`，pixel mobile 横向溢出已消除（375px viewport 下 `scrollWidth` 从约 626px 回到 375px），首屏方形缩略图尺寸也回到与 original 接近。
- 2026-06-10 更新：pixel 第二段 natural/flush gallery 已按原站恢复 3 列与左右内缩；natural thumbnails 退出 `content-visibility:auto` 占位高度，避免第二段 grid 行高被 320px placeholder 压缩。`visual:measure` 已新增 `g2` 输出，desktop/wide 第二段图片宽高 delta 已收至约 `0.1px`。
- 2026-06-10 更新：tight dense gallery 在 mobile/tablet 重新保持 dense modifier 优先级，`game/gif/illustrator` 移动和平板断点恢复 3 列；`graphic` 继续保持显式 2 列。
- 2026-06-10 更新：graphic 恢复原站首张 `graphic-06.jpg` 全栏图，Gallery 支持 `span: "all"` 和 `hideCaption`；`visual:measure` 的默认 pick 改为按 y 再按 x，列数改为优先报告第一个非跨栏图片行，因此 graphic 会显示 `cols=2/first=1`。
- 2026-06-10 更新：tight gallery 顶部按 5 断点校准，`game/illustrator` 的 `mainAnchor.y` 与 `thumbnails.y` delta 已约为 0，`gif` 保留原站 `< HOME` 高 16px 的特例；`.thumbnails--columns-2` 提升 specificity，避免 `graphic` 在 1024 laptop 被通用 3 列规则覆盖。
- 2026-06-10 更新：Cargo grid 横向 gutter / column padding 已恢复为 row 左右 `-0.75rem` + col 左右 `0.75rem` 的模型；desktop/wide 的 main width 残差从约 17-20px 收到约 4-5px，graphic desktop/wide 图片宽度残差约 3px，未引入横向滚动。
- 2026-06-10 更新：home wide avatar 按原站宽视口等效尺寸校准为 `6.25rem`，wide 下头像宽高 delta 从 `-10.8px` 收到 `0px`，首个内容 y delta 从 `-19.11px` 收到 `+0.01px`；desktop 头像保持约 `-0.34px` 小残差。
- 2026-06-10 更新：graphic 在 `page-graphic page-gallery-tight` 范围内收回小断点横向扩展；mobile/tablet/laptop 首张全栏图宽度 delta 从 `+17.7/+25.86/+12.78px` 收到 `+0.04/+0.03/-1.59px`，列数 delta 归 0；desktop/wide 后续已收至归零级别。
- 2026-06-10 更新：Gallery 支持 `thumbSrc`，graphic 两张超长图新增 `public/images/graphics/thumbs/graphic-04.jpg` 与 `graphic-05.jpg` 轻量缩略图；前 3 张图改为 eager，`media.ts` 在图片已有自然尺寸时提前移除透明态，避免 graphic 线上长图下载慢时长时间显示灰色占位。
- 2026-06-10 更新：gif hero 在 `<=768px` 改为 `calc(100% - 0.25rem)`，mobile/tablet hero width delta 从 `-69.86/-151.95px` 收到 `+0.95/+1.36px`；5 断点 hero/natural media 宽高均在约 `5px` 内。
- 2026-06-10 更新：GIF gallery 13 个条目接入 `thumbSrc`，新增 `public/images/gifs/thumbs/*.webp` 静态 poster（约 `130KB` 总量），仅在 GIF 页面启用 `eagerThumbs`，并把 GIF 缩略图未加载占位兜底为方形黑底；点击仍打开原 GIF，本地 mobile/tablet 3 秒内 13/13 缩略图完成加载，截图无灰/空占位。
- 2026-06-10 更新：`visual:measure` 的 `mainColumn` 选择规则改为取右栏最右候选，避免在原站 Cargo DOM 中误选其它可见 `[grid-col="8"]`；codes/graphic desktop/wide 的 `main.x` delta 归 0，`main.width` delta 收到 `+0.01/+0.02px`，原先约 `4-7px` 的 main width 残差判定为测量噪音。
- 2026-06-10 更新：illustrator 在 `<=1024px` 使用 scoped `thumbnails-container` 宽度和 dense padding；mobile/tablet/laptop 首组 `thumbImage` width delta 从 `+5.9/+8.62/+4.28px` 收到 `+0.01/+0.01/+0.03px`，列数保持 3。
- 2026-06-10 更新：graphic desktop/wide 在 page-scoped 宽度下收回首张全栏图尺寸；`thumbImage` width delta 从 `+2.88/+3.43px` 收到 `+0.02/0px`，height delta 从 `+2.5/+2.98px` 收到 `0/0px`，列数仍为 2。
- 2026-06-10 更新：illustrator desktop/wide 在 page-scoped 宽度下收回首组与第二组尺寸；首组 `thumbImage` width delta 从 `+0.97/+1.17px` 收到 `0/0px`，height delta 从 `+1.7/+2.08px` 收到 `0/0px`，两组列数仍为 3。
- 残差：photo/gif 的资源加载与 photo 缺图仍需按节点继续复核。

### Pixel / Illustrations / GIFs / Graphics / Photos
- 原站：1:1 缩略图 grid
- Clone：同结构

### Poem / SNS / Links / Contact
- 原站：纯文字单栏
- Clone：同结构

> 残差由 #18 截图明确归档，每张 PNG 都在 `diff-screenshots/`，下次启动直接 `Read` 比对即可。

---

## 5. 已知限制

1. **Cargo runtime JS 在 networkidle 之后还会修改 DOM**：缩略图可能此时仍 `display:none`，需要再等 1.5-3s。脚本里 `original` 模式比 `clone` 多 wait 1500ms。如果还不够，可以在脚本里把 wait 拉到 3000ms 重跑。
2. **getComputedStyle 拿不到 thumbnails 真实列数**：因为图未加载，宽度算不准。要调研 `[thumbnails-cols]` 属性（Cargo runtime 注入），可以先 `await page.waitForSelector('.thumb_image:visible', { timeout: 8000 })` 再读。
3. **Mobile UA + 1440 viewport** 这种异常组合没测；Cargo 是用 viewport 而不是 UA 决定 mobile，所以问题不大。
