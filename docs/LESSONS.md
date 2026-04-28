# 经验教训（LESSONS）

> 已经踩过的坑，将来不要再踩。每条都带「事件 / 原因 / 教训」三段。

---

## 1. 不要把"参考"和"事实之源"搞混

**事件**：花了一整轮把 Astro 站做成顶部 navbar + 汉堡菜单，结果用户看了说"侧边栏不见了，自适应也不对"。我又顺手提议"那就按 `_old-site/styles.css` 重写"——被用户当场否决。

**原因**：我把 `_old-site/`（用户自己之前的失败复刻）当成了参考基准，但它本身就是失败案例。在失败案例上山寨，等于二次失败。

**教训**：
- 复刻任务，**事实之源永远是"原版正在线运行的那个站"**。
- 项目里的 `_old-site/` 仅供"反面教材"参考（看它哪里不对、避开同样错误）。
- 所有数值（字号、间距、断点）必须能追溯到原站 CSS / DOM。
- **不要**在没访问到原站的情况下，凭"印象"或"二手资料"决定布局。

---

## 2. WebFetch 工具的能力边界

**事件**：试图用 `WebFetch` 读 `https://onovich.com/` 拿原站 HTML，要么返回 503，要么返回 AI 摘要后的简化文本，根本拿不到原始结构。

**原因**：
- `WebFetch` 会被一些站点（Cargo 是一个）按 UA 屏蔽，返回 503。
- 即便拿到内容，`WebFetch` 也是**经过 LLM 处理的摘要**，不是原始 HTML。问 footer 内容会"幻觉"出不存在的内容（我亲身踩过：它说原站 footer 写"这是一个简短的个人信息页"——实际上原站根本没这段）。
- WebFetch 无法验证"页面里有没有版本号"这种**精确字符串**问题。

**教训**：
- **要原始 HTML 用 `Bash + curl + 浏览器 UA`**，不用 WebFetch。
- WebFetch 只适合让 LLM 帮你"理解一个页面在讲什么"，不适合做精确字符串/结构验证。
- 用 GitHub 公共 API 查 Actions 状态比 WebFetch 抓 GitHub 网页更可靠。

---

## 3. WebArchive 不是首选

**事件**：原站抓不到时，我提议去 web.archive.org 拿快照。被用户否决：「原站当下还活着，应该想办法访问到原始网站」。

**原因**：
- WebArchive 的快照可能是几个月前的，与当前线上版本不符。
- 抓不到原站，本质问题是工具/UA/代理选错了，不是原站不可达。
- 「退而求其次」是一种思维惰性，是 #1 教训的同源问题。

**教训**：原站只要还活着就一定要直抓。WebArchive 仅用于"原站已死/已大改"的考古场景。

---

## 4. 服务端渲染 / 真实视觉效果，不能只靠读 HTML

**事件**（用户提出）：拿到 HTML 之后，我以为读懂 stylesheet 就能知道布局；但很多视觉效果其实是 Cargo 服务端动态生成的（CSS 里包含变量但实际值由后端注入）、或者依赖运行时 JS 的尺寸计算（grid 列数响应窗口宽度）。

**原因**：
- Cargo 的 stylesheet.css 里有 `@media` 断点和 CSS 变量，但有些值（容器宽度、卡片大小）是 Cargo 后端按用户设置渲染进 inline style 的。
- 字体在 `@font-face` 里指向 Cargo 自己的 woff2，浏览器渲染才能看到真实字距、行高。
- 想得到「这个屏幕宽度下，gallery 是几列、卡片多大」必须**真的渲染一遍**。

**教训**：复刻 UI 必须有"真实渲染 + 像素对照"的环节，单看 HTML/CSS 是不够的。

**对应工作流**：见 `WORKFLOW.md` 的「真实渲染对照」一节，使用 headless 浏览器 / Playwright 截图 + 本地 dev server 做并排对比。

---

## 5. CSS 文件加载方式有 Vite 陷阱

**事件**：早期把 `@fontsource/nunito` 用 `@import` 写在 `global.css` 里，构建时 Vite 报警告找不到 woff2 路径。

**修法**：把字体 import 移到 Astro 组件 frontmatter（`BaseLayout.astro`）里，作为 ES module import：
```js
import '@fontsource/nunito/300.css';
```
而不是 CSS 里的 `@import`。

**教训**：Astro + Vite 体系下，依赖型资源走 ES import 而不是 CSS @import。

---

## 6. CI Node 版本必须匹配 package.json engines

**事件**：`site/package.json` 写 `engines.node: '>=22.12.0'`，workflow 里写 `node-version: '20'`，导致 GitHub Actions 连续 5 次 build 失败。

**教训**：每次改 engines 或 workflow 后，**两边必须同步**。可以加一个 CI 自检脚本对齐。

---

## 7. PowerShell sed 多行替换易出错

**事件**：用 sed 批量给 12 个 .astro 文件加 `activePage` 属性，被用户中断。原因是 sed 替换串里出现 `<` `/` `>` 等转义复杂的字符，写得长且不可读，一旦出错很难排查。

**教训**：批量改文件，**优先用 Edit 工具逐个改**，别图省事写一长串 sed。改的不是 12 个，是 100 个，再考虑脚本化。

---

## 8. CNAME 文件决定 Pages 域名归属

**事件**：`site/public/CNAME` 写的是 `onovich.com`，导致 Pages 抢了主域名，新站把 Cargo 站盖住了。

**修法**：改成 `blog.onovich.com`，主域名 DNS A 记录继续指 Cargo。

**教训**：Pages 自定义域名归属由仓库内的 CNAME 文件决定（不是 DNS 决定），改它要慎重。Astro 的 `astro.config.mjs` 的 `site` 字段也要同步改，否则 sitemap/canonical URL 会错。

---

## 9. 会话压缩后要补 context

**事件**：会话续接时，前文已被 summary 替代。我曾基于 summary 直接动手，但 summary 漏了一些细节（比如 footer 上的版本号最初是 `transparent` 不可见）。

**教训**：续接会话时，先看 `HANDOFF.md` + `MEMORY.md` + `TaskList`，再看代码当前状态（`git log`/`git status`），**不要只信 summary**。
