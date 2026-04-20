# 项目结构

## 目录组织

```
├── .kiro/                    # Kiro AI 配置
│   └── steering/            # AI 辅助开发指导文档
├── docs/                     # 功能文档（按功能模块组织）
│   ├── [feature]/           # 每个功能一个目录
│   │   ├── README.md        # 功能概述
│   │   └── *.md             # 其他相关文档
├── public/                   # 静态资源
├── src/                      # 源代码
│   ├── @types/              # 全局类型定义
│   ├── components/          # 可复用 UI 组件
│   │   ├── AuthProvider.tsx
│   │   ├── Box/
│   │   ├── CommonTable/
│   │   ├── ErrorBoundary.tsx
│   │   ├── Header/
│   │   ├── Layout/
│   │   ├── PageContainer/
│   │   └── Spinner.tsx
│   ├── configurify/         # 配置化组件
│   │   └── columns/         # 表格列定义
│   ├── contexts/            # React Context
│   │   └── resource/        # 资源上下文
│   ├── hooks/               # 自定义 Hooks
│   │   ├── chat/            # 聊天相关 Hooks
│   │   ├── menu/            # 菜单相关 Hooks
│   │   ├── services/        # API 请求 Hooks
│   │   └── *.ts             # 通用 Hooks
│   ├── layouts/             # 布局组件
│   ├── pages/               # 页面组件（路由级别）
│   │   ├── Index/           # 首页
│   │   ├── Login/           # 登录页
│   │   ├── chat/            # 聊天会话
│   │   ├── model-settings/  # 模型设置
│   │   ├── roles/           # 角色管理
│   │   ├── tenants/         # 租户管理
│   │   └── users/           # 用户管理
│   ├── services/            # API 服务层
│   │   └── api/             # Orval 生成的 API 代码
│   ├── stores/              # Zustand 全局状态
│   │   ├── authStore.ts     # 认证状态
│   │   ├── chatStore.ts     # 聊天状态
│   │   └── index.ts
│   ├── theme/               # 主题配置
│   │   ├── tokens.ts        # 设计令牌
│   │   ├── components.ts    # 组件样式
│   │   ├── tailwind-bridge.ts # Tailwind 主题桥接
│   │   └── *.ts
│   ├── types/               # 类型定义
│   │   ├── api/             # Orval 生成的 API 类型
│   │   ├── chat.ts
│   │   ├── common.ts
│   │   ├── resource.ts
│   │   └── *.ts
│   ├── utils/               # 工具函数
│   │   ├── errorHandler.ts
│   │   ├── orval-mutator.ts # Orval 请求适配器
│   │   ├── request.ts       # Axios 配置
│   │   └── *.ts
│   ├── router.tsx           # 路由配置
│   ├── main.tsx             # 应用入口
│   └── global.css           # 全局样式
├── mocks/                    # MSW Mock 数据
├── scripts/                  # 构建脚本
├── .env.sample              # 环境变量示例
├── orval.config.ts          # API 代码生成配置
├── tailwind.config.ts       # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 配置
└── vitest.config.ts         # Vitest 配置
```

## 核心约定

### 组件组织

- **components/**: 可复用的 UI 组件，不包含业务逻辑
- **pages/**: 页面级组件，对应路由，包含业务逻辑
- **layouts/**: 布局组件，定义页面结构

### 状态管理层次

1. **组件状态**: useState/useReducer (组件内部)
2. **全局状态**: Zustand stores (跨组件共享)
3. **服务端状态**: React Query (API 数据缓存)
4. **表单状态**: Ant Design Form

### API 请求流程

```
页面/组件 → hooks/services/ → services/api/ → 后端 API
         ↑                  ↑
    React Query      Orval 生成的代码
```

**重要**: 所有 API 请求必须通过 React Query 管理，禁止直接调用 service 方法。

### 类型定义

- **types/api/**: Orval 自动生成，不要手动修改
- **types/**: 业务类型定义
- **@types/**: 全局类型声明

### 样式方案

1. **优先级**: TailwindCSS > Ant Design 组件样式 > CSS Modules
2. **主题**: 通过 `src/theme/` 统一管理
3. **响应式**: 使用 Tailwind 断点工具类

### 文档组织

- 所有功能文档保存在 `docs/[feature]/` 目录
- 功能名称使用 kebab-case (如: `user-management`)
- 每个功能至少包含 `README.md`

### 命名规范

- **组件**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase + use 前缀 (`useUserData.ts`)
- **工具函数**: camelCase (`formatDate.ts`)
- **常量**: UPPER_SNAKE_CASE
- **文件夹**: kebab-case 或 camelCase

### 导入顺序

1. React 和第三方库
2. Ant Design 组件
3. 内部模块 (使用 `@/` 别名)
4. 相对路径导入
5. 样式文件

### 测试文件

- 单元测试: `*.test.ts(x)` (与源文件同目录)
- E2E 测试: `__tests__/playwright-test/tests/`
- Mock 数据: `mocks/`

## 特殊目录说明

### chatbot-ui-main/

这是一个参考项目或旧版本代码，包含完整的聊天 UI 实现。可作为功能参考，但不是当前项目的一部分。

### configurify/

配置化组件系统，用于快速生成表格列定义等可配置的 UI 元素。

### contexts/resource/

资源上下文系统，用于管理应用中的资源（如菜单、路由）配置。
