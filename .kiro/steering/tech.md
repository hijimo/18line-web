# 技术栈

## 核心技术

- **构建工具**: Vite 7.2 (使用 SWC 编译器)
- **框架**: React 18.2 + TypeScript 5.8
- **路由**: React Router 7.9
- **UI 框架**: Ant Design 5.29 + @ant-design/pro-components
- **样式方案**: TailwindCSS 4.1 (禁用 preflight 以兼容 Ant Design)
- **状态管理**:
  - Zustand 5.0 (全局状态)
  - @tanstack/react-query 5.90 (服务端状态)
- **HTTP 客户端**: Axios 1.13
- **工具库**:
  - ahooks 3.9 (React Hooks 工具集)
  - lodash-es 4.17
  - dayjs 1.11 (日期处理)
  - immer 10.2 (不可变数据)

## 开发工具

- **代码规范**: ESLint + Prettier + eslint-config-ts-prefixer
- **测试框架**:
  - Vitest 4.0 (单元测试)
  - React Testing Library (组件测试)
  - Playwright (E2E 测试)
  - MSW 2.12 (API Mock)
- **Git Hooks**: Husky + lint-staged
- **API 代码生成**: Orval 7.16 (基于 OpenAPI)
- **Node 版本**: 22.17.0 (通过 Volta 管理)

## 常用命令

### 开发

```bash
pnpm dev          # 启动开发服务器 (localhost:3000)
pnpm start        # 同上
```

### 代码质量

```bash
pnpm lint         # 运行 ESLint 检查
pnpm lint:fix     # 自动修复 ESLint 问题
pnpm typecheck    # TypeScript 类型检查
pnpm prettier     # 格式化代码
pnpm validate     # 运行所有检查 (lint + test + build + typecheck)
```

### 测试

```bash
pnpm test         # 运行单元测试
pnpm test:watch   # 监听模式运行测试
pnpm test:ui      # 使用 UI 界面运行测试
pnpm test:e2e     # 运行 E2E 测试
```

### 构建

```bash
pnpm build        # 构建生产版本
pnpm preview      # 预览生产构建
```

### API 代码生成

```bash
pnpm api:sync     # 同步 API 文档
pnpm api:generate # 生成 API 代码
pnpm api          # 同步并生成 (推荐)
```

## 环境变量

- 支持 CRA 风格的环境变量（`REACT_APP_` 前缀）
- 环境文件: `.env`, `.env.local`, `.env.development`, `.env.production`
- 主题色配置: `VITE_THEME_COLOR`

## 路径别名

- `@/*` 映射到 `./src/*`
- 在 TypeScript 和 Vite 中均已配置

## API 代理

开发环境下，`/api/` 路径会被代理到 `http://localhost:8080`。
修改代理配置请编辑 `vite.config.ts` 中的 `server.proxy`。

## TypeScript 配置

- 严格模式已启用 (`strict: true`)
- 编译目标: ESNext
- JSX 转换: react-jsx (无需手动导入 React)
- 模块解析: Bundler

## 构建优化

- 生成 sourcemap 便于调试
- 使用 SWC 提升构建速度
- 支持代码分割和懒加载
- Tree Shaking 自动移除未使用代码
