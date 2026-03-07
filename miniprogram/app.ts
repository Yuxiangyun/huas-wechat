import { storage } from './utils/storage';
import { API_BASE_URL } from './utils/config';

App({
  globalData: {
    token: '',
    isLoggedIn: false,
    apiBaseUrl: API_BASE_URL,
  },

  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    const token = storage.getToken();
    this.globalData.token = token;
    this.globalData.isLoggedIn = Boolean(token);
  },
});
