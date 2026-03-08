export interface ThemeCourseColor {
  background: string;
  border: string;
}

export type ScheduleThemeKey = 'lime' | 'ocean' | 'mint' | 'sunset' | 'sakura';

export interface ScheduleTheme {
  key: ScheduleThemeKey;
  name: string;
  description: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  courseColors: ThemeCourseColor[];
}

export const DEFAULT_SCHEDULE_THEME_KEY: ScheduleThemeKey = 'lime';

const LIME_COLORS: ThemeCourseColor[] = [
  { background: '#F0F7FF', border: '#91CAFF' },
  { background: '#F6FFED', border: '#B7EB8F' },
  { background: '#FFF0F6', border: '#FFADD2' },
  { background: '#FFF2E8', border: '#FFBB96' },
  { background: '#E6FFFB', border: '#87E8DE' },
  { background: '#F9F0FF', border: '#D3ADF7' },
  { background: '#FCFFE6', border: '#EAF889' },
  { background: '#E0F2FE', border: '#7DD3FC' },
  { background: '#FEF2F2', border: '#FECACA' },
  { background: '#ECFDF5', border: '#6EE7B7' },
  { background: '#FFFBEB', border: '#FDE047' },
  { background: '#F3E8FF', border: '#D8B4FE' },
  { background: '#FFE4E6', border: '#FDA4AF' },
  { background: '#F0FDF4', border: '#86EFAC' },
  { background: '#F8FAFC', border: '#CBD5E1' },
];

const OCEAN_COLORS: ThemeCourseColor[] = [
  { background: '#EAF4FF', border: '#7CB9FF' },
  { background: '#ECF9FF', border: '#82D1FF' },
  { background: '#EAFBFF', border: '#5DD6E8' },
  { background: '#EEF8FF', border: '#6BB7F8' },
  { background: '#E8F6FF', border: '#4CA3E6' },
  { background: '#F0F7FF', border: '#90B8FF' },
  { background: '#E9FCFF', border: '#7EE0FF' },
  { background: '#E8F1FF', border: '#7EA4FF' },
  { background: '#EDF7FF', border: '#66B3FF' },
  { background: '#E9FAFF', border: '#58C4E8' },
  { background: '#EFFBFF', border: '#7AD7FF' },
  { background: '#EEF4FF', border: '#93A9FF' },
  { background: '#E6F5FF', border: '#59A5E8' },
  { background: '#EBFCFF', border: '#73D8E8' },
  { background: '#F2F8FF', border: '#9DB6D1' },
];

const MINT_COLORS: ThemeCourseColor[] = [
  { background: '#EBFFF6', border: '#74D9B5' },
  { background: '#F0FFF2', border: '#96E07A' },
  { background: '#ECFFF9', border: '#5CD7C0' },
  { background: '#F3FFF0', border: '#9EDC8C' },
  { background: '#E9FFF4', border: '#64D3A1' },
  { background: '#F1FFF8', border: '#88E0B5' },
  { background: '#F7FFF0', border: '#B8E986' },
  { background: '#ECFFF7', border: '#75D9B8' },
  { background: '#F0FFF9', border: '#8DE3CF' },
  { background: '#EAFFF1', border: '#67D69A' },
  { background: '#F7FFF3', border: '#B4E47B' },
  { background: '#EEFFF6', border: '#82DFB0' },
  { background: '#E8FFF3', border: '#5FD39C' },
  { background: '#F2FFF8', border: '#95E6C4' },
  { background: '#F4FFF6', border: '#B4D8C9' },
];

