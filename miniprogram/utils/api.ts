import { storage } from './storage';

export interface ApiMeta {
  cached?: boolean;
  source?: string;
  updated_at?: string;
  expires_at?: string;
}

interface ServerSuccess<T> {
  success: true;
  data: T;
  _meta?: ApiMeta;
}

interface ServerFailure {
  success: false;
  error_code: number;
  error_message: string;
  needCaptcha?: boolean;
  sessionId?: string;
  captchaImage?: string;
}

type ServerEnvelope<T> = ServerSuccess<T> | ServerFailure;

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T | null;
  meta?: ApiMeta;
  needCaptcha?: boolean;
  sessionId?: string;
  captchaImage?: string;
  action?: 'NEED_CAPTCHA';
}

export interface Course {
  name: string;
  teacher: string;
  location: string;
  day: number;
  section: string;
  weekStr?: string;
}

export interface ScheduleData {
  week: string;
  courses: Course[];
  message: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  captcha?: string;
  sessionId?: string;
}

export interface LoginSuccessData {
  token: string;
  user?: UserInfo;
}

export interface UserInfo {
  name: string;
  studentId: string;
  className: string;
  identity?: string;
  organizationCode?: string;
}

export interface ECardInfo {
  balance: number;
  status?: string;
  lastTime?: string;
}

export interface GradeSummary {
  totalCourses?: number;
  totalCredits?: number;
  averageGpa?: number;
  averageScore?: number;
}

export interface GradeItem {
  term: string;
  courseCode: string;
  courseName: string;
  groupName?: string;
  score: number | string;
  scoreText: string;
  pass: boolean;
  flag?: string;
  credit?: number;
  totalHours?: number;
  gpa?: number;
  retakeTerm?: string;
  examMethod?: string;
  examNature?: string;
  courseAttribute?: string;
  courseNature?: string;
  courseCategory?: string;
}

export interface GradeList {
  summary: GradeSummary;
  items: GradeItem[];
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'info' | 'warning' | 'error';
}

interface RequestOptions {
  path: string;
  method?: WechatMiniprogram.RequestOption['method'];
  data?: Record<string, unknown>;
  auth?: boolean;
  timeout?: number;
}

const API_BASE_URL_KEY = 'api_base_url';

function getDefaultBaseUrl(): string {
  try {
    const sysInfo = wx.getSystemInfoSync();
    if (sysInfo.platform === 'devtools') {
      return 'http://localhost:3000';
    }
    return '';
  } catch {
    return '';
  }
}

function getBaseUrl(): string {
  const app = getApp<IAppOption>();
  const globalBaseUrl = app && app.globalData ? app.globalData.apiBaseUrl : '';
  const localBaseUrl = wx.getStorageSync(API_BASE_URL_KEY) as string | '';
  const extBaseUrl = (() => {
    try {
      const extConfig = (typeof wx.getExtConfigSync === 'function'
        ? wx.getExtConfigSync()
        : {}) as { apiBaseUrl?: string };
      return extConfig.apiBaseUrl || '';
    } catch {
      return '';
    }
  })();

  if (typeof globalBaseUrl === 'string' && globalBaseUrl.trim()) {
    return globalBaseUrl.trim().replace(/\/$/, '');
  }

  if (typeof extBaseUrl === 'string' && extBaseUrl.trim()) {
    return extBaseUrl.trim().replace(/\/$/, '');
  }

  if (typeof localBaseUrl === 'string' && localBaseUrl.trim()) {
    return localBaseUrl.trim().replace(/\/$/, '');
  }

  return getDefaultBaseUrl();
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = `${baseUrl}${normalizedPath}`;
  if (!query) return base;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return params ? `${base}?${params}` : base;
}

