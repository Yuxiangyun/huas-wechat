export const API_BASE_URL = 'https://api.huas-api.top/';

export interface PublicAccountConfig {
  name: string;
  wechatId: string;
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

// 填写后会在 `pages/more` 展示公众号入口，并在支持场景下渲染官方关注组件。
export const PUBLIC_ACCOUNT_CONFIG: PublicAccountConfig = {
  name: '包含树洞/拍好饭功能',
  wechatId: 'gh_9dbc18ee5523',
  intro: '',
};

export function hasPublicAccountConfig(config: PublicAccountConfig = PUBLIC_ACCOUNT_CONFIG): boolean {
  return Boolean(config.name.trim() && config.wechatId.trim());
}

export const ABOUT_CONTRIBUTORS_CONFIG: AboutContributorsConfig = {
  note: '欢迎，感谢贡献，用爱发电中',
  list: [
   
    {
      initial: '佘',
      name: '地信 24101 佘磊',
      role: '推广',
      desc: '转发到非常多非常多非常多的群聊',
      tag: 'Spread',
    }, 
    {
      initial: '喻',
      name: '软工 24101 喻祥云',
      role: '核心开发',
      desc: '负责开发和维护',
      tag: 'Core',
    }
  ],
};
