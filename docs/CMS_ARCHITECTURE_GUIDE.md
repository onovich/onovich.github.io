# Onovich CMS Architecture Guide

> Binding short checklist: `docs/ARCHITECTURE_REFACTOR_CHECKLIST.md`.
> This file is the detailed background; the checklist is the commit-time standard.

## 1. Architecture Goal

The CMS should preserve the current Onovich site's Cargo-like character while making content updates simple.
It must not become a generic page builder. The correct model is:

> template + section presets + constrained parameters + visual preview

Editors should usually choose from existing page/section patterns, edit content, reorder items, and publish. They should rarely touch advanced layout parameters, and they should never edit raw CSS for ordinary changes.

## 2. Non-Goals

- Do not build a fully freeform drag-and-drop website editor.
- Do not expose arbitrary CSS properties as normal CMS controls.
- Do not merge all galleries into one generic behavior.
- Do not treat images as only "assets"; in this site image order, ratio, caption mode, click behavior, and section grouping are part of the design.
- Do not make WYSIWYG the default for every page. Use WYSIWYG only for rich text pages such as poems.

## 3. Current Site Personality To Preserve

These are not incidental details. They must be represented as CMS data or locked presets:

- Cargo-style 90% container with 3.1rem content padding.
- 4/8 two-column page frame: left navigation, right page content.
- Desktop root font scaling with viewport width.
- Wide-screen-specific vertical offsets.
- Left navigation split into main section and social section.
- Active navigation opacity.
- Inner page `< HOME` link, with page-specific spacing.
- Home avatar, divider, and small bio text.
- Multiple gallery personalities:
  - roomy 3-column gallery with larger padding, captions, and 16:9 or square crops.
  - dense gallery with natural image ratios.
  - flush gallery with no image padding.
  - 2-column long-image graphic page.
  - segmented galleries where one page has multiple gallery sections.
  - GIF page with a standalone hero GIF plus captionless GIF grid.
  - photo index where each photo is an entry to a detail page.
  - photo detail pages with image-only columns.
- Contact page as a right-side drawer that pushes page content left.
- Mobile hamburger menu and full-width slide panel.

## 4. System Shape

Recommended modules:

```text
site/src/cms/
  schema.ts             # Type definitions and validation schema
  presets.ts            # Page, section, caption, interaction presets
  adapters/
    currentContent.ts   # Read/write current JSON/HTML content shape
  renderers/
    PageRenderer.astro
    SectionRenderer.astro
    GalleryRenderer.astro
    PhotoRenderer.astro
    RichTextRenderer.astro
  validation/
    validateSite.ts
    validateAssets.ts
    validateVisualRules.ts

site/src/content/
  site.json             # CMS-owned site config, navigation, pages, sections
  poem.html             # Rich text body if keeping raw HTML separate

site/public/images/
  ...                   # Curated original/migrated assets
  uploads/              # Future CMS uploaded assets
```

The first implementation can keep the existing Astro pages and JSON files. The target architecture should still move toward one CMS-owned `site.json` plus renderers driven by template IDs.

## 5. Data Model

### Site

```ts
interface SiteConfig {
  schemaVersion: number;
  title: string;
  description: string;
  baseUrl: string;
  framePresetId: "cargo-4-8";
  nav: NavConfig;
  pages: Page[];
  assets: Asset[];
}
```

### Navigation

```ts
interface NavConfig {
  title: string;              // "Onovich"
  groups: NavGroup[];
}

interface NavGroup {
  id: "main" | "social" | "hidden";
  label: string;
  items: NavItem[];
}

interface NavItem {
  pageId: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
}
```

Navigation must be generated from CMS data. Editors should not manually edit Astro nav arrays.

### Page

```ts
interface Page {
  id: string;
  title: string;
  path: string;
  templateId: PageTemplateId;
  navGroupId?: "main" | "social" | "hidden";
  activeNavPath?: string;
  frame: PageFrameParams;
  sections: Section[];
  seo?: SeoParams;
}
```

### Page Frame Params

```ts
interface PageFrameParams {
  showLeftNav: boolean;
  showBackLink: boolean;
  backHref: string;
  backLabel: string;
  topSpacingPreset: "home" | "inner" | "photo" | "tight" | "contact";
  wideTopAdjustment?: "default" | "homeWide" | "innerWide";
  contactDrawer?: boolean;
}
```

The CMS UI should expose this as friendly controls:

