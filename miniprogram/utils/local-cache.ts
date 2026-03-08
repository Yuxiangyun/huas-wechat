import { setStorageWithAutoCleanup } from './storage';

export interface TimedCacheEntry<T> {
  timestamp: number;
  data: T;
  updatedAtText?: string;
  refreshHint?: string;
}

export function readTimedCache<T>(key: string, ttlMs: number): TimedCacheEntry<T> | null {
  try {
    const raw = wx.getStorageSync(key) as TimedCacheEntry<T> | Record<string, unknown> | '' | undefined;
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const timed = raw as Partial<TimedCacheEntry<T>>;
    if (typeof timed.timestamp !== 'number' || !('data' in timed)) {
      wx.removeStorageSync(key);
      return null;
    }

    if (Date.now() - timed.timestamp > ttlMs) {
      wx.removeStorageSync(key);
      return null;
    }

    return {
      timestamp: timed.timestamp,
      data: timed.data as T,
      updatedAtText: typeof timed.updatedAtText === 'string' ? timed.updatedAtText : undefined,
      refreshHint: typeof timed.refreshHint === 'string' ? timed.refreshHint : undefined,
    };
  } catch {
    return null;
  }
}

export function writeTimedCache<T>(
  key: string,
  data: T,
  updatedAtText?: string,
  refreshHint?: string,
): void {
  setStorageWithAutoCleanup(key, {
    timestamp: Date.now(),
    data,
    updatedAtText,
    refreshHint,
  } as TimedCacheEntry<T>);
}
