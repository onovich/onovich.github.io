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

`visual:measure` 是数值探针：它复用同一套页面/视口/加载等待逻辑，输出原站和 clone 的 bbox、font-size、line-height、gallery columns 和 delta。先跑 measure，再决定 CSS 改哪里。

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

> bodycopy 的 line-height **是绝对像素 16px** 而不是相对值。这是 Cargo 的怪癖，会导致中文文本行间距很挤。我们 clone 用了 `1.6` 倍数，看起来更舒服，差异可接受。

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
- 残差：bodycopy line-height、内页 main y、wide root font-size 仍需后续节点继续收。

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
