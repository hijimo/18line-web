# 中台前端主题配置系统

基于Ant Design 5.0版本的主题配置系统，符合设计方案规范。

## 文件结构

- `tokens.ts` - 基础颜色配置，包含亮色和暗色主题的颜色定义
- `typography.ts` - 字体和排版相关配置
- `spacing.ts` - 间距和尺寸相关配置
- `border.ts` - 圆角和边框相关配置
- `motion.ts` - 动画和过渡相关配置
- `components.ts` - 组件级样式覆盖配置
- `index.ts` - 主题配置入口，导出完整主题配置
- `example.tsx` - 主题使用示例

## 使用方法

### 基本使用

```tsx
import { ConfigProvider } from 'antd'
import { getThemeConfig } from './theme'

// 在应用根组件中配置主题
const App = () => {
  return (
    <ConfigProvider theme={getThemeConfig('light')}>
      <YourApp />
    </ConfigProvider>
  )
}
```

### 主题切换

```tsx
import { useState } from 'react'
import { ConfigProvider, Switch } from 'antd'
import { getSwitchableTheme } from './theme'

const App = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  return (
    <>
      <Switch
        checked={themeMode === 'dark'}
        onChange={(checked) => setThemeMode(checked ? 'dark' : 'light')}
        checkedChildren="暗色"
        unCheckedChildren="亮色"
      />

      <ConfigProvider theme={getSwitchableTheme(themeMode)}>
        <YourApp />
      </ConfigProvider>
    </>
  )
}
```

### 自定义主题

```tsx
import { ConfigProvider } from 'antd'
import { getSwitchableTheme } from './theme'

// 自定义部分主题配置
const customTheme = {
  token: {
    colorPrimary: '#0ea5e9', // 使用sky-500替代teal-500作为主色
  },
  components: {
    Button: {
      borderRadius: 8, // 自定义按钮圆角
    },
  },
}

const App = () => {
  return (
    <ConfigProvider theme={getSwitchableTheme('light', customTheme)}>
      <YourApp />
    </ConfigProvider>
  )
}
```

## 主题切换原理

本主题系统支持亮色和暗色两种模式，通过以下方式实现：

1. 基于Ant Design 5.0的Token系统进行配置
2. 使用`defaultAlgorithm`和`darkAlgorithm`进行亮暗色算法切换
3. 为不同主题模式提供不同的颜色映射关系
4. 支持通过`ConfigProvider`进行主题动态切换

## 主题定制

如需调整主题配置，可直接修改相应的配置文件：

- 调整颜色系统：修改`tokens.ts`
- 调整字体和排版：修改`typography.ts`
- 调整间距和尺寸：修改`spacing.ts`
- 调整圆角和边框：修改`border.ts`
- 调整动画效果：修改`motion.ts`
- 调整组件样式：修改`components.ts`

# 主题系统

这个目录包含应用的主题系统实现，支持亮色/暗色模式和多种颜色系统切换。

## 文件结构

- **index.ts**: 主题系统的入口文件，导出各种主题相关的函数和类型
- **tokens.ts**: 定义颜色、间距、阴影等设计令牌
- **typography.ts**: 文字排版相关的主题配置
- **spacing.ts**: 间距相关的主题配置
- **border.ts**: 边框相关的主题配置
- **motion.ts**: 动画相关的主题配置
- **components.ts**: 组件级别的主题配置
- **tailwind-bridge.ts**: 连接 Ant Design 和 TailwindCSS 的桥接层

## 主题系统特性

- **亮色/暗色模式切换**: 支持基于用户偏好的亮色和暗色模式
- **多色系主题**: 支持Tailwind CSS的22种颜色系统作为主题色
- **本地保存**: 用户的主题偏好会保存到localStorage
- **响应式设计**: 主题适配各种屏幕尺寸

## 使用方法

### 1. 切换主题模式

```tsx
import useTheme from '@/hooks/useTheme'

const MyComponent = () => {
  const { themeMode, setThemeMode } = useTheme()

  return (
    <button
      onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
    >
      切换主题模式
    </button>
  )
}
```

### 2. 切换主题颜色

```tsx
import useTheme from '@/hooks/useTheme'
import type { ColorName } from '@/theme/tokens'

const MyComponent = () => {
  const { colorName, setColorName } = useTheme()

  return (
    <button onClick={() => setColorName('blue' as ColorName)}>
      切换到蓝色主题
    </button>
  )
}
```

### 3. 获取所有可用的颜色系统

```tsx
import { getAvailableColors } from '@/theme'

const colors = getAvailableColors()
// 返回: ['red', 'orange', 'amber', 'yellow', 'lime', 'green', ...]
```

### 4. 使用预设的主题切换器组件

```tsx
import ThemeSwitcher from '@/components/ThemeSwitcher'

const MyComponent = () => {
  return (
    <div>
      <h1>我的应用</h1>
      <ThemeSwitcher />
    </div>
  )
}
```

## 颜色系统

该主题系统集成了Tailwind CSS的完整颜色系统，包括22种颜色系列：

- 主要颜色系列：red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose
- 中性颜色系列：slate, gray, zinc, neutral, stone

每种颜色都有从50到950的色阶，可以在应用中使用。

## 扩展

如需添加新的颜色系列或修改现有颜色，请编辑 `tokens.ts` 文件中的 `tailwindColors` 对象。
