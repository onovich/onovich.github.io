# 当前阶段问题清单（OPEN_ISSUES）

> 本文档记录项目**当前所有未解决的问题**，每个问题给出"症状 / 假设 / 下一步"。
>
> **持久化**：本文档已 commit，断会话不丢。
>
> **状态字段**：🔴 必须解决 / 🟡 后续解决 / 🟢 已知风险但暂不处理。

---

## 🔴 1. 视觉复刻不到位（核心阻塞）

**症状**：当前 `https://blog.onovich.com/` 的样式与 `https://onovich.com/` 差距巨大：
- 字号、模块尺寸、自适应规则全错
- 当前实现是顶部 navbar + 汉堡 overlay，原站是右上角浮动汉堡 + 右侧滑入面板（详见 `docs/CSS_SPEC.md` 第 1 节）
- 我曾尝试改成 `_old-site/styles.css` 那种全站 sidebar，被否决（详见 `docs/LESSONS.md` 第 1 条）

**根因**：
- 早期没读 Cargo 真站源码就动手
- 中期把 `_old-site/`（用户失败旧复刻）当成了规范
- 始终缺少**真实浏览器渲染对照**环节

**下一步**（任务 #17 → #16）：
1. ✅ #17：从原站 CSS 推断规范 → 已产出 `docs/CSS_SPEC.md`
2. ⬜ #16：按 CSS_SPEC.md 重写 `BaseLayout.astro` + `global.css` + 各页面
3. ⬜ Playwright 截图对照，5 个断点（375/768/1024/1440/1920）误差 < 5px

---

## 🔴 2. 工作区有错误方向的未提交改动

**症状**：`git status` 显示这 4 个文件已修改但未提交：
- `site/src/layouts/BaseLayout.astro`
- `site/src/styles/global.css`
- `site/src/pages/index.astro`
- `site/src/pages/codes.astro`

这些改动是上一轮"误把 `_old-site` 当规范"留下的中间产物，**不能 commit**。

**下一步**：
- 重写 #16 时直接覆盖这些文件（按 `docs/CSS_SPEC.md` 写新的版本）
- 不需要主动 revert——新写入会覆盖旧 working tree 内容

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
