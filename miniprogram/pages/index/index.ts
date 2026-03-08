// pages/index/index.ts - 课程表首页
import { api, Course, PublicAnnouncement } from '../../utils/api';
import { fetchPublicAnnouncements, hasUnreadAnnouncements, markAnnouncementsAsRead } from '../../utils/announcements';
import { createDefaultShareContent, createShareAppMessage } from '../../utils/share';
import { storage, setStorageWithAutoCleanup } from '../../utils/storage';
import { customCourseStorage, parseWeekNum, formatWeeks } from '../../utils/custom-course/index';
import { buildThemeStyle, DEFAULT_SCHEDULE_THEME_KEY, getScheduleThemeByKey } from '../../utils/theme';
import { setSelectedTab } from '../../utils/tab-bar';
import { getBeijingNow, resolveRefreshHint, resolveUpdatedAtText, triggerLightHaptic } from '../../utils/util';

interface DisplayCourse extends Course {
  id: string;
  exactStart: number;
  exactEnd: number;
  exactCount: number;
  bigSectionStart: number;
  conflictCount: number;
  conflictIndex: number;
  cardStyle: string;
  colorIndex: number;
  dayStr: string;
  isCustom?: boolean;
  customId?: string;
  weeksText?: string;
}

const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];

interface SectionTimeRange {
  start: number;
  end: number;
  breakEnd: number;
}

const SECTION_TIME_RANGES: SectionTimeRange[] = [
  { start: 480, end: 580, breakEnd: 600 },
  { start: 600, end: 700, breakEnd: 870 },
  { start: 870, end: 970, breakEnd: 990 },
  { start: 990, end: 1090, breakEnd: 1140 },
  { start: 1140, end: 1240, breakEnd: 1240 },
];

