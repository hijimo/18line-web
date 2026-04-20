import { theme } from 'antd'

// 颜色对象的类型定义
import type { ThemeConfig } from 'antd'

type ColorScale = {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950: string
}

// 所有颜色系统的类型
export type ColorPalettes = {
  red: ColorScale
  orange: ColorScale
  amber: ColorScale
  yellow: ColorScale
  lime: ColorScale
  green: ColorScale
  emerald: ColorScale
  teal: ColorScale
  cyan: ColorScale
  sky: ColorScale
  blue: ColorScale
  indigo: ColorScale
  violet: ColorScale
  purple: ColorScale
  fuchsia: ColorScale
  pink: ColorScale
  rose: ColorScale
  slate: ColorScale
  gray: ColorScale
  zinc: ColorScale
  neutral: ColorScale
  stone: ColorScale
}

// 可用的颜色系统名称
export type ColorName = keyof ColorPalettes

// Tailwind颜色系统 - 添加所有22个色系
export const tailwindColors: ColorPalettes = {
  // 基础颜色
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },
  lime: {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#84cc16',
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#3f6212',
    900: '#365314',
    950: '#1a2e05',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  fuchsia: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  stone: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },
}

// 完整的中性色系统
export const neutralColors = {
  // 灰色系列
  gray50: tailwindColors.slate[50],
  gray100: tailwindColors.slate[100],
  gray200: tailwindColors.slate[200],
  gray300: tailwindColors.slate[300],
  gray400: tailwindColors.slate[400],
  gray500: tailwindColors.slate[500],
  gray600: tailwindColors.slate[600],
  gray700: tailwindColors.slate[700],
  gray800: tailwindColors.slate[800],
  gray900: tailwindColors.slate[900],
  gray950: tailwindColors.slate[950],
}

// 暗色模式下的中性色映射
export const darkNeutralColors = {
  gray50: '#18212f',
  gray100: '#1e293b',
  gray200: '#2d3748',
  gray300: '#3e4c59',
  gray400: '#718096',
  gray500: '#a0aec0',
  gray600: '#cbd5e0',
  gray700: '#e2e8f0',
  gray800: '#edf2f7',
  gray900: '#f7fafc',
  gray950: '#f8fafc',
}

// 语义颜色类型
type SemanticColorsType = {
  primary: string
  primaryHover: string
  primaryActive: string
  primaryLight: string
  primaryLighter: string
  primaryLightest: string
  success: string
  successHover: string
  successActive: string
  successLight: string
  successLighter: string
  successLightest: string
  warning: string
  warningHover: string
  warningActive: string
  warningLight: string
  warningLighter: string
  warningLightest: string
  error: string
  errorHover: string
  errorActive: string
  errorLight: string
  errorLighter: string
  errorLightest: string
  info: string
  infoHover: string
  infoActive: string
  infoLight: string
  infoLighter: string
  infoLightest: string
}

// 获取语义颜色对象，基于选定主题色
export const getSemanticColors = (
  colorName: ColorName = 'teal',
): SemanticColorsType => {
  const colorPalette = tailwindColors[colorName]

  return {
    // 主色
    primary: colorPalette[500],
    primaryHover: colorPalette[600],
    primaryActive: colorPalette[700],
    primaryLight: colorPalette[200],
    primaryLighter: colorPalette[100],
    primaryLightest: colorPalette[50],

    // 成功色 (green系列)
    success: tailwindColors.green[500],
    successHover: tailwindColors.green[600],
    successActive: tailwindColors.green[700],
    successLight: tailwindColors.green[200],
    successLighter: tailwindColors.green[100],
    successLightest: tailwindColors.green[50],

    // 警告色 (amber系列)
    warning: tailwindColors.amber[500],
    warningHover: tailwindColors.amber[600],
    warningActive: tailwindColors.amber[700],
    warningLight: tailwindColors.amber[300],
    warningLighter: tailwindColors.amber[100],
    warningLightest: tailwindColors.amber[50],

    // 错误色 (red系列)
    error: tailwindColors.red[500],
    errorHover: tailwindColors.red[600],
    errorActive: tailwindColors.red[700],
    errorLight: tailwindColors.red[300],
    errorLighter: tailwindColors.red[100],
    errorLightest: tailwindColors.red[50],

    // 信息色 (blue系列)
    info: tailwindColors.blue[500],
    infoHover: tailwindColors.blue[600],
    infoActive: tailwindColors.blue[700],
    infoLight: tailwindColors.blue[300],
    infoLighter: tailwindColors.blue[100],
    infoLightest: tailwindColors.blue[50],
  }
}

