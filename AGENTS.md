# AGENTS.md

## 默认协作规则

- 始终使用中文回复。
- 本项目是 `18line-web`，定位为 18line 管理后台前端项目。
- 修改前先阅读现有页面、组件、服务和类型定义，保持当前 React、Ant Design 和项目目录风格。
- 当前工作区可能存在用户未提交改动，禁止回退或覆盖与任务无关的变更。

## 项目概览

- 技术栈：Vite、React 18、TypeScript、React Router、Ant Design 5、Ant Design Pro Components、React Query、Zustand、Axios。
- API 代码生成使用 Orval，配置位于 `orval.config.ts` 和 `orval.openapi.config.ts`。
- 测试栈包含 Vitest、React Testing Library、MSW 和 Playwright。
- 构建产物输出到 `dist/`。

## 目录约定

- `src/pages/`：后台页面，按业务模块划分。
- `src/components/`：通用组件和布局组件。
- `src/services/`：请求封装、接口服务和 Orval 生成代码。
- `src/services/api/`：接口生成产物，修改前确认是否应通过 Orval 重新生成。
- `src/hooks/`：通用 hooks。
- `src/stores/`：Zustand 状态。
- `src/theme/`：Ant Design 主题 token、组件样式和 Tailwind bridge。
- `src/types/`、`src/@types/`：共享类型定义。
- `src/test-utils/`：测试辅助工具。

## 开发规则

- 优先复用已有组件、hooks、请求封装和表格/表单模式。
- UI 开发遵循 Ant Design 5 的交互和视觉体系，后台页面应保持信息密度、可扫描性和操作效率。
- 图标优先使用项目已安装的 `@ant-design/icons` 或 `lucide-react`。
- 接口调用优先走 `src/services/` 中既有封装；不要在页面内散落裸 `fetch`。
- 涉及后端接口字段时，先与 `travel18/` 的实际接口、OpenAPI 或生成代码保持一致。
- 不要手改可生成的接口代码，除非任务明确要求修复生成配置或临时补丁。
- 页面和组件必须适配常见桌面宽度，避免按钮、表格操作列、表单项文字溢出或重叠。

## 常用命令

- 安装依赖：`pnpm install`
- 启动开发服务：`pnpm dev`
- 生产构建：`pnpm build`
- 预览构建产物：`pnpm preview`
- ESLint 检查：`pnpm lint`
- ESLint 自动修复：`pnpm lint:fix`
- TypeScript 检查：`pnpm typecheck`
- 单元测试：`pnpm test`
- 测试监听：`pnpm test:watch`
- E2E 测试：`pnpm test:e2e`
- 同步并生成接口：`pnpm api`
- 生成 OpenAPI 相关代码：`pnpm openapi`

## 验证要求

- TypeScript 或业务逻辑改动后，优先运行 `pnpm typecheck`。
- React 组件、hooks、服务层改动后，运行相关 Vitest；不确定范围时运行 `pnpm test`。
- 路由、关键流程或浏览器交互改动后，视范围运行 `pnpm test:e2e` 或手动打开本地页面验证。
- 接口生成相关改动后，运行 `pnpm api` 或对应生成命令，并检查生成文件差异是否符合预期。
- 只改文档时不强制运行测试。
