import type { ThemeConfig } from 'antd'
import { borderTokens, darkBorderTokens } from './border'
import { componentTokens, getThemedComponentTokens } from './components'
import { motionTokens } from './motion'
import { spacingTokens } from './spacing'
import type { ColorName } from './tokens'
import { darkTheme, getThemeTokens, lightTheme, tailwindColors } from './tokens'
import { typographyTokens } from './typography'

// 自定义主题设置类型
type ThemeSettings = {
  token?: Record<string, unknown>
  components?: Record<string, unknown>
}

// 主题模式类型
export type ThemeMode = 'light' | 'dark'

// 合并基础主题设置
const mergedLightTheme = {
  ...lightTheme,
  token: {
    ...lightTheme.token,
    ...typographyTokens,
    ...spacingTokens,
    ...borderTokens,
    ...motionTokens,
  },
  components: componentTokens,
}

// 合并暗色主题设置
const mergedDarkTheme = {
  ...darkTheme,
  token: {
    ...darkTheme.token,
    ...typographyTokens,
    ...spacingTokens,
    ...darkBorderTokens, // 使用暗色模式的边框设置
    ...motionTokens,
  },
  components: componentTokens, // 组件配置可以进一步区分暗色和亮色
}

/**
 * 获取当前主题配置
 * @param themeMode 主题模式，'light' 或 'dark'
 * @param colorName 主题颜色名称，从Tailwind的22个色系中选择
 * @returns 完整的主题配置对象
 */
export const getThemeConfig = (
  themeMode: ThemeMode = 'light',
  colorName: ColorName = 'teal',
): ThemeConfig => {
  const themeTokens = getThemeTokens(colorName, themeMode)
  const basicTheme = themeMode === 'dark' ? mergedDarkTheme : mergedLightTheme

  // 创建一个带有当前主题色的组件配置
  const themedComponents = getThemedComponentTokens(colorName)

  return {
    ...basicTheme,
    token: {
      ...basicTheme.token,
      ...themeTokens.token,
    },
    components: themedComponents, // 使用动态组件配置
    ...(themeTokens.algorithm && { algorithm: themeTokens.algorithm }),
    hashed: false,
  }
}

/**
 * 动态切换主题
 * @param themeMode 主题模式
 * @param colorName 主题颜色名称
 * @param customSettings 自定义主题设置（可选）
 * @returns 合并后的主题配置
 */
export const getSwitchableTheme = (
  themeMode: ThemeMode = 'light',
  colorName: ColorName = 'teal',
  customSettings: ThemeSettings = {},
): ThemeConfig => {
  const baseTheme = getThemeConfig(themeMode, colorName)

  return {
    ...baseTheme,
    token: {
      ...baseTheme.token,
      ...customSettings?.token,
    },
    components: {
      ...baseTheme.components,
      ...customSettings?.components,
    },
  }
}

/**
 * 获取所有可用的颜色系统名称
 * @returns 所有可用的颜色系统名称数组
 */
export const getAvailableColors = (): ColorName[] => {
  return Object.keys(tailwindColors) as ColorName[]
}

// 暴露所有主题相关设置供单独使用
export {
  borderTokens,
  ColorName,
  componentTokens,
  darkBorderTokens,
  darkTheme,
  lightTheme,
  motionTokens,
  spacingTokens,
  tailwindColors,
  typographyTokens,
}
