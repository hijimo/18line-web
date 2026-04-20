import type { ThemeConfig } from 'antd'

import { neutralColors, tailwindColors, type ColorName } from './tokens'

type ComponentsConfig = NonNullable<ThemeConfig['components']>

// 组件级样式覆盖配置
export const componentTokens = {
  // Button 按钮
  Button: {
    // 按钮高度
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 48,

    // 按钮内边距
    paddingInline: 16,
    paddingInlineSM: 12,
    paddingInlineLG: 24,

    // 按钮圆角
    borderRadius: 4,
    borderRadiusSM: 4,
    borderRadiusLG: 6,

    // 默认按钮
    defaultBg: '#ffffff',
    defaultBorderColor: neutralColors.gray200,
    defaultColor: neutralColors.gray700,

    // 主要按钮 (从主题颜色派生)
    primaryColor: '#ffffff',
    primaryShadow: '0 2px 0 rgba(255,255,255,0.1)',
    defaultShadow: '0 2px 0 rgba(255,255,255,0.1)',
    dangerShadow: '0 2px 0 rgba(255,255,255,0.1)',
  },

  // Input 输入框
  Input: {
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 48,

    paddingInline: 12,
    paddingInlineSM: 8,
    paddingInlineLG: 16,

    borderRadius: 4,
    borderRadiusSM: 4,
    borderRadiusLG: 6,

    addonBg: neutralColors.gray50,
  },

  // Select 选择器
  Select: {
    controlHeight: 40,
    controlHeightSM: 32,
    controlHeightLG: 48,

    borderRadius: 4,
    borderRadiusSM: 4,
    borderRadiusLG: 6,
  },

  // DatePicker 日期选择器
  DatePicker: {
    // 日期面板单元格尺寸
    cellHeight: 24,
    cellWidth: 36,
    textHeight: 40,
    withoutTimeCellHeight: 66,
    timeCellHeight: 28,

    // 时间面板尺寸
    timeColumnHeight: 224,
    timeColumnWidth: 56,

    // 输入框字体
    inputFontSize: 14,
    inputFontSizeLG: 16,
    inputFontSizeSM: 14,

    // 输入框边距
    paddingBlock: 8,
    paddingBlockLG: 10,
    paddingBlockSM: 0,
    paddingInline: 12,

    paddingInlineLG: 12,
    paddingInlineSM: 10,

    // 预设区域尺寸
    presetsWidth: 120,
    presetsMaxWidth: 200,

    // 多选标签样式
    multipleItemHeight: 24,
    multipleItemHeightLG: 32,
    multipleItemHeightSM: 16,
    multipleItemBg: neutralColors.gray100,
    multipleItemBorderColor: 'transparent',
    multipleItemBorderColorDisabled: 'transparent',
    multipleItemColorDisabled: neutralColors.gray400,
    multipleSelectorBgDisabled: neutralColors.gray100,

    // 面板样式
    activeBg: '#ffffff',
    addonBg: neutralColors.gray50,
    hoverBg: '#ffffff',

    cellBgDisabled: neutralColors.gray100,
    cellHoverBg: neutralColors.gray100,

    // 弹出窗口设置
    zIndexPopup: 1050,
  },

  // Table 表格
  Table: {
    borderColor: neutralColors.gray200,
    headerBg: neutralColors.gray50,
    headerColor: neutralColors.gray800,
    headerSortActiveBg: neutralColors.gray100,
    rowHoverBg: neutralColors.gray50,

    // 表格内边距
    cellPaddingInline: 16,
    cellPaddingInlineSM: 12,
    cellPaddingInlineMD: 16,
    cellPaddingInlineLG: 16,

    // 表格外观
    borderRadius: 8,
    borderRadiusLG: 12,
  },

  // Card 卡片
  Card: {
    borderRadius: 8,
    borderRadiusLG: 12,

    paddingLG: 24,
    padding: 16,
    paddingSM: 12,

    headerBg: 'transparent',
    headerHeight: 48,

    actionsBg: 'transparent',
  },

  // Modal 弹窗
  Modal: {
    borderRadius: 8,
    paddingContentHorizontalLG: 24,
    paddingContentHorizontal: 16,
    titleColor: neutralColors.gray900,
    titleFontSize: 18,
    titleLineHeight: 1.5,
    headerPadding: '0px 0px',
    headerBg: 'transparent',
    headerBorderColor: neutralColors.gray200,
    footerBg: 'transparent',
    footerBorderColor: neutralColors.gray200,
    footerPadding: '12px 24px',
  },

  // Drawer 抽屉
  Drawer: {
    bodyPadding: 24,
    footerPaddingBlock: 16,
    footerPaddingInline: 24,
  },

  // Tabs 标签页
  Tabs: {
    horizontalItemPadding: '12px 16px',
    horizontalItemMargin: '0 2px',
    cardGutter: 4,

    cardHeight: 40,
  },

  // Tooltip 提示
  Tooltip: {
    // colorBgDefault: neutralColors.gray100,
    // colorTextLightSolid: neutralColors.gray950,
    borderRadius: 4,
    borderRadiusOuter: 4,
    controlHeight: 32,
    paddingXS: 8,
    paddingXXS: 6,
  },

  // Menu 菜单
  Menu: {
    itemHeight: 40,
    itemBorderRadius: 4,
    subMenuItemBorderRadius: 4,

    popupBg: '#ffffff',
  },

  // Pagination 分页
  Pagination: {
    itemSize: 32,
    itemSizeSM: 24,

    itemActiveColorDisabled: neutralColors.gray400,
    itemActiveBgDisabled: neutralColors.gray100,
  },

  // Tag 标签
  Tag: {
    borderRadiusSM: 16, // 圆角标签
    defaultBg: neutralColors.gray100,
    defaultColor: neutralColors.gray600,
  },

  // Form 表单
  Form: {
    labelRequiredMarkColor: tailwindColors.red[500],
    labelColor: neutralColors.gray700,
    labelFontSize: 14,
    labelHeight: 40,
    itemMarginBottom: 24,
  },
}

