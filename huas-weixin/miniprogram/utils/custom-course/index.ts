import { setStorageWithAutoCleanup } from '../storage';

export interface CustomCourse {
  customId: string;
  name: string;
  teacher: string;
  location: string;
  day: number;
  section: string;
  weeks: number[];
  isCustom: boolean;
}

interface CreateCustomCourseInput {
  name: string;
  teacher: string;
  location: string;
  day: number;
  section: string;
  weeks: number[];
}

const KEY = 'custom_courses';

function normalizeDay(day: number): number {
  if (day < 1) return 1;
  if (day > 7) return 7;
  return day;
}

function normalizeWeeks(weeks: number[]): number[] {
  const unique = new Set<number>();
  weeks.forEach((week) => {
    if (Number.isInteger(week) && week >= 1 && week <= 30) {
      unique.add(week);
    }
  });
  return Array.from(unique).sort((a, b) => a - b);
}

function readAll(): CustomCourse[] {
  try {
    const raw = wx.getStorageSync(KEY) as CustomCourse[] | '' | undefined;
    if (!raw || !Array.isArray(raw)) {
      return [];
    }
    return raw
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        customId: item.customId,
        name: item.name,
        teacher: item.teacher || '',
        location: item.location || '',
        day: normalizeDay(item.day),
        section: item.section,
        weeks: normalizeWeeks(item.weeks || []),
        isCustom: true,
      }))
      .filter((item) => Boolean(item.customId && item.name && item.section));
  } catch {
    return [];
  }
}

function writeAll(courses: CustomCourse[]): void {
  const success = setStorageWithAutoCleanup(KEY, courses);
  if (!success) {
    console.warn('[Storage] 自定义课程写入失败');
  }
}

function buildCustomId(): string {
  return `cc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const customCourseStorage = {
  getAll(): CustomCourse[] {
    return readAll();
  },

  getByWeek(week: number): CustomCourse[] {
    if (!Number.isInteger(week) || week <= 0) {
      return [];
    }
    return readAll().filter((course) => course.weeks.includes(week));
  },

  add(input: CreateCustomCourseInput): CustomCourse {
    const all = readAll();
    const next: CustomCourse = {
      customId: buildCustomId(),
      name: input.name.trim(),
      teacher: input.teacher.trim(),
      location: input.location.trim(),
      day: normalizeDay(input.day),
      section: input.section.trim(),
      weeks: normalizeWeeks(input.weeks),
      isCustom: true,
    };
    all.push(next);
    writeAll(all);
    return next;
  },

  remove(customId: string): void {
    const all = readAll().filter((course) => course.customId !== customId);
    writeAll(all);
  },

  removeAll(): void {
    wx.removeStorageSync(KEY);
  },
};

export function parseWeekNum(weekText: string): number {
  if (!weekText) return 0;
  const match = weekText.match(/(\d{1,2})/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) || 0;
}

export function formatWeeks(weeks: number[]): string {
  const sortedWeeks = normalizeWeeks(weeks);
  if (sortedWeeks.length === 0) {
    return '未设置周次';
  }

  const ranges: string[] = [];
  let start = sortedWeeks[0];
  let prev = sortedWeeks[0];

  for (let i = 1; i < sortedWeeks.length; i += 1) {
    const current = sortedWeeks[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }

    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = current;
    prev = current;
  }

  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return `${ranges.join(',')}周`;
}
