import type {
  CmsPage,
  CmsSection,
  CmsSeed,
  ContentItem,
  LegacyLayoutParams,
  NavGroup,
  NavGroupId,
  PageFrameParams,
  PageTemplateId,
  SectionParams,
  SectionPresetId,
  SectionType,
} from './schema';
import { pageTemplates, presets, sectionPresetMap } from './presets';

type RawContentItem = ContentItem & {
  [key: string]: unknown;
};

export interface CurrentContentSources {
  codes: RawContentItem[];
  games: RawContentItem[];
  pixel: RawContentItem[];
  illustrations: RawContentItem[];
  gifs: RawContentItem[];
  graphics: RawContentItem[];
  photoAlbums: {
    index: RawContentItem[];
    albums: Record<string, CurrentPhotoAlbum>;
  };
  poemHtml: string;
}

interface CurrentPhotoAlbum {
  slug: string;
  title: string;
  year?: string;
  href?: string;
  backHref?: string;
  backLabel?: string;
  items: RawContentItem[];
}

const categorySite = '站点';
const categoryWorks = '作品';
const categoryLinks = '链接';

const dividerDefaults = {
  dividerColor: 'rgba(127, 127, 127, 0.4)',
  dividerSize: 1,
};

function frameFor(templateId: PageTemplateId, overrides: Partial<PageFrameParams> = {}): PageFrameParams {
  const preset = pageTemplates.find((item) => item.id === templateId);
  if (!preset) {
    throw new Error(`Unknown page template: ${templateId}`);
  }
  return {
    ...preset.defaultFrame,
    ...overrides,
  };
}

function legacyLayout(overrides: Partial<LegacyLayoutParams> = {}): LegacyLayoutParams {
  return {
    columns: 3,
    imageRatio: 'natural',
    caption: 'html',
    width: 100,
    top: 5.5,
    ...dividerDefaults,
    ...overrides,
  };
}

function itemFrom(raw: RawContentItem): ContentItem {
  return {
    ...raw,
    section: typeof raw.section === 'number' ? raw.section : undefined,
    links: raw.links?.map((link) => ({ ...link })),
  };
}

function itemsFrom(rawItems: RawContentItem[]): ContentItem[] {
  return rawItems.map(itemFrom);
}

function section(
  id: string,
  type: SectionType,
  presetId: SectionPresetId,
  rawItems: RawContentItem[] | ContentItem[],
  overrides: Partial<SectionParams> = {},
  title?: string,
): CmsSection {
  const preset = sectionPresetMap.get(presetId);
  if (!preset) {
    throw new Error(`Unknown section preset: ${presetId}`);
  }

  return {
    id,
    type,
    presetId,
    title,
    params: {
      ...preset.defaults,
      ...overrides,
    },
    items: rawItems.map((item) => itemFrom(item as RawContentItem)),
  };
}

function richTextSection(id: string, bodyHtml: string): CmsSection {
  return {
    ...section(id, 'rich-text', 'rich-text-poem', [{ id, bodyHtml }]),
    bodyHtml,
  };
}

function page(params: {
  id: string;
  title: string;
  path: string;
  type: string;
  templateId: PageTemplateId;
  category: string;
  sidebar?: boolean;
  navGroupId?: NavGroupId;
  frame?: Partial<PageFrameParams>;
  sections: CmsSection[];
  layout?: Partial<LegacyLayoutParams>;
  bodyHtml?: string;
  items?: ContentItem[];
  albums?: Record<string, ContentItem[]>;
}): CmsPage {
  return {
    id: params.id,
    title: params.title,
    path: params.path,
    type: params.type,
    templateId: params.templateId,
    category: params.category,
    sidebar: params.sidebar ?? true,
    navGroupId: params.navGroupId,
    activeNavPath: params.path,
    frame: frameFor(params.templateId, params.frame),
    sections: params.sections,
    seo: {
      title: `${params.title} - Onovich`,
    },
    layout: legacyLayout(params.layout),
    bodyHtml: params.bodyHtml,
    items: params.items ?? params.sections.flatMap((item) => item.items),
    albums: params.albums,
  };
}

function navGroups(pages: CmsPage[]): NavGroup[] {
  const groups: Array<{ id: NavGroupId; label: string; order: number }> = [
    { id: 'main', label: categoryWorks, order: 1 },
    { id: 'social', label: categoryLinks, order: 2 },
    { id: 'hidden', label: '隐藏', order: 99 },
  ];

  return groups.map((group) => ({
    ...group,
    items: pages
      .filter((item) => item.navGroupId === group.id)
      .map((item, order) => ({
        pageId: item.id,
        label: item.title,
        path: item.path,
        group: group.label,
        navGroupId: group.id,
        visible: group.id !== 'hidden',
        order,
      })),
  }));
}

