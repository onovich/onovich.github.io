import photoAlbums from './photoAlbums.json';

export type Language = 'en' | 'zh-CN';
export type PageKey = 'home' | 'work' | 'art' | 'writing' | 'profile' | 'contact';
export type ArtCategoryKey = 'pixel' | 'illustration' | 'animation' | 'graphic' | 'photography' | 'poetry';

export const siteUrl = 'https://onovich.com';

const pageSlugs: Record<PageKey, string> = {
  home: '',
  work: 'games-and-tools',
  art: 'art',
  writing: 'development-notes',
  profile: 'profile',
  contact: 'contact',
};

const artSlugs: Record<ArtCategoryKey, string> = {
  pixel: 'pixel',
  illustration: 'illustration',
  animation: 'animation',
  graphic: 'graphic',
  photography: 'photography',
  poetry: 'poetry',
};

export function pagePath(page: PageKey, language: Language): string {
  const prefix = language === 'zh-CN' ? '/zh' : '';
  const slug = pageSlugs[page];
  return slug ? `${prefix}/${slug}/` : `${prefix || ''}/`;
}

export function artPath(category: ArtCategoryKey, language: Language): string {
  const prefix = language === 'zh-CN' ? '/zh' : '';
  return `${prefix}/art/${artSlugs[category]}/`;
}

export function photoAlbumPath(album: string, language: Language): string {
  const prefix = language === 'zh-CN' ? '/zh' : '';
  return `${prefix}/art/photography/${album}/`;
}

export const photoAlbumSlugs = {
  photo_1: 'tokyo',
  photo_2: 'kamakura',
  photo_3: 'fuji',
  photo_5: 'hong-kong',
  photo_6: 'shenzhen',
  photo_7: 'shanghai',
  photo_8: 'beijing',
} as const;

export type PhotoAlbumId = keyof typeof photoAlbumSlugs;

export function getPhotoAlbumBySlug(slug: string) {
  const entry = Object.entries(photoAlbumSlugs).find(([, value]) => value === slug);
  if (!entry) return null;

  const albumId = entry[0] as PhotoAlbumId;
  const album = photoAlbums.albums.find((item) => item.slug === albumId);
  return album ? { albumId, album } : null;
}

export const projects = {
  ninja: {
    name: 'Ninja Ming',
    href: 'https://store.steampowered.com/app/3234330/Ninja_Ming/',
    image: '/images/games/ninja-ming-cover.png',
    alt: 'Ninja Ming key art',
  },
  golf: {
    name: '2DProGolf',
    href: 'https://github.com/onovich/2DProGolf',
    image: '/images/covers/2dprogolf.png',
    alt: '2DProGolf project cover',
  },
  inscape: {
    name: 'Inscape',
    href: 'https://github.com/onovich/Inscape',
    image: '/images/covers/inscape.png',
    alt: 'Inscape project cover',
  },
  prism: {
    name: 'PrismDraft',
    href: 'https://github.com/onovich/PrismDraft',
    image: '/images/covers/prismdraft.png',
    alt: 'PrismDraft project cover',
  },
  pulse: {
    name: 'Pulse',
    href: 'https://github.com/onovich/Pulse',
    image: '/images/covers/pulse.png',
    alt: 'Pulse project cover',
  },
  ease: {
    name: 'EaseTween',
    href: 'https://github.com/onovich/EaseTween',
    image: '/images/covers/easetween.png',
    alt: 'EaseTween project cover',
  },
  litio: {
    name: 'LitIO',
    href: 'https://github.com/onovich/LitIO',
    image: '/images/covers/litio.png',
    alt: 'LitIO project cover',
  },
  beat: {
    name: 'Beat',
    href: 'https://github.com/onovich/Beat',
    image: '/images/covers/beat.png',
    alt: 'Beat project cover',
  },
  repoCover: {
    name: 'RepoCover',
    href: 'https://repo-cover.onovich.com/',
    image: '/images/covers/repo-cover.png',
    alt: 'RepoCover project cover',
  },
  repoReadme: {
    name: 'RepoReadme',
    href: 'https://github.com/onovich/RepoReadme',
    image: '/images/covers/repo-readme.png',
    alt: 'RepoReadme project cover',
  },
} as const;