const SUNSET_COLORS: ThemeCourseColor[] = [
  { background: '#FFF4E8', border: '#FFB36B' },
  { background: '#FFF8EA', border: '#FFC46B' },
  { background: '#FFF1EC', border: '#FF9F7A' },
  { background: '#FFF5EE', border: '#FFB084' },
  { background: '#FFF2E8', border: '#FFAA64' },
  { background: '#FFF7EF', border: '#FFC58E' },
  { background: '#FFF9F0', border: '#FFD089' },
  { background: '#FFF3EA', border: '#FFAF78' },
  { background: '#FFF0EA', border: '#FF9E8D' },
  { background: '#FFF6EC', border: '#FFBC7A' },
  { background: '#FFF8EE', border: '#FFD08A' },
  { background: '#FFF2F0', border: '#FFAD9E' },
  { background: '#FFF4EB', border: '#FFA768' },
  { background: '#FFF7F1', border: '#FFC79E' },
  { background: '#FFF8F4', border: '#D9B8A2' },
];

const SAKURA_COLORS: ThemeCourseColor[] = [
  { background: '#FFF0F6', border: '#F8A9C7' },
  { background: '#FFF3F8', border: '#F6B5CF' },
  { background: '#FFEFF5', border: '#F48FB8' },
  { background: '#FFF5FA', border: '#F8B7D8' },
  { background: '#FFF0F8', border: '#EFA7D5' },
  { background: '#FDF1FF', border: '#D9A9F6' },
  { background: '#FFF6FB', border: '#F8C6DD' },
  { background: '#FDF0FA', border: '#E8A4D7' },
  { background: '#FFF2F7', border: '#F5A8C8' },
  { background: '#FFF4F9', border: '#F2BAD2' },
  { background: '#FFF6FA', border: '#F8C2D8' },
  { background: '#F7EEFF', border: '#C9A0F2' },
  { background: '#FFF1F7', border: '#F3A0C2' },
  { background: '#FFF5FB', border: '#F8C7E0' },
  { background: '#FFF8FC', border: '#D7C0D9' },
];

export const SCHEDULE_THEMES: ScheduleTheme[] = [
  {
    key: 'lime',
    name: '青柠',
    description: '清新高亮，默认风格',
    accent: '#D2FF72',
    accentSoft: 'rgba(210, 255, 114, 0.24)',
    accentInk: '#111111',
    courseColors: LIME_COLORS,
  },
  {
    key: 'ocean',
    name: '海盐',
    description: '冷静通透，低疲劳',
    accent: '#8FD3FF',
    accentSoft: 'rgba(143, 211, 255, 0.24)',
    accentInk: '#0E2A3C',
    courseColors: OCEAN_COLORS,
  },
  {
    key: 'mint',
    name: '薄荷',
    description: '自然轻盈，阅读舒适',
    accent: '#86E7C7',
    accentSoft: 'rgba(134, 231, 199, 0.24)',
    accentInk: '#103126',
    courseColors: MINT_COLORS,
  },
  {
    key: 'sunset',
    name: '暮光',
    description: '暖色柔和，层次明显',
    accent: '#FFBE7A',
    accentSoft: 'rgba(255, 190, 122, 0.24)',
    accentInk: '#40220C',
    courseColors: SUNSET_COLORS,
  },
  {
    key: 'sakura',
    name: '樱花',
    description: '柔和甜感，信息清晰',
    accent: '#F7A8C8',
    accentSoft: 'rgba(247, 168, 200, 0.24)',
    accentInk: '#3B1D2B',
    courseColors: SAKURA_COLORS,
  },
];

export interface ScheduleThemeOption {
  key: ScheduleThemeKey;
  name: string;
  description: string;
  accent: string;
}

export const SCHEDULE_THEME_OPTIONS: ScheduleThemeOption[] = SCHEDULE_THEMES.map((theme) => ({
  key: theme.key,
  name: theme.name,
  description: theme.description,
  accent: theme.accent,
}));

export function getScheduleThemeByKey(themeKey: string | null | undefined): ScheduleTheme {
  const found = SCHEDULE_THEMES.find((theme) => theme.key === themeKey);
  return found || SCHEDULE_THEMES[0];
}

export function buildThemeStyle(theme: Pick<ScheduleTheme, 'accent' | 'accentSoft' | 'accentInk'>): string {
  return `--theme-accent:${theme.accent};--theme-accent-soft:${theme.accentSoft};--theme-accent-ink:${theme.accentInk};`;
}
