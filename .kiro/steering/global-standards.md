---
alwaysApply: true
---

标题：全局代码规范与约束（团队统一标准）

目的：为整个项目建立统一的代码风格、架构原则和最佳实践，确保代码质量、可维护性和团队协作效率。

适用范围：所有 TypeScript/React 代码，包括组件、页面、工具函数、类型定义、测试代码等。

## 核心架构原则

### 1. 函数式编程优先

- 优先使用纯函数，避免副作用
- 数据不可变性：使用 `readonly`、`as const`、不可变更新模式
- 组合优于继承：通过函数组合解决复杂逻辑
- 避免类组件，全面使用函数组件 + Hooks

### 2. 组件化设计思想

- 单一职责原则：每个组件只负责一个功能
- 组件复用性：抽取可复用的 UI 组件到 `src/components/`
- 容器与展示分离：业务逻辑组件 vs 纯 UI 组件
- 组合模式：使用 `children`、render props、compound components

### 3. Hooks 优先策略

- 逻辑复用通过自定义 Hooks 实现
- 状态管理优先使用 `useState`、`useReducer`
- 副作用集中在 `useEffect` 中处理
- 性能优化使用 `useMemo`、`useCallback`（但不过度优化）

## 技术栈约束

### 1. 状态管理层次

```typescript
// 全局状态：Zustand Store
// 服务端状态：@tanstack/react-query
// 组件状态：useState/useReducer
// 表单状态：Ant Design Form 或自定义 Hooks
```

### 2. 数据请求规范

- 统一错误处理和加载状态管理
- 缓存策略明确：`staleTime`、`cacheTime` 合理配置
- 乐观更新用于用户体验关键场景

#### 2.1 **唯一合法方式**

- **所有 API 请求必须使用 `@tanstack/react-query` 管理**。
- **严禁**在组件或 hooks 中直接使用 `fetch`、`axios`、`useEffect` 进行请求。
- 出现 `fetch`/`axios` 直接调用的代码一律视为 **违规**。

---

#### 2.2 **标准调用链**

1. 在 `src/services/` 中定义 **纯函数请求方法**（基于 axios）。
   - 只负责发送请求和返回数据，不做缓存、不做副作用。

2. 在 `src/hooks/` 中定义对应的 `useQuery` / `useMutation` hook。
   - 页面或组件 **只能调用这些 hooks**，禁止直接调用 services。

```typescript
// 标准请求 Hook 模式
const useUserList = (params: UserListParams) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.getList(params),
    staleTime: 5 * 1000, // 5秒钟
  })
}
```

#### 2.3 **副作用约束**

- 禁止在 `useEffect` 中发请求，**必须用 react-query**。
- 禁止直接调用 service 方法。
- 数据获取、缓存、错误处理、loading 状态都交给 react-query 统一管理。

### 3. 类型系统要求

- 严格遵循 `ts-google.mdc` 规范
- 禁止 `any`，必要时使用 `unknown` 并收窄
- API 响应类型必须显式定义
- 使用可辨识联合处理复杂状态

## 代码组织规范

### 1. 文件结构约定

```
src/
├── components/          # 可复用 UI 组件
├── pages/              # 页面组件（路由级别）
├── hooks/              # 自定义 Hooks
├── services/           # API 服务层
├── store/              # Zustand 全局状态
├── types/              # 类型定义
├── utils/              # 工具函数
└── constants/          # 常量定义
```

### 2. 导入导出规范

- 优先命名导出，避免默认导出
- 导入顺序：第三方库 → 内部模块 → 相对路径
- 类型导入使用 `import type`
- 路径别名使用 `@/` 前缀

```typescript
// 正确的导入顺序
import React from 'react'
import { Button, Modal } from 'antd'
import { useQuery } from '@tanstack/react-query'

import type { User } from '@/types/user'
import { userService } from '@/services/user'
import { useUserStore } from '@/store/userStore'

import './index.css'
```

### 3. 命名约定

