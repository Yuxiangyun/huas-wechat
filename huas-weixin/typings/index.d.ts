/// <reference path="./types/index.d.ts" />

interface IAppOption extends WechatMiniprogram.IAnyObject {
  globalData: {
    token: string;
    isLoggedIn: boolean;
    apiBaseUrl: string;
  };
}
