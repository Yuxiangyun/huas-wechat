// pages/more/more.ts - 更多页面
import { api, UserInfo, ECardInfo, GradeList, GradeItem } from '../../utils/api';
import { storage } from '../../utils/storage';
import { customCourseStorage, formatWeeks } from '../../utils/custom-course/index';
import { triggerLightHaptic } from '../../utils/util';
import type { CustomCourse } from '../../utils/custom-course/index';

interface TermGrades {
    term: string;
    items: GradeItem[];
}

const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];
const DAY_OPTIONS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
// 生成 1 到 10 节的选项
const SECTION_NUMBERS = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

interface DisplayCustomCourse extends CustomCourse {
    dayStr: string;
    weeksText: string;
}

interface GroupedCustomCourse {
    id: string;
    name: string;
    teacher: string;
    items: DisplayCustomCourse[];
}

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
        userInfo: {} as UserInfo,
        showGrades: false,
        showECard: false,
        grades: null as GradeList | null,
        gradesByTerm: [] as TermGrades[],
        ecard: null as ECardInfo | null,
        gradesLoading: false,
        ecardLoading: false,

        showCustomCourses: false,
        customCourses: [] as DisplayCustomCourse[],
        customCourseGroups: [] as GroupedCustomCourse[],

        showAddModal: false,
        formName: '',
        formTeacher: '',
        formLocation: '',
        // 改为 startIndex 和 endIndex，分别对应 SECTION_NUMBERS 的索引
        formTimeSlots: [{ dayIndex: 0, startIndex: 0, endIndex: 1 }],
        formWeeks: {} as Record<number, boolean>,
        dayOptions: DAY_OPTIONS,
        sectionNumbers: SECTION_NUMBERS,
    },

    onShow() {
        setSelectedTab(this, 1);

        if (!storage.getToken()) {
            wx.reLaunch({ url: '/pages/login/login' });
            return;
        }

        this.fetchUserInfo();
        this.loadCustomCourses();
    },

    async fetchUserInfo(forceRefresh = false) {
        const localUser = storage.getUserInfo();
        if (localUser) {
            this.setData({ userInfo: localUser });
            if (!forceRefresh) {
                console.log('✅ [Cache] 用户信息：命中永久本地缓存');
                return;
            }
        }

        console.log('🌐 [Network] 获取用户信息...');
        try {
            const res = await api.getUserInfo(forceRefresh);
            if ((res.code === 0 || res.code === 200) && res.data) {
                this.setData({ userInfo: res.data });
                storage.saveUserInfo(res.data);
            }
        } catch (err: any) {
            console.error('获取用户信息失败:', err);
        }
    },

    async toggleGrades() {
        triggerLightHaptic();
        const { showGrades, grades } = this.data;
        if (!showGrades && !grades) {
            this.setData({ showGrades: true, gradesLoading: true });
            await this.fetchGrades();
        } else {
            this.setData({ showGrades: !showGrades });
        }
    },

    async refreshGrades() {
        await this.fetchGrades(true);
    },

    async fetchGrades(forceRefresh = false) {
        this.setData({ gradesLoading: true });
        try {
            if (!forceRefresh) {
                const cachedGrades = wx.getStorageSync('cache_grades');
                const cachedGradesByTerm = wx.getStorageSync('cache_grades_by_term');
                if (cachedGrades && cachedGradesByTerm) {
                    console.log('✅ [Cache] 成绩：命中永久本地缓存');
                    this.setData({ grades: cachedGrades, gradesByTerm: cachedGradesByTerm, gradesLoading: false });
                    return;
                }
            }

            console.log('🌐 [Network] 获取成绩数据...');
            const res = await api.getGrades({ refresh: forceRefresh });
            if ((res.code === 0 || res.code === 200) && res.data) {
                const grades = res.data;
                const termMap: Record<string, GradeItem[]> = {};
                if (grades.items && Array.isArray(grades.items)) {
                    grades.items.forEach(item => {
                        const term = item.term || '未知学期';
                        if (!termMap[term]) termMap[term] = [];
                        termMap[term].push(item);
                    });
                }
                const gradesByTerm: TermGrades[] = Object.keys(termMap)
                    .sort((a, b) => b.localeCompare(a))
                    .map(term => ({ term, items: termMap[term] }));

                this.setData({ grades, gradesByTerm });
                wx.setStorageSync('cache_grades', grades);
                wx.setStorageSync('cache_grades_by_term', gradesByTerm);
            } else {
                this.setData({ grades: null, gradesByTerm: [] });
            }
        } catch (err: any) {
            this.setData({ grades: null, gradesByTerm: [] });
        } finally {
            this.setData({ gradesLoading: false });
        }
    },

    async toggleECard() {
        triggerLightHaptic();
        const { showECard, ecard } = this.data;
        if (!showECard && !ecard) {
            this.setData({ showECard: true, ecardLoading: true });
            await this.fetchECard();
        } else {
            this.setData({ showECard: !showECard });
        }
    },

    async refreshECard() {
        await this.fetchECard(true);
    },

    async fetchECard(forceRefresh = false) {
        this.setData({ ecardLoading: true });
        try {
            if (!forceRefresh) {
                const cachedECard = wx.getStorageSync('cache_ecard');
                if (cachedECard) {
                    console.log('✅ [Cache] 一卡通：命中永久本地缓存');
                    this.setData({ ecard: cachedECard, ecardLoading: false });
                    return;
                }
            }

            console.log('🌐 [Network] 获取一卡通数据...');
            const res = await api.getECard(forceRefresh);
            if ((res.code === 0 || res.code === 200) && res.data) {
                this.setData({ ecard: res.data });
                wx.setStorageSync('cache_ecard', res.data);
            } else {
                this.setData({ ecard: null });
            }
        } catch (err: any) {
            this.setData({ ecard: null });
        } finally {
            this.setData({ ecardLoading: false });
        }
    },

    loadCustomCourses() {
        const courses = customCourseStorage.getAll();
        const displayCourses: DisplayCustomCourse[] = courses.map(c => ({
            ...c,
            dayStr: DAY_NAMES[c.day - 1] || '',
            weeksText: formatWeeks(c.weeks),
        }));

        const groupedMap = new Map<string, GroupedCustomCourse>();
        displayCourses.forEach(c => {
            const key = `${c.name}|${c.teacher}`;
            if (!groupedMap.has(key)) {
                groupedMap.set(key, { id: key, name: c.name, teacher: c.teacher, items: [] });
            }
            groupedMap.get(key)!.items.push(c);
        });

        this.setData({ customCourses: displayCourses, customCourseGroups: Array.from(groupedMap.values()) });
    },

    toggleCustomCourses() {
        triggerLightHaptic();
        this.setData({ showCustomCourses: !this.data.showCustomCourses });
    },

    showAddModal() {
        const formWeeks: Record<number, boolean> = {};
        for (let i = 1; i <= 20; i++) formWeeks[i] = true;
        this.setData({
            showAddModal: true,
            formName: '', formTeacher: '', formLocation: '',
            formTimeSlots: [{ dayIndex: 0, startIndex: 0, endIndex: 1 }],
            formWeeks,
        });
    },

    hideAddModal() { this.setData({ showAddModal: false }); },
    noop() { },

    onFormInput(e: WechatMiniprogram.Input) {
        const field = e.currentTarget.dataset.field as string;
        this.setData({ [field]: e.detail.value } as any);
    },

    addTimeSlot() {
        triggerLightHaptic();
        const slots = [...this.data.formTimeSlots];
        slots.push({ dayIndex: 0, startIndex: 0, endIndex: 1 });
        this.setData({ formTimeSlots: slots });
    },

    removeTimeSlot(e: WechatMiniprogram.TouchEvent) {
        const index = e.currentTarget.dataset.index as number;
        const slots = [...this.data.formTimeSlots];
        if (slots.length > 1) {
            slots.splice(index, 1);
            this.setData({ formTimeSlots: slots });
        }
    },

    onTimeSlotDayChange(e: WechatMiniprogram.PickerChange) {
        const index = e.currentTarget.dataset.index as number;
        const slots = [...this.data.formTimeSlots];
        slots[index].dayIndex = parseInt(e.detail.value as string);
        this.setData({ formTimeSlots: slots });
    },

    onTimeSlotStartChange(e: WechatMiniprogram.PickerChange) {
        const index = e.currentTarget.dataset.index as number;
        const slots = [...this.data.formTimeSlots];
        slots[index].startIndex = parseInt(e.detail.value as string);
        // 如果开始节次大于结束节次，自动将结束节次设为开始节次
        if (slots[index].startIndex > slots[index].endIndex) {
            slots[index].endIndex = slots[index].startIndex;
        }
        this.setData({ formTimeSlots: slots });
    },

    onTimeSlotEndChange(e: WechatMiniprogram.PickerChange) {
        const index = e.currentTarget.dataset.index as number;
        const slots = [...this.data.formTimeSlots];
        slots[index].endIndex = parseInt(e.detail.value as string);
        this.setData({ formTimeSlots: slots });
    },

    onWeekToggle(e: WechatMiniprogram.TouchEvent) {
        const week = e.currentTarget.dataset.week as number;
        const formWeeks = { ...this.data.formWeeks };
        formWeeks[week] = !formWeeks[week];
        this.setData({ formWeeks });
    },

    // 快捷周次操作
    selectAllWeeks() {
        const formWeeks: Record<number, boolean> = {};
        for (let i = 1; i <= 20; i++) formWeeks[i] = true;
        this.setData({ formWeeks });
    },
    selectOddWeeks() {
        const formWeeks: Record<number, boolean> = {};
        for (let i = 1; i <= 20; i++) formWeeks[i] = (i % 2 !== 0);
        this.setData({ formWeeks });
    },
    selectEvenWeeks() {
        const formWeeks: Record<number, boolean> = {};
        for (let i = 1; i <= 20; i++) formWeeks[i] = (i % 2 === 0);
        this.setData({ formWeeks });
    },
    clearAllWeeks() {
        const formWeeks: Record<number, boolean> = {};
        for (let i = 1; i <= 20; i++) formWeeks[i] = false;
        this.setData({ formWeeks });
    },

    markScheduleChanged() {
        storage.markCustomCourseChanged();
    },

    submitCustomCourse() {
        const { formName, formTeacher, formLocation, formTimeSlots, formWeeks, sectionNumbers } = this.data;

        if (!formName.trim()) {
            wx.showToast({ title: '请输入课程名称', icon: 'none' });
            return;
        }

        const weeks: number[] = [];
        for (let i = 1; i <= 20; i++) {
            if (formWeeks[i]) weeks.push(i);
        }
        if (weeks.length === 0) {
            wx.showToast({ title: '请至少选择一个周次', icon: 'none' });
            return;
        }

        // 逻辑防呆：校验所有时段 start <= end
        for (let i = 0; i < formTimeSlots.length; i++) {
            if (formTimeSlots[i].startIndex > formTimeSlots[i].endIndex) {
                wx.showToast({ title: `第 ${i + 1} 个时段结束节次不能早于开始节次`, icon: 'none' });
                return;
            }
        }

        formTimeSlots.forEach(slot => {
            const day = slot.dayIndex + 1;
            const startNum = sectionNumbers[slot.startIndex];
            const endNum = sectionNumbers[slot.endIndex];
            // 组装成诸如 "1-2节" 或 "3-3节" (首页逻辑会自动将其解析为精确小节)
            const section = startNum === endNum ? `${startNum}节` : `${startNum}-${endNum}节`;

            customCourseStorage.add({
                name: formName.trim(), teacher: formTeacher.trim(),
                location: formLocation.trim(), day, section, weeks,
            });
        });

        this.markScheduleChanged();
        this.setData({ showAddModal: false });
        this.loadCustomCourses();
        wx.showToast({ title: '已添加', icon: 'success' });
    },

    deleteCustomCourse(e: WechatMiniprogram.TouchEvent) {
        const customId = e.currentTarget.dataset.id as string;
        const course = this.data.customCourses.find(c => c.customId === customId);
        wx.showModal({
            title: '提示', content: `确定要删除「${course ? course.name : '该课程'}」吗？`,
            success: (res) => {
                if (res.confirm) {
                    customCourseStorage.remove(customId);
                    this.markScheduleChanged();
                    this.loadCustomCourses();
                    wx.showToast({ title: '已删除', icon: 'success' });
                }
            },
        });
    },

    deleteCustomCourseGroup(e: WechatMiniprogram.TouchEvent) {
        const groupId = e.currentTarget.dataset.groupid as string;
        const group = this.data.customCourseGroups.find(g => g.id === groupId);
        if (!group) return;

        wx.showModal({
            title: '提示', content: `确定要删除「${group.name}」吗？`,
            success: (res) => {
                if (res.confirm) {
                    group.items.forEach(c => customCourseStorage.remove(c.customId));
                    this.markScheduleChanged();
                    this.loadCustomCourses();
                    wx.showToast({ title: '已删除', icon: 'success' });
                }
            },
        });
    },

    clearAllCustomCourses() {
        wx.showModal({
            title: '提示', content: `确定要清除全部 ${this.data.customCourses.length} 门自定义课程吗？`,
            success: (res) => {
                if (res.confirm) {
                    customCourseStorage.removeAll();
                    this.markScheduleChanged();
                    this.loadCustomCourses();
                    wx.showToast({ title: '已清除', icon: 'success' });
                }
            },
        });
    },

    handleClearCache() {
        triggerLightHaptic();
        wx.showModal({
            title: '提示', content: '确定要清除缓存吗？将保留登录状态、账号信息与自定义课程。',
            success: (res) => {
                if (res.confirm) {
                    storage.clearCacheKeepLogin();
                    this.setData({
                        grades: null,
                        gradesByTerm: [],
                        ecard: null,
                        showGrades: false,
                        showECard: false,
                        gradesLoading: false,
                        ecardLoading: false,
                    });
                    this.loadCustomCourses();
                    wx.showToast({ title: '缓存已清除', icon: 'success' });
                }
            },
        });
    },

    handleLogout() {
        wx.showModal({
            title: '提示', content: '确定要退出登录吗？',
            success: (res) => {
                if (res.confirm) {
                    storage.clearAll();
                    wx.showToast({ title: '已退出登录', icon: 'success', duration: 1500 });
                    setTimeout(() => { wx.reLaunch({ url: '/pages/login/login?logout=true' }); }, 1500);
                }
            },
        });
    },

    onShareAppMessage() { return { title: '为文理er准备的小程序，欢迎使用！', path: '/pages/index/index', imageUrl: '/images/share-cover.png' }; },
    onShareTimeline() { return { title: '为文理er准备的小程序，欢迎使用！', imageUrl: '/images/share-cover.png' }; },
});
