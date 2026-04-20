// 间距与尺寸配置（基于4px倍数的设计体系）
export const spacingTokens = {
  // 基础单位
  sizeUnit: 4, // 4px作为基础单位

  // 基础间距
  sizeXXS: 4, // 极小间距
  sizeXS: 8, // 小间距
  sizeSM: 12, // 中小间距
  sizeMD: 16, // 中等间距
  sizeLG: 24, // 大间距
  sizeXL: 32, // 超大间距
  sizeXXL: 48, // 特大间距

  // 组件内部间距
  paddingXXS: 4, // 极小内边距
  paddingXS: 8, // 小内边距
  paddingSM: 12, // 中小内边距
  padding: 16, // 标准内边距
  paddingMD: 20, // 中等内边距
  paddingLG: 24, // 大内边距
  paddingXL: 32, // 超大内边距

  // 组件间外部间距
  marginXXS: 4, // 极小外边距
  marginXS: 8, // 小外边距
  marginSM: 12, // 中小外边距
  margin: 16, // 标准外边距
  marginMD: 20, // 中等外边距
  marginLG: 24, // 大外边距
  marginXL: 32, // 超大外边距

  // 特定组件尺寸
  controlHeight: 40, // 标准控件高度
  controlHeightSM: 32, // 小型控件高度
  controlHeightLG: 44, // 大型控件高度
  controlHeightXL: 52, // 超大控件高度
}

// 创建间距工具函数
export const spacing = (multiplier: number): number =>
  spacingTokens.sizeUnit * multiplier
