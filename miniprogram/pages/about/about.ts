import { storage } from '../../utils/storage';
import { buildThemeStyle, DEFAULT_SCHEDULE_THEME_KEY, getScheduleThemeByKey, type ScheduleThemeKey } from '../../utils/theme';
import { setSelectedTab } from '../../utils/tab-bar';
import { getBeijingHour } from '../../utils/util';

Page({
  data: {
    currentScheduleThemeKey: DEFAULT_SCHEDULE_THEME_KEY as ScheduleThemeKey,
    themeStyle: buildThemeStyle(getScheduleThemeByKey(DEFAULT_SCHEDULE_THEME_KEY)),
    greetingText: '',
    copyTagText: '复制',
    features: [
      { label: '课程表查询', desc: '查看每周课程安排，支持周次切换' },
      { label: '成绩查询', desc: '查看历史成绩、学分和绩点统计' },
      { label: '校园卡余额', desc: '查询校园卡余额' },
    ],
    instructions: [
      '使用学校教务系统账号密码登录',
      '您的密码仅保存在本地设备',
      '数据来源于学校教务系统',
    ],
  },

  onShow() {
    setSelectedTab(this, 2);
    this.loadScheduleTheme();
    this.setGreeting();
  },

  loadScheduleTheme() {
    const theme = getScheduleThemeByKey(storage.getScheduleTheme());
    this.setData({
      currentScheduleThemeKey: theme.key,
      themeStyle: buildThemeStyle(theme),
    });
  },

  setGreeting() {
    const hour = getBeijingHour();
    let greeting = '';

    if (hour >= 0 && hour < 6) {
      greeting = '深夜好';
    } else if (hour < 11) {
      greeting = '早上好';
    } else if (hour < 13) {
      greeting = '中午好';
    } else if (hour < 18) {
      greeting = '下午好';
    } else {
      greeting = '晚上好';
    }

    this.setData({ greetingText: ` ${greeting}` });
  },

  copyWechat() {
    wx.setClipboardData({
      data: '-nullsleep',
      success: () => {
        this.setData({ copyTagText: '已复制！' });
        setTimeout(() => {
          this.setData({ copyTagText: '复制' });
        }, 1500);
      },
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
