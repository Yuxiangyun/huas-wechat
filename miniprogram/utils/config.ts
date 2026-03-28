export const API_BASE_URL = 'https://your-api.example.com/';

export interface AppCopyConfig {
  brandPrimary: string;
  brandSecondary: string;
  englishSubtitle: string;
  shareDescription: string;
  shareShortDescription: string;
  footerText: string;
}

export interface SupportContactConfig {
  label: string;
  clipboardText: string;
  hint: string;
}

export interface PublicAccountConfig {
  name: string;
  // 微信号（用于展示/复制，也用于 openOfficialAccountChat）
  wechatId: string;
  // 公众号原始 ID（gh_ 开头，用于 openOfficialAccountProfile）
  originalId?: string;
  intro: string;
}

export interface ContributorConfig {
  initial: string;
  name: string;
  role: string;
  desc: string;
  tag: string;
}

export interface AboutContributorsConfig {
  note: string;
  list: ContributorConfig[];
}

export const APP_COPY_CONFIG: AppCopyConfig = {
  brandPrimary: '校园',
  brandSecondary: '小助手',
  englishSubtitle: 'Campus Helper',
  shareDescription: '一个可自托管的校园服务小程序示例，欢迎使用！',
  shareShortDescription: '一个可自托管的课表与校园服务小程序示例！',
  footerText: 'Open Source Edition',
};

export const SUPPORT_CONTACT_CONFIG: SupportContactConfig = {
  label: '公开反馈渠道',
  clipboardText: '',
  hint: '请在 utils/config.ts 中填写你的公开联系方式',
};

// 填写后会在 `pages/more` 展示公众号入口，并在支持场景下渲染官方关注组件。
export const PUBLIC_ACCOUNT_CONFIG: PublicAccountConfig = {
  name: '',
  wechatId: '',
  originalId: '',
  intro: '',
};

export function hasPublicAccountConfig(config: PublicAccountConfig = PUBLIC_ACCOUNT_CONFIG): boolean {
  return Boolean(config.name.trim() && (config.wechatId.trim() || config.originalId?.trim()));
}

export const ABOUT_CONTRIBUTORS_CONFIG: AboutContributorsConfig = {
  note: '欢迎在开源后补充贡献者信息',
  list: [],
};
