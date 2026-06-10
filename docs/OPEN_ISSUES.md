# 当前阶段问题清单（OPEN_ISSUES）

> 本文档记录项目**当前所有未解决的问题**，每个问题给出"症状 / 假设 / 下一步"。
>
> **持久化**：本文档已 commit，断会话不丢。
>
> **状态字段**：🔴 必须解决 / 🟡 后续解决 / 🟢 已知风险但暂不处理。

---

## 当前 TODO 摘要（2026-06-10）

1. P0：视觉变更必须跑 `visual:check` + `visual:diff`，后续不能只靠 build 通过。
2. P1：标准 gallery（codes/pixel）顶部、pixel mobile 横向溢出、pixel 第二段 natural 缩略图尺寸/高度、tight gallery 顶部与 game/gif/illustrator 列数、illustrator 5 断点缩略图尺寸、graphic 首张全栏图与长图顺序、graphic 5 断点图片宽度、Cargo grid 横向 gutter / main width、home wide avatar、gif hero/natural media 尺寸已收敛；下一步继续复核剩余 gallery 资源加载。
3. P1：继续实测并复核 gallery 资源加载；`assets:check` 已确认 234 个真实内容图片引用 0 缺失，且没有超过 `1MB` 仍缺 `thumbSrc` 的候选；`visual:guard` 默认检查通过，gallery + photo detail desktop clone 为 `217/217` 图片加载，mobile+desktop 扩展审计为 `434/434`。
4. P2：旧 `photos.json` / `/images/photos/*` 内容链路已移除；photo 运行时以 `photoAlbums.json` 和 `/images/photo-albums/*` 为唯一来源；illustrator 3 个大候选已补轻量 WebP poster。

---

## ✅ 1. 内页左侧导航已完成线上/截图回归确认

**症状**：早期线上 `blog.onovich.com/codes` 等子页面进入后，左侧 Onovich 分类导航消失；原站 `onovich.com/codes` 会保留左侧导航列，并在右侧显示 `< HOME` + 内容。

**已确认事实**（Playwright 实测 `onovich.com/codes` 1440px）：
- H1 Onovich at x≈112 y≈58
- CODES active at x≈112 y≈125
- GAMES / PIXEL / ... / MESSAGE 都在左列
- 右侧内容区从 x≈514 开始

**回归证据（2026-06-10）**：
- `npm run visual:diff -- --clone=http://127.0.0.1:4350 --pages=home,codes,pixel`：30/30 screenshots saved。
- 已人工查看 `diff-screenshots/codes.desktop.clone.png`：左侧 Onovich 分类导航存在，`< HOME` 在右侧内容区。
- `npm run visual:check -- --clone=http://127.0.0.1:4350 --pages=home,codes,pixel --viewports=desktop --targets=clone`：19 assertions passed。
- `npm run visual:check -- --pages=codes --viewports=desktop --targets=original,clone`：线上 `blog.onovich.com/codes` 与原站 `onovich.com/codes` 均通过左导航位置检查。

**当前状态**：本项已解决；后续任何布局/样式改动继续跑视觉门禁，避免回归。

---

## 🔴 2. 视觉复刻仍有尺寸/缩放残差

