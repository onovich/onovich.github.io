# Onovich social-preview ledger

## v2 — 2026-09-08

```yaml
repository:
  name: "OnovichSiteRedesign"
  url: "https://onovich.com"
  visibility: public
  default_branch: "main"
  local_checkout: "D:\\WebProjects\\OnovichSiteRedesign"

evidence:
  mode: runtime-tested
  inspected:
    - path_or_url: "site/src/content/portfolio.ts"
      proves: "The bilingual site describes Onovich's games, game systems, development tools, and art."
    - path_or_url: "site/src/layouts/BaseLayout.astro"
      proves: "English and Chinese currently share one language-level social image each."
    - path_or_url: "site/public/images/profile/avatar.jpg"
      proves: "The pixel-art frog astronaut is the established personal identity image."
    - path_or_url: "site/public/images/games/ninja-ming-cover.png"
      proves: "Ninja Ming is a featured playable project."
    - path_or_url: "site/public/images/covers/2dprogolf.png"
      proves: "2DProGolf is a featured game-systems project."
    - path_or_url: "site/public/images/social/onovich-en.png"
      proves: "The retained v1 baseline is a 1280×640 capture of the English home page."
    - path_or_url: "site/public/images/social/onovich-zh.png"
      proves: "The retained v1 baseline is a 1280×640 capture of the Chinese home page."
    - path_or_url: "http://127.0.0.1:4351/ and http://127.0.0.1:4351/zh/"
      proves: "The generated static preview serves the new metadata, manifest, icons, and language-specific social cards."
  claim_boundaries:
    - "The v2 cards describe the portfolio as games, systems, tools, and art; they do not claim a product count, performance result, or release status beyond the cited project art."
    - "The preview is a language-level site card, not a route-specific project advertisement."

content:
  promise: "A bilingual personal portfolio for games, game systems, development tools, and art."
  proof:
    - "The Onovich frog-astronaut avatar identifies the author."
    - "Ninja Ming key art represents a released/featured game project."
    - "2DProGolf cover represents systems and tool-oriented work."
  exclude:
    - "Unverified metrics, release counts, client logos, or performance claims."
    - "A generic technology collage, browser chrome, and unrelated art thumbnails."

source_route:
  artifacts:
    - path_or_url: "site/public/images/profile/avatar.jpg"
      role: brand
      identity_value: 3
      intrinsic_beauty: 3
      composition_readiness: 3
      noise_burden: 0
      information_deficit: 1
    - path_or_url: "site/public/images/games/ninja-ming-cover.png"
      role: complete-artifact
      identity_value: 3
      intrinsic_beauty: 3
      composition_readiness: 2
      noise_burden: 0
      information_deficit: 1
    - path_or_url: "site/public/images/covers/2dprogolf.png"
      role: complete-artifact
      identity_value: 3
      intrinsic_beauty: 3
      composition_readiness: 3
      noise_burden: 0
      information_deficit: 1
  intervention:
    keep:
      - "The white, rule-led site material and green accent."
      - "The avatar and the two site-featured project images."
    remove:
      - "Navigation chrome, duplicated page copy, and incidental page whitespace."
    repair:
      - "Give the share card a clear small-size hierarchy rather than a viewport screenshot."
      - "Give the project proof more than one third of the 2:1 canvas."
    supplement:
      - cue: "Language-specific portfolio promise and category rail"
        provenance: "site/src/content/portfolio.ts"
  interpretation_level: 2
  continuity_model: deliberate-collage
  aspect_fit:
    source_bounds: "Ninja Ming: 720×400; 2DProGolf: 1280×640; avatar: 400×400"
    target_bounds: "Ninja panel 570×226; 2DProGolf panel 570×188; avatar panel 174×174"
    method: "explicit-crop"
    unused_area: "None; each source fills a bounded panel with xMidYMid slice."
    verdict: pass
  fragment_ledger:
    - source_region: "Ninja Ming key art"
      semantic_unit: "Complete logo, hero character, and flame border"
      crop_boundary: "Bounded wide panel; no text or character is split."
      adjacency: "Separated from other sources by the site-rule gap."
      thumbnail_verdict: pass
    - source_region: "2DProGolf cover"
      semantic_unit: "Title and golf-course UI"
      crop_boundary: "Bounded wide panel; source uses its native 2:1 ratio."
      adjacency: "Separated from Ninja Ming by the site-rule gap."
      thumbnail_verdict: pass

composition:
  production_route: source-hybrid
  regions:
    - name: "identity and promise"
      bounds: "72,72 to 548,568"
      purpose: "Brand name, concise site promise, avatar, and category rail."
    - name: "featured game proof"
      bounds: "628,72 to 1208,332"
      purpose: "Recognizable Ninja Ming key art."
    - name: "featured systems proof"
      bounds: "628,356 to 1208,568"
      purpose: "Recognizable 2DProGolf interface art."
  line_ledger:
    - element: "Accent rule by the wordmark"
      role: "identity marker"
      endpoints_or_bounds: "72,99 to 110,99"
      evidence: "The current site uses a thin green active-navigation marker."
    - element: "Horizontal rules around the category rail and project panels"
      role: "boundary"
      endpoints_or_bounds: "Bound each copy or source-image region."
      evidence: "The current site uses thin gray rules to divide the portfolio frame."

version:
  baseline: "site/public/images/social/onovich-en.png and onovich-zh.png"
  candidate: "site/public/images/social/onovich-en-v2.png and onovich-zh-v2.png"
  preservation_contract:
    identity_anchors:
      - "Onovich name"
      - "Pixel-art frog astronaut avatar"
      - "White paper, black/gray text, thin rules, and green accent"
      - "Ninja Ming and 2DProGolf source art"
    protected_strengths:
      - "The baseline represents the actual portfolio homepage."
      - "The baseline preserves the sparse white visual language."
    allowed_changes:
      - "Replace viewport capture with a purpose-built social card."
      - "Increase thumbnail hierarchy and make language-specific copy explicit."
    forbidden_changes:
      - "Inventing product claims or generic developer-tool imagery."
      - "Replacing the portfolio's minimal white system with a preset dark/glass/gradient theme."
  comparison_scores:
    identity_fidelity: 5
    product_clarity: 5
    aesthetic_authorship: 4
    abstraction_fit: 5
    topology_fidelity: 5
    material_quality: 5
    composition: 4
    thumbnail_legibility: 5
    line_semantics: 5
    fragment_integrity: 5
  vetoes: []
  verdict: promote
  reason: "The v2 pair keeps the site’s sparse white/green material and avatar, while making the portfolio promise and two genuine featured-project artifacts legible at thumbnail size. No protected identity or fragment-integrity veto regressed."

output:
  svg: "site/public/images/social/onovich-en-v2.svg; site/public/images/social/onovich-zh-v2.svg"
  png: "site/public/images/social/onovich-en-v2.png (86,303 bytes); site/public/images/social/onovich-zh-v2.png (83,197 bytes)"
  review_sheet: "docs/social-preview-reviews/onovich-en-v2-review.png; docs/social-preview-reviews/onovich-zh-v2-review.png"
  width: 1280
  height: 640
  bytes: 169500
  mechanical_validation: pass
  full_size_review: pass
  thumbnail_light_review: pass
  thumbnail_dark_review: pass
  batch_contact_review: not-applicable

authorization:
  readme_modified: false
  github_uploaded: false
  upload_verification: not-requested
```
