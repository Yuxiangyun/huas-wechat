import { storage } from './utils/storage';

App({
  globalData: {
    token: '',
    isLoggedIn: false,
    apiBaseUrl: 'http://localhost:3000/',
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
