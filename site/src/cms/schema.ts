export type NavGroupId = 'main' | 'social' | 'hidden';

export type PageTemplateId =
  | 'home-profile'
  | 'gallery-page'
  | 'segmented-gallery-page'
  | 'gif-page'
  | 'photo-index'
  | 'photo-detail'
  | 'rich-text'
  | 'links'
  | 'contact-drawer';

export type SectionType =
  | 'profile'
  | 'gallery'
  | 'gif-hero'
  | 'photo-index'
  | 'photo-detail'
  | 'rich-text'
  | 'links'
  | 'contact';

export type SectionPresetId =
  | 'home-profile'
  | 'gallery-roomy-3'
  | 'gallery-dense-3'
  | 'gallery-flush-3'
  | 'gallery-dense-2'
  | 'gif-hero'
  | 'photo-index-columns'
  | 'photo-detail-columns'
  | 'rich-text-poem'
  | 'sns-icons'
  | 'single-link'
  | 'contact-message';

export type CaptionMode =
  | 'none'
  | 'title-year'
  | 'title-desc-links'
  | 'html';

export type ClickMode =
  | 'none'
  | 'lightbox'
  | 'internal-page'
  | 'external-link';

export interface CmsSeed {
  schemaVersion: 1;
  updatedAt: string;
  site: SiteMeta;
  categories: string[];
  sidebar: NavItem[];
  nav: NavConfig;
  presets: PresetRegistry;
  pages: CmsPage[];
  assets?: CmsAsset[];
}

export interface SiteMeta {
  title: string;
  description: string;
  baseUrl: string;
  framePresetId: 'cargo-4-8';
}

export interface NavConfig {
  title: string;
  groups: NavGroup[];
}

export interface NavGroup {
  id: NavGroupId;
  label: string;
  order: number;
  items: NavItem[];
}

export interface NavItem {
  pageId?: string;
  id?: string;
  label: string;
  path: string;
  group: string;
  navGroupId?: NavGroupId;
  visible?: boolean;
  order?: number;
}

export interface CmsPage {
  id: string;
  title: string;
  path: string;
  type: string;
  templateId: PageTemplateId;
  category: string;
  sidebar: boolean;
  navGroupId?: NavGroupId;
  activeNavPath?: string;
  frame: PageFrameParams;
  sections: CmsSection[];
  seo?: SeoParams;
  layout: LegacyLayoutParams;
  bodyHtml?: string;
  items: ContentItem[];
  albums?: Record<string, ContentItem[]>;
}

export interface PageFrameParams {
  showLeftNav: boolean;
  showBackLink: boolean;
  backHref: string;
  backLabel: string;
  topSpacingPreset: 'home' | 'inner' | 'photo' | 'tight' | 'contact';
  wideTopAdjustment?: 'default' | 'homeWide' | 'innerWide';
  contactDrawer?: boolean;
}

export interface CmsSection {
  id: string;
  type: SectionType;
  presetId: SectionPresetId;
  title?: string;
  params: SectionParams;
  items: ContentItem[];
  bodyHtml?: string;
}

export interface SectionParams {
  columns?: 1 | 2 | 3;
  spacing?: 'roomy' | 'dense' | 'flush';
  imageFit?: 'natural' | 'cover-square' | 'cover-16-9' | 'contain';
  captionMode?: CaptionMode;
  clickMode?: ClickMode;
  sectionGap?: 'none' | 'normal' | 'large';
  widthMode?: 'content' | 'wide' | 'custom';
  customWidthPercent?: number;
  showCaptions?: boolean;
}

export interface ContentItem {
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
  links?: ContentLink[];
  targetPageId?: string;
  hidden?: boolean;
  section?: number;
  originalUrl?: string;
  displayUrl?: string;
}

export interface ContentLink {
  label: string;
  url: string;
}

export interface CmsAsset {
  id: string;
  src: string;
  targetPath?: string;
  originalUrl?: string;
  width: number;
  height: number;
  mimeType: string;
  alt?: string;
  source: 'original-site' | 'upload' | 'manual';
  size?: number;
  dataUrl?: string;
}

export interface SeoParams {
  title?: string;
  description?: string;
}

export interface LegacyLayoutParams {
  columns: number;
  imageRatio: string;
  caption: CaptionMode | 'text';
  width: number;
  top: number;
  dividerColor: string;
  dividerSize: number;
}

export interface PresetRegistry {
  pageTemplates: PageTemplatePreset[];
  sectionPresets: SectionPreset[];
}

export interface PageTemplatePreset {
  id: PageTemplateId;
  label: string;
  description: string;
  defaultFrame: PageFrameParams;
}

export interface SectionPreset {
  id: SectionPresetId;
  label: string;
  type: SectionType;
  defaults: SectionParams;
  simpleControls: Array<keyof SectionParams | 'title' | 'items'>;
  advancedControls: Array<keyof SectionParams>;
  requiredItemFields: Array<keyof ContentItem>;
  optionalItemFields: Array<keyof ContentItem>;
}

export interface CmsValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  pageId?: string;
  sectionId?: string;
  itemId?: string;
}
