import {
  buildCampusMapViewport,
  CAMPUS_MAPS,
  CAMPUS_MAP_MAX_SCALE,
  CAMPUS_MAP_MIN_SCALE,
  DEFAULT_CAMPUS_MAP_ID,
  getCampusMapById,
  type CampusMapId,
} from '../../utils/campus-map/index';
import { createShareAppMessage, createShareTimeline } from '../../utils/share';
import { storage } from '../../utils/storage';
import { buildThemeStyle, DEFAULT_SCHEDULE_THEME_KEY, getScheduleThemeByKey, type ScheduleThemeKey } from '../../utils/theme';
import { triggerLightHaptic } from '../../utils/util';

const DEFAULT_CAMPUS_MAP = getCampusMapById(DEFAULT_CAMPUS_MAP_ID);
const TRANSFORM_SYNC_DELAY_MS = 80;

type CampusMapPageInstance = WechatMiniprogram.Page.Instance<Record<string, any>, Record<string, any>>;

interface TransformRuntimeState {
  latestX: number;
  latestY: number;
  latestScale: number;
  syncTimer: number | null;
}

const transformRuntimeStore = new WeakMap<object, TransformRuntimeState>();

function getTransformRuntime(page: CampusMapPageInstance): TransformRuntimeState {
  let runtime = transformRuntimeStore.get(page);
  if (!runtime) {
    runtime = {
      latestX: 0,
      latestY: 0,
      latestScale: CAMPUS_MAP_MIN_SCALE,
      syncTimer: null,
    };
    transformRuntimeStore.set(page, runtime);
  }

  return runtime;
}

function rememberTransform(page: CampusMapPageInstance, x: number, y: number, scale: number): void {
  const runtime = getTransformRuntime(page);
  runtime.latestX = x;
  runtime.latestY = y;
  runtime.latestScale = scale;
}

function clearTransformSync(page: CampusMapPageInstance): void {
  const runtime = getTransformRuntime(page);
  if (runtime.syncTimer === null) return;

  clearTimeout(runtime.syncTimer);
  runtime.syncTimer = null;
}

function createViewportData(viewport: ReturnType<typeof buildCampusMapViewport>): Record<string, number> {
  return {
    mapAreaWidthPx: viewport.areaWidthPx,
    mapAreaHeightPx: viewport.areaHeightPx,
    mapWidthPx: viewport.mapWidthPx,
    mapHeightPx: viewport.mapHeightPx,
    mapX: viewport.initialX,
    mapY: viewport.initialY,
    mapScale: viewport.initialScale,
    initialMapX: viewport.initialX,
    initialMapY: viewport.initialY,
    initialMapScale: viewport.initialScale,
  };
}

function applyViewport(
  page: CampusMapPageInstance,
  viewport: ReturnType<typeof buildCampusMapViewport>,
  extraData: Record<string, unknown> = {},
): void {
  rememberTransform(page, viewport.initialX, viewport.initialY, viewport.initialScale);
  page.setData({
    ...createViewportData(viewport),
    ...extraData,
  } as Record<string, any>);
}

function flushTransform(page: CampusMapPageInstance): void {
  const runtime = getTransformRuntime(page);
  const pageData = page.data as Record<string, any>;

  if (
    runtime.latestX === pageData.mapX &&
    runtime.latestY === pageData.mapY &&
    runtime.latestScale === pageData.mapScale
  ) {
    return;
  }

  page.setData({
    mapX: runtime.latestX,
    mapY: runtime.latestY,
    mapScale: runtime.latestScale,
  } as Record<string, any>);
}

function scheduleTransformSync(page: CampusMapPageInstance): void {
  clearTransformSync(page);

  const runtime = getTransformRuntime(page);
  runtime.syncTimer = setTimeout(() => {
    runtime.syncTimer = null;
    flushTransform(page);
  }, TRANSFORM_SYNC_DELAY_MS) as unknown as number;
}

function forceApplyTransform(
  page: CampusMapPageInstance,
  targetX: number,
  targetY: number,
  targetScale: number,
): void {
  const runtime = getTransformRuntime(page);
  const pageData = page.data as Record<string, any>;
  const latestX = runtime.latestX;
  const latestY = runtime.latestY;
  const latestScale = runtime.latestScale;

  clearTransformSync(page);
  rememberTransform(page, targetX, targetY, targetScale);

  const dataIsStale =
    latestX !== pageData.mapX ||
    latestY !== pageData.mapY ||
    latestScale !== pageData.mapScale;
  const latestDiffersFromTarget =
    latestX !== targetX ||
    latestY !== targetY ||
    latestScale !== targetScale;

  if (dataIsStale && latestDiffersFromTarget) {
    page.setData({
      mapX: latestX,
      mapY: latestY,
      mapScale: latestScale,
    } as Record<string, any>, () => {
      page.setData({
        mapX: targetX,
        mapY: targetY,
        mapScale: targetScale,
      } as Record<string, any>);
    });
    return;
  }

  page.setData({
    mapX: targetX,
    mapY: targetY,
    mapScale: targetScale,
  } as Record<string, any>);
}

