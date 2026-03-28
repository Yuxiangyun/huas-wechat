import { api, type ApiResponse, type PublicAnnouncement } from './api';
import { setStorageWithAutoCleanup } from './storage';

const ANNOUNCEMENT_READ_IDS_KEY = 'announcement_read_ids';

export async function fetchPublicAnnouncements(): Promise<ApiResponse<PublicAnnouncement[]>> {
  return api.getPublicAnnouncements();
}

export function getReadAnnouncementIds(): string[] {
  try {
    const raw = wx.getStorageSync(ANNOUNCEMENT_READ_IDS_KEY) as string[] | '' | undefined;
    return Array.isArray(raw) ? raw.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

export function hasUnreadAnnouncements(items: PublicAnnouncement[]): boolean {
  const readIds = getReadAnnouncementIds();
  return items.some((item) => !readIds.includes(String(item.id)));
}

export function markAnnouncementsAsRead(items: PublicAnnouncement[]): void {
  const readIds = items.map((item) => String(item.id));
  setStorageWithAutoCleanup(ANNOUNCEMENT_READ_IDS_KEY, readIds);
}