- Show in left nav
- Show `< HOME`
- Return target
- Page spacing: default / tight / photo / home / contact drawer

### Section

```ts
interface Section {
  id: string;
  type: SectionType;
  presetId: SectionPresetId;
  title?: string;
  params: SectionParams;
  items: ContentItem[];
}
```

### Section Params

```ts
interface SectionParams {
  columns?: 1 | 2 | 3;
  spacing?: "roomy" | "dense" | "flush";
  imageFit?: "natural" | "cover-square" | "cover-16-9" | "contain";
  captionMode?: "none" | "title-year" | "title-desc-links" | "html";
  clickMode?: "none" | "lightbox" | "internal-page" | "external-link";
  sectionGap?: "none" | "normal" | "large";
  widthMode?: "content" | "wide" | "custom";
  customWidthPercent?: number;
}
```

### Content Item

```ts
interface ContentItem {
  id: string;
  title?: string;
  year?: string;
  desc?: string;
  bodyHtml?: string;
  captionHtml?: string;
  src?: string;
  width?: number;
  height?: number;
  href?: string;
  links?: Array<{ label: string; url: string }>;
  targetPageId?: string;
  hidden?: boolean;
}
```

## 6. Preset Registry

Presets are the main protection layer. The CMS should store preset IDs instead of raw CSS.

### Page Templates

```ts
type PageTemplateId =
  | "home-profile"
  | "gallery-page"
  | "segmented-gallery-page"
  | "gif-page"
  | "photo-index"
  | "photo-detail"
  | "rich-text"
  | "links"
  | "contact-drawer";
```

### Section Presets

```ts
type SectionPresetId =
  | "home-profile"
  | "gallery-roomy-3"
  | "gallery-dense-3"
  | "gallery-flush-3"
  | "gallery-dense-2"
  | "gif-hero"
  | "photo-index-columns"
  | "photo-detail-columns"
  | "rich-text-poem"
  | "sns-icons"
  | "single-link";
```

Each preset should define:

- allowed item fields
- default params
- which params can be edited in simple mode
- which params are advanced-only
- renderer component
- validation rules

Example:

```ts
const sectionPresets = {
  "gallery-dense-3": {
    label: "Dense 3-column gallery",
    defaults: {
      columns: 3,
      spacing: "dense",
      imageFit: "natural",
      captionMode: "html",
      clickMode: "lightbox",
    },
    simpleControls: ["captionMode", "clickMode"],
    advancedControls: ["columns", "spacing", "imageFit", "sectionGap"],
  },
};
```

## 7. Current Page Mapping

Use this table as the baseline migration map.

| Page | Template | Sections | Important Params |
| --- | --- | --- | --- |
| Home | `home-profile` | profile section | avatar, divider, bio, home spacing |
| Codes | `gallery-page` | `gallery-roomy-3` | 3 columns, 16:9, captions with links |
| Games | `gallery-page` | `gallery-dense-3` | 3 columns, natural ratio, HTML captions, 15 items |
| Pixel Arts | `segmented-gallery-page` | `gallery-roomy-3` + `gallery-flush-3` | first section square captions, second section natural/flush |
| Illustrations | `segmented-gallery-page` | single-image section + dense galleries | natural ratios, three sections, 29 items |
| GIFs | `gif-page` | `gif-hero` + `gallery-dense-3` | hero GIF, no captions in GIF grid, 13 grid items |
| Graphic Designs | `gallery-page` | `gallery-dense-2` | 2 columns, natural long images, HTML captions, 5 items |
| Photos | `photo-index` | photo entry grid | 7 entries, each links to photo detail page |
| Photo detail pages | `photo-detail` | image columns | no captions, image-only, custom back target |
| Poems | `rich-text` | poem body | fixed small text, 14px/25px, preserved HTML line breaks |
| SNS | `links` | icon row | icon font, compact spacing |
| Links | `links` | single-link text | compact top offset |
| Contact | `contact-drawer` | form drawer | 400px right drawer, left content shifted |

## 8. CMS UI Guide

### Layout

Use a three-pane CMS:

```text
[Page Tree] [Section / Item Editor] [Live Preview]
```

Left pane:

- page list
- nav group
- visibility toggle
- drag sort

Middle pane:

- page basics
- section list
- selected section editor
- selected item editor

Right pane:

- live preview
- viewport switch: 1440 / 2048 / mobile
- warning list

