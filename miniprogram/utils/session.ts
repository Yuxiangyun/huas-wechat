import { storage } from './storage';

export const LOGIN_PAGE_URL = '/pages/login/login';
export const LOGIN_PAGE_ROUTE = 'pages/login/login';

interface LoginRedirectOptions {
  logout?: boolean;
  sessionExpired?: boolean;
}

function setAppSessionToken(token: string): void {
  const app = getApp<IAppOption>();
  app.globalData.token = token;
  app.globalData.isLoggedIn = Boolean(token);
}

function buildLoginUrl(options: LoginRedirectOptions = {}): string {
  const params = Object.entries(options)
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return params ? `${LOGIN_PAGE_URL}?${params}` : LOGIN_PAGE_URL;
}

export function isLoginPageActive(): boolean {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  return current?.route === LOGIN_PAGE_ROUTE;
}

export function redirectToLogin(options: LoginRedirectOptions = {}): void {
  wx.reLaunch({ url: buildLoginUrl(options) });
}

export function ensureLoggedIn(): boolean {
  if (storage.getToken()) {
    return true;
  }

  redirectToLogin();
  return false;
}

export function activateSession(token: string): void {
  storage.saveToken(token);
  setAppSessionToken(token);
}

export function clearSession(): void {
  storage.clearToken();
  storage.removeUserInfo();
  setAppSessionToken('');
}

export function clearAllSessionData(): void {
  storage.clearAll();
  setAppSessionToken('');
}

export function handleAuthFailure(code: number): boolean {
  if (code !== 4001 && code !== 3003) {
    return false;
  }

  clearSession();
  if (!isLoginPageActive()) {
    redirectToLogin({ sessionExpired: true });
  }
  return true;
}
