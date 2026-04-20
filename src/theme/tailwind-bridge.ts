import {
  darkNeutralColors,
  getSemanticColors,
  neutralColors,
  type ColorName,
} from './tokens'

export type TailwindTheme = {
  colors: {
    primary: {
      DEFAULT: string
      50: string
      100: string
      200: string
      500: string
      600: string
      700: string
    }
    success: {
      DEFAULT: string
      50: string
      100: string
      200: string
      500: string
      600: string
      700: string
    }
    warning: {
      DEFAULT: string
      50: string
      100: string
      200: string
      500: string
      600: string
      700: string
    }
    error: {
      DEFAULT: string
      50: string
      100: string
      200: string
      500: string
      600: string
      700: string
    }
    info: {
      DEFAULT: string
      50: string
      100: string
      200: string
      500: string
      600: string
      700: string
    }
    gray: Record<string, string>
    teal: Record<string, string>
  }
  borderRadius: {
    sm: string
    DEFAULT: string
    md: string
    lg: string
    xl: string
  }
  boxShadow: {
    sm: string
    DEFAULT: string
    md: string
    lg: string
    xl: string
    inner: string
    none: string
  }
  fontFamily: {
    sans: string[]
  }
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
  }
  spacing: Record<string, string>
}

/**
 * 生成Tailwind配置，用于桥接Ant Design主题和Tailwind CSS
 * 可在tailwind.config.js中引入此函数生成的配置
 *
 * @example
 * // tailwind.config.js
 * const { generateTailwindTheme } = require('./theme/tailwind-bridge');
 *
 * module.exports = {
 *   theme: {
 *     extend: generateTailwindTheme(),
 *   },
 *   // ...其它配置
 * };
 */

export const generateTailwindTheme = (
  colorName: ColorName = 'teal',
): TailwindTheme => {
  const semanticColors = getSemanticColors(colorName)
  return {
    colors: {
      // 主色
      primary: {
        DEFAULT: semanticColors.primary,
        50: semanticColors.primaryLightest,
        100: semanticColors.primaryLighter,
        200: semanticColors.primaryLight,
        500: semanticColors.primary,
        600: semanticColors.primaryHover,
        700: semanticColors.primaryActive,
      },
      // 功能色
      success: {
        DEFAULT: semanticColors.success,
        50: semanticColors.successLightest,
        100: semanticColors.successLighter,
        200: semanticColors.successLight,
        500: semanticColors.success,
        600: semanticColors.successHover,
        700: semanticColors.successActive,
      },
      warning: {
        DEFAULT: semanticColors.warning,
        50: semanticColors.warningLightest,
        100: semanticColors.warningLighter,
        200: semanticColors.warningLight,
        500: semanticColors.warning,
        600: semanticColors.warningHover,
        700: semanticColors.warningActive,
      },
      error: {
        DEFAULT: semanticColors.error,
        50: semanticColors.errorLightest,
        100: semanticColors.errorLighter,
        200: semanticColors.errorLight,
        500: semanticColors.error,
        600: semanticColors.errorHover,
        700: semanticColors.errorActive,
      },
      info: {
        DEFAULT: semanticColors.info,
        50: semanticColors.infoLightest,
        100: semanticColors.infoLighter,
        200: semanticColors.infoLight,
        500: semanticColors.info,
        600: semanticColors.infoHover,
        700: semanticColors.infoActive,
      },
      // 灰色系列 - 保持原有gray命名，兼容Tailwind默认方案
      gray: {
        50: neutralColors.gray50,
        100: neutralColors.gray100,
        200: neutralColors.gray200,
        300: neutralColors.gray300,
        400: neutralColors.gray400,
        500: neutralColors.gray500,
        600: neutralColors.gray600,
        700: neutralColors.gray700,
        800: neutralColors.gray800,
        900: neutralColors.gray900,
        950: neutralColors.gray950,
      },
      // 保持teal色系命名，与design system保持一致
      teal: {
        50: semanticColors.primaryLightest,
        100: semanticColors.primaryLighter,
        200: semanticColors.primaryLight,
        500: semanticColors.primary,
        600: semanticColors.primaryHover,
        700: semanticColors.primaryActive,
      },
    },
    borderRadius: {
      sm: '2px', // 小圆角
      DEFAULT: '4px', // 标准圆角
      md: '6px', // 中等圆角
      lg: '8px', // 大圆角
      xl: '12px', // 超大圆角
    },
    boxShadow: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      DEFAULT:
        '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      none: 'none',
    },
    fontFamily: {
      sans: ['Inter', 'HarmonyOS Sans', 'Helvetica Neue', 'sans-serif'],
    },
    fontSize: {
      xs: '12px', // 超小号文本
      sm: '13px', // 小号文本
      base: '14px', // 基准字号
      lg: '16px', // 大型文本
      xl: '18px', // 模块标题
      '2xl': '20px', // 页面标题
    },
    spacing: {
      // 添加设计系统中定义的间距
      '0.5': '2px', // 2px
      '1': '4px', // 4px
      '1.5': '6px', // 6px
      '2': '8px', // 8px
      '2.5': '10px', // 10px
      '3': '12px', // 12px
      '3.5': '14px', // 14px
      '4': '16px', // 16px
      '5': '20px', // 20px
      '6': '24px', // 24px
      '7': '28px', // 28px
      '8': '32px', // 32px
      '9': '36px', // 36px
      '10': '40px', // 40px
      '11': '44px', // 44px
      '12': '48px', // 48px
      '16': '64px', // 64px
    },
  }
}

