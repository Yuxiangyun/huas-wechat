const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

function toBeijingDate(date: Date): Date {
  return new Date(date.getTime() + BEIJING_OFFSET_MS);
}

export const getBeijingNow = (): Date => {
  return toBeijingDate(new Date());
};

function hasExplicitTimezone(text: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
}

function parseNaiveBeijingDate(text: string): Date | null {
  const normalized = text.trim().replace(/\//g, '-').replace('T', ' ');
  const match = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})(?::(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?)?$/,
  );
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4] || '0', 10);
  const minute = Number.parseInt(match[5] || '0', 10);
  const second = Number.parseInt(match[6] || '0', 10);
  const millis = Number.parseInt((match[7] || '0').padEnd(3, '0'), 10);

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59 ||
    second < 0 || second > 59
  ) {
    return null;
  }

  // Interpret timezone-naive inputs as Beijing local time.
  const utcMs = Date.UTC(year, month - 1, day, hour - 8, minute, second, millis);
  const parsed = new Date(utcMs);
  if (Number.isNaN(parsed.getTime())) return null;

  const check = toBeijingDate(parsed);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }

  return parsed;
}

export const formatTime = (date: Date): string => {
  const beijingDate = toBeijingDate(date);
  const year = beijingDate.getUTCFullYear();
  const month = beijingDate.getUTCMonth() + 1;
  const day = beijingDate.getUTCDate();
  const hour = beijingDate.getUTCHours();
  const minute = beijingDate.getUTCMinutes();
  const second = beijingDate.getUTCSeconds();

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  );
};

const formatNumber = (n: number): string => {
  const s = n.toString();
  return s[1] ? s : `0${s}`;
};

function parseDateValue(value: string | number | Date | undefined | null): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    const date = new Date(value.getTime());
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (hasExplicitTimezone(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const naiveBeijing = parseNaiveBeijingDate(text);
  if (naiveBeijing) {
    return naiveBeijing;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export const formatBeijingDateTime = (value: string | number | Date | undefined | null): string => {
  const date = parseDateValue(value);
  if (!date) return '';

  const beijingDate = toBeijingDate(date);
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');
  const hours = String(beijingDate.getUTCHours()).padStart(2, '0');
  const minutes = String(beijingDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(beijingDate.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const getBeijingHour = (value?: string | number | Date): number => {
  const date = parseDateValue(value ?? Date.now());
  if (!date) return 0;
  const beijingDate = toBeijingDate(date);
  return beijingDate.getUTCHours();
};

export const resolveUpdatedAtText = (serverUpdatedAt?: string): string | undefined => {
  const text = formatBeijingDateTime(serverUpdatedAt);
  return text || undefined;
};

export const triggerLightHaptic = (): void => {
  if (typeof wx.vibrateShort !== 'function') return;
  wx.vibrateShort({
    type: 'light',
    fail: () => {
      // Ignore devices that do not support haptic feedback.
    },
  });
};