**症状**：当前 `https://blog.onovich.com/` 的样式与 `https://onovich.com/` 仍有可见残差：
- v2.2.0 已修：左 4/8 grid、汉堡菜单、desktop root font-size 12.96px、avatar+hr+bio
- 已修：codes gallery caption 从大字号 structured caption 改为 Cargo 风格 12px HTML caption；`visual:measure` 桌面 title/tags font-size 与 line-height delta 均为 0。
- 已修：bodycopy / main content 行高改回原站绝对 `16px`；codes 5 断点 `bodycopy.lineHeight` delta 均为 0。
- 已修：wide 断点 root font-size 上限从 `12.96px` 调到原站实测 `15.55px`；desktop 仍为 `12.96px`，wide `html.fontSize` / `bodycopy.fontSize` delta 均为 0。
- 已澄清：旧 `main.y` 测到的是右栏列盒，不能代表首个可见内容；`visual:measure` 已新增 `mainAnchor`。桌面 home 首个内容 delta 约 `-0.62px`，codes/pixel `< HOME` delta 约 `-4.51px`，gallery 顶部 `thumbnails.y` delta 约 `-10.96px`。
- 5 断点复核：wide root 修复前 codes 的 `mainAnchor.y` delta 约 mobile `-33.32px`、tablet `-25.54px`、laptop `-18.56px`、desktop `-4.51px`、wide `-27.44px`；wide root 修复后 wide `mainAnchor.y` 收到约 `-8.24px`。
- 已修：codes/pixel 走 `page-gallery-standard` 变体，按 5 断点校准右栏顶部和 `< HOME` 到 gallery 的间距；codes/pixel 的 `mainAnchor.y` 与 `thumbnails.y` delta 在 mobile/tablet/laptop/desktop/wide 均约为 0。
- 已修：gallery grid item 增加 `min-width: 0`，pixel mobile 横向溢出已消除（375px viewport 下 `scrollWidth` 从约 626px 回到 375px），首屏方形缩略图尺寸也回到与 original 接近。
- 已修：pixel 第二段 natural/flush gallery 已对齐 5 断点列数，desktop/wide 第二段图片宽高 delta 已收至约 `0.1px`；`visual:measure` 已新增 `g2` 输出，直接报告第二段列数、图片尺寸和段落高度。
- 已修：tight dense gallery 在 mobile/tablet 重新保持 dense modifier 优先级，`game/gif/illustrator` 在移动和平板断点恢复 3 列；`graphic` 保持显式 2 列。
- 已修：graphic 已恢复原站首张全栏图 `graphic-06.jpg`，通过 `span: "all"` 跨两列并隐藏 caption；后续两张长图顺序与原站一致。
- 已修：tight gallery 顶部按 5 断点校准，`game/illustrator` 的 `mainAnchor.y` 与 `thumbnails.y` delta 已约为 0；`gif` 保留原站比其它 tight 页高 16px 的特殊 `< HOME` 位置；`graphic` laptop 断点从误报/误排 3 列恢复为 2 列。
- 已修：关闭态 mobile site menu 增加 `visibility/pointer-events` 防护；thumbnail caption 增加安全换行，避免长中英混排标题撑出横向滚动或 full-page screenshot 黑边。
- 已修：Cargo grid 横向 gutter / column padding 已恢复为 row 左右 `-0.75rem` + col 左右 `0.75rem` 的模型；desktop/wide 的 main width 残差从约 17-20px 收到约 4-5px，graphic desktop/wide 图片宽度残差约 3px，未引入横向滚动。
- 已修：home wide avatar 按原站宽视口等效尺寸校准为 `6.25rem`，wide 下头像宽高 delta 从 `-10.8px` 收到 `0px`，首个内容 y delta 从 `-19.11px` 收到 `+0.01px`；desktop 头像保持约 `-0.34px` 小残差。
- 已修：graphic 在 `page-graphic page-gallery-tight` 范围内收回小断点横向扩展；mobile/tablet/laptop 首张全栏图宽度 delta 从 `+17.7/+25.86/+12.78px` 收到 `+0.04/+0.03/-1.59px`，列数 delta 归 0；desktop/wide 后续已收至归零级别。
- 已修：Gallery 支持 `thumbSrc`，graphic 两张超长图新增 `public/images/graphics/thumbs/graphic-04.jpg` 与 `graphic-05.jpg` 轻量缩略图；前 3 张图改为 eager，`media.ts` 在图片已有自然尺寸时提前移除透明态，避免 graphic 线上长图下载慢时长时间显示灰色占位。
- 已修：gif hero 在 `<=768px` 改为 `calc(100% - 0.25rem)`，mobile/tablet hero width delta 从 `-69.86/-151.95px` 收到 `+0.95/+1.36px`；5 断点 hero/natural media 宽高均在约 `5px` 内。
- 已修：GIF gallery 13 个条目接入 `thumbSrc`，新增 `public/images/gifs/thumbs/*.webp` 静态 poster（约 `130KB` 总量），仅在 GIF 页面启用 `eagerThumbs`，并把 GIF 缩略图未加载占位兜底为方形黑底；点击仍打开原 GIF，本地 mobile/tablet 3 秒内 13/13 缩略图完成加载，截图无灰/空占位。
- 已修：`visual:measure` 的 `mainColumn` 选择规则改为取右栏最右候选，避免在原站 Cargo DOM 中误选其它可见 `[grid-col="8"]`；codes/graphic desktop/wide 的 `main.x` delta 归 0，`main.width` delta 收到 `+0.01/+0.02px`，原先约 `4-7px` 的 main width 残差判定为测量噪音。
- 已修：illustrator 在 `<=1024px` 使用 scoped `thumbnails-container` 宽度和 dense padding；mobile/tablet/laptop 首组 `thumbImage` width delta 从 `+5.9/+8.62/+4.28px` 收到 `+0.01/+0.01/+0.03px`，列数保持 3。
- 已修：graphic desktop/wide 在 page-scoped 宽度下收回首张全栏图尺寸；`thumbImage` width delta 从 `+2.88/+3.43px` 收到 `+0.02/0px`，height delta 从 `+2.5/+2.98px` 收到 `0/0px`，列数仍为 2。
- 已修：illustrator desktop/wide 在 page-scoped 宽度下收回首组与第二组尺寸；首组 `thumbImage` width delta 从 `+0.97/+1.17px` 收到 `0/0px`，height delta 从 `+1.7/+2.08px` 收到 `0/0px`，两组列数仍为 3。
- 已修：`assets:check` 资源门禁已加入；旧 `photos.json` / `/images/photos/*` 链路已移除，photo 运行时来源统一为 `photoAlbums.json`；当前 234 个真实内容图片引用均存在。
- 已修：illustrator 3 个大候选 `128.gif`、`ref-18.png`、`ref-20.png` 已接入同尺寸比例 WebP poster（约 93KB、39KB、88KB），点击仍打开原 GIF/PNG；`assets:check` 当前 234 个真实内容图片引用 0 缺失，且无大缩略图 warning。
- 已修：`visual:diff` 增加 lazy image 预热、`images=loaded/total` 日志和 `--targets=clone`；`illustrator` desktop clone 在 `--imageTimeout=25000 --scrollPasses=3` 下为 `29/29`，下半段截图不再出现 false placeholder。
- 已修：新增 `visual:image-audit` 无截图加载审计；本地 clone 默认 gallery + photo detail desktop 审计为 `codes/game/pixel/illustrator/gif/graphic/photo/photo_1..photo_8` 共 `217/217` 图片加载，mobile+desktop 扩展审计为 `434/434`，避免为了判断加载状态反复生成截图。
- 已修：`visual:check` / `visual:measure` 现在支持 photo detail 的 `< PHOTO` 返回链接；`--pages=photo-details` 桌面 clone 布局门禁通过 `56` assertions。
- 已修：新增 `visual:guard` 无截图聚合门禁；`--clone=http://127.0.0.1:4351` 默认路径通过布局 `75` assertions + 图片 `217/217`，`--full --skipLayout` 通过 mobile+desktop 图片 `434/434`。
- 残差：gallery 资源加载仍需按节点继续复核；后续先用 `visual:image-audit` 区分截图预热不足和真实页面体验问题，有 WARN 时再定向跑 `visual:diff` 截图。
- 缩略图列数需要继续复核其它 gallery 页面；codes 当前 5 断点已对齐（mobile/tablet 2 列，laptop/desktop/wide 3 列），game/gif/illustrator 当前 5 断点已恢复 3 列，graphic 当前 5 断点已保持 2 列。

