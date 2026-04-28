# 当前阶段问题清单（OPEN_ISSUES）

> 本文档记录项目**当前所有未解决的问题**，每个问题给出"症状 / 假设 / 下一步"。
>
> **持久化**：本文档已 commit，断会话不丢。
>
> **状态字段**：🔴 必须解决 / 🟡 后续解决 / 🟢 已知风险但暂不处理。

---

## 🔴 1. 视觉复刻不到位（核心阻塞）

**症状**：当前 `https://blog.onovich.com/` 的样式与 `https://onovich.com/` 仍有可见残差：
- v2.2.0 已修：左 4/8 grid、汉堡菜单、root font-size 12.96px、avatar+hr+bio
- 残差：clone 字号略大、行高略松、列上下对齐略偏
- 缩略图列数还没按断点对齐（原站列数由 Cargo runtime JS 注入 `[thumbnails-cols]` 属性）

**已归档证据**：`diff-screenshots/{slug}.{vp}.{original|clone}.png`（gitignored）— 共 120 张

**下一步**（任务 #18 后续 / P0）：
1. 用 Playwright `getComputedStyle()` 对照原站 5 断点的关键元素（h1/h2/bodycopy/.thumb_image/.title/.tags），抽出精确像素值
2. 调 `global.css` 直到 5 断点截图差异 < 5px
3. 缩略图列数：实测原站每个断点显示几列后写进 `@media`

---

## 🔴 2. 工作区有错误方向的未提交改动

**症状**：早期会话留下来过的 working tree 改动已在 v2.2.0 commit 中清理。**当前没有遗留**。

**下一步**：无需操作。如果再次出现"凭印象写"的中间产物，记得**新写入会覆盖**，不需要主动 revert。

---

## 🟡 3. photos 02-07 缺图片

**症状**：`site/public/images/photos/photo-02.jpg` 到 `photo-07.jpg` 不存在；`photos.json` 已引用，线上会 404。

**已知**：
- 旧仓库（`_old-site/`）也没这 6 张
- 需要从原站 `https://onovich.com/photo` 抓真实 freight.cargo.site URL 后下载

**临时处理**：用户已说"非关键路径，后期手动补"。

**下一步**：等用户主动要求时，按 `docs/WORKFLOW.md` E 节方法迁移。

---

## 🟡 4. Electron admin 未端到端验证

**症状**：`admin/main.js` `preload.js` `renderer/` 代码已写但从未走过完整流程。

**未验证项**：
- 启动后能否正确列出所有 section
- JSON 编辑保存
- 拖拽导入图片到 `site/public/images/<section>/`
- 启动本地 astro dev 预览
- 一键 git push 触发 GitHub Actions

**下一步**（任务 #15）：等 #16 视觉复刻通过后再做。否则 admin 跑出来发布的也是错样式。

---

## 🟢 5. WebFetch 工具不可靠

**症状**：在本项目里，`WebFetch` 经常被 Cargo 屏蔽（503）或返回 LLM 摘要而非原始 HTML，且会幻觉。

**应对**：已切换为 `Bash + curl + 浏览器 UA`。已写进 `docs/LESSONS.md` 第 2 条 + `docs/WORKFLOW.md` A 节。

**下一步**：保持现状，避免再用 WebFetch 抓原站。

---

## 🟢 6. 域名归属由仓库内 CNAME 决定

**当前**：`site/public/CNAME = blog.onovich.com`，`astro.config.mjs site = https://blog.onovich.com`。

**风险**：如果误改成 `onovich.com`，Pages 会立即抢走主域名，覆盖 Cargo 站。

**应对**：已写进 `docs/LESSONS.md` 第 8 条 + 全局 memory。

---

## 🟢 7. CI Node 版本绑定

**当前**：workflow 里 `node-version: '22'`，与 `package.json engines.node: '>=22.12.0'` 匹配。

**风险**：未来升级 Astro 可能要 Node 24，两边都要同步改。

**应对**：已写进 `docs/LESSONS.md` 第 6 条。

---

## 🟢 8. 项目内有两个 .git（_old-site 子目录）

**当前**：`_old-site/.git` 是旧仓库克隆带来的，**不影响**当前项目的 git 操作。`_old-site/` 已在主项目 `.gitignore`。

**应对**：保持现状，不要把 `_old-site` 当成参考。

---

## 索引：相关文档

- `HANDOFF.md` — 接手指南
- `docs/CSS_SPEC.md` — 原站样式规范（事实归档）
- `docs/LESSONS.md` — 经验教训
- `docs/WORKFLOW.md` — 工作流（抓站 / 部署 / 截图对照）
- `_reference-site/` — 原站 HTML+CSS 归档