function normalizeCourse(input: unknown, fallbackDay?: number): Course | null {
  if (!input || typeof input !== 'object') return null;

  const item = input as Record<string, unknown>;
  const sectionStart = item.startSection !== undefined ? item.startSection : item.start;
  const sectionEnd = item.endSection !== undefined ? item.endSection : item.end;

  let dayRaw: unknown = item.day;
  if (dayRaw === undefined || dayRaw === null) dayRaw = item.weekday;
  if (dayRaw === undefined || dayRaw === null) dayRaw = item.dayOfWeek;
  if (dayRaw === undefined || dayRaw === null) dayRaw = fallbackDay;
  if (dayRaw === undefined || dayRaw === null) dayRaw = 1;
  const day = Number.parseInt(String(dayRaw), 10);

  const section =
    typeof item.section === 'string' && item.section.trim()
      ? item.section.trim()
      : sectionStart !== undefined
      ? `${sectionStart}${sectionEnd !== undefined ? `-${sectionEnd}` : ''}`
      : '1-2';

  const name =
    (item.name as string) ||
    (item.courseName as string) ||
    (item.kcmc as string) ||
    '未命名课程';

  const teacher =
    (item.teacher as string) ||
    (item.teacherName as string) ||
    (item.jsxm as string) ||
    '';

  const location =
    (item.location as string) ||
    (item.classroom as string) ||
    (item.room as string) ||
    (item.jasmin as string) ||
    '';

  return {
    name,
    teacher,
    location,
    day: Number.isFinite(day) ? Math.min(7, Math.max(1, day)) : 1,
    section,
    weekStr: (item.weekStr as string) || (item.weeks as string) || '',
  };
}

function dateToDayOfWeek(dateText: string): number {
  const d = new Date(dateText.replace(/-/g, '/'));
  if (Number.isNaN(d.getTime())) return 1;
  return d.getDay() === 0 ? 7 : d.getDay();
}

function normalizePortalSchedule(payload: unknown): ScheduleData {
  const courses: Course[] = [];

  if (Array.isArray(payload)) {
    payload.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        const maybeRecord = entry as Record<string, unknown>;
        const date = typeof maybeRecord.date === 'string' ? maybeRecord.date : undefined;
        const fallbackDay = date ? dateToDayOfWeek(date) : undefined;

        const nested = maybeRecord.courses || maybeRecord.items || maybeRecord.list || maybeRecord.events;
        if (Array.isArray(nested)) {
          nested.forEach((course) => {
            const normalized = normalizeCourse(course, fallbackDay);
            if (normalized) courses.push(normalized);
          });
          return;
        }
      }

      const normalized = normalizeCourse(entry);
      if (normalized) courses.push(normalized);
    });
  } else if (payload && typeof payload === 'object') {
    Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
      const fallbackDay = dateToDayOfWeek(key);
      if (Array.isArray(value)) {
        value.forEach((course) => {
          const normalized = normalizeCourse(course, fallbackDay);
          if (normalized) courses.push(normalized);
        });
        return;
      }

      const normalized = normalizeCourse(value, fallbackDay);
      if (normalized) courses.push(normalized);
    });
  }

  return {
    week: '',
    courses,
    message: '',
  };
}

function normalizeSchedulePayload(payload: unknown): ScheduleData {
  if (Array.isArray(payload)) {
    return {
      week: '',
      courses: payload.map((item) => normalizeCourse(item)).filter((item): item is Course => Boolean(item)),
      message: '',
    };
  }

  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;

    if (Array.isArray(data.courses)) {
      return {
        week: (data.week as string) || '',
        courses: data.courses
          .map((item) => normalizeCourse(item))
          .filter((item): item is Course => Boolean(item)),
        message: (data.message as string) || '',
      };
    }
  }

  return normalizePortalSchedule(payload);
}

function mapEnvelopeToResponse<T>(statusCode: number, body: unknown): ApiResponse<T> {
  if (body && typeof body === 'object' && 'success' in (body as Record<string, unknown>)) {
    const envelope = body as ServerEnvelope<T>;

    if (envelope.success) {
      return {
        code: 200,
        msg: 'ok',
        data: envelope.data,
        meta: envelope._meta,
      };
    }

    const failure = envelope as ServerFailure;
    return {
      code: failure.error_code || statusCode,
      msg: failure.error_message || '请求失败',
      data: null,
      needCaptcha: failure.needCaptcha,
      sessionId: failure.sessionId,
      captchaImage: failure.captchaImage,
      action: failure.needCaptcha ? 'NEED_CAPTCHA' : undefined,
    };
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      code: 200,
      msg: 'ok',
      data: body as T,
    };
  }

  return {
    code: statusCode,
    msg: '请求失败',
    data: null,
  };
}

