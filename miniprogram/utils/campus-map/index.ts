export type CampusMapId = 'xibei' | 'dong';
export type CampusMapCategory = 'gate' | 'academic' | 'dining' | 'sports' | 'service';
export type CampusMapZone = 'north' | 'south' | 'shared';

export interface CampusMapMarker {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  description: string;
  category: CampusMapCategory;
  zone: CampusMapZone;
  xPercent: number;
  yPercent: number;
}

export interface CampusMapConfig {
  id: CampusMapId;
  name: string;
  shortName: string;
  imageSrc: string;
  expectedPath: string;
  baseWidth: number;
  baseHeight: number;
  markers: CampusMapMarker[];
}

export interface CampusMapViewport {
  areaWidthPx: number;
  areaHeightPx: number;
  mapWidthPx: number;
  mapHeightPx: number;
  initialX: number;
  initialY: number;
  initialScale: number;
}

export const CAMPUS_MAP_MIN_SCALE = 1;
export const CAMPUS_MAP_MAX_SCALE = 4;
export const DEFAULT_CAMPUS_MAP_ID: CampusMapId = 'xibei';
const VIEWPORT_PADDING_X_PX = 16;
const VIEWPORT_PADDING_Y_PX = 20;

export const CAMPUS_MAP_CATEGORY_LABELS: Record<CampusMapCategory, string> = {
  gate: '校门',
  academic: '教学',
  dining: '食堂',
  sports: '运动',
  service: '服务',
};

export const CAMPUS_MAP_ZONE_LABELS: Record<CampusMapZone, string> = {
  north: '北院',
  south: '南院',
  shared: '公共区',
};

const XIBEI_CAMPUS_MARKERS: CampusMapMarker[] = [
  {
    id: 'north-gate',
    name: '北大门',
    shortName: '北大门',
    summary: '北院主要出入口',
    description: '靠近柳叶大道，适合作为进入北院后的起点。',
    category: 'gate',
    zone: 'north',
    xPercent: 59.2,
    yPercent: 10.7,
  },
  {
    id: 'library',
    name: '图书馆',
    shortName: '图书馆',
    summary: '北院核心学习区域',
    description: '位于北院中部偏东，临近白马湖和主路环线。',
    category: 'academic',
    zone: 'north',
    xPercent: 64.3,
    yPercent: 27.7,
  },
  {
    id: 'yifu-building',
    name: '逸夫楼',
    shortName: '逸夫楼',
    summary: '北院重要教学楼',
    description: '位于北院北部中轴附近，和艺术中心、东附楼相邻。',
    category: 'academic',
    zone: 'north',
    xPercent: 61.3,
    yPercent: 17.4,
  },
  {
    id: 'second-track',
    name: '第二田径场',
    shortName: '二田',
    summary: '北院西侧运动场',
    description: '靠近宿舍区与篮球场，是北院使用频率较高的运动区域。',
    category: 'sports',
    zone: 'north',
    xPercent: 14.2,
    yPercent: 28.1,
  },
  {
    id: 'first-track',
    name: '第一田径场',
    shortName: '一田',
    summary: '北院东侧大型运动场',
    description: '位于白马湖以东，邻近体育训练馆和网球场。',
    category: 'sports',
    zone: 'north',
    xPercent: 79.1,
    yPercent: 45.3,
  },
  {
    id: 'sports-center',
    name: '体育训练馆',
    shortName: '训练馆',
    summary: '体育训练与活动场馆',
    description: '位于北院东南区域，和网球场、第一田径场形成运动区。',
    category: 'sports',
    zone: 'north',
    xPercent: 81.6,
    yPercent: 58.8,
  },
  {
    id: 'canteen-three',
    name: '三食堂',
    shortName: '三食堂',
    summary: '北院西南侧食堂',
    description: '靠近宿舍与快递点，适合作为生活区的常用标记。',
    category: 'dining',
    zone: 'north',
    xPercent: 10.2,
    yPercent: 56.6,
  },
  {
    id: 'express-station',
    name: '邮政快递点',
    shortName: '快递点',
    summary: '生活服务点位',
    description: '位于北院西侧宿舍带附近，日常取件更方便定位。',
    category: 'service',
    zone: 'north',
    xPercent: 14.9,
    yPercent: 44.9,
  },
  {
    id: 'school-gate',
    name: '校大门',
    shortName: '校大门',
    summary: '南侧主出入口',
    description: '位于洞庭大道一侧，是南北院间的重要地标节点。',
    category: 'gate',
    zone: 'shared',
    xPercent: 50.9,
    yPercent: 91.3,
  },
  {
    id: 'office-building',
    name: '第二办公楼',
    shortName: '办公楼',
    summary: '南院行政办公区域',
    description: '位于南院中北部，和第一教学楼、天鹅湖相邻。',
    category: 'academic',
    zone: 'south',
    xPercent: 44.6,
    yPercent: 67.8,
  },
  {
    id: 'south-basketball',
    name: '南院篮球场',
    shortName: '篮球场',
    summary: '南院运动区域',
    description: '位于南院中部，靠近第一教学楼与宿舍区。',
    category: 'sports',
    zone: 'south',
    xPercent: 55.5,
    yPercent: 72.4,
  },
  {
    id: 'south-dormitory',
    name: '17舍 / 18舍',
    shortName: '17/18舍',
    summary: '南院宿舍区节点',
    description: '位于南院东南部，方便作为南院生活区的定位入口。',
    category: 'service',
    zone: 'south',
    xPercent: 67.6,
    yPercent: 76.0,
  },
];

