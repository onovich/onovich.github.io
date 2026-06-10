# CSS 规范 — 从 onovich.com 反推

> 本文档是原站设计规范的事实归档。来源：`_reference-site/stylesheet.css`（750 行）+ 各页面 HTML 内嵌的 `<style class="local-css" data-target="...">` 块。
>
> **持久化**：本文档已 commit 到仓库，**不会因为上下文窗口关闭而丢失**。

---

## 1. 整体架构（关键澄清）

**原站不是传统侧边栏布局**，是 Cargo Pinned-Top + Site Menu 模式：

- **右上角浮动汉堡按钮** `#site_menu_button`：`position: fixed; top: 3rem; right: 3rem; font-size: 28px`
- 点开右侧滑入黑色面板 `#site_menu`：`background: rgba(20,20,20,0.95); max-width: 400px; min-width: 300px`
- **首页**有一个内容内的 12 列 grid，左 4 列放分类导航（用户感知中的"侧边栏"实际是这个）
- **内页**（codes/game/pixel/...）是单栏画廊网格，**没有**左侧栏，导航全靠右上汉堡

> 之前我把它当成 `_old-site` 那种全站 flex sidebar 是错的。也不是顶部水平 navbar。

---

## 2. 容器与留白

```css
.content_padding {
  padding: 3.1rem;        /* 上下左右四向相同 */
}
.container_width {
  width: 90%;             /* 容器占视口 90% */
  margin: 0 auto;
}
.thumbnails_width {
  width: 58%;             /* 画廊在容器内占 58% — 即视口 90%×58% */
}
[thumbnails-pad]   { padding: 0.55rem; }
[thumbnails-gutter]{ margin: -1.1rem; } /* = -2 × pad */
[responsive-layout] [thumbnails-pad]   { padding: 0.5rem; }
[responsive-layout] [thumbnails-gutter]{ margin: -1rem; }

/* Cargo grid-row / grid-col 横向模型（clone 等价实现） */
[grid-row][grid-gutter="3"] { margin-left: -0.75rem; margin-right: -0.75rem; }
[grid-col][grid-pad="1.5"]  { padding-left: 0.75rem; padding-right: 0.75rem; }
```

原站全局 `[grid-gutter="3"]` 是 `margin: -1.5rem`，但当前复刻只把它拆到横向模型里：row 左右各 `-0.75rem`，col 左右各 `0.75rem`；垂直距离仍由各页面的显式 top / gallery preset 校准。

---

## 3. 字体栈

**混合字体策略**，不同元素分别使用：

| 元素 | font-family |
|---|---|
| `bodycopy` / `h1` | `"PingFangSC-Light", sans-serif, Icons` |
| `h2` | `Nunito, Icons` |
| `small` | `Nunito, Icons` 或 `"PingFangSC-Light", sans-serif`（CSS 里两次声明，后写覆盖） |
| `.thumbnails .title` / `.tags` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif, "Sans Serif", Icons` |
| `.gallery_image_caption` | `"PingFangSC-Light", sans-serif, Icons` |
| `#site_menu` | 同 thumbnails 的系统字体栈 |

**Web 字体来源**：
```html
<link href="//fonts.googleapis.com/css?family=PingFangSC-Light:400|Nunito:300,400,700">
```
我们的 Astro 站继续用 `@fontsource/nunito` 自托管 Nunito，PingFangSC 走系统降级（macOS/iOS 自带，Windows 走 sans-serif fallback）。

---

## 4. 字号 / 行高 / 颜色

```css
bodycopy {
  font-size: 1.3rem;       /* 默认正文，约 21px (root 16px) */
  font-weight: 200;
  color: rgb(42, 42, 42);
  line-height: 16px;       /* 注意：原站这里写死像素，不是相对单位 */
}

h1 { font-size: 37px; line-height: 32px; font-weight: 400; color: rgb(30,30,30); letter-spacing: 0.04em; }
   /* 但 local-css 在首页覆盖为 1.6rem */
h2 { font-size: 1.9rem; line-height: 1.3; font-weight: 300; color: rgba(46,46,46,0.95); }
   /* local-css 在首页覆盖为 1.2rem; line-height: 1.9 */

small { font-size: 14px; line-height: 25px; font-weight: 400; color: rgba(18,18,18,0.75); }

/* 画廊 */
.thumbnails .title { font-size: 1.8rem; font-weight: normal; color: rgba(0,0,0,0.85); line-height: 1.1; }
.thumbnails .tags  { font-size: 1.6rem; font-weight: 400; color: rgba(0,0,0,0.35); line-height: 1.2; }
.thumbnails .has_title .tags { margin-top: 0; }       /* 有 title 时去掉 tags 顶部间距 */
.thumbnails .thumb_image { outline: 1px solid rgba(0,0,0,.12); outline-offset: -1px; }

/* Album 内 caption（跟 thumbnails caption 不一样） */
.gallery_image_caption { font-size: 12px; font-weight: 400; color: rgba(0,0,0,0.3); line-height: 1.3; }
```