let timeLineTimer: number | null = null;
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatBeijingToday(): string {
  const now = getBeijingNow();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getHashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function formatRemainText(remainMinutes: number): string {
  if (remainMinutes >= 60) {
    const hours = Math.floor(remainMinutes / 60);
    const minutes = remainMinutes % 60;
    return minutes > 0 ? `${hours}h${minutes}` : `${hours}h`;
  }
  return `${remainMinutes}分`;
}

Page({
  data: {
    dataSources: ['默认', '备用'],
    currentDataSourceIndex: 0,
    currentWeek: '未知',
    currentDate: '',
    selectedDate: '',
    days: [] as { name: string; date: string; isToday: boolean }[],
    sections: [
      { num: '1-2', start: '08:00', end: '09:40' },
      { num: '3-4', start: '10:00', end: '11:40' },
      { num: '5-6', start: '14:30', end: '16:10' },
      { num: '7-8', start: '16:30', end: '18:10' },
      { num: '9-10', start: '19:00', end: '20:40' },
    ],
    courses: [] as DisplayCourse[],
    allCourses: [] as Course[],
    loading: false,
    showDetail: false,
    detailCourse: {} as DisplayCourse,
    showAnnouncementsModal: false,
    showAnnouncementDot: false,
    announcements: [] as PublicAnnouncement[],
    isCurrentWeek: true,
    scheduleMessage: '',
    scheduleUpdatedAtText: '',
    scheduleRefreshHint: '',
    scheduleRefreshing: false,
    showWeekend: true,
    currentTimeLineTop: null as number | null,
    todayDayOfWeek: 1,
    timeLineCountdown: '',
    currentScheduleThemeKey: DEFAULT_SCHEDULE_THEME_KEY,
    themeStyle: buildThemeStyle(getScheduleThemeByKey(DEFAULT_SCHEDULE_THEME_KEY)),
    // 新增：动态计算的高度数据
    sectionHeight: 180,
    periodHeight: 90
  },

  onLoad() {
    const today = formatBeijingToday();
    this.setData({ selectedDate: today });
    this.calculateLayout(); // 初始化时计算自适应高度
    this.applyScheduleTheme();
  },

  onShow() {
    setSelectedTab(this, 0);
    if (!storage.getToken()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    this.applyScheduleTheme();
    this.updateDateInfo();

    const scheduleCacheCleared = storage.consumeScheduleCacheCleared();
    if (scheduleCacheCleared) {
      this.fetchSchedule(true);
    } else {
      this.fetchSchedule();
    }

    this.checkAnnouncementUnread();

    this.startTimeLineTimer();
  },

  onHide() { this.stopTimeLineTimer(); },
  onUnload() { this.stopTimeLineTimer(); },

  applyScheduleTheme() {
    const theme = getScheduleThemeByKey(storage.getScheduleTheme());
    const themeStyle = buildThemeStyle(theme);
    const themeChanged = this.data.currentScheduleThemeKey !== theme.key;

    this.setData(
      {
        currentScheduleThemeKey: theme.key,
        themeStyle,
      },
      () => {
        if (themeChanged && this.data.courses.length > 0) {
          this.processCourses();
        }
      },
    );
  },

  // 计算屏幕剩余高度并均分给5节课
  calculateLayout() {
    try {
      const wxAny = wx as any;
      const useWindowInfo = typeof wxAny.getWindowInfo === 'function';
      const info = useWindowInfo ? wxAny.getWindowInfo() : wx.getSystemInfoSync();
      const windowWidth = info.windowWidth;
      const windowHeight = info.windowHeight;
      const screenHeight = info.screenHeight;
      const safeAreaBottom = info.safeArea ? info.safeArea.bottom : undefined;

      const rpxRatio = 750 / windowWidth;
      const windowHeightRpx = windowHeight * rpxRatio;
      const safeAreaBottomPx = typeof safeAreaBottom === 'number'
        ? Math.max(0, screenHeight - safeAreaBottom)
        : 0;
      const safeAreaBottomRpx = safeAreaBottomPx * rpxRatio;

      // 顶部固定区 + 底部 tabbar 和安全区预留，避免最后一节被遮挡且无法滚动
      const topReserveRpx = 280;
      const bottomReserveRpx = 140 + safeAreaBottomRpx;
      const availableHeight = windowHeightRpx - topReserveRpx - bottomReserveRpx;
      let sectionHeight = Math.floor(availableHeight / 5);

      // 设置一个保底高度，防止在极其矮的屏幕上压扁
      if (sectionHeight < 140) sectionHeight = 140;

      this.setData({
        sectionHeight: sectionHeight,
        periodHeight: sectionHeight / 2
      });
    } catch (e) {
      console.error('获取系统信息失败，使用默认高度');
    }
  },

  startTimeLineTimer() {
    this.stopTimeLineTimer();
    this.updateTimeLine();
    timeLineTimer = setInterval(() => { this.updateTimeLine(); }, 60000) as any;
  },

  stopTimeLineTimer() {
    if (timeLineTimer) { clearInterval(timeLineTimer); timeLineTimer = null; }
  },

  updateTimeLine() {
    if (!this.data.isCurrentWeek) {
      this.setData({ currentTimeLineTop: null });
      return;
    }
    const now = getBeijingNow();
    const todayDayOfWeek = now.getUTCDay() || 7;
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const totalMinutes = hour * 60 + minute;
    const sh = this.data.sectionHeight; // 获取动态的大节高度

    let top = -1;
    let countdown = '';
    let activeSectionIndex = -1;
    let remain = 0;

    if (totalMinutes < SECTION_TIME_RANGES[0].start) {
      top = 0;
    } else {
      const sectionCount = SECTION_TIME_RANGES.length;
      for (let i = 0; i < sectionCount; i++) {
        const section = SECTION_TIME_RANGES[i];
        if (totalMinutes <= section.end) {
          top = i * sh + ((totalMinutes - section.start) / (section.end - section.start)) * sh;
          activeSectionIndex = i;
          remain = section.end - totalMinutes;
          break;
        }
        if (totalMinutes <= section.breakEnd) {
          top = (i + 1) * sh;
          break;
        }
      }
      if (top === -1) {
        top = sectionCount * sh;
      }
    }

    if (activeSectionIndex !== -1) {
      const hasClassNow = this.data.courses.some((c: any) => c.day === todayDayOfWeek && c.bigSectionStart === (activeSectionIndex + 1));
      if (hasClassNow) {
        countdown = `距下课${formatRemainText(remain)}`;
      }
    }

    this.setData({ currentTimeLineTop: top, todayDayOfWeek, timeLineCountdown: countdown });
  },

  updateDateInfo(dateStr?: string) {
    const selectedDateStr = dateStr || this.data.selectedDate;
    const selectedDate = new Date(selectedDateStr.replace(/-/g, '/'));
    const monday = getMonday(selectedDate);
    const todayStr = formatBeijingToday();
    const todayMonday = getMonday(new Date(todayStr.replace(/-/g, '/')));
    const isCurrentWeek = monday.getTime() === todayMonday.getTime();

    const displayDate = `${monday.getMonth() + 1}/${monday.getDate()}`;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = formatDate(d);
      days.push({
        name: DAY_NAMES[i],
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        isToday: dStr === todayStr,
      });
    }
    this.setData({ currentDate: displayDate, days, isCurrentWeek });
  },

  async fetchSchedule(forceRefresh = false) {
    const { selectedDate, allCourses, currentDataSourceIndex } = this.data;
    const previousUpdatedAtText = this.data.scheduleUpdatedAtText;
    const previousRefreshHint = this.data.scheduleRefreshHint;
    let shouldRestoreScheduleMeta = true;
    if (allCourses.length === 0) {
      this.setData({ loading: true, scheduleUpdatedAtText: '', scheduleRefreshHint: '' });
    }

    const customCourseChanged = storage.consumeCustomCourseChanged();

    // 垃圾回收：清理超过 24 小时的课表旧缓存，防止 10MB 空间耗尽（Storage Leak 修复）
    try {
      const resList = wx.getStorageInfoSync();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      resList.keys.forEach(key => {
        if (key.startsWith('cache_schedule_')) {
          if (customCourseChanged) {
            wx.removeStorageSync(key);
            return;
          }
          const item = wx.getStorageSync(key);
          if (item && item.timestamp && Date.now() - item.timestamp > ONE_DAY_MS) {
            wx.removeStorageSync(key);
            console.log(`🗑️ [GC] 清理过期课表缓存：${key}`);
          }
        }
      });
      if (customCourseChanged) {
        console.log('🗑️ [Cache] 自定义课程变更，已清空全部课表缓存');
      }
    } catch (e) {
      console.warn('清理课表缓存失败', e);
    }

    try {
      const cacheKey = `cache_schedule_${currentDataSourceIndex}_${selectedDate}`;
      const cacheData = wx.getStorageSync(cacheKey);

      if (!forceRefresh && cacheData) {
        const { timestamp, data, updatedAtText, refreshHint } = cacheData as {
          timestamp: number;
          data: { week?: string; courses?: Course[]; message?: string };
          updatedAtText?: string;
          refreshHint?: string;
        };
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < ONE_DAY_MS) {
          if ((typeof updatedAtText === 'string' && updatedAtText) || (typeof refreshHint === 'string' && refreshHint)) {
            console.log(`✅ [Cache] 课程表(${selectedDate})：命中24小时本地缓存`);
            this.setData({
              currentWeek: currentDataSourceIndex === 1 ? '' : (data.week || '未知'),
              allCourses: Array.isArray(data.courses) ? data.courses : [],
              scheduleMessage: data.message || '',
              scheduleUpdatedAtText: refreshHint ? '' : (updatedAtText || ''),
              scheduleRefreshHint: refreshHint || '',
              loading: false
            });
            this.processCourses();
            shouldRestoreScheduleMeta = false;
            return;
          }
          console.log(`ℹ️ [Cache] 课程表(${selectedDate})：命中旧缓存但缺少更新时间，回源补齐`);
        } else {
          console.log(`⏳ [Cache] 课程表(${selectedDate})：缓存已过期，时长：${(Date.now() - timestamp) / 1000 / 60 / 60} 小时`);
        }
      }

      console.log(`🌐 [Network] 课程表(${selectedDate})：拉取新网路数据...`);
      this.setData({ scheduleRefreshing: true, scheduleRefreshHint: '' });
      let res;
      if (currentDataSourceIndex === 1) {
        const selectedDateObj = new Date(selectedDate.replace(/-/g, '/'));
        const monday = getMonday(selectedDateObj);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        res = await api.getPortalSchedule(formatDate(monday), formatDate(sunday), forceRefresh);
      } else {
        res = await api.getSchedule(selectedDate, forceRefresh);
      }

      if ((res.code === 0 || res.code === 200) && res.data) {
        const scheduleUpdatedAtText = resolveUpdatedAtText(res.meta?.updated_at);
        const scheduleRefreshHint = resolveRefreshHint(res.meta, scheduleUpdatedAtText)
          || (scheduleUpdatedAtText ? '' : '已更新');
        const dataToCache = {
          week: res.data.week,
          courses: res.data.courses,
          message: res.data.message
        };
        setStorageWithAutoCleanup(cacheKey, {
          timestamp: Date.now(),
          data: dataToCache,
          ...(scheduleUpdatedAtText ? { updatedAtText: scheduleUpdatedAtText } : {}),
          ...(scheduleRefreshHint ? { refreshHint: scheduleRefreshHint } : {}),
        });

        const nextData: Record<string, unknown> = {
          currentWeek: currentDataSourceIndex === 1 ? '' : (res.data.week || '未知'),
          allCourses: Array.isArray(res.data.courses) ? res.data.courses : [],
          scheduleMessage: res.data.message || '',
          scheduleUpdatedAtText: scheduleRefreshHint ? '' : (scheduleUpdatedAtText || ''),
          scheduleRefreshHint,
        };
        this.setData(nextData);
        this.processCourses();
        shouldRestoreScheduleMeta = false;
      } else {
        wx.showToast({ title: res.msg || '获取课表失败', icon: 'none' });
      }
    } catch (err: any) {
      console.error('获取课程表失败:', err);
      wx.showToast({ title: err?.msg || '获取课表失败', icon: 'none' });
    } finally {
      if (shouldRestoreScheduleMeta) {
        this.setData({
          scheduleUpdatedAtText: previousUpdatedAtText,
          scheduleRefreshHint: previousRefreshHint,
        });
      }
      this.setData({ loading: false, scheduleRefreshing: false });
    }
  },

  processCourses() {
    const { allCourses, currentWeek, scheduleMessage, periodHeight, currentDataSourceIndex } = this.data;
    if (!Array.isArray(allCourses)) return;

    const weekNum = parseWeekNum(currentWeek) || parseWeekNum(scheduleMessage);
    const useWeekBasedCustomCourses = currentDataSourceIndex === 0 && weekNum > 0;
    const customCourses =
      currentDataSourceIndex === 0
        ? useWeekBasedCustomCourses
          ? customCourseStorage.getByWeek(weekNum)
          : customCourseStorage.getAll()
        : [];
    const mergedCourses = [
      ...allCourses,
      ...customCourses.map(c => ({ ...c, weekStr: formatWeeks(c.weeks) })),
    ];
    const theme = getScheduleThemeByKey(this.data.currentScheduleThemeKey);
    const courseColors = theme.courseColors;

    const parsedCourses: DisplayCourse[] = mergedCourses.map((course) => {
      const sectionMatch = course.section.match(/(\d+)\s*[-~,，]?(\d+)?/);
      const exactStart = sectionMatch ? parseInt(sectionMatch[1]) : 1;
      const exactEnd = sectionMatch && sectionMatch[2] ? parseInt(sectionMatch[2]) : exactStart;
      const exactCount = exactEnd - exactStart + 1;
      const bigSectionStart = Math.ceil(exactStart / 2);

      const isCustom = !!(course as any).isCustom;
      const colorIndex = getHashCode(course.name) % 15;

      return {
        ...course,
        id: isCustom ? `custom-${(course as any).customId}` : `${course.day}-${course.section}-${course.name}`,
        exactStart, exactEnd, exactCount, bigSectionStart,
        conflictCount: 1, conflictIndex: 0, cardStyle: '', colorIndex,
        dayStr: DAY_NAMES[course.day - 1] || '',
        isCustom, customId: (course as any).customId,
        weeksText: isCustom ? formatWeeks((course as any).weeks) : (course.weekStr || ''),
      } as DisplayCourse;
    });

    const coursesByDay: Record<number, DisplayCourse[]> = {};
    parsedCourses.forEach(c => {
      if (!coursesByDay[c.day]) coursesByDay[c.day] = [];
      coursesByDay[c.day].push(c);
    });

    Object.values(coursesByDay).forEach(dayCourses => {
      dayCourses.forEach(c1 => {
        const group = dayCourses.filter(c2 => Math.max(c1.exactStart, c2.exactStart) <= Math.min(c1.exactEnd, c2.exactEnd));
        if (group.length > 1) {
          group.sort((a, b) => a.id.localeCompare(b.id));
          c1.conflictCount = Math.max(c1.conflictCount, group.length);
          c1.conflictIndex = group.findIndex(x => x.id === c1.id);
        }
      });
    });

    const courses = parsedCourses.map(c => {
      // 核心修改：高度计算使用动态生成的 periodHeight
      const height = c.exactCount * periodHeight - 16;
      const topOffset = (c.exactStart % 2 === 0) ? periodHeight : 0;
      const widthPercent = 100 / c.conflictCount;
      const leftPercent = c.conflictIndex * widthPercent;
      const color = courseColors[c.colorIndex % courseColors.length];
      c.cardStyle = `height: ${height}rpx; top: ${topOffset}rpx; margin-top: 8rpx; width: calc(${widthPercent}% - 8rpx); left: calc(${leftPercent}% + 4rpx); z-index: ${5 + c.conflictIndex}; background: ${color.background}; border-left-color: ${color.border};`;
      return c;
    });

    let showWeekend = courses.some(c => c.day === 6 || c.day === 7);
    if (this.data.isCurrentWeek) {
      const now = getBeijingNow();
      const todayDay = now.getUTCDay() || 7;
      if (todayDay === 6 || todayDay === 7) showWeekend = true;
    }

    this.setData({ courses, showWeekend });
    this.updateTimeLine();
  },

  onPullDownRefresh() {
    triggerLightHaptic();
    this.fetchSchedule(true).then(() => wx.stopPullDownRefresh());
  },
  handleRefresh() {
    triggerLightHaptic();
    this.fetchSchedule(true);
  },
  prevWeek() {
    triggerLightHaptic();
    this.changeWeek(-7);
  },
  nextWeek() {
    triggerLightHaptic();
    this.changeWeek(7);
  },
  changeWeek(days: number) {
    const current = new Date(this.data.selectedDate.replace(/-/g, '/'));
    current.setDate(current.getDate() + days);
    const newDate = formatDate(current);
    this.setData({ selectedDate: newDate, allCourses: [] });
    this.updateDateInfo(newDate);
    this.fetchSchedule();
  },
  goToCurrentWeek() {
    triggerLightHaptic();
    if (this.data.isCurrentWeek) return;
    const today = formatBeijingToday();
    this.setData({ selectedDate: today, allCourses: [] });
    this.updateDateInfo(today);
    this.fetchSchedule();
  },
  onDateChange(e: any) {
    triggerLightHaptic();
    const date = e.detail.value;
    this.setData({ selectedDate: date, allCourses: [] });
    this.updateDateInfo(date);
    this.fetchSchedule();
  },

  onDataSourceChange(e: any) {
    triggerLightHaptic();
    const index = parseInt(e.detail.value, 10);
    if (this.data.currentDataSourceIndex !== index) {
      this.setData({ currentDataSourceIndex: index, allCourses: [] });
      this.fetchSchedule();
    }
  },

  showCourseDetail(e: any) {
    this.setData({ showDetail: true, detailCourse: e.currentTarget.dataset.course });
  },
  hideDetail() {
    this.setData({ showDetail: false });
  },
  stopPropagation() { },

  async checkAnnouncementUnread() {
    try {
      const res = await fetchPublicAnnouncements();
      if ((res.code === 0 || res.code === 200) && Array.isArray(res.data)) {
        this.setData({ showAnnouncementDot: hasUnreadAnnouncements(res.data) });
      }
    } catch {
      // 静默失败，不影响主流程
    }
  },

  async showAnnouncements() {
    this.setData({ showAnnouncementsModal: true });
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await fetchPublicAnnouncements();
      if ((res.code === 0 || res.code === 200) && Array.isArray(res.data)) {
        markAnnouncementsAsRead(res.data);
        this.setData({ announcements: res.data, showAnnouncementDot: false });
      } else {
        wx.showToast({ title: res.msg || '获取公告失败', icon: 'none' });
      }
    } catch (err: any) {
      console.error('获取公告失败:', err);
    } finally {
      wx.hideLoading();
    }
  },

  hideAnnouncements() {
    this.setData({ showAnnouncementsModal: false });
  },

  onShareAppMessage() { return createShareAppMessage(createDefaultShareContent('为文理er准备的查课表小程序！')); }
});