Page({
  data: {
    currentScheduleThemeKey: DEFAULT_SCHEDULE_THEME_KEY as ScheduleThemeKey,
    themeStyle: buildThemeStyle(getScheduleThemeByKey(DEFAULT_SCHEDULE_THEME_KEY)),
    mapOptions: CAMPUS_MAPS.map((item) => ({
      id: item.id,
      name: item.name,
      shortName: item.shortName,
    })),
    activeMapId: DEFAULT_CAMPUS_MAP.id as CampusMapId,
    mapImageSrc: DEFAULT_CAMPUS_MAP.imageSrc,
    imageExpectedPath: DEFAULT_CAMPUS_MAP.expectedPath,
    mapImageStatus: 'loading',
    imageWidthPx: DEFAULT_CAMPUS_MAP.baseWidth,
    imageHeightPx: DEFAULT_CAMPUS_MAP.baseHeight,
    mapAreaWidthPx: 0,
    mapAreaHeightPx: 0,
    mapWidthPx: 0,
    mapHeightPx: 0,
    mapX: 0,
    mapY: 0,
    mapScale: CAMPUS_MAP_MIN_SCALE,
    initialMapX: 0,
    initialMapY: 0,
    initialMapScale: CAMPUS_MAP_MIN_SCALE,
    useMapAnimation: false,
    minScale: CAMPUS_MAP_MIN_SCALE,
    maxScale: CAMPUS_MAP_MAX_SCALE,
  },

  onLoad() {
    this.initializeViewport();
    this.loadScheduleTheme();
  },

  onShow() {
    this.loadScheduleTheme();
  },

  onUnload() {
    clearTransformSync(this as CampusMapPageInstance);
  },

  initializeViewport() {
    const systemInfo = wx.getSystemInfoSync();
    const viewport = buildCampusMapViewport(
      systemInfo.windowWidth,
      systemInfo.windowHeight,
      this.data.imageWidthPx,
      this.data.imageHeightPx,
    );
    applyViewport(this as CampusMapPageInstance, viewport);
  },

  loadScheduleTheme() {
    const theme = getScheduleThemeByKey(storage.getScheduleTheme());
    this.setData({
      currentScheduleThemeKey: theme.key,
      themeStyle: buildThemeStyle(theme),
    });
  },

  onMapImageLoad(e: WechatMiniprogram.CustomEvent<{ width?: number; height?: number }>) {
    const width = Number(e.detail?.width || 0);
    const height = Number(e.detail?.height || 0);

    if (width > 0 && height > 0 && (width !== this.data.imageWidthPx || height !== this.data.imageHeightPx)) {
      const systemInfo = wx.getSystemInfoSync();
      const viewport = buildCampusMapViewport(systemInfo.windowWidth, systemInfo.windowHeight, width, height);
      applyViewport(this as CampusMapPageInstance, viewport, {
        imageWidthPx: width,
        imageHeightPx: height,
        mapImageStatus: 'ready',
      });
      return;
    }

    if (this.data.mapImageStatus === 'ready') return;
    this.setData({ mapImageStatus: 'ready' });
  },

  onMapImageError() {
    this.setData({ mapImageStatus: 'error' });
  },

  switchCampusMap(e: WechatMiniprogram.TouchEvent) {
    const nextMapId = e.currentTarget.dataset.id as CampusMapId | undefined;
    if (!nextMapId || nextMapId === this.data.activeMapId) return;

    const nextMap = getCampusMapById(nextMapId);
    const systemInfo = wx.getSystemInfoSync();
    const viewport = buildCampusMapViewport(
      systemInfo.windowWidth,
      systemInfo.windowHeight,
      nextMap.baseWidth,
      nextMap.baseHeight,
    );

    triggerLightHaptic();
    applyViewport(this as CampusMapPageInstance, viewport, {
      activeMapId: nextMap.id,
      mapImageSrc: nextMap.imageSrc,
      imageExpectedPath: nextMap.expectedPath,
      mapImageStatus: 'loading',
      imageWidthPx: nextMap.baseWidth,
      imageHeightPx: nextMap.baseHeight,
    });
  },

  onMapChange(e: WechatMiniprogram.CustomEvent<{ x: number; y: number; source: string }>) {
    const { x, y, source } = e.detail;
    if (!source) return;

    rememberTransform(this as CampusMapPageInstance, x, y, getTransformRuntime(this as CampusMapPageInstance).latestScale);
    scheduleTransformSync(this as CampusMapPageInstance);
  },

  onMapScale(e: WechatMiniprogram.CustomEvent<{ x?: number; y?: number; scale: number }>) {
    const runtime = getTransformRuntime(this as CampusMapPageInstance);
    const { x, y, scale } = e.detail;
    rememberTransform(
      this as CampusMapPageInstance,
      typeof x === 'number' ? x : runtime.latestX,
      typeof y === 'number' ? y : runtime.latestY,
      typeof scale === 'number' ? scale : runtime.latestScale,
    );
    scheduleTransformSync(this as CampusMapPageInstance);
  },

  resetViewport() {
    triggerLightHaptic();
    forceApplyTransform(
      this as CampusMapPageInstance,
      this.data.initialMapX,
      this.data.initialMapY,
      this.data.initialMapScale,
    );
  },

  onShareAppMessage() {
    const currentMap = getCampusMapById(this.data.activeMapId);
    return createShareAppMessage({
      title: `校园地图 · ${currentMap.name}`,
      path: '/pages/campus-map/campus-map',
    });
  },

  onShareTimeline() {
    const currentMap = getCampusMapById(this.data.activeMapId);
    return createShareTimeline({
      title: `校园地图 · ${currentMap.name}`,
    });
  },
});