- 组件：PascalCase (`UserProfile`)
- Hooks：camelCase + use 前缀 (`useUserData`)
- 常量：UPPER_SNAKE_CASE (`API_BASE_URL`)
- 文件名：kebab-case 或 camelCase
- CSS 类名：kebab-case

## React 开发规范

### 1. 组件设计原则

- 严格遵循 `react-airbnb.mdc` 规范
- Props 接口显式定义，避免 `any`
- 事件处理函数命名：`handleXxx`
- 条件渲染使用短路运算符或三元表达式

```typescript
interface UserCardProps {
  readonly user: User;
  readonly onEdit?: (user: User) => void;
  readonly disabled?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  disabled = false,
}) => {
  const handleEditClick = useCallback(() => {
    onEdit?.(user);
  }, [onEdit, user]);

  return (
    <div className="user-card">
      {user.avatar && <img src={user.avatar} alt={user.name} />}
      <h3>{user.name}</h3>
      {!disabled && (
        <Button onClick={handleEditClick}>编辑</Button>
      )}
    </div>
  );
};
```

### 2. Hooks 使用规范

- 依赖数组必须完整且准确
- 避免在 render 中创建新对象/函数
- 自定义 Hooks 返回对象使用 `as const`

```typescript
// 自定义 Hook 示例
export const useUserManagement = () => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const handleUserSelect = useCallback((user: User) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    )
  }, [])

  return {
    selectedUsers,
    handleUserSelect,
  } as const
}
```

### 3. 性能优化指导

- 合理使用 `React.memo`（避免过度优化）
- 大列表使用虚拟滚动
- 图片懒加载和预加载策略
- 代码分割：路由级别和组件级别

## 样式与主题规范

### 1. 样式方案

- 优先使用 Tailwind CSS4 工具类
- 复杂组件样式使用 css 模块
- 主题变量统一管理在 `src/theme/`
- 响应式设计使用 Tailwind 断点

### 2. 设计系统集成

- 严格使用 Ant Design 组件和 Design Token
- 自定义组件继承 Ant Design 主题
- 颜色、间距、字体使用设计系统变量

## 错误处理与日志

### 1. 错误边界

- 页面级别必须有 ErrorBoundary
- 关键组件使用 try-catch 包装
- 错误信息用户友好，开发环境详细

### 2. 日志规范

- 使用统一的日志工具
- 生产环境避免 console.log
- 错误日志包含上下文信息

## 测试要求

### 1. 测试覆盖率

- 工具函数：100% 覆盖率
- 组件：关键交互和边界情况
- Hooks：状态变更和副作用

### 2. 测试工具

- 单元测试：Jest + Testing Library
- 组件测试：Storybook
- E2E 测试：关键用户流程

## 代码质量门禁

### 1. 提交前检查

- ESLint 无错误和警告
- TypeScript 编译通过
- Prettier 格式化完成
- 单元测试通过

### 2. 代码审查要点

- 类型安全性
- 性能影响
- 可维护性
- 安全性考虑

## 禁止模式

### 1. 绝对禁止

- 使用 `any` 类型
- 直接修改 props 或 state
- 在 render 中进行副作用操作
- 硬编码 API 地址和敏感信息

### 2. 强烈不推荐

- 过度嵌套的组件结构
- 单个文件超过 300 行
- 复杂的三元表达式嵌套
- 未处理的 Promise rejection

## 自检清单

提交代码前必须确认：

- [ ] 遵循 TypeScript 和 React 规范
- [ ] 使用了合适的 Hooks 和状态管理
- [ ] API 请求使用 react-query
- [ ] 组件职责单一且可复用
- [ ] 错误处理完善
- [ ] 性能考虑合理
- [ ] 类型定义完整
- [ ] 测试覆盖关键场景

## 工具配置

### 1. VSCode 插件要求

- TypeScript Importer
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Auto Rename Tag

### 2. 编译配置

- 启用 TypeScript strict 模式
- 配置路径别名
- 开启增量编译
- 生产环境代码压缩和 Tree Shaking

这份规范是团队代码质量的基石，所有团队成员都应严格遵循。定期回顾和更新规范，确保与技术栈演进保持同步。标题：全局代码规范与约束（团队统一标准）
