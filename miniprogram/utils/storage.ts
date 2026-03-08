import type { UserInfo } from './api';

interface Credentials {
  username: string;
  password: string;
}

const KEYS = {
  token: 'token',
  userInfo: 'user_info',
  credentials: 'credentials',
  rememberPassword: 'remember_password',
  lastLoginUsername: 'last_login_username',
  scheduleTheme: 'schedule_theme',
  customCourseChanged: 'custom_course_changed',
  scheduleCacheCleared: 'schedule_cache_cleared',
} as const;

const CACHE_PREFIXES = ['cache_', 'announcement_'];

function getSafe<T>(key: string): T | null {
  try {
    const value = wx.getStorageSync(key) as T | '' | undefined;
    if (value === '' || value === undefined || value === null) {
      return null;
    }
    return value as T;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const withErrMsg = error as { errMsg?: unknown; message?: unknown };
    if (typeof withErrMsg.errMsg === 'string') {
      return withErrMsg.errMsg;
    }
    if (typeof withErrMsg.message === 'string') {
      return withErrMsg.message;
    }
  }

  return '';
}

function isStorageQuotaError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  if (!message) return false;

  return /quota|exceed|maximum|max size|storage|full|space|容量|空间|超出|上限|满/.test(message);
}

function removeCacheStorageKeys(): number {
  try {
    const info = wx.getStorageInfoSync();
    const cacheKeys = info.keys.filter((key) => CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)));

    const sorted = cacheKeys
      .map((key) => {
        let timestamp = 0;
        try {
          const value = wx.getStorageSync(key) as { timestamp?: unknown } | '' | undefined;
          if (value && typeof value === 'object' && typeof value.timestamp === 'number') {
            timestamp = value.timestamp;
          }
        } catch {
          // Ignore invalid cache data.
        }
        return { key, timestamp };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    let removed = 0;
    sorted.forEach(({ key }) => {
      try {
        wx.removeStorageSync(key);
        removed += 1;
      } catch {
        // Ignore remove errors.
      }
    });

    return removed;
  } catch {
    return 0;
  }
}

export function setStorageWithAutoCleanup(key: string, value: unknown): boolean {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (error) {
    if (!isStorageQuotaError(error)) {
      return false;
    }

    const removed = removeCacheStorageKeys();
    if (removed <= 0) {
      return false;
    }

    try {
      wx.setStorageSync(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function setSafe(key: string, value: unknown): void {
  const success = setStorageWithAutoCleanup(key, value);
  if (!success) {
    console.warn(`[Storage] 写入失败：${key}`);
  }
}

export const storage = {
  saveToken(token: string): void {
    setSafe(KEYS.token, token);
  },

  getToken(): string {
    const token = getSafe<string>(KEYS.token);
    return token || '';
  },

  clearToken(): void {
    wx.removeStorageSync(KEYS.token);
  },

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  },

  saveUserInfo(userInfo: UserInfo): void {
    setSafe(KEYS.userInfo, userInfo);
  },

  getUserInfo(): UserInfo | null {
    return getSafe<UserInfo>(KEYS.userInfo);
  },

  removeUserInfo(): void {
    wx.removeStorageSync(KEYS.userInfo);
  },

  saveCredentials(username: string, password: string): void {
    setSafe(KEYS.credentials, { username, password } as Credentials);
  },

  getCredentials(): Credentials | null {
    return getSafe<Credentials>(KEYS.credentials);
  },

  removeCredentials(): void {
    wx.removeStorageSync(KEYS.credentials);
  },

  setRememberPassword(remember: boolean): void {
    setSafe(KEYS.rememberPassword, remember);
  },

  getRememberPassword(): boolean {
    const saved = getSafe<boolean>(KEYS.rememberPassword);
    return saved !== false;
  },

  saveLastLoginUsername(username: string): void {
    setSafe(KEYS.lastLoginUsername, username);
  },

  getLastLoginUsername(): string {
    const username = getSafe<string>(KEYS.lastLoginUsername);
    return username || '';
  },

  removeLastLoginUsername(): void {
    wx.removeStorageSync(KEYS.lastLoginUsername);
  },

  saveScheduleTheme(themeKey: string): void {
    setSafe(KEYS.scheduleTheme, themeKey);
  },

  getScheduleTheme(): string {
    return getSafe<string>(KEYS.scheduleTheme) || '';
  },

  markCustomCourseChanged(): void {
    setSafe(KEYS.customCourseChanged, true);
  },

  consumeCustomCourseChanged(): boolean {
    const changed = getSafe<boolean>(KEYS.customCourseChanged) === true;
    if (changed) {
      wx.removeStorageSync(KEYS.customCourseChanged);
    }
    return changed;
  },

  markScheduleCacheCleared(): void {
    setSafe(KEYS.scheduleCacheCleared, true);
  },

  consumeScheduleCacheCleared(): boolean {
    const cleared = getSafe<boolean>(KEYS.scheduleCacheCleared) === true;
    if (cleared) {
      wx.removeStorageSync(KEYS.scheduleCacheCleared);
    }
    return cleared;
  },

  clearCacheKeepLogin(): void {
    removeCacheStorageKeys();
    this.markScheduleCacheCleared();
  },

  clearAll(): void {
    try {
      wx.clearStorageSync();
    } catch {
      // Ignore and keep app usable.
    }
  },
};
