// 圆角和边框配置
export const borderTokens = {
  // 圆角定义
  borderRadius: 4, // 标准圆角
  borderRadiusSM: 2, // 小圆角
  borderRadiusLG: 8, // 大圆角
  borderRadiusXL: 12, // 超大圆角
  borderRadiusOuter: 4, // 外层容器圆角

  // 边框定义
  borderWidth: 1, // 标准边框宽度
  borderWidthLG: 2, // 粗边框宽度

  // 边框样式
  borderStyle: 'solid', // 标准边框样式
  borderStyleDashed: 'dashed', // 虚线边框样式

  // 轮廓
  outlineWidth: 2, // 轮廓宽度
  outlineOffset: 2, // 轮廓偏移

  // 阴影
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // 微弱阴影
  boxShadowSM:
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // 小阴影
  boxShadowMD:
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // 中等阴影
  boxShadowLG:
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // 大阴影
  boxShadowXL:
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // 特大阴影
  boxShadowInner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', // 内阴影
}

// 暗色模式的阴影配置
export const darkBorderTokens = {
  ...borderTokens,
  // 暗色模式下阴影更暗且更模糊
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
  boxShadowSM: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
  boxShadowMD:
    '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  boxShadowLG:
    '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
  boxShadowXL:
    '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  boxShadowInner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
}
