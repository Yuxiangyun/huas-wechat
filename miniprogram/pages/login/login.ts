import { api, PublicAnnouncement, UserInfo } from '../../utils/api';
import { fetchPublicAnnouncements, hasUnreadAnnouncements, markAnnouncementsAsRead } from '../../utils/announcements';
import { storage } from '../../utils/storage';
const CAPTCHA_REQUIRED_MSG = '学校系统要求补充验证码。这通常是密码或学号输错后触发，请先核对密码，再输入验证码登录。';
const CREDENTIAL_ERROR_MSG = '学号或密码错误，请核对后重新登录。';
const CREDENTIAL_ERROR_WITH_CAPTCHA_MSG = '学号或密码可能不正确。请先核对密码，再填写验证码登录。';
const SESSION_EXPIRED_MSG = '凭证过期，请重新登录～';

function isCredentialError(msg?: string): boolean {
  const normalizedMsg = (msg || '').trim();

  return (
    normalizedMsg.includes('密码错误') ||
    normalizedMsg.includes('用户名或者密码有误') ||
    normalizedMsg.includes('用户名或密码有误') ||
    normalizedMsg.includes('账号或密码有误') ||
    normalizedMsg.includes('账号密码错误') ||
    (normalizedMsg.includes('账号') && normalizedMsg.includes('密码')) ||
    (normalizedMsg.includes('学号') && normalizedMsg.includes('密码'))
  );
}

function isGenericCaptchaPrompt(msg?: string): boolean {
  const normalizedMsg = (msg || '').trim();
  return !normalizedMsg || normalizedMsg === '需要验证码' || normalizedMsg === '请输入验证码后重试';
}

function getCaptchaGuidance(msg?: string): string {
  const normalizedMsg = (msg || '').trim();

  if (normalizedMsg.includes('验证码错误')) {
    return '验证码错误，请核对密码后重新输入图中验证码。';
  }

  if (isGenericCaptchaPrompt(normalizedMsg)) {
    return CAPTCHA_REQUIRED_MSG;
  }

  return normalizedMsg;
}

function getLoginErrorGuidance(msg?: string, options: { showCaptcha?: boolean } = {}): string {
  const { showCaptcha = false } = options;
  const normalizedMsg = (msg || '').trim();

  if (normalizedMsg.includes('验证码错误') || isGenericCaptchaPrompt(normalizedMsg)) {
    return getCaptchaGuidance(normalizedMsg);
  }

  if (isCredentialError(normalizedMsg)) {
    return showCaptcha ? CREDENTIAL_ERROR_WITH_CAPTCHA_MSG : CREDENTIAL_ERROR_MSG;
  }

  if (!normalizedMsg) {
    return '登录失败，请稍后重试。';
  }

  return normalizedMsg;
}

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
    showAnnouncementsModal: false,
    showAnnouncementDot: false,
    announcements: [] as PublicAnnouncement[],
  },

  onLoad(options: { logout?: string; sessionExpired?: string } = {}): void {
    const isLogoutStatus = options.logout === 'true' || options.sessionExpired === 'true';
    if (isLogoutStatus) {
      this.setData({
        isLogout: true,
        errorMsg: options.sessionExpired === 'true' ? SESSION_EXPIRED_MSG : '',
      });
    }

    this.loadSavedCredentials();
  },

  onShow(): void {
    if (storage.isLoggedIn()) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }

    this.setData({
      isLogout: false,
      showAnnouncementDot: false,
    });

    this.checkAnnouncementUnread();
  },

  loadSavedCredentials(): void {
    const rememberValue = storage.getRememberPassword() !== false;
    this.setData({ rememberPassword: rememberValue });

    if (!rememberValue) return;

    const credentials = storage.getCredentials();
    if (credentials) {
      this.setData({
        username: credentials.username,
        password: credentials.password,
      });
      return;
    }

    const lastLoginUsername = storage.getLastLoginUsername();
    if (!lastLoginUsername) {
      return;
    }

    this.setData({
      username: lastLoginUsername,
    });
  },

  onLoginSuccess(token: string, username: string, user?: UserInfo): void {
    this.setData({ loading: false });

    const lastLoginUsername = storage.getLastLoginUsername();
    if (lastLoginUsername && lastLoginUsername !== username) {
      wx.removeStorageSync('custom_courses');
      storage.clearAll();
    }

    storage.saveToken(token);
    storage.saveLastLoginUsername(username);
    if (user) {
      storage.saveUserInfo(user);
    }

    if (this.data.rememberPassword) {
      storage.saveCredentials(username, this.data.password.trim());
      storage.saveLastLoginUsername(username);
      storage.setRememberPassword(true);
    } else {
      storage.removeCredentials();
      storage.removeLastLoginUsername();
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
      storage.removeLastLoginUsername();
    }
  },

  goToAbout() {
    wx.switchTab({ url: '/pages/about/about' });
  },

  async checkAnnouncementUnread(): Promise<void> {
    try {
      const res = await fetchPublicAnnouncements();
      if ((res.code === 0 || res.code === 200) && Array.isArray(res.data)) {
        this.setData({ showAnnouncementDot: hasUnreadAnnouncements(res.data) });
      }
    } catch {
      // 静默失败，不影响登录流程。
    }
  },

  async showAnnouncements(): Promise<void> {
    this.setData({ showAnnouncementsModal: true });
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await fetchPublicAnnouncements();
      if ((res.code === 0 || res.code === 200) && Array.isArray(res.data)) {
        markAnnouncementsAsRead(res.data);
        this.setData({ announcements: res.data, showAnnouncementDot: false });
      } else {
        wx.showToast({ title: res.msg || '获取公告失败', icon: 'none' });
      }
    } catch (err: any) {
      console.error('获取公告失败:', err);
    } finally {
      wx.hideLoading();
    }
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
        errorMsg: getCaptchaGuidance(res.msg),
        captchaLoading: false,
      });
      return;
    }

    this.setData({
      errorMsg: getLoginErrorGuidance(res.msg, { showCaptcha: this.data.showCaptcha }),
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
      this.onLoginSuccess(res.data.token, cleanUsername, res.data.user);
      return;
    }

    if (res.needCaptcha) {
      this.setData({
        loading: false,
        showCaptcha: true,
        sessionId: res.sessionId || this.data.sessionId,
        captchaImage: res.captchaImage ? `data:image/png;base64,${res.captchaImage}` : this.data.captchaImage,
        captcha: '',
        errorMsg: getCaptchaGuidance(res.msg),
      });
      return;
    }

    this.setData({
      loading: false,
      errorMsg: getLoginErrorGuidance(res.msg, { showCaptcha }),
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