**已归档证据**：`diff-screenshots/{slug}.{vp}.{original|clone}.png`（gitignored）— 共 120 张
**自动门禁**：`site/scripts/visual-layout-check.mjs` 已加入，npm 脚本为 `npm run visual:check`；用于快速阻止左导航/返回链接消失这类 P0 回归。
**数值探针**：`site/scripts/visual-style-report.mjs` 已加入，npm 脚本为 `npm run visual:measure`；用于输出原站/clone 的 bbox、font-size、line-height、`mainAnchor`、gallery columns delta，并在多段 gallery 页面输出 `g2` 第二段列数、图片尺寸和段落高度。
**图片加载审计**：`site/scripts/visual-image-audit.mjs` 已加入，npm 脚本为 `npm run visual:image-audit`；用于无截图复核 clone/original 的 `images=loaded/total`，默认检查 gallery + photo detail desktop。
**聚合门禁**：`site/scripts/visual-guard.mjs` 已加入，npm 脚本为 `npm run visual:guard`；用于一条命令执行常规 layout + image audit。
**资源门禁**：`site/scripts/assets-check.mjs` 已加入，npm 脚本为 `npm run assets:check`；用于快速检查内容 JSON 的 `/images/` 引用是否缺失，并列出超过 `1MB` 且没有 `thumbSrc` 的大缩略图候选。
**Ops wrapper**：`.codex/project-ops-workflow.json` 与 `docs/codex-ops-workflow.md` 已初始化；常规验证可用 `Validate.cmd` 跑 build + assets，`Smoke.cmd` 跑 `visual:guard` + 本地预览 HTTP 检查，减少后续手写命令和 token 消耗。
**Measure 快扫**：`visual:measure` 已支持 `--imageTimeout`、`--scrollPasses`、`--scrollDelay`、`--navigationTimeout`、`--attempts`、`--loadImages=false`；原站较慢时先窄范围快扫，再用正常图片等待复核候选。

