// 动画和过渡配置
export const motionTokens = {
  // 动画时长
  motionDurationFast: '0.1s', // 50-100ms，快速反馈
  motionDurationMid: '0.2s', // 150-200ms，标准过渡
  motionDurationSlow: '0.3s', // 200-300ms，强调过渡
  motionDurationSlower: '0.5s', // 400-500ms，大型元素过渡

  // 缓动曲线
  motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)', // 平滑过渡
  motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)', // 进入动画
  motionEaseIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', // 退出动画
  motionEaseOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // 弹性过渡
  motionEaseInBack: 'cubic-bezier(0.36, 0, 0.66, -0.56)', // 压缩效果

  // 常用过渡组合
  motionBase: 0, // 基础过渡
  motionEnter: '0.2s cubic-bezier(0.215, 0.61, 0.355, 1)', // 元素进入过渡
  motionLeave: '0.15s cubic-bezier(0.55, 0.055, 0.675, 0.19)', // 元素离开过渡
  motionExpand: '0.3s cubic-bezier(0.645, 0.045, 0.355, 1)', // 展开过渡
  motionCollapse: '0.3s cubic-bezier(0.645, 0.045, 0.355, 1)', // 折叠过渡
}

// 为组件提供默认动画配置
export const componentMotions = {
  // 弹出和抽屉
  modal: {
    motion: motionTokens.motionBase,
    enter: `${motionTokens.motionDurationMid} ${motionTokens.motionEaseOutBack}`,
    leave: `${motionTokens.motionDurationMid} ${motionTokens.motionEaseIn}`,
  },
  drawer: {
    motion: motionTokens.motionBase,
    enter: `${motionTokens.motionDurationSlow} ${motionTokens.motionEaseOut}`,
    leave: `${motionTokens.motionDurationMid} ${motionTokens.motionEaseIn}`,
  },

  // 下拉菜单
  dropdown: {
    motion: motionTokens.motionBase,
    enter: `${motionTokens.motionDurationFast} ${motionTokens.motionEaseOutBack}`,
    leave: `${motionTokens.motionDurationFast} ${motionTokens.motionEaseIn}`,
  },

  // 折叠面板
  collapse: {
    motion: motionTokens.motionBase,
    enter: motionTokens.motionExpand,
    leave: motionTokens.motionCollapse,
  },

  // 标签页切换
  tabs: {
    inkBarMotion: `${motionTokens.motionDurationMid} ${motionTokens.motionEaseInOut}`,
    tabPaneMotion: `${motionTokens.motionDurationMid} ${motionTokens.motionEaseInOut}`,
  },

  // 列表动画
  list: {
    itemMotion: `${motionTokens.motionDurationMid} ${motionTokens.motionEaseOut}`,
  },
}