const DONG_CAMPUS_MARKERS: CampusMapMarker[] = [];

export const CAMPUS_MAPS: CampusMapConfig[] = [
  {
    id: 'xibei',
    name: '西北校区',
    shortName: '西北校区',
    imageSrc: '/assets/campus-map/huas-campus-map.png',
    expectedPath: 'miniprogram/assets/campus-map/huas-campus-map.png',
    baseWidth: 1080,
    baseHeight: 1767,
    markers: XIBEI_CAMPUS_MARKERS,
  },
  {
    id: 'dong',
    name: '东校区',
    shortName: '东校区',
    imageSrc: '/assets/campus-map/huas-campus-map-dxq.png',
    expectedPath: 'miniprogram/assets/campus-map/huas-campus-map-dxq.png',
    baseWidth: 977,
    baseHeight: 1280,
    markers: DONG_CAMPUS_MARKERS,
  },
];

export function getCampusMapById(id: string | undefined): CampusMapConfig {
  return CAMPUS_MAPS.find((item) => item.id === id) || CAMPUS_MAPS[0];
}

export function buildCampusMapViewport(
  windowWidthPx: number,
  windowHeightPx: number,
  imageWidthPx: number,
  imageHeightPx: number,
): CampusMapViewport {
  const areaWidthPx = Math.max(1, Math.round(windowWidthPx));
  const areaHeightPx = Math.max(1, Math.round(windowHeightPx));
  const safeWidthPx = Math.max(1, areaWidthPx - VIEWPORT_PADDING_X_PX * 2);
  const safeHeightPx = Math.max(1, areaHeightPx - VIEWPORT_PADDING_Y_PX * 2);
  const normalizedImageWidthPx = Math.max(1, imageWidthPx);
  const normalizedImageHeightPx = Math.max(1, imageHeightPx);

  // Fit the full map into the safe viewport on first paint.
  const fitScale = Math.min(safeWidthPx / normalizedImageWidthPx, safeHeightPx / normalizedImageHeightPx);
  const mapWidthPx = Math.max(1, Math.round(normalizedImageWidthPx * fitScale));
  const mapHeightPx = Math.max(1, Math.round(normalizedImageHeightPx * fitScale));
  const initialX = Math.round((areaWidthPx - mapWidthPx) / 2);
  const initialY = Math.round((areaHeightPx - mapHeightPx) / 2);

  return {
    areaWidthPx,
    areaHeightPx,
    mapWidthPx,
    mapHeightPx,
    initialX,
    initialY,
    initialScale: CAMPUS_MAP_MIN_SCALE,
  };
}
