import { storage } from './utils/storage';

App({
  globalData: {
    token: '',
    isLoggedIn: false,
    apiBaseUrl: 'localhost:3000',
  },

  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    const token = storage.getToken();
    this.globalData.token = token;
    this.globalData.isLoggedIn = Boolean(token);

    const extBaseUrl = (() => {
      try {
        const extConfig = (typeof wx.getExtConfigSync === 'function'
          ? wx.getExtConfigSync()
          : {}) as { apiBaseUrl?: string };
        return (extConfig.apiBaseUrl || '').trim();
      } catch {
        return '';
      }
    })();
    const localBaseUrl = (wx.getStorageSync('api_base_url') as string | '').trim();
    const resolvedBaseUrl = extBaseUrl || localBaseUrl;
    this.globalData.apiBaseUrl = resolvedBaseUrl;
    if (resolvedBaseUrl) {
      wx.setStorageSync('api_base_url', resolvedBaseUrl);
    }
  },
});
