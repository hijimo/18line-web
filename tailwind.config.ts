import type { Config } from 'tailwindcss'

const { generateTailwindTheme } = require('./src/theme/tailwind-bridge')

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,.css}'],
  theme: {
    extend: {
      ...generateTailwindTheme(import.meta.env.VITE_THEME_COLOR), // 主题色修改
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar-hide'),
    require('@tailwindcss/line-clamp'),
  ],
  // 禁用 preflight 以避免与 Ant Design 冲突
  corePlugins: {
    preflight: false,
  },
}

export default config