function handleAuthFailure(code: number): void {
  if (code !== 4001 && code !== 3003) return;

  storage.clearToken();
  storage.removeUserInfo();

  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current && current.route === 'pages/login/login') {
    return;
  }

  wx.reLaunch({ url: '/pages/login/login?sessionExpired=true' });
}

function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { path, method = 'GET', data, auth = true, timeout = 15000 } = options;
  const baseUrl = getBaseUrl();

  if (!baseUrl) {
    return Promise.resolve({
      code: -2,
      msg: '未配置 API 地址，请先设置 apiBaseUrl',
      data: null,
    });
  }

  if (auth && !storage.getToken()) {
    handleAuthFailure(4001);
    return Promise.resolve({
      code: 4001,
      msg: '未登录',
      data: null,
    });
  }

  const url = method === 'GET' ? buildUrl(baseUrl, path, data) : buildUrl(baseUrl, path);
  const header: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (auth) {
    header.Authorization = `Bearer ${storage.getToken()}`;
  }

  return new Promise((resolve) => {
    wx.request({
      url,
      method,
      data: method === 'GET' ? undefined : data,
      header,
      timeout,
      success: (res) => {
        const normalized = mapEnvelopeToResponse<T>(res.statusCode, res.data);
        if (auth) {
          handleAuthFailure(normalized.code);
        }
        resolve(normalized);
      },
      fail: () => {
        resolve({
          code: -1,
          msg: '网络异常，请稍后重试',
          data: null,
        });
      },
    });
  });
}

function shouldForceRefresh(forceRefresh?: boolean): 'true' | undefined {
  return forceRefresh ? 'true' : undefined;
}

export const api = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginSuccessData>> {
    const response = await request<LoginSuccessData>({
      path: '/auth/login',
      method: 'POST',
      auth: false,
      data: {
        username: payload.username,
        password: payload.password,
        captcha: payload.captcha,
        sessionId: payload.sessionId,
      },
    });
    return response;
  },

  async getSchedule(date?: string, forceRefresh = false): Promise<ApiResponse<ScheduleData>> {
    const response = await request<unknown>({
      path: '/api/schedule',
      method: 'GET',
      data: {
        date,
        refresh: shouldForceRefresh(forceRefresh),
      },
    });

    return {
      ...response,
      data: response.data ? normalizeSchedulePayload(response.data) : null,
    };
  },

  async getPortalSchedule(startDate: string, endDate: string, forceRefresh = false): Promise<ApiResponse<ScheduleData>> {
    const response = await request<unknown>({
      path: '/api/v1/schedule',
      method: 'GET',
      data: {
        startDate,
        endDate,
        refresh: shouldForceRefresh(forceRefresh),
      },
    });

    return {
      ...response,
      data: response.data ? normalizePortalSchedule(response.data) : null,
    };
  },

  async getGrades(
    params: { term?: string; kcxz?: string; kcmc?: string; refresh?: boolean } = {},
  ): Promise<ApiResponse<GradeList>> {
    return request<GradeList>({
      path: '/api/grades',
      method: 'GET',
      data: {
        term: params.term,
        kcxz: params.kcxz,
        kcmc: params.kcmc,
        refresh: shouldForceRefresh(params.refresh),
      },
    });
  },

  async getECard(forceRefresh = false): Promise<ApiResponse<ECardInfo>> {
    return request<ECardInfo>({
      path: '/api/ecard',
      method: 'GET',
      data: {
        refresh: shouldForceRefresh(forceRefresh),
      },
    });
  },

  async getUserInfo(forceRefresh = false): Promise<ApiResponse<UserInfo>> {
    return request<UserInfo>({
      path: '/api/user',
      method: 'GET',
      data: {
        refresh: shouldForceRefresh(forceRefresh),
      },
    });
  },

  async health(): Promise<ApiResponse<{ status: string; timestamp: string; uptime: number }>> {
    return request<{ status: string; timestamp: string; uptime: number }>({
      path: '/health',
      method: 'GET',
      auth: false,
    });
  },

  async getPublicAnnouncements(): Promise<ApiResponse<PublicAnnouncement[]>> {
    return {
      code: 200,
      msg: 'ok',
      data: [],
    };
  },

  async trackTabSwitch(_: { tab: string; studentId?: string; name?: string }): Promise<ApiResponse<{ ok: true }>> {
    return {
      code: 200,
      msg: 'ok',
      data: { ok: true },
    };
  },
};