/**
 * 获取带主题色的组件配置
 * @param colorName 主题颜色名称
 * @returns 带主题色的组件配置
 */
export const getThemedComponentTokens = (
  colorName: ColorName,
): ComponentsConfig => {
  const color = tailwindColors[colorName] || tailwindColors.teal

  return {
    ...componentTokens,
    Button: {
      ...componentTokens.Button,
      // primaryHoverBg: color[600],
      // primaryActiveBg: color[700],
      linkHoverBg: color[50],
    },
    Input: {
      ...componentTokens.Input,
      hoverBorderColor: color[400],
      activeBorderColor: color[500],
    },
    Select: {
      ...componentTokens.Select,
      multipleItemBg: color[50],
      multipleItemBorderColor: color[200],
      // multipleItemColor: color[700],
      optionSelectedBg: color[50],
      optionSelectedColor: color[700],
      optionActiveBg: color[50],
    },
    DatePicker: {
      ...componentTokens.DatePicker,
      hoverBorderColor: color[400],
      activeBorderColor: color[500],
      activeShadow: `0 0 0 2px ${color[100]}`,
      errorActiveShadow: `0 0 0 2px ${tailwindColors.red[100]}`,
      warningActiveShadow: `0 0 0 2px ${tailwindColors.amber[100]}`,
      cellActiveWithRangeBg: color[50],
      cellHoverWithRangeBg: color[100],
      cellRangeBorderColor: color[400],
      multipleItemBg: color[50],
      multipleItemBorderColor: color[200],
      // multipleItemColor: color[700],
    },
    Table: {
      ...componentTokens.Table,
      rowSelectedBg: color[50],
      rowSelectedHoverBg: color[100],
    },
    Tabs: {
      ...componentTokens.Tabs,
      // tabsActiveColor: color[500],
      itemSelectedColor: color[500],
      itemHoverColor: color[700],
      inkBarColor: color[500],
    },
    Menu: {
      ...componentTokens.Menu,
      itemHoverBg: color[50],
      itemSelectedBg: color[50],
      itemSelectedColor: color[700],
      darkItemSelectedBg: color[700],
    },
    Pagination: {
      ...componentTokens.Pagination,
      itemActiveBg: color[50],
    },
  }
}
