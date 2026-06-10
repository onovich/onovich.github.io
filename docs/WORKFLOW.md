# 工作流（WORKFLOW）

> 项目里反复要做的几件事，每件给一个"配方"。新 agent 接手按这个执行就行。

---

## A. 抓原站（onovich.com）

**目标**：拿到原站某页面的真实 HTML / CSS。

```bash
# 1. 抓页面 HTML（带浏览器 UA，避开 Cargo 的 503）
curl -sL \
  -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
  --max-time 30 \
  "https://onovich.com/codes" -o _reference-site/codes.html

# 2. 从 HTML 里找 stylesheet 链接，下载
grep -oE 'href="[^"]*stylesheet[^"]*"' _reference-site/codes.html
curl -sL -A "Mozilla/5.0 ..." "https://onovich.com/stylesheet?c=..." -o _reference-site/stylesheet.css

# 3. 想抓所有页面，循环：
for page in index codes game pixel illustrator gif graphic photo poem sns links contact; do
  url="https://onovich.com/${page/index/}"
  curl -sL -A "Mozilla/5.0 ..." "$url" -o "_reference-site/${page}.html"
done
```

**已归档**：`_reference-site/` 已包含全部 11 个页面 + stylesheet（2026-04-29）。重新抓只在原站改版后做。

**禁忌**：
- ❌ 不用 `WebFetch`（被 503 / 返回 LLM 摘要）
- ❌ 不用 `web.archive.org`（用户已否决）

---

## B. 真实渲染对照（推荐用 Playwright）

**目标**：原站和我们的本地 dev 站在同一个屏幕宽度下截图对比，找像素差异。

**最小可行方案**：
```bash
# 1. 启动本地 dev
cd site && npm run dev   # → http://localhost:4321

# 2. 安装 Playwright（一次性）
npm i -D playwright
npx playwright install chromium

# 3. 写个截图脚本（保存为 site/scripts/diff.mjs）
node site/scripts/diff.mjs
```