### Simple Mode

Simple mode should be the default. It should expose:

- page title
- path
- nav label
- show in nav
- template
- section preset
- item list
- image
- caption
- click target
- reorder

### Advanced Mode

Advanced mode is for preserving special pages. It should expose:

- section spacing
- top spacing preset
- caption mode
- image fit
- columns
- section gap
- back link behavior
- wide-screen adjustment

Advanced mode should still use constrained dropdowns and numeric ranges, not free text CSS.

## 9. Interaction Model

Every image/item should have a click behavior:

```ts
type ClickMode =
  | "none"
  | "lightbox"
  | "internal-page"
  | "external-link";
```

Photo index entries should default to `internal-page`.
Gallery works should default to `lightbox`.
External project links should live in captions, not replace image click unless explicitly chosen.

## 10. Asset Model

Assets need metadata because layout depends on real dimensions.

```ts
interface Asset {
  id: string;
  src: string;
  originalUrl?: string;
  width: number;
  height: number;
  mimeType: string;
  alt?: string;
  source: "original-site" | "upload" | "manual";
}
```

CMS upload flow:

1. Upload image.
2. Read width/height automatically.
3. Suggest section fit based on aspect ratio.
4. Let editor choose click behavior.
5. Warn if image is too small for the chosen layout.

## 11. Rendering Pipeline

Recommended render flow:

```text
site.json
  -> schema validation
  -> page template resolver
  -> section preset resolver
  -> Astro renderer components
  -> static pages
  -> visual smoke screenshots
```

Renderers should not infer major layout from content shape. They should read preset IDs.

Bad:

```ts
if image is wide, use 16:9 gallery
```

Good:

```ts
section.presetId === "gallery-roomy-3"
```

## 12. Validation Rules

Before publish, validate:

- all paths are unique
- all nav links resolve
- every visible page has a nav label
- every image exists
- every image has width and height
- photo index target pages exist
- GIF page has exactly one hero section
- contact page has drawer preset
- rich text pages do not contain unsafe scripts
- page template allows the selected section presets
- no page uses fallback generic gallery unless intentionally marked

Visual smoke checks:

- 1440 desktop screenshot
- 2048 wide desktop screenshot
- mobile screenshot
- nav title position
- first content item position
- first content item dimensions
- nonblank image check

## 13. Publishing Flow

The CMS publish button should run:

1. Save draft to local storage or draft JSON.
2. Validate schema.
3. Validate assets.
4. Build preview.
5. Generate screenshots.
6. Show warnings.
7. Export or commit publish package.

For static hosting, "publish" can mean generating:

```text
site/src/content/site.json
site/public/images/uploads/...
```

Then the normal Astro build and GitHub Pages deploy pipeline can handle delivery.

## 14. WYSIWYG Scope

Only use WYSIWYG for:

- poem body
- optional custom rich text pages
- caption HTML preview/editing

Do not use WYSIWYG for:

- page frame layout
- navigation
- gallery columns
- image spacing
- photo album routing

Those should be structured fields.

## 15. Migration Strategy

Phase 1:

- Keep existing page files.
- Improve `/cms` to reflect real presets and current content.
- Export CMS data as JSON.

Phase 2:

- Add schema and preset registry.
- Add validation.
- Add preview viewport controls.

Phase 3:

- Move current JSON files into a unified `site.json`.
- Render pages from CMS data.
- Keep special routes such as photo detail pages generated from CMS data.

Phase 4:

- Add asset upload and publish package export.
- Add visual regression baselines.

## 16. Implementation Rules

- Before committing code, complete the self-check in `docs/ARCHITECTURE_REFACTOR_CHECKLIST.md`.
- All unique page behavior must be either a template, section preset, or constrained parameter.
- No ordinary CMS action should require editing CSS.
- Adding a new page must start from a template.
- Adding a new gallery section must start from a preset.
- Existing pages should round-trip through CMS without visual changes.
- Advanced settings should show a short explanation of what original page behavior they preserve.
- The CMS should prefer "duplicate this page/section" over "build from scratch" for this site.

## 17. Editor Copy

Use names that match actual site behavior:

- Roomy gallery
- Dense gallery
- Flush gallery
- Natural image ratio
- Square crop
- Hero GIF
- Photo entry
- Photo detail
- Cargo page spacing
- Tight page spacing
- Contact drawer

Avoid abstract labels such as "layout A" or "mode 2".