function numberedSections(
  idPrefix: string,
  rawItems: RawContentItem[],
  presetForIndex: (index: number) => SectionPresetId,
): CmsSection[] {
  const sectionNumbers = Array.from(new Set(rawItems.map((item) => item.section)))
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);

  return sectionNumbers.map((sectionNumber, index) => {
    const rawSectionItems = rawItems.filter((item) => item.section === sectionNumber);
    const presetId = presetForIndex(index);
    const preset = sectionPresetMap.get(presetId);

    return section(
      `${idPrefix}-${sectionNumber}`,
      'gallery',
      presetId,
      rawSectionItems,
      preset?.defaults ?? {},
      `Section ${sectionNumber}`,
    );
  });
}

export function createCmsSeed(content: CurrentContentSources): CmsSeed {
  const photoAlbums = Object.values(content.photoAlbums.albums);
  const photoAlbumPages = photoAlbums.map((album) =>
    page({
      id: album.slug,
      title: album.title,
      path: album.href ?? `/${album.slug}`,
      type: 'photo-detail',
      templateId: 'photo-detail',
      category: categoryWorks,
      sidebar: false,
      navGroupId: 'hidden',
      sections: [
        section(`${album.slug}-photos`, 'photo-detail', 'photo-detail-columns', album.items, {
          captionMode: 'none',
          showCaptions: false,
        }),
      ],
      layout: {
        columns: 3,
        imageRatio: 'natural',
        caption: 'none',
        top: 4.7,
      },
    }),
  );

  const pages: CmsPage[] = [
    page({
      id: 'home',
      title: 'Homepage',
      path: '/',
      type: 'home',
      templateId: 'home-profile',
      category: categorySite,
      sidebar: false,
      navGroupId: 'hidden',
      frame: {
        showBackLink: false,
      },
      sections: [
        section('home-profile', 'profile', 'home-profile', [
          {
            id: 'avatar',
            title: 'Avatar',
            src: '/images/profile/avatar.jpg',
            width: 400,
            height: 400,
            bodyHtml: '<p>沼蛙奥诺维奇，在沙发上创作游戏。</p><p>天生的法兰左和 BTV（但不会潜水）。</p>',
          },
        ]),
      ],
      bodyHtml: '<p>沼蛙奥诺维奇，在沙发上创作游戏。</p><p>天生的法兰左和 BTV（但不会潜水）。</p>',
      layout: {
        columns: 1,
        imageRatio: '1 / 1',
        caption: 'none',
        width: 58,
        top: 7.3,
      },
    }),
    page({
      id: 'codes',
      title: 'CODES',
      path: '/codes',
      type: 'gallery',
      templateId: 'gallery-page',
      category: categoryWorks,
      navGroupId: 'main',
      sections: [
        section('codes-gallery', 'gallery', 'gallery-roomy-3', content.codes, {
          imageFit: 'cover-16-9',
          captionMode: 'title-desc-links',
        }),
      ],
      items: itemsFrom(content.codes),
      layout: {
        imageRatio: '16 / 9',
        caption: 'title-desc-links',
      },
    }),
    page({
      id: 'game',
      title: 'GAMES',
      path: '/game',
      type: 'gallery',
      templateId: 'gallery-page',
      category: categoryWorks,
      navGroupId: 'main',
      frame: {
        topSpacingPreset: 'tight',
      },
      sections: [
        section('games-gallery', 'gallery', 'gallery-dense-3', content.games, {
          captionMode: 'html',
        }),
      ],
      items: itemsFrom(content.games),
      layout: {
        imageRatio: 'natural',
        caption: 'html',
        top: 5.5,
      },
    }),
    page({
      id: 'pixel',
      title: 'PIXEL ARTS',
      path: '/pixel',
      type: 'gallery',
      templateId: 'segmented-gallery-page',
      category: categoryWorks,
      navGroupId: 'main',
      sections: numberedSections('pixel', content.pixel, (index) => (
        index === 0 ? 'gallery-roomy-3' : 'gallery-flush-3'
      )),
      items: itemsFrom(content.pixel),
      layout: {
        imageRatio: '1 / 1',
        caption: 'html',
      },
    }),
    page({
      id: 'illustrator',
      title: 'ILLUSTRATIONS',
      path: '/illustrator',
      type: 'gallery',
      templateId: 'segmented-gallery-page',
      category: categoryWorks,
      navGroupId: 'main',
      frame: {
        topSpacingPreset: 'tight',
      },
      sections: numberedSections('illustrations', content.illustrations, () => 'gallery-dense-3'),
      items: itemsFrom(content.illustrations),
      layout: {
        imageRatio: 'natural',
        caption: 'html',
      },
    }),
    page({
      id: 'gif',
      title: 'GIFS',
      path: '/gif',
      type: 'gallery',
      templateId: 'gif-page',
      category: categoryWorks,
      navGroupId: 'main',
      sections: [
        section('gif-hero', 'gif-hero', 'gif-hero', [
          {
            id: 'gif-hero',
            title: 'GIF hero',
            src: '/images/gifs/hero.gif',
            width: 750,
            height: 553,
          },
        ]),
        section('gif-gallery', 'gallery', 'gallery-dense-3', content.gifs, {
          captionMode: 'none',
          showCaptions: false,
        }),
      ],
      items: itemsFrom(content.gifs),
      layout: {
        imageRatio: 'natural',
        caption: 'none',
      },
    }),
    page({
      id: 'graphic',
      title: 'GRAPHIC DESIGNS',
      path: '/graphic',
      type: 'gallery',
      templateId: 'gallery-page',
      category: categoryWorks,
      navGroupId: 'main',
      frame: {
        topSpacingPreset: 'tight',
      },
      sections: [
        section('graphics-gallery', 'gallery', 'gallery-dense-2', content.graphics),
      ],
      items: itemsFrom(content.graphics),
      layout: {
        columns: 2,
        imageRatio: 'natural',
        caption: 'html',
      },
    }),
    page({
      id: 'photo',
      title: 'PHOTOS',
      path: '/photo',
      type: 'photo-index',
      templateId: 'photo-index',
      category: categoryWorks,
      navGroupId: 'main',
      sections: [
        section('photo-index', 'photo-index', 'photo-index-columns', content.photoAlbums.index.map((item) => ({
          ...item,
          targetPageId: item.href?.replace('/', ''),
        }))),
      ],
      items: itemsFrom(content.photoAlbums.index),
      albums: Object.fromEntries(
        photoAlbums.map((album) => [
          album.slug,
          itemsFrom(album.items),
        ]),
      ),
      layout: {
        imageRatio: 'natural',
        caption: 'title-year',
        top: 4.7,
      },
    }),
    ...photoAlbumPages,
    page({
      id: 'poem',
      title: 'POEMS',
      path: '/poem',
      type: 'richtext',
      templateId: 'rich-text',
      category: categoryWorks,
      navGroupId: 'main',
      sections: [
        richTextSection('poem-body', content.poemHtml),
      ],
      bodyHtml: content.poemHtml,
      layout: {
        columns: 1,
        imageRatio: 'text',
        caption: 'none',
      },
    }),
    page({
      id: 'sns',
      title: 'SNS',
      path: '/sns',
      type: 'links',
      templateId: 'links',
      category: categoryLinks,
      navGroupId: 'social',
      sections: [
        section('sns-links', 'links', 'sns-icons', [
          { id: 'twitter', title: 'Twitter', href: 'https://twitter.com/Umbra_Onovich' },
          { id: 'steam', title: 'Steam', href: 'http://steamcommunity.com/id/onovich' },
          { id: 'douban', title: '豆瓣', href: 'https://www.douban.com/people/hjn1110/' },
          { id: 'github', title: 'GitHub', href: 'https://github.com/onovich' },
        ]),
      ],
      layout: {
        columns: 1,
        imageRatio: 'text',
        caption: 'none',
      },
    }),
    page({
      id: 'links',
      title: 'LINKS',
      path: '/links',
      type: 'links',
      templateId: 'links',
      category: categoryLinks,
      navGroupId: 'social',
      sections: [
        section('external-links', 'links', 'single-link', [
          { id: 'placeholder', title: 'Onovich', href: 'https://onovich.com' },
        ]),
      ],
      layout: {
        columns: 1,
        imageRatio: 'text',
        caption: 'none',
      },
    }),
    page({
      id: 'contact',
      title: 'MESSAGE',
      path: '/contact',
      type: 'form',
      templateId: 'contact-drawer',
      category: categoryLinks,
      navGroupId: 'social',
      sections: [
        section('contact-message', 'contact', 'contact-message', [
          { id: 'message', title: 'MESSAGE', bodyHtml: '<p>MESSAGE</p>' },
        ]),
      ],
      bodyHtml: '<p>MESSAGE</p>',
      layout: {
        columns: 1,
        imageRatio: 'text',
        caption: 'none',
        top: 7.3,
      },
    }),
  ];

  const nav = {
    title: 'Onovich',
    groups: navGroups(pages),
  };

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    site: {
      title: 'Onovich',
      description: 'Onovich creates games on a sofa.',
      baseUrl: 'https://blog.onovich.com',
      framePresetId: 'cargo-4-8',
    },
    categories: [categorySite, categoryWorks, categoryLinks],
    sidebar: nav.groups.flatMap((group) => group.items).filter((item) => item.visible),
    nav,
    presets,
    pages,
  };
}
