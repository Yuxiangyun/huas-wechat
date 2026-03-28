function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  return (value || fallback).trim().replace(/\/+$/, '');
}

function normalizeUrl(value: string | undefined, fallback: string): string {
  return (value || fallback).trim();
}

function safeHostname(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
}

const casBaseUrl = normalizeBaseUrl(process.env.UPSTREAM_CAS_BASE_URL, 'https://cas.example.edu.cn');
const portalBaseUrl = normalizeBaseUrl(process.env.UPSTREAM_PORTAL_BASE_URL, 'https://portal.example.edu.cn');
const jwBaseUrl = normalizeBaseUrl(process.env.UPSTREAM_JW_BASE_URL, 'https://jw.example.edu.cn');
const authxBaseUrl = normalizeBaseUrl(process.env.UPSTREAM_AUTHX_BASE_URL, 'https://auth.example.edu.cn');

const casLoginUrl = normalizeUrl(process.env.UPSTREAM_CAS_LOGIN_URL, `${casBaseUrl}/cas/login`);
const jwTargetUrl = normalizeUrl(process.env.UPSTREAM_JW_TARGET_URL, `${jwBaseUrl}/index.jsp`);

export const URLS = {
  login: casLoginUrl,
  captcha: normalizeUrl(process.env.UPSTREAM_CAS_CAPTCHA_URL, `${casBaseUrl}/cas/captcha.jpg`),
  pubkey: normalizeUrl(process.env.UPSTREAM_CAS_PUBKEY_URL, `${casBaseUrl}/cas/jwt/publicKey`),
  servicePortal: normalizeUrl(process.env.UPSTREAM_PORTAL_LOGIN_URL, `${portalBaseUrl}/login`),
  serviceJw: normalizeUrl(
    process.env.UPSTREAM_JW_SSO_URL,
    `${jwBaseUrl}/sso.jsp?targetUrl=base64${Buffer.from(jwTargetUrl).toString('base64')}`
  ),
  jwIndex: normalizeUrl(process.env.UPSTREAM_JW_INDEX_URL, `${jwBaseUrl}/jsxsd/framework/xsMain.jsp`),
  kbApi: normalizeUrl(process.env.UPSTREAM_JW_SCHEDULE_URL, `${jwBaseUrl}/jsxsd/framework/main_index_loadkb.jsp`),
  gradeApi: normalizeUrl(process.env.UPSTREAM_JW_GRADE_URL, `${jwBaseUrl}/jsxsd/kscj/cjcx_list`),
  ecardApi: normalizeUrl(process.env.UPSTREAM_PORTAL_ECARD_URL, `${portalBaseUrl}/portalApi/v2/personalData/getMyECard`),
  userInfo: normalizeUrl(process.env.UPSTREAM_AUTHX_USER_URL, `${authxBaseUrl}/personal/api/v1/personal/me/user`),
  portalScheduleEvents: normalizeUrl(
    process.env.UPSTREAM_PORTAL_SCHEDULE_URL,
    `${portalBaseUrl}/portal-api/v1/calendar/share/schedule/getEvents`
  ),
  portalOrigin: normalizeUrl(process.env.UPSTREAM_PORTAL_ORIGIN, portalBaseUrl),
  portalReferer: normalizeUrl(process.env.UPSTREAM_PORTAL_REFERER, `${portalBaseUrl}/main.html`),
  sessionExpiredHost: process.env.UPSTREAM_SESSION_EXPIRED_HOST?.trim() || safeHostname(casLoginUrl),
};
