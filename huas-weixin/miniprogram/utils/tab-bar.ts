export function setSelectedTab(
  page: WechatMiniprogram.Page.Instance<any, any>,
  selected: number,
): void {
  const getter = (page as WechatMiniprogram.Page.Instance<any, any> & {
    getTabBar?: (
      cb?: (tabBar: WechatMiniprogram.Component.TrivialInstance) => void,
    ) => WechatMiniprogram.Component.TrivialInstance | undefined;
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