**重要修正**：缩略图标题字号是 **1.8rem**（约 28-29px），不是 12px。我之前错误地参考 `_old-site` 用了 12px。

---

## 5. 汉堡菜单（Site Menu）

```css
#site_menu_button {
  position: fixed;
  top: 3rem; right: 3rem;
  font-size: 28px;        /* mobile: 34px */
  color: rgba(0,0,0,0.75);
  padding: 6px;
  line-height: 1;
}

#site_menu {
  background: rgba(20,20,20,0.95);
  font-family: -apple-system, ..., sans-serif, Icons;
  font-size: 20px;
  font-weight: 400;
  padding: 20px 30px 90px 30px;
  max-width: 400px;
  min-width: 300px;
  text-align: left;
}
body.mobile #site_menu { width: 100%; }   /* 移动端铺满 */

#site_menu .page-link a   { color: rgba(255,255,255,0.75); }
#site_menu .set-link > a  { color: rgba(255,255,255,0.75); font-weight: bold; }
#site_menu a:active       { opacity: 0.7; }
#site_menu a.active       { opacity: 0.4; }
#site_menu .break         { height: 28px; }
#site_menu .indent        { margin-left: 28px; }
#site_menu .close         { display: none; color: rgba(255,255,255,0.4); font-size: 45px; line-height: 0.85em; }
body.mobile #site_menu .close { display: block; font-size: 50px; line-height: 1em; }
```

---

## 6. 响应式

**两套机制并存**：

1. **Cargo JS 嗅探 UA 改 `body class`**：`body.mobile` / 默认（desktop）
   - 不是纯 @media width，而是 user-agent + viewport 判断
   - 真实触发点要 Playwright 测

2. **CSS @media**：原 stylesheet.css 里没有显式 width 断点（除了 `.mobile .page` 这种依赖 body class 的）
   - 列数变化由 Cargo JS 运行时计算 `thumbnails-cols` 属性

**Astro 复刻策略**：
- 用纯 CSS @media 替代 Cargo JS 嗅探：`@media (max-width: 768px)` 触发 mobile 样式
- 画廊用 `grid-template-columns: repeat(auto-fill, minmax(<col-width>, 1fr))` 做自然列数
- 真实列宽要通过 Playwright 截图原站确认

---

## 7. 颜色配色

| 变量名 | 值 | 用途 |
|---|---|---|
| 背景 | `#fff` | body / page |
| 主文字 | `rgba(46,46,46,0.95)` ~ `rgb(30,30,30)` | h1 / h2 |
| 正文 | `rgb(42,42,42)` font-weight 200 | bodycopy |
| 缩略图 title | `rgba(0,0,0,0.85)` | thumbnails title |
| 缩略图 desc/tags | `rgba(0,0,0,0.35)` | thumbnails tags |
| Album caption | `rgba(0,0,0,0.3)` | gallery_image_caption |
| 缩略图 outline | `rgba(0,0,0,0.12)` | 1px 描边 |
| Site menu 背景 | `rgba(20,20,20,0.95)` | 黑色面板 |
| Site menu 链接 | `rgba(255,255,255,0.75)` | 白文字 |
| 汉堡按钮 | `rgba(0,0,0,0.75)` | 右上图标 |

---

## 8. 已确认 vs 待真实渲染验证

### 高置信度（仅靠 CSS/HTML 即可定死）
- ✅ 全站留白 padding 3.1rem
- ✅ 容器宽 90%、画廊宽 58%
- ✅ 字号、字体栈、配色（如上表）
- ✅ 汉堡菜单导航（不是 sidebar、不是顶部 navbar）
- ✅ 缩略图 outline、caption 样式

### 必须 Playwright 真渲染原站才能定（#16 工作）
- ⚠️ 画廊在 1440 / 1920 / 1024 / 768 / 375 各自显示几列
- ⚠️ Cargo JS 何时把 body 加 `mobile` class（屏宽阈值）
- ⚠️ 首页 grid-col 双栏在 mobile 下是否堆叠、堆叠阈值
- ⚠️ Web 字体加载完成后的真实字距、字宽
- ⚠️ Cargo runtime JS 注入的 inline style（Playwright 跑完 JS 后用 `getComputedStyle` 读）

---

## 9. 复刻执行检查表（给 #16）

按本文档实现 Astro 站时，每改一个组件都要检查：

- [ ] 用 #5 的汉堡 + 黑色面板，**不要**做顶部水平 navbar
- [ ] 用 #5 的汉堡 + 黑色面板，**不要**做 `_old-site` 那种全站 flex sidebar
- [ ] 容器留白严格 3.1rem
- [ ] 缩略图标题 1.8rem（不是 12px！）
- [ ] 缩略图加 1px 0.12 alpha outline
- [ ] 字体栈按 #3 表混合（h1/bodycopy 用 PingFangSC-Light，h2 用 Nunito，缩略图用 system UI）
- [ ] mobile 用 @media + body class 双重触发
- [ ] 完成后用 Playwright 在 5 个断点截图与原站对比，差异 < 5px 才算通过