/**
 * 生成CSS变量，用于在CSS中直接使用主题变量
 * 可在全局样式文件中引入
 *
 * @example
 * // 在全局CSS文件中
 * :root {
 *   ${generateCssVariables()}
 * }
 */
export const generateCssVariables = (colorName: ColorName = 'teal'): string => {
  const variables: Record<string, string> = {}
  const themeSemanticsColors = getSemanticColors(colorName)

  // 添加中性色变量
  Object.entries(neutralColors).forEach(([key, value]) => {
    variables[`--color-${key}`] = value
  })

  // 添加语义色变量
  Object.entries(themeSemanticsColors).forEach(([key, value]) => {
    variables[`--color-${key}`] = value
  })

  // 转换为CSS字符串
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ')
}

/**
 * 创建自定义CSS类，用于快速应用主题样式
 * 这些类可以和Tailwind类一起使用，或单独使用
 *
 * @example
 * // 在全局CSS文件中
 * ${generateCustomClasses()}
 */
export const generateCustomClasses = (): void => {
  const css = `
  /* 文本颜色 */
  .text-primary { color: var(--color-primary); }
  .text-success { color: var(--color-success); }
  .text-warning { color: var(--color-warning); }
  .text-error { color: var(--color-error); }
  .text-info { color: var(--color-info); }
  
  /* 背景颜色 */
  .bg-primary { background-color: var(--color-primary); }
  .bg-primary-light { background-color: var(--color-primaryLightest); }
  .bg-success { background-color: var(--color-success); }
  .bg-success-light { background-color: var(--color-successLightest); }
  .bg-warning { background-color: var(--color-warning); }
  .bg-warning-light { background-color: var(--color-warningLightest); }
  .bg-error { background-color: var(--color-error); }
  .bg-error-light { background-color: var(--color-errorLightest); }
  .bg-info { background-color: var(--color-info); }
  .bg-info-light { background-color: var(--color-infoLightest); }
  
  /* 边框颜色 */
  .border-primary { border-color: var(--color-primary); }
  .border-success { border-color: var(--color-success); }
  .border-warning { border-color: var(--color-warning); }
  .border-error { border-color: var(--color-error); }
  .border-info { border-color: var(--color-info); }
  
  /* 通用状态类 */
  .status-success { 
    color: var(--color-success);
    background-color: var(--color-successLightest);
    border-color: var(--color-successLight);
  }
  .status-warning {
    color: var(--color-warning);
    background-color: var(--color-warningLightest);
    border-color: var(--color-warningLight);
  }
  .status-error {
    color: var(--color-error);
    background-color: var(--color-errorLightest);
    border-color: var(--color-errorLight);
  }
  .status-info {
    color: var(--color-info);
    background-color: var(--color-infoLightest);
    border-color: var(--color-infoLight);
  }
  `
  document.head.appendChild(document.createElement('style')).textContent = css
}

/**
 * 用于动态切换主题时更新CSS变量
 * 在主题切换时调用此函数
 *
 * @example
 * // 当主题发生变化时
 * import { updateThemeCssVariables } from './tailwind-bridge';
 *
 * // 在主题切换的地方调用
 * function toggleTheme(mode) {
 *   updateThemeCssVariables(mode);
 * }
 */
export const updateThemeCssVariables = (
  themeMode: 'light' | 'dark',
  colorName: ColorName = 'teal',
): void => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const themeSemanticsColors = getSemanticColors(colorName)
  const themeColors =
    themeMode === 'dark'
      ? { ...darkNeutralColors, ...themeSemanticsColors }
      : { ...neutralColors, ...themeSemanticsColors }

  // 设置CSS变量
  Object.entries(themeColors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, String(value))
  })

  // 设置primary相关的CSS变量，用于Tailwind主题
  root.style.setProperty(
    '--color-primary-50',
    themeSemanticsColors.primaryLightest,
  )
  root.style.setProperty(
    '--color-primary-100',
    themeSemanticsColors.primaryLighter,
  )
  root.style.setProperty(
    '--color-primary-200',
    themeSemanticsColors.primaryLight,
  )
  root.style.setProperty('--color-primary-500', themeSemanticsColors.primary)
  root.style.setProperty(
    '--color-primary-600',
    themeSemanticsColors.primaryHover,
  )
  root.style.setProperty(
    '--color-primary-700',
    themeSemanticsColors.primaryActive,
  )
}
