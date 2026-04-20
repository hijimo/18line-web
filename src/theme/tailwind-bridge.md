# Tailwind CSS 与 Ant Design 主题桥接指南

本文档介绍如何使用 `tailwind-bridge.ts` 文件，实现 Tailwind CSS 与 Ant Design v5 主题系统的无缝集成，特别适合需要同时使用这两种框架的项目。

## 概述

`tailwind-bridge.ts` 文件提供了一套工具函数，用于：

1. 将 Ant Design 主题变量同步到 Tailwind CSS 配置
2. 生成包含主题颜色的 CSS 变量
3. 创建可直接使用的主题相关 CSS 类
4. 在运行时动态更新主题（支持亮色/暗色模式切换）

这种桥接方式不需要修改现有项目结构，只需简单引入即可使用。

## 基本用法

### 1. 配置 Tailwind CSS

在 `tailwind.config.js` 文件中引入 `generateTailwindTheme` 函数：

```js
// tailwind.config.js
const { generateTailwindTheme } = require('./theme/tailwind-bridge')

module.exports = {
  theme: {
    extend: generateTailwindTheme(),
  },
  // 其他配置...
}
```

这样配置后，您可以在 Tailwind 类中使用我们设计系统定义的颜色：

```jsx
// 例如使用主色
<div className="bg-primary text-white">
  主色背景
</div>

// 使用语义色
<div className="bg-success-50 text-success-700 border border-success">
  成功状态
</div>

// 使用中性色
<div className="bg-gray-50 text-gray-900">
  中性色背景与文字
</div>
```

### 2. 使用 CSS 变量

在全局样式文件（如 `globals.css`）中引入 CSS 变量：

```css
:root {
  /* 引入所有主题相关的 CSS 变量 */
  ${generateCssVariables()}
}
```

然后可以在任何 CSS 或内联样式中使用这些变量：

```jsx
// 在React组件中使用
<div style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-gray50)' }}>
  使用CSS变量
</div>

// 在CSS文件中使用
.custom-element {
  color: var(--color-textSecondary);
  background-color: var(--color-bgLayout);
  border: 1px solid var(--color-borderBase);
}
```

### 3. 使用预定义 CSS 类

在全局样式文件中引入预定义的 CSS 类：

```css
/* 在globals.css中 */
${generateCustomClasses()}
```

这样可以直接使用这些预定义类：

```jsx
<button className="bg-primary text-white hover:bg-primary-600">
  主色按钮
</button>

<div className="status-success">
  成功状态
</div>
```

### 4. 动态主题切换

在主题切换组件中使用 `updateThemeCssVariables` 函数：

```jsx
import { updateThemeCssVariables } from './theme/tailwind-bridge'

// 在主题切换函数中
function toggleTheme(mode) {
  // 更新当前主题模式
  setThemeMode(mode) // 假设使用了React状态

  // 更新CSS变量
  updateThemeCssVariables(mode)

  // 如果还需要更新Ant Design主题，可以同时调用
  // changeAntdTheme(mode);
}

// 使用组件
return (
  <Switch
    checked={themeMode === 'dark'}
    onChange={(checked) => toggleTheme(checked ? 'dark' : 'light')}
  />
)
```

## 集成与已有项目的兼容

此桥接文件设计为与现有项目完全兼容，无需重构：

1. **无侵入性**：不需要修改已有组件代码
2. **渐进增强**：可以逐步在新功能中应用，而不影响现有功能
3. **双向兼容**：既可以在Tailwind项目中使用Ant Design，也可以在Ant Design项目中使用Tailwind

## 颜色系统映射

桥接文件中的颜色映射遵循以下原则：

1. **保持原有命名**：Tailwind的 `gray-xx` 与Ant Design的中性色系对应
2. **语义色扩展**：为 primary、success、warning、error、info 提供多个色阶
3. **亮色/暗色适配**：根据当前主题模式自动调整颜色表现

## 最佳实践

1. **使用Tailwind的实用类优先**：对于简单的样式需求，使用Tailwind类
2. **使用Ant Design组件**：对于复杂交互组件，使用Ant Design提供的组件
3. **对于特殊样式需求**：可以使用CSS变量与自定义类结合的方式

## 性能考虑

桥接文件已针对性能进行了优化：

1. **按需引入**：仅导出必要的函数，可以按需引入
2. **缓存支持**：`updateThemeCssVariables` 函数仅更新必要的CSS变量
3. **静态生成**：大部分配置可在构建时生成，不影响运行时性能

## 示例

### 卡片组件示例

```jsx
// 使用Tailwind + Ant Design混合方式
import { Card, Button } from 'antd'

function CustomCard() {
  return (
    <Card className="border border-borderBase rounded-md shadow-md">
      <h3 className="text-lg font-medium text-textPrimary mb-2">卡片标题</h3>
      <p className="text-textSecondary mb-4">卡片内容描述信息</p>
      <div className="flex space-x-2">
        <Button type="primary">主按钮</Button>
        <Button className="bg-gray-100 hover:bg-gray-200">次要按钮</Button>
      </div>
    </Card>
  )
}
```

### 状态标签示例

```jsx
// 使用预定义状态类
function StatusTag({ type, children }) {
  return (
    <span className={`status-${type} px-2 py-1 rounded text-sm inline-block`}>
      {children}
    </span>
  );
}

// 使用
<StatusTag type="success">成功</StatusTag>
<StatusTag type="warning">警告</StatusTag>
<StatusTag type="error">错误</StatusTag>
<StatusTag type="info">信息</StatusTag>
```

## 扩展与定制

如需进一步定制桥接文件，可以修改以下部分：

1. 在 `generateTailwindTheme` 函数中添加更多的Tailwind配置
2. 在 `generateCustomClasses` 函数中添加更多的预定义CSS类
3. 在 `tokens.ts` 文件中添加新的颜色或修改现有颜色