**下一步**（任务 #18 后续 / P0）：
1. 继续把 `npm run assets:check` 作为资源门禁；当前应为 234 个真实内容图片引用 0 缺失、0 大候选 warning。
2. 缩略图列数和资源加载：先用 `visual:guard --clone=http://localhost:4350` 复核常规布局和 gallery + photo detail；有 WARN 时再用 `visual:diff --targets=clone` 定向截图，之后决定是否需要页面级 eager / poster 调整。
3. 小幅图片尺寸残差：目前 gallery 尺寸类残差已收敛到数值门禁级别；继续以 `thumbImage.width/height` 为准防回归，不再把旧 `main.width` 假残差列为待修。
4. 下一轮视觉小节点候选：用正常图片等待复核 desktop 快扫里的 `codes/pixel` 缩略图宽度约 `-2px`、`photo` 顶部约 `-5.6px`；`gif/graphic` 顶部指标先按测量锚点噪声处理，不直接改 CSS。

---

## 🟢 3. 工作区曾经有的错误中间产物

**说明**：早期会话遗留过 working tree 改动，已在 v2.2.0 commit 中清理；后续不要把临时截图、旧站反例或本地设置误提交。

**下一步**：提交前继续只 stage 相关文件；不要提交 `.claude/settings.local.json`、`diff-screenshots/`、`_old-site/`。

---

## ✅ 4. 陈旧 photos.json 链路已移除

**历史症状**：`site/public/images/photos/photo-02.jpg` 到 `photo-07.jpg` 曾不存在；`photos.json` 已引用，容易造成“运行时 photo 缺图”的误判。

**当前状态**：
- 实际页面和 CMS 均使用 `photoAlbums.json`，不读取 `photos.json`。
- `site/public/images/photo-albums/*` 是 photo 运行时来源，当前体积约 4.6MB。
- 旧 `photos.json` 和 `/images/photos/*` 已从运行时仓库移除，减少约 31MB 陈旧资源。
- `npm run assets:check` 已确认 234 个真实内容图片引用 0 缺失。

**下一步**：photo 后续不再按缺图处理；资源优化优先用图片加载统计复核真实慢加载页面。

---

## 🟡 5. 网页 CMS 需要继续模块化和发布链路打磨

**当前**：项目不再维护双后台。旧 `admin/` Electron 管理端已移除，后续只沿站内 `/cms` 网页 CMS 演进。

