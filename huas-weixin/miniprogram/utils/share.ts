interface ShareContent {
  title: string;
  path?: string;
  imageUrl?: string;
}

const DEFAULT_PATH = '/pages/index/index';
const DEFAULT_IMAGE_URL = '/images/share-cover.png';

export function createShareAppMessage(content: ShareContent): WechatMiniprogram.Page.ICustomShareContent {
  return {
    title: content.title,
    path: content.path || DEFAULT_PATH,
    ...(content.imageUrl ? { imageUrl: content.imageUrl } : {}),
  };
}

export function createShareTimeline(content: ShareContent): WechatMiniprogram.Page.ICustomTimelineContent {
  return {
    title: content.title,
    ...(content.imageUrl ? { imageUrl: content.imageUrl } : {}),
  };
}

export function createDefaultShareContent(title: string): ShareContent {
  return { title, path: DEFAULT_PATH };
}

export function createCoverShareContent(title: string): ShareContent {
  return { title, path: DEFAULT_PATH, imageUrl: DEFAULT_IMAGE_URL };
}
