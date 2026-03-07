function setSelectedTab(page: WechatMiniprogram.Page.Instance<any, any>, selected: number): void {
  const getter = (page as WechatMiniprogram.Page.Instance<any, any> & {
    getTabBar?: ((cb?: (tabBar: WechatMiniprogram.Component.TrivialInstance) => void) => WechatMiniprogram.Component.TrivialInstance | undefined);
  }).getTabBar;

  if (typeof getter !== 'function') return;

  let handled = false;
  getter.call(page, (tabBar: WechatMiniprogram.Component.TrivialInstance) => {
    handled = true;
    tabBar.setData({ selected });
  });

  if (!handled) {
    const tabBar = getter.call(page);
    if (tabBar) {
      tabBar.setData({ selected });
    }
  }
}

Page({
  data: {
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
    this.setGreeting();
  },

  setGreeting() {
    const hour = new Date().getHours();
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