`site/scripts/diff.mjs` 模板：
```js
import { chromium } from 'playwright';
import path from 'path';

const PAGES = ['', '/codes', '/game', '/pixel'];
const SIZES = [
  { name: 'mobile',  width: 375,  height: 800 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const browser = await chromium.launch();
for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: size });
  const page = await ctx.newPage();
  for (const route of PAGES) {
    const slug = route.replace('/', '') || 'home';
    // 原站
    await page.goto(`https://onovich.com${route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `diff/${slug}.${size.name}.original.png`, fullPage: true });
    // 本地新站
    await page.goto(`http://localhost:4321${route}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `diff/${slug}.${size.name}.new.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log('截图完成，看 diff/ 目录');
```

**对比方式**：
- 用图片比对工具（如 `pixelmatch` npm 包）算 diff
- 或人眼并排看 `diff/codes.desktop.original.png` vs `diff/codes.desktop.new.png`

> 这是回答用户那条「服务端渲染拿不到真实效果」担忧的标准答案：**Playwright 启真浏览器，跑完 JS 之后再截图**，所以不管 Cargo 是不是服务端塞了 inline style、不管布局靠多少 JS 计算，截图都是用户最终看到的真实视觉。

---

## C. 部署验证

当前 GitHub Pages workflow：
- build runtime 使用 `node-version: '22'`，匹配 `site/package.json engines.node >=22.12.0`
- GitHub 官方 actions 使用 Node 24 版本：checkout v6、setup-node v6、upload-pages-artifact v5、deploy-pages v5

```bash
# 1. 看最近 5 次 Actions（不需要 gh CLI）
curl -s "https://api.github.com/repos/onovich/onovich.github.io/actions/runs?per_page=5" \
  | python -c "import sys,json; \
[print(r['conclusion'], r['head_sha'][:7], r['html_url']) for r in json.load(sys.stdin)['workflow_runs']]"

# 2. 失败的话，查 jobs 找哪个 step 红了
curl -s "https://api.github.com/repos/onovich/onovich.github.io/actions/runs/<RUN_ID>/jobs" \
  | python -m json.tool | grep -A2 '"conclusion"'

# 3. 验证线上是不是新版（看版本号）
curl -sL -A "Mozilla/5.0 ..." "https://blog.onovich.com/" | grep "build-version"

# 4. 本地构建预演
cd site && npm run build && npx http-server dist -p 8080
# 访问 http://localhost:8080
```

**版本号约定**：每次重大改版，把 `BaseLayout.astro` 里 `v2.0.x-astro · YYYY-MM-DD` 这个字符串递增一下，方便从源码层判断"线上跑的是不是这一版"。

---

## D. Git 推送

远端：`git@github.com:onovich/onovich.github.io.git`（User Pages 仓库）

```bash
# 标准流程
git status
git add <具体文件>          # 不用 git add . 防止误提交 _old-site
git commit -m "msg"
git push                     # 不要 force！历史已经被覆盖一次了，别再覆盖
```

**注意**：
- `_old-site/` 已 gitignore，不会被加入提交
- `_reference-site/` 是否提交要根据策略决定（建议提交，方便后人对照原站；体积可控，1MB 内）
- 若改 workflow 后要触发部署，可改个无关字符 push 一下，或在 Actions 页面手动 `workflow_dispatch`

---

## E. 图片迁移（从 Cargo CDN）

```bash
# 1. 从归档的 HTML 里找出 freight.cargo.site 的图片 URL
grep -oE 'https://freight\.cargo\.site/[^"]+\.(png|jpg|jpeg|gif)' _reference-site/photo.html | sort -u

# 2. 下载（带 Referer，否则可能 403）
curl -sL \
  -A "Mozilla/5.0 ..." \
  -H "Referer: https://onovich.com/" \
  "https://freight.cargo.site/i/<hash>/<filename>" \
  -o site/public/images/photo-albums/photo/photo-02.jpg
```

---

## F. 本地资源门禁

```bash
cd site
npm run assets:check
```

用途：
- 读取 `src/content/*.json` 和 `public/images`
- 缺失 `/images/` 本地引用会失败
- 超过 `1MB` 且没有 `thumbSrc` 的缩略图候选会以警告列出

当前基线：234 个真实内容图片引用 0 缺失，且无超过 `1MB` 仍缺 `thumbSrc` 的候选；旧 `photos.json` / `/images/photos/*` 链路已移除。

---

## G. 任务管理约定

- 用 `TaskList` / `TaskCreate` / `TaskUpdate` 维护当前 todo
- 跨会话状态在 `HANDOFF.md`（人工维护，覆盖 7 天 memory 限制）
- 一次性临时步骤用任务，长期约定写到 `LESSONS.md` / `WORKFLOW.md`
- 完成任务**立刻** `TaskUpdate status=completed`，不要积压

---

## H. 常见反模式（不要做）

| 反模式 | 替代 |
|---|---|
| 用 WebFetch 抓原站 | curl + 浏览器 UA |
| 用 _old-site/styles.css 当样式参考 | _reference-site/stylesheet.css |
| 复刻"差不多就行" | 像素级对照（Playwright 截图） |
| sed 批量改 12 个文件 | Edit 工具逐个改 |
| 力推（force push） | 正常 push |
| 通过 web.archive.org 看原站 | 直接抓 onovich.com |
| `git add .` | `git add <具体文件>` |
| 改 CNAME 不改 astro.config.mjs site 字段 | 两个一起改 |

---

## I. Pre-push 视觉验证门禁（必须）

**任何**修改 BaseLayout、global.css、page 结构后，push 之前必须执行：

```txt
1. cd site && npm run build
2. npm run preview -- --host 127.0.0.1 --port 4350
3. npm run visual:check -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
4. npm run visual:measure -- --clone=http://localhost:4350 --pages=home,codes,pixel --viewports=desktop
5. npm run visual:image-audit -- --clone=http://localhost:4350
6. npm run visual:diff -- --clone=http://localhost:4350 --pages=home,codes,pixel
7. Read 6 张关键截图（home/codes/pixel × desktop/mobile original/clone）
8. 写出可见差异清单（量化或定性）
9. 不通过 → 继续改 → 回到 1
10. 通过 → commit + push → 等 Actions → curl 线上验 build-version
```

长 gallery 截图如果下半段出现占位，先跑无截图审计：

```txt
npm run visual:image-audit -- --clone=http://localhost:4350 --pages=galleries,photo-details --viewports=desktop --imageTimeout=25000 --scrollPasses=3
```

`visual:image-audit` 复用 `visual:diff` 的 lazy image 预热和图片等待，但不保存 PNG；输出全是 `OK images=loaded/total` 时，说明优先问题不是资源加载。页面组别可用 `galleries`、`photo-details`、`photo-albums`。需要排除截图预热不足时，再定向截图：

```txt
npm run visual:diff -- --clone=http://localhost:4350 --targets=clone --pages=illustrator --imageTimeout=25000 --scrollPasses=3
```

说明：视觉复刻判断仍用默认 `original,clone`。只查本地 clone 的资源加载、占位或页面回归时，先用 `visual:image-audit`；必须看截图时再用 `--targets=clone`，可以少截一半图。

新增视觉脚本时不要重复写 `original/clone` target 配置；统一从 `site/scripts/visual-config.mjs` 调 `selectTargets()`，这样 `--original`、`--clone`、`--targets` 的行为只在一处维护。

**绝对禁止的事**：

- build 通过就 commit + push
- 没读截图就声称样式 OK
- 没跑 `visual:check` 就声称内页布局没回归
- 用 WebFetch 检测视觉
- 用 _old-site 当样式参考
- web.archive.org 替代原站

任何样式变更不经过截图对照就 push，等同于回到 v2.0 初期"凭印象写"模式。这是 LESSONS.md 里反复强调的禁忌。
