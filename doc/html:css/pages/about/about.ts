
Page({
    data: {
        greetingText: '',
        copyTagText: '复制',

        features: [
            { label: '课程表查询', desc: '查看每周课程安排，支持周次切换' },
            { label: '成绩查询', desc: '查看历史成绩、学分和绩点统计' },
            { label: '校园卡余额', desc: '查询校园卡余额' }
        ],

        instructions: [
            '使用学校教务系统账号密码登录',
            '您的密码仅保存在本地设备',
            '数据来源于学校教务系统'
        ]
    },

    onShow() {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().setData({ selected: 2 });
        }

        this.setGreeting();
    },

    setGreeting() {
        const hour = new Date().getHours();
        let greeting = '';

        if (hour >= 0 && hour < 6) {
            greeting = '深夜好';
        } else if (hour >= 6 && hour < 11) {
            greeting = '早上好';
        } else if (hour >= 11 && hour < 13) {
            greeting = '中午好';
        } else if (hour >= 13 && hour < 18) {
            greeting = '下午好';
        } else {
            greeting = '晚上好';
        }

        this.setData({
            greetingText: ` ${greeting}`
        });
    },

    copyWechat() {
        wx.setClipboardData({
            data: '',
            success: () => {
                this.setData({ copyTagText: '已复制！' });
                setTimeout(() => {
                    this.setData({ copyTagText: '复制' });
                }, 1500);
            }
        });
    },

    onShareAppMessage() {
        return {
            title: '一个可自托管的校园服务小程序示例，欢迎使用！',
            path: '/pages/index/index',
            imageUrl: '/images/share-cover.png',
        };
    },

    onShareTimeline() {
        return {
            title: '一个可自托管的校园服务小程序示例，欢迎使用！',
            imageUrl: '/images/share-cover.png',
        };
    }
});