**已完成**：
- `site/src/pages/cms.astro` 已退回页面壳层，样式拆到 `site/src/styles/cms.css`
- 浏览器主逻辑拆到 `site/src/cms/client.ts`
- 状态 helper 拆到 `site/src/cms/state.js`
- 预览渲染拆到 `site/src/cms/preview.js`
- 草稿校验拆到 `site/src/cms/draftValidation.js`
- 发布包构造拆到 `site/src/cms/publishPackage.js`
- 导入包解析/校验拆到 `site/src/cms/importPackage.js`，浏览器导入、Raw JSON 和 `cms:apply` 共用
- 发布应用计划拆到 `site/src/cms/applyPackagePlan.js`，`apply-cms-publish.mjs` 已退回 CLI IO
- 资产引用/路径分类拆到 `site/src/cms/assetReferences.js`，草稿校验会提前警告非 `/images/` 图片路径，`cms:apply` 会阻止远程/相对/缺失本地图片
- `npm run cms:publish:smoke` 会从构建后的 `/cms` 页面抽真实 seed、生成发布包、跑 apply dry-run
- `cms:apply` 正式写入前会备份覆盖目标到 `site/.cms-backups/`，并输出回滚提示；备份目录已 gitignored
- `npm run cms:restore -- .cms-backups/<timestamp>` 可从备份恢复旧文件，并删除发布时新建的目标文件
- 富文本工具栏命令拆到 `site/src/cms/richText.js`，统一处理命令白名单、链接 URL trim、拒绝 `javascript:`/`data:` 链接，并由 `cms:check` 覆盖
- 富文本选区保存/恢复已收进 `site/src/cms/richText.js`，toolbar 点击前会捕获编辑器选区，执行命令前恢复，避免点击按钮或弹出链接输入后丢失 selection
- 富文本粘贴清洗和允许标签白名单已收进 `site/src/cms/richText.js`；`draftValidation.js` 会阻止导入/Raw JSON 里的危险标签、事件处理器和危险链接
- 富文本链接 UI 已替代浏览器 `prompt()`：`/cms` 里点击“链接”会打开内嵌 URL 面板，`cms:smoke` 会真实选择正文文本并验证 `<a href="https://example.com/smoke">link</a>`
- 上传资源共享契约已拆到 `site/src/cms/uploadAssets.js`：统一生成 `/images/uploads/...` 路径、校验 MIME/宽高/data URL，并让发布包 manifest 携带 uploads 数量、目标目录和目标路径
- 资源上传 UI 已接入 `/cms` 条目编辑：选择图片后读取 MIME、宽高、size、data URL，写入 `state.assets`，并回填当前条目的 `/images/uploads/...` 路径；CMS 预览会用 data URL，发布路径仍保持静态站目标路径
- `cms:apply` 会校验上传资源、允许包内上传资源满足 `/images/uploads/...` 引用，并把 base64 内容落盘到 `public/images/uploads/...`；备份/恢复会覆盖这些新建上传文件
- `npm run cms:check` 已覆盖状态、预览、草稿校验、导出包、导入包、应用计划、资产路径和缺失资产阻止等纯逻辑；`npm run cms:smoke`、`npm run cms:apply:smoke`、`npm run cms:publish:smoke` 已可复用做网页 CMS/发布链路冒烟

**下一步（拆成小节点）**：
1. CMS 后续增强暂缓，优先回到视觉 P0/P1：字号/行高/列对齐和 gallery 断点列数。

---

## 🟢 6. WebFetch 工具不可靠

**症状**：在本项目里，`WebFetch` 经常被 Cargo 屏蔽（503）或返回 LLM 摘要而非原始 HTML，且会幻觉。

**应对**：已切换为 `Bash + curl + 浏览器 UA`。已写进 `docs/LESSONS.md` 第 2 条 + `docs/WORKFLOW.md` A 节。

**下一步**：保持现状，避免再用 WebFetch 抓原站。

---

## 🟢 7. 域名归属由仓库内 CNAME 决定

**当前**：`site/public/CNAME = blog.onovich.com`，`astro.config.mjs site = https://blog.onovich.com`。

**风险**：如果误改成 `onovich.com`，Pages 会立即抢走主域名，覆盖 Cargo 站。

**应对**：已写进 `docs/LESSONS.md` 第 8 条 + 全局 memory。

---

## 🟢 8. CI Node 版本绑定

**当前**：workflow 里 `node-version: '22'`，与 `package.json engines.node: '>=22.12.0'` 匹配；GitHub Actions 官方步骤已升级到 Node 24 版本（checkout v6、setup-node v6、upload-pages-artifact v5、deploy-pages v5）。

**风险**：未来升级 Astro 可能要 Node 24，两边都要同步改。

**应对**：已写进 `docs/LESSONS.md` 第 6 条；部署时继续观察 Actions annotation 是否清掉。

---

## 🟢 9. 项目内有两个 .git（_old-site 子目录）

**当前**：`_old-site/.git` 是旧仓库克隆带来的，**不影响**当前项目的 git 操作。`_old-site/` 已在主项目 `.gitignore`。

**应对**：保持现状，不要把 `_old-site` 当成参考。

---

## 索引：相关文档

- `HANDOFF_NEXT.md` — 最新交接说明（当前工作区草稿/P0/P1）
- `AGENT_HANDOFF.md` — 给任意接手 agent 的完整指南
- `HANDOFF.md` — 接手指南
- `docs/CSS_SPEC.md` — 原站样式规范（事实归档）
- `docs/RENDERING_REPORT.md` — Playwright 实测渲染数据 + 自适应规则
- `docs/LESSONS.md` — 经验教训
- `docs/WORKFLOW.md` — 工作流（抓站 / 部署 / 截图对照）
- `_reference-site/` — 原站 HTML+CSS 归档