// 默认语义颜色(使用teal)
export const semanticColors = getSemanticColors('teal')

// 扩展的颜色配置 - 完整的中性色色板映射到AntD可用的变量名
export const extendedNeutralColorTokens = {
  // 文本颜色层级
  colorTextHeading: neutralColors.gray900, // 标题文字颜色
  colorTextLabel: neutralColors.gray700, // 标签文字颜色
  colorTextDescription: neutralColors.gray500, // 描述文字颜色
  colorTextPlaceholder: neutralColors.gray400, // 占位符文字颜色
  colorTextDisabled: neutralColors.gray400, // 禁用状态文字颜色

  // 背景色应用
  colorBgMask: 'rgba(0, 0, 0, 0.45)', // 遮罩层背景色
  colorBgPage: neutralColors.gray50, // 页面背景色

  // 分割线颜色
  colorSplit: neutralColors.gray100, // 分割线颜色

  // 边框应用
  colorBorderFocus: semanticColors.primary, // 聚焦状态边框颜色
}

// 生成基础颜色配置
export const getBaseTokens = (
  fnSemanticColors: SemanticColorsType,
): Record<string, string> => ({
  // 主色与功能色定义
  colorPrimary: fnSemanticColors.primary,
  colorSuccess: fnSemanticColors.success,
  colorWarning: fnSemanticColors.warning,
  colorError: fnSemanticColors.error,
  colorInfo: fnSemanticColors.info,
  colorLink: fnSemanticColors.primary,
  colorLinkActive: fnSemanticColors.primaryActive,
  colorLinkHover: fnSemanticColors.primaryHover,

  // 中性色配置
  colorTextBase: neutralColors.gray950,
  colorBgBase: '#ffffff',

  // 扩展的中性色配置
  colorText: neutralColors.gray900, // 主要文本颜色
  colorTextSecondary: neutralColors.gray700, // 次要文本颜色
  colorTextTertiary: neutralColors.gray500, // 第三级文本颜色
  colorTextQuaternary: neutralColors.gray400, // 第四级文本颜色

  // 背景色系列
  colorBgContainer: '#ffffff', // 容器背景色
  colorBgElevated: '#ffffff', // 浮层背景色
  colorBgLayout: neutralColors.gray50, // 布局背景色
  colorBgSpotlight: neutralColors.gray950, // 聚光背景色

  // 边框颜色
  colorBorder: neutralColors.gray200,
  colorBorderSecondary: neutralColors.gray100,

  // 填充色
  colorFill: neutralColors.gray100,
  colorFillSecondary: neutralColors.gray50,
  colorFillTertiary: '#ffffff',
  colorFillQuaternary: '#ffffff',
  // 控制项激活状态背景色
  controlItemBgActive: fnSemanticColors.primaryLightest,
  controlItemBgActiveDisabled: 'rgba(0, 0, 0, 0.15)',
  controlItemBgActiveHover: fnSemanticColors.primaryLighter,
  // 控制项悬浮背景色
  controlItemBgHover: 'rgba(0, 0, 0, 0.04)',
})

// 默认基础颜色
export const baseTokens = getBaseTokens(semanticColors)

