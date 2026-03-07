import { triggerLightHaptic } from '../utils/util';

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

            // 3. 仅执行跳转，坚决不在这里 setData 修改 selected，彻底消灭鬼影
            wx.switchTab({ url });
        }
    }
})
