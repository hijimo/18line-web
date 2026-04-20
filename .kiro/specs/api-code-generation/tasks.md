# 实施任务列表

- [x] 1. 创建 API 文档同步脚本
  - 创建 `scripts/sync-api-doc.js` 文件，实现从远程服务器下载 OpenAPI 文档的功能
  - 实现文件下载函数，支持 HTTP/HTTPS 协议
  - 实现文件保存函数，自动创建目标目录
  - 添加错误处理和友好的控制台输出
  - 在 package.json 中添加 `api:sync` 脚本命令
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2_

- [x] 2. 配置 Orval 代码生成器
  - 创建 `orval.config.ts` 配置文件
  - 配置输入源指向 `docs/api/doc.yaml`
  - 配置类型定义输出到 `src/types/api/`
  - 配置 API 服务代码输出到 `src/services/api/`
  - 配置按标签分组生成（tags-split 模式）
  - 配置文件命名使用 kebab-case 格式
  - 在 package.json 中添加 `api:generate` 脚本命令
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.1_

- [x] 3. 创建自定义请求函数适配器
  - 创建 `src/utils/orval-mutator.ts` 文件
  - 实现 `orvalMutator` 函数，将 Orval 请求适配到项目的 `request.ts`
  - 在 `orval.config.ts` 中配置使用自定义 mutator
  - 确保生成的 API 函数使用项目现有的请求工具
  - _Requirements: 2.4_

- [x] 4. 配置代码生成规范
  - 在 `orval.config.ts` 中启用 Prettier 格式化
  - 配置使用命名导出而非默认导出
  - 配置使用路径别名 `@/` 引用项目模块
  - 确保生成的代码符合 TypeScript 严格模式
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. 配置类型生成选项
  - 配置生成完整的请求参数类型
  - 配置生成完整的响应数据类型
  - 配置生成错误类型
  - 确保生成的类型包含 JSDoc 注释
  - _Requirements: 1.4, 1.5, 2.5_

- [x] 6. 添加组合命令
  - 在 package.json 中添加 `api:sync-and-generate` 命令
  - 配置该命令依次执行文档同步和代码生成
  - 测试命令在 yarn 和 pnpm 下都能正常工作
  - _Requirements: 4.3, 4.5_

- [x] 7. 验证生成的代码
  - 运行 `yarn api:sync` 测试文档同步功能
  - 运行 `yarn api:generate` 测试代码生成功能
  - 运行 `yarn typecheck` 验证生成的代码通过类型检查
  - 运行 `yarn lint` 验证生成的代码符合 ESLint 规则
  - 检查生成的文件结构和命名是否符合规范
  - _Requirements: 5.1, 5.2, 5.5_

- [ ]\* 8. 编写使用文档
  - 在项目 README 中添加 API 代码生成的使用说明
  - 创建 `docs/api-code-generation/README.md` 功能文档
  - 添加使用示例和最佳实践
  - 说明如何在业务代码中使用生成的 API
  - _Requirements: 所有需求_

- [ ]\* 9. 添加示例代码
  - 创建示例组件展示如何使用生成的 API
  - 展示如何处理加载状态和错误
  - 展示如何与 React Query 集成
  - 展示如何使用生成的类型定义
  - _Requirements: 2.5_
