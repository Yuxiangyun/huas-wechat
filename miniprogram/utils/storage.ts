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

function setSafe(key: string, value: unknown): void {
  try {
    wx.setStorageSync(key, value);
  } catch {
    // Ignore quota/write errors in helper layer.
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
    try {
      const info = wx.getStorageInfoSync();
      info.keys.forEach((key) => {
        if (CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          wx.removeStorageSync(key);
        }
      });
      this.markScheduleCacheCleared();
    } catch {
      // Ignore and keep app usable.
    }
  },

  clearAll(): void {
    try {
      wx.clearStorageSync();
    } catch {
      // Ignore and keep app usable.
    }
  },
};
