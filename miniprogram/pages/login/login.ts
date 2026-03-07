import { api, PublicAnnouncement } from '../../utils/api';
import { storage } from '../../utils/storage';

const ANNOUNCEMENT_READ_IDS_KEY = 'announcement_read_ids';

Page({
  data: {
    username: '',
    password: '',
    captcha: '',
    captchaImage: '',
    sessionId: '',
    rememberPassword: true,
    loading: false,
    captchaLoading: false,
    errorMsg: '',
    showCaptcha: false,
    isLogout: false,
    autoLoginTip: '',
    showAnnouncementsModal: false,
    showAnnouncementDot: false,
    announcements: [] as PublicAnnouncement[],
  },

  onLoad(options: { logout?: string; sessionExpired?: string } = {}): void {
    const isLogoutStatus = options.logout === 'true' || options.sessionExpired === 'true';
    if (isLogoutStatus) {
      this.setData({ isLogout: true });
    }

    this.loadSavedCredentials();
  },

  onShow(): void {
    if (storage.isLoggedIn()) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }

    const credentials = storage.getCredentials();
    const remember = storage.getRememberPassword();
    const hasSavedUsername = Boolean(credentials && credentials.username);
    const hasSavedPassword = Boolean(credentials && credentials.password);
    const canAutoLogin =
      !this.data.isLogout &&
      remember &&
      hasSavedUsername &&
      hasSavedPassword &&
      !this.data.loading;

    if (canAutoLogin && credentials) {
      this.tryAutoLogin(credentials.username, credentials.password);
    }

    this.checkAnnouncementUnread();
    this.setData({ isLogout: false });
  },

  loadSavedCredentials(): void {
    const rememberValue = storage.getRememberPassword() !== false;
    this.setData({ rememberPassword: rememberValue });

    if (!rememberValue) return;

    const credentials = storage.getCredentials();
    if (!credentials) return;

    this.setData({
      username: credentials.username,
      password: credentials.password,
    });
  },

  async tryAutoLogin(username: string, password: string): Promise<void> {
    if (this.data.loading) return;

    this.setData({
      loading: true,
      errorMsg: '',
      autoLoginTip: '正在自动登录...',
    });

    const res = await api.login({ username, password });

    if (res.code === 200 && res.data) {
      this.setData({ autoLoginTip: '' });
      this.onLoginSuccess(res.data.token, username, password);
      return;
    }

    if (res.needCaptcha) {
      this.setData({
        loading: false,
        autoLoginTip: '',
        showCaptcha: true,
        sessionId: res.sessionId || '',
        captchaImage: res.captchaImage ? `data:image/png;base64,${res.captchaImage}` : '',
        errorMsg: '需要验证码，请手动完成登录',
      });
      return;
    }

    const displayMsg = res.msg || '自动登录失败，请手动登录';
    this.setData({
      loading: false,
      autoLoginTip: '',
      errorMsg: displayMsg,
    });
  },

  onLoginSuccess(token: string, username: string, password: string): void {
    this.setData({ loading: false });

    const lastLoginUsername = storage.getLastLoginUsername();
    if (lastLoginUsername && lastLoginUsername !== username) {
      wx.removeStorageSync('custom_courses');
      storage.clearAll();
    }

    storage.saveToken(token);
    storage.saveLastLoginUsername(username);

    if (this.data.rememberPassword) {
      storage.saveCredentials(username, password);
      storage.setRememberPassword(true);
    } else {
      storage.removeCredentials();
      storage.setRememberPassword(false);
    }

    const app = getApp<IAppOption>();
    app.globalData.token = token;
    app.globalData.isLoggedIn = true;

    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1000,
    });

    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 1000);
  },

  onUsernameInput(e: WechatMiniprogram.Input): void {
    this.setData({ username: e.detail.value, errorMsg: '' });
  },

  onPasswordInput(e: WechatMiniprogram.Input): void {
    this.setData({ password: e.detail.value, errorMsg: '' });
  },

  onCaptchaInput(e: WechatMiniprogram.Input): void {
    this.setData({ captcha: e.detail.value, errorMsg: '' });
  },

  onRememberChange(e: WechatMiniprogram.SwitchChange): void {
    const remember = e.detail.value;
    this.setData({ rememberPassword: remember });
    storage.setRememberPassword(remember);

    if (!remember) {
      storage.removeCredentials();
    }
  },

  goToAbout() {
    wx.switchTab({ url: '/pages/about/about' });
  },

  async checkAnnouncementUnread(): Promise<void> {
    const res = await api.getPublicAnnouncements();
    if (res.code !== 200 || !Array.isArray(res.data)) return;

    const readIds: string[] = wx.getStorageSync(ANNOUNCEMENT_READ_IDS_KEY) || [];
    const hasUnread = res.data.some((item: PublicAnnouncement) => !readIds.includes(String(item.id)));
    this.setData({ showAnnouncementDot: hasUnread });
  },

  async showAnnouncements(): Promise<void> {
    this.setData({ showAnnouncementsModal: true });
    wx.showLoading({ title: '加载中...' });

    const res = await api.getPublicAnnouncements();
    if (res.code === 200 && Array.isArray(res.data)) {
      const readIds = res.data.map((item: PublicAnnouncement) => String(item.id));
      wx.setStorageSync(ANNOUNCEMENT_READ_IDS_KEY, readIds);
      this.setData({ announcements: res.data, showAnnouncementDot: false });
    } else {
      wx.showToast({ title: res.msg || '获取公告失败', icon: 'none' });
    }

    wx.hideLoading();
  },

  hideAnnouncements(): void {
    this.setData({ showAnnouncementsModal: false });
  },

  noop(): void {
    // Prevent modal from bubbling taps.
  },

  async refreshCaptcha(): Promise<void> {
    if (this.data.captchaLoading) return;

    const cleanUsername = this.data.username.trim();
    const cleanPassword = this.data.password.trim();

    if (!cleanUsername || !cleanPassword) {
      this.setData({ errorMsg: '请先输入学号和密码再刷新验证码' });
      return;
    }

    this.setData({ captchaLoading: true, captcha: '', showCaptcha: true, errorMsg: '' });

    const res = await api.login({
      username: cleanUsername,
      password: cleanPassword,
    });

    if (res.code === 200 && res.data) {
      this.setData({
        showCaptcha: false,
        sessionId: '',
        captchaImage: '',
        errorMsg: '当前无需验证码，点击登录即可',
        captchaLoading: false,
      });
      return;
    }

    if (res.needCaptcha) {
      this.setData({
        sessionId: res.sessionId || '',
        captchaImage: res.captchaImage ? `data:image/png;base64,${res.captchaImage}` : '',
        errorMsg: '请输入验证码后登录',
        captchaLoading: false,
      });
      return;
    }

    this.setData({
      errorMsg: res.msg || '刷新验证码失败',
      captchaLoading: false,
    });
  },

  async handleLogin(): Promise<void> {
    const { username, password, captcha, sessionId, loading, showCaptcha } = this.data;
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanCaptcha = captcha.trim();

    if (!cleanUsername) {
      this.setData({ errorMsg: '请输入学号' });
      return;
    }

    if (!cleanPassword) {
      this.setData({ errorMsg: '请输入密码' });
      return;
    }

    if (showCaptcha && !cleanCaptcha) {
      this.setData({ errorMsg: '请输入验证码' });
      return;
    }

    if (loading) return;

    this.setData({ loading: true, errorMsg: '' });

    const res = await api.login({
      username: cleanUsername,
      password: cleanPassword,
      captcha: showCaptcha ? cleanCaptcha : undefined,
      sessionId: showCaptcha ? sessionId : undefined,
    });

    if (res.code === 200 && res.data) {
      this.onLoginSuccess(res.data.token, cleanUsername, cleanPassword);
      return;
    }

    if (res.needCaptcha) {
      this.setData({
        loading: false,
        showCaptcha: true,
        sessionId: res.sessionId || this.data.sessionId,
        captchaImage: res.captchaImage ? `data:image/png;base64,${res.captchaImage}` : this.data.captchaImage,
        captcha: '',
        errorMsg: res.msg || '请输入验证码后重试',
      });
      return;
    }

    this.setData({
      loading: false,
      errorMsg: res.msg || '登录失败',
    });
  },

  onShareAppMessage() {
    return {
      title: '为文理er准备的查课表，查成绩小程序，欢迎使用！',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: '为文理er准备的查课表，查成绩小程序，欢迎使用！',
    };
  },
});