// 获取主题配置
export const getThemeTokens = (
  colorName: ColorName = 'teal',
  mode: 'light' | 'dark' = 'light',
): ThemeConfig => {
  const colors = getSemanticColors(colorName)
  const tokens = getBaseTokens(colors)

  if (mode === 'light') {
    return {
      token: {
        ...tokens,
        ...extendedNeutralColorTokens,
        // colorBorderFocus: colors.primary,
        // 控制项激活状态背景色 - 亮色模式
        controlItemBgActive: colors.primaryLightest,
        controlItemBgActiveDisabled: 'rgba(0, 0, 0, 0.15)',
        controlItemBgActiveHover: colors.primaryLighter,
        // 控制项悬浮背景色 - 亮色模式
        controlItemBgHover: 'rgba(0, 0, 0, 0.04)',
      },
      algorithm: theme.defaultAlgorithm,
    }
  }
  // 暗色模式下调整颜色
  return {
    token: {
      // 主色与功能色调整为更亮的色调
      colorPrimary: tailwindColors[colorName][400],
      colorSuccess: tailwindColors.green[400],
      colorWarning: tailwindColors.amber[400],
      colorError: tailwindColors.red[400],
      colorInfo: tailwindColors.blue[400],
      colorLink: colors.primary,
      colorLinkActive: colors.primaryActive,
      colorLinkHover: colors.primaryHover,

      // 控制项激活状态背景色 - 暗色模式
      controlItemBgActive: `rgba(${parseInt(
        tailwindColors[colorName][400].slice(1, 3),
        16,
      )}, ${parseInt(tailwindColors[colorName][400].slice(3, 5), 16)}, ${parseInt(
        tailwindColors[colorName][400].slice(5, 7),
        16,
      )}, 0.2)`,
      controlItemBgActiveDisabled: 'rgba(255, 255, 255, 0.15)',
      controlItemBgActiveHover: `rgba(${parseInt(
        tailwindColors[colorName][400].slice(1, 3),
        16,
      )}, ${parseInt(tailwindColors[colorName][400].slice(3, 5), 16)}, ${parseInt(
        tailwindColors[colorName][400].slice(5, 7),
        16,
      )}, 0.3)`,
      // 控制项悬浮背景色 - 暗色模式
      controlItemBgHover: 'rgba(255, 255, 255, 0.08)',

      // 中性色反转
      colorTextBase: darkNeutralColors.gray700,
      colorBgBase: '#121212',

      // 边框颜色调整
      colorBorder: '#2d3748',
      colorBorderSecondary: '#1e293b',

      // 文本颜色层级 - 暗色模式
      colorText: darkNeutralColors.gray900,
      colorTextSecondary: darkNeutralColors.gray700,
      colorTextTertiary: darkNeutralColors.gray500,
      colorTextQuaternary: darkNeutralColors.gray400,
      colorTextHeading: darkNeutralColors.gray900,
      colorTextLabel: darkNeutralColors.gray700,
      colorTextDescription: darkNeutralColors.gray500,
      colorTextPlaceholder: darkNeutralColors.gray400,
      colorTextDisabled: darkNeutralColors.gray400,

      // 背景色系列 - 暗色模式
      colorBgContainer: '#1e293b',
      colorBgElevated: '#2d3748',
      colorBgLayout: '#0f172a',
      colorBgSpotlight: '#18212f',
      // colorBgPage: '#0f172a',

      // 填充色 - 暗色模式
      colorFill: '#2d3748',
      colorFillSecondary: '#1e293b',
      colorFillTertiary: '#18212f',
      colorFillQuaternary: '#0f172a',

      // 分割线颜色 - 暗色模式
      colorSplit: '#2d3748',

      // 遮罩层
      colorBgMask: 'rgba(0, 0, 0, 0.6)',

      // 边框应用 - 聚焦状态使用主题色
      // colorBorderFocus: tailwindColors[colorName][400],
    },
    algorithm: theme.darkAlgorithm,
  }
}

// 默认亮色主题配置
export const lightTheme = getThemeTokens('teal', 'light')

// 暗色主题配置
export const darkTheme = getThemeTokens('teal', 'dark')

// 为组件库设计的色彩应用映射
export const getColorMap = (
  colorName: ColorName = 'teal',
): Record<string, string> => {
  const colors = getSemanticColors(colorName)

  return {
    // 主色应用
    primary: colors.primary,
    primaryHover: colors.primaryHover,
    primaryActive: colors.primaryActive,
    primaryBg: colors.primaryLightest,
    primaryBorder: colors.primaryLight,

    // 功能色应用
    success: colors.success,
    successBg: colors.successLightest,
    successBorder: colors.successLight,

    warning: colors.warning,
    warningBg: colors.warningLightest,
    warningBorder: colors.warningLight,

    error: colors.error,
    errorBg: colors.errorLightest,
    errorBorder: colors.errorLight,

    info: colors.info,
    infoBg: colors.infoLightest,
    infoBorder: colors.infoLight,

    // 中性色应用
    textPrimary: neutralColors.gray900,
    textSecondary: neutralColors.gray700,
    textTertiary: neutralColors.gray500,
    textDisabled: neutralColors.gray400,

    bgLayout: neutralColors.gray50,
    bgContainer: '#ffffff',
    bgElevated: '#ffffff',
    bgSpotlight: neutralColors.gray100,

    borderBase: neutralColors.gray200,
    borderLight: neutralColors.gray100,
    split: neutralColors.gray100,
  }
}

// 当前颜色映射
export const colorMap = getColorMap('teal')

export const light = lightTheme
export const dark = darkTheme
