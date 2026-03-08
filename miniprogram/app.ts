import { storage } from './utils/storage';
import { API_BASE_URL } from './utils/config';

App({
  globalData: {
    token: '',
    isLoggedIn: false,
    apiBaseUrl: API_BASE_URL,
  },

  onLaunch() {
    try {
      wx.removeStorageSync('logs');
    } catch {
      // Ignore cleanup errors.
    }

    const token = storage.getToken();
    this.globalData.token = token;
    this.globalData.isLoggedIn = Boolean(token);
  },
});