export const copy = {
  en: {
    skip: 'Skip to content',
    index: 'INDEX',
    close: 'Close',
    nav: {
      home: 'HOME',
      work: 'GAMES & TOOLS',
      art: 'ART',
      writing: 'DEV NOTES',
      profile: 'PROFILE',
      contact: 'CONTACT',
    },
    pages: {
      home: {
        title: 'Onovich — Games, Systems & Tools',
        description: 'Onovich makes games, game systems, and development tools.',
      },
      work: {
        title: 'Games & Tools — Onovich',
        description: 'Games, Unity systems, runtime libraries, editors, and development tools by Onovich.',
      },
      art: {
        title: 'Art — Onovich',
        description: 'Pixel art, illustration, animation, graphic work, photography, and poetry by Onovich.',
      },
      writing: {
        title: 'Development Notes — Onovich',
        description: 'Knowledge, notes, and reflections on making games and development tools.',
      },
      profile: {
        title: 'Profile — Onovich',
        description: 'Game systems engineer and technical creator working primarily with Unity and C#.',
      },
      contact: {
        title: 'Contact — Onovich',
        description: 'Contact Onovich about games, development tools, and possible collaboration.',
      },
    },
    home: {
      title: 'Welcome, stranger.',
      body: [
        'I’m Onovich, a swamp frog who likes making games from the sofa.',
        'I make games, and game development tools.',
        'When I’m not writing code, I draw, take photographs, and occasionally write poems.',
      ],
      lead: 'You might be interested in a few things I’ve made and am making…',
      moreWork: 'More games and tools',
      moreArt: 'Pixel art, illustration, photography, and poems',
    },
    work: {
      title: 'Games & Tools',
      games: 'Games',
      gamesNote: 'Released collaborations and playable projects in development.',
      systems: 'Systems & tools',
      systemsNote: 'Runtime foundations, editors, graphics, and production utilities.',
      publishing: 'GitHub presentation tools',
      publishingNote: 'Covers and READMEs that help repositories present themselves clearly.',
    },
    projectDescriptions: {
      ninjaShort: 'Released game · co-development',
      ninjaLong: 'Released game · co-development · 1Poss Studio',
      golfShort: 'Game · route planning and golf',
      golfLong: 'Terrain, route planning, and golf',
      inscape: 'Language and editor R&D',
      prism: 'Modeling, rendering, and editor tooling',
      pulse: 'Mini 2D physics engine · Unity / C#',
      ease: 'Verified zero-GC steady-state playback',
      litio: 'Binary serialization · Unity / C#',
      beat: 'Timing and rhythm utility',
      repoCover: 'Repository-aware Social Preview generation',
      repoReadme: 'Repository-aware README writing',
    },
    art: {
      title: 'Art',
      all: 'All art',
      pixel: 'Pixel art',
      illustration: 'Illustration',
      animation: 'Animation',
      graphic: 'Graphic',
      photography: 'Photography',
      poetry: 'Poetry',
      albums: 'albums',
      works: 'works',
      open: 'Open image',
      poemNote: 'Poems written between 2013 and 2014',
      poetryPreview: 'River water knows everything.\nThat does not mean it forgives.',
      back: 'Back to all art',
      backToPhotography: 'Back to photography',
    },
    writing: {
      title: 'Development Notes',
      publication: 'GAMELETTER',
      heading: 'Knowledge, notes, and reflections on making games.',
      status: 'In development.',
    },
    profile: {
      title: 'Profile',
      bio: [
        'I’m a game systems engineer and technical creator working primarily with Unity and C#.',
        'My work spans game-engine foundations, complex gameplay and production systems, and the design and development of toolchains.',
        'Away from code, I also enjoy playing games and thinking about game design.',
      ],
      focus: 'Focus',
      focusItems: [
        'Architecture for combat, presentation, and other complex gameplay systems',
        'Game editors and content-production workflows',
        'Rendering, graphics experiments, and technical art',
      ],
      experience: 'Selected experience',
      experiences: [
        ['Ninja Ming', 'As a core team member, I helped develop the 1Poss Studio indie game Ninja Ming.'],
        ['DIYRPG BBS', 'Helped found and maintain an early Chinese indie game developer community from 2004 to 2009.'],
        ['Inscape / PrismDraft', 'Ongoing language, editor, modeling, and rendering R&D.'],
        ['Open-source tools', 'A public body of Unity and C# runtime, editor, serialization, animation, and physics experiments.'],
      ],
    },
    contact: {
      title: 'Contact',
      line1: 'You’re welcome to get in touch.',
      line2: 'If you’d like to work together, please include:',
      items: ['what you are making;', 'where you need help;', 'the rough scope and timing.'],
      email: 'Email me directly',
      github: 'See my public work on GitHub',
      twitter: 'Talk to me on X / Twitter',
      formName: 'Your name',
      formEmail: 'Your email',
      formMessage: 'Message',
      formSubmit: 'Send message',
      formSending: 'Sending…',
      formSuccess: 'Message sent. Thank you — I’ll get back to you soon.',
      formError: 'The message could not be sent. Please email me directly at onovich1110@gmail.com.',
      formNote: 'Your message is sent from this page. If it does not go through, email me directly at onovich1110@gmail.com.',
    },
  },
  'zh-CN': {
    skip: '跳到主要内容',
    index: '目录',
    close: '关闭',
    nav: {
      home: '首页',
      work: '游戏与工具',
      art: '艺术创作',
      writing: '开发笔记',
      profile: '履历',
      contact: '联系',
    },
    pages: {
      home: {
        title: 'Onovich — 游戏、系统与工具',
        description: 'Onovich 从事游戏开发，也开发游戏系统与工具。',
      },
      work: {
        title: '游戏与工具 — Onovich',
        description: 'Onovich 的游戏、Unity 系统、运行时库、编辑器与开发工具。',
      },
      art: {
        title: '艺术创作 — Onovich',
        description: 'Onovich 的像素画、插画、动画、平面作品、摄影与诗歌。',
      },
      writing: {
        title: '开发笔记 — Onovich',
        description: '关于游戏制作与开发工具的知识、记录与思考。',
      },
      profile: {
        title: '履历 — Onovich',
        description: '主要使用 Unity 与 C# 的游戏系统工程师与技术创作者。',
      },
      contact: {
        title: '联系 — Onovich',
        description: '就游戏、开发工具或合作事宜联系 Onovich。',
      },
    },
    home: {
      title: '欢迎来此，陌生人。',
      body: [
        '我，沼蛙奥诺维奇，喜欢在沙发上做游戏。',
        '做游戏，也做游戏开发工具。',
        '不写代码的时候，我画画、拍照，偶尔写诗。',
      ],
      lead: '你可能感兴趣，这些是我做过和在做的东西……',
      moreWork: '更多游戏与开发工具',
      moreArt: '像素画、插画、摄影与诗歌',
    },
    work: {
      title: '游戏与工具',
      games: '游戏',
      gamesNote: '已经发行的合作项目，以及制作中的可玩作品。',
      systems: '系统与工具',
      systemsNote: '运行时基础、编辑器、图形实验与生产工具。',
      publishing: 'GitHub 美化方案',
      publishingNote: '让代码仓库更清楚、更好看的封面与 README 工具。',
    },
    projectDescriptions: {
      ninjaShort: '已发行游戏 · 合作开发',
      ninjaLong: '已发行游戏 · 与 1Poss Studio 合作开发',
      golfShort: '路线规划与高尔夫游戏',
      golfLong: '地形、路线规划与高尔夫',
      inscape: '语言与编辑器研发',
      prism: '建模、渲染与编辑器工具',
      pulse: '迷你 2D 物理引擎 · Unity / C#',
      ease: '已验证稳定播放阶段零 GC',
      litio: '二进制序列化 · Unity / C#',
      beat: '节拍与时间工具',
      repoCover: '理解仓库后生成 Social Preview',
      repoReadme: '理解仓库后编写 README',
    },
    art: {
      title: '艺术创作',
      all: '全部分类',
      pixel: '像素画',
      illustration: '插画',
      animation: '动图',
      graphic: '平面',
      photography: '摄影',
      poetry: '诗歌',
      albums: '组相册',
      works: '件作品',
      open: '查看原图',
      poemNote: '写于 2013 至 2014 年',
      poetryPreview: '河水知道一切\n而并非意味着它也选择了包容',
      back: '返回全部艺术分类',
      backToPhotography: '返回摄影',
    },
    writing: {
      title: '开发笔记',
      publication: 'GAMELETTER',
      heading: '游戏制作相关的知识、记录与思考。',
      status: '正在开发中。',
    },
    profile: {
      title: '履历',
      bio: [
        '我是一名游戏系统工程师和技术创作者，主要使用 Unity 与 C#。',
        '我的工作跨越游戏引擎层、复杂的系统业务层、工具链的设计与研发。',
        '在不写代码的时候，我也喜欢打游戏、思考游戏设计。',
      ],
      focus: '关注方向',
      focusItems: [
        '战斗、演出等复杂游戏玩法系统的架构设计',
        '游戏编辑器与内容生产工作流',
        '渲染、图形实验与技术美术',
      ],
      experience: '部分经历',
      experiences: [
        ['Ninja Ming', '作为核心成员，参与了 1Poss Studio 的独立游戏《Ninja Ming》的开发。'],
        ['DIYRPG BBS', '2004-2009 年期间参与创办与维护国内早期独立游戏开发者社区。'],
        ['Inscape / PrismDraft', '持续进行语言、编辑器、建模与渲染方向的研发。'],
        ['开源工具', '公开维护了一批 Unity 与 C# 运行时、编辑器、序列化、动画和物理实验。'],
      ],
    },
    contact: {
      title: '联系',
      line1: '欢迎找我聊天。',
      line2: '如果你想找我合作，请在来信中说清楚：',
      items: ['你正在做什么；', '你希望在哪方面获得帮助；', '大致的范围与时间。'],
      email: '直接发邮件给我',
      github: '在 GitHub 查看我的公开作品',
      twitter: '在 X / Twitter 找我',
      formName: '你的称呼',
      formEmail: '你的邮箱',
      formMessage: '留言内容',
      formSubmit: '发送留言',
      formSending: '发送中…',
      formSuccess: '留言已发送，谢谢。我会尽快回复。',
      formError: '留言未能发送，请直接发送至 onovich1110@gmail.com。',
      formNote: '留言会直接从网页发送。如果发送失败，请直接发送至 onovich1110@gmail.com。',
    },
  },
} as const;

export const artCategories: ReadonlyArray<{
  key: ArtCategoryKey;
  preview: string;
  previewAlt: string;
}> = [
  { key: 'pixel', preview: '/images/pixel/frog-park.jpg', previewAlt: 'Pixel art frog in a park' },
  { key: 'illustration', preview: '/images/illustrations/ref-07.jpg', previewAlt: 'Illustration of a fish' },
  { key: 'animation', preview: '/images/gifs/00swordguy.gif', previewAlt: 'Animated sword character' },
  { key: 'graphic', preview: '/images/graphics/graphic-06.jpg', previewAlt: 'Graphic artwork with a yellow window' },
  { key: 'photography', preview: '/images/photo-albums/photo/photo-01.jpg', previewAlt: 'Tokyo street photograph' },
  { key: 'poetry', preview: '', previewAlt: '' },
];
