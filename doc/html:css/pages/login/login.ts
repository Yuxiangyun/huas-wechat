// pages/login/login.ts
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
        autoLoginTip: '', // 自动登录提示
        showAnnouncementsModal: false,
        showAnnouncementDot: false,
        announcements: [] as PublicAnnouncement[],
    },

    onLoad(options: any): void {
        // 退出登录或 session 过期跳转时，跳过自动登录
        const isLogoutStatus = (options && options.logout === 'true') || (options && options.sessionExpired === 'true');
        if (isLogoutStatus) {
            this.setData({ isLogout: true });
        }

        // 加载保存的凭据
        this.loadSavedCredentials();
    },

    onShow(): void {
        // 已登录则直接跳转
        if (storage.isLoggedIn()) {
            wx.switchTab({ url: '/pages/index/index' });
            return;
        }

        const credentials = storage.getCredentials();
        const remember = storage.getRememberPassword();
        const { isLogout, loading } = this.data;

        // 尝试自动登录条件判断
        const canAutoLogin = !isLogout && remember && credentials && credentials.username && credentials.password && !loading;

        if (canAutoLogin) {
            this.tryAutoLogin(credentials.username, credentials.password);
        }

        this.checkAnnouncementUnread();

        // 重置状态，避免下次无法自动登录
        this.setData({ isLogout: false });
    },

    loadSavedCredentials(): void {
        const rememberValue = storage.getRememberPassword() !== false;
        this.setData({ rememberPassword: rememberValue });

        if (rememberValue) {
            const credentials = storage.getCredentials();
            if (credentials) {
                this.setData({
                    username: credentials.username,
                    password: credentials.password,
                });
            }
        }
    },

    async tryAutoLogin(username: string, password: string): Promise<void> {
        if (this.data.loading) return;

        this.setData({
            loading: true,
            errorMsg: '',
            autoLoginTip: '正在自动登录...'
        });

        try {
            // 获取 sessionId
            const captchaRes = await api.getCaptcha();
            if (captchaRes.code !== 200 || !captchaRes.data) {
                this.setData({
                    loading: false,
                    autoLoginTip: '',
                    errorMsg: '获取验证码失败，请手动登录'
                });
                return;
            }

            const { sessionId } = captchaRes.data;

            // 尝试无验证码登录
            const res = await api.login({
                username,
                password,
                captcha: '',
                sessionId,
            });

            if (res.code === 200 && res.data) {
                this.setData({ autoLoginTip: '' });
                this.onLoginSuccess(res.data.token, username, password);
            } else {
                // 自动登录失败，显示验证码让用户手动登录
                this.setData({
                    loading: false,
                    showCaptcha: true,
                    captchaImage: `data:image/png;base64,${captchaRes.data.image}`,
                    sessionId,
                    autoLoginTip: '',
                });

                // 显示错误信息
                if (res.action === 'NEED_CAPTCHA') {
                    this.setData({ errorMsg: '需要输入验证码' });
                } else if (res.msg) {
                    let displayMsg = res.msg;
                    // 拦截并替换密码错误提示
                    const isCredentialError = displayMsg.includes('账号') || displayMsg.includes('密码') || displayMsg.includes('学号') || displayMsg.includes('验证码');

                    if (isCredentialError) {
                        displayMsg = '学号，密码，或者验证码错误';
                        storage.removeCredentials();
                        storage.setRememberPassword(false);
                        this.setData({ rememberPassword: false });
                    }
                    this.setData({ errorMsg: `自动登录失败: ${displayMsg}` });
                }
            }
        } catch (err: any) {
            console.error('自动登录失败:', err);
            const isUpstreamError = err && err.code >= 500;
            const errorMsg = isUpstreamError ? '教务系统繁忙，请稍后刷新重试' : '网络异常，请手动登录';

            this.setData({
                loading: false,
                showCaptcha: !isUpstreamError,
                autoLoginTip: '',
                errorMsg
            });

            if (!isUpstreamError) {
                this.refreshCaptcha();
            }
        }
    },

    onLoginSuccess(token: string, username: string, password: string): void {
        // 确保 loading 状态重置
        this.setData({ loading: false });

        // 检查是否切换了账号，如果是，则清理上一个账号的缓存（防止切号串数据）
        const lastLoginUsername = storage.getLastLoginUsername();
        if (lastLoginUsername && lastLoginUsername !== username) {
            console.log('🔄 检测到切换账号登录，清理旧账号缓存...');
            wx.removeStorageSync('custom_courses'); // 仅在明确切换账号时才销毁上一个账号的自定义课程
            storage.clearAll();
        }

        // 保存状态与凭据
        storage.saveToken(token);
        storage.saveLastLoginUsername(username);

        if (this.data.rememberPassword) {
            storage.saveCredentials(username, password);
            storage.setRememberPassword(true);
        } else {
            storage.removeCredentials();
            storage.setRememberPassword(false);
        }

        // 更新全局状态
        const app = getApp();
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

    async checkAnnouncementUnread() {
        try {
            const res = await api.getPublicAnnouncements();
            if ((res.code === 0 || res.code === 200) && Array.isArray(res.data)) {
                const readIds: string[] = wx.getStorageSync(ANNOUNCEMENT_READ_IDS_KEY) || [];
                const hasUnread = res.data.some(item => !readIds.includes(String(item.id)));
                this.setData({ showAnnouncementDot: hasUnread });
            }
        } catch {
            // 静默失败，不影响主流程
        }
    },

    async showAnnouncements() {
        this.setData({ showAnnouncementsModal: true });
        try {
            wx.showLoading({ title: '加载中...' });
            const res = await api.getPublicAnnouncements();
            if ((res.code === 0 || res.code === 200) && Array.isArray(res.data)) {
                const readIds = res.data.map(item => String(item.id));
                wx.setStorageSync(ANNOUNCEMENT_READ_IDS_KEY, readIds);
                this.setData({ announcements: res.data, showAnnouncementDot: false });
            } else {
                wx.showToast({ title: res.msg || '获取公告失败', icon: 'none' });
            }
        } catch (err: any) {
            console.error('获取公告失败:', err);
            wx.showToast({ title: '网络异常', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    },

    hideAnnouncements() {
        this.setData({ showAnnouncementsModal: false });
    },

    noop() { },

    async refreshCaptcha(): Promise<void> {
        if (this.data.captchaLoading) return;

        this.setData({
            captchaLoading: true,
            captcha: '',
            showCaptcha: true
        });

        try {
            const res = await api.getCaptcha();
            if (res.code === 200 && res.data) {
                this.setData({
                    captchaImage: `data:image/png;base64,${res.data.image}`,
                    sessionId: res.data.sessionId,
                });
            } else {
                this.setData({ errorMsg: res.msg || '获取验证码失败' });
            }
        } catch (err) {
            console.error('获取验证码失败:', err);
            this.setData({ errorMsg: '网络异常' });
        } finally {
            this.setData({ captchaLoading: false });
        }
    },

    async handleLogin(): Promise<void> {
        const { username, password, captcha, sessionId, loading, showCaptcha } = this.data;
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();
        const cleanCaptcha = captcha.trim();

        // 表单基础校验 (利用卫语句提前返回)
        if (!cleanUsername) return this.setData({ errorMsg: '请输入学号' });
        if (!cleanPassword) return this.setData({ errorMsg: '请输入密码' });
        if (showCaptcha && !cleanCaptcha) return this.setData({ errorMsg: '请输入验证码' });
        if (loading) return;

        this.setData({ loading: true, errorMsg: '' });

        try {
            let currentSessionId = sessionId;

            // 如果没有会话ID，先获取
            if (!currentSessionId) {
                const captchaRes = await api.getCaptcha();
                if (captchaRes.code === 200 && captchaRes.data) {
                    currentSessionId = captchaRes.data.sessionId;
                    this.setData({
                        sessionId: currentSessionId,
                        captchaImage: `data:image/png;base64,${captchaRes.data.image}`,
                    });
                } else {
                    this.setData({ loading: false, errorMsg: '获取会话失败' });
                    return;
                }
            }

            const res = await api.login({
                username: cleanUsername,
                password: cleanPassword,
                captcha: cleanCaptcha,
                sessionId: currentSessionId,
            });

            if (res.code === 200 && res.data) {
                this.onLoginSuccess(res.data.token, cleanUsername, cleanPassword);
            } else {
                // 拦截并替换密码错误提示
                let displayMsg = res.msg || '登录失败';
                if (displayMsg.includes('账号') || displayMsg.includes('密码') || displayMsg.includes('学号') || displayMsg.includes('验证码')) {
                    displayMsg = '学号，密码，或者验证码错误';
                }

                this.setData({ errorMsg: displayMsg });

                if (res.action === 'NEED_CAPTCHA' || res.needCaptcha) {
                    this.setData({ showCaptcha: true });
                }
                this.refreshCaptcha();
            }
        } catch (err: any) {
            console.error('登录失败:', err);
            this.setData({
                errorMsg: err.msg || '网络异常',
                showCaptcha: true
            });
            this.refreshCaptcha();
        } finally {
            this.setData({ loading: false });
        }
    },

    onShareAppMessage() {
        return {
            title: '为文理er准备的查课表，查成绩小程序，欢迎使用！',
            path: '/pages/index/index',
            imageUrl: '/images/share-cover.png',
        };
    },

    onShareTimeline() {
        return {
            title: '为文理er准备的查课表，查成绩小程序，欢迎使用！',
            imageUrl: '/images/share-cover.png',
        };
    },
});