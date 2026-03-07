import { triggerLightHaptic } from '../utils/util';
import { api } from '../utils/api';
import { storage } from '../utils/storage';

const TAB_NAMES = ['课表', '服务', '关于'] as const;
let _firstAttach = true;

Component({
    data: {
        selected: 0,
        list: [{
            pagePath: "/pages/index/index",
            text: "课表"
        }, {
            pagePath: "/pages/more/more",
            text: "服务"
        }, {
            pagePath: "/pages/about/about",
            text: "关于"
        }]
    },
    lifetimes: {
        attached() {
            if (!_firstAttach) return;
            _firstAttach = false;
            // 首次加载上报默认 tab（课表）
            const user = storage.getUserInfo();
            api.trackTabSwitch({
                tab: '课表',
                studentId: user ? user.studentId : undefined,
                name: user ? user.name : undefined,
            });
        }
    },
    methods: {
        switchTab(e: any) {
            const data = e.currentTarget.dataset;
            const url = data.path;

            // 1. 拦截重复点击
            if (this.data.selected === data.index) {
                return;
            }

            // 2. 触发轻量级震动反馈
            triggerLightHaptic();

            // 3. 上报 tab 切换埋点
            const tab = TAB_NAMES[data.index as number];
            if (tab) {
                const user = storage.getUserInfo();
                api.trackTabSwitch({
                    tab,
                    studentId: user ? user.studentId : undefined,
                    name: user ? user.name : undefined,
                });
            }

            // 4. 仅执行跳转，坚决不在这里 setData 修改 selected，彻底消灭鬼影
            wx.switchTab({ url });
        }
    }
})
