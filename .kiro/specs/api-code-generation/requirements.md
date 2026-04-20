# Requirements Document

## Introduction

本功能旨在为项目配置 orval 工具，实现从 Swagger/OpenAPI 文档自动生成 TypeScript 类型定义和 API 接口代码。同时提供自动化脚本同步远程 API 文档到本地，确保前端代码与后端 API 保持同步。

## Glossary

- **Orval**: 基于 OpenAPI/Swagger 规范自动生成 TypeScript 代码的工具
- **API Generator**: 指 orval 工具生成 API 客户端代码的功能
- **Type Generator**: 指 orval 工具生成 TypeScript 类型定义的功能
- **Sync Script**: 同步远程 API 文档到本地的自动化脚本
- **OpenAPI Document**: 位于 <http://localhost:8080/swagger/doc.yaml> 的 API 规范文档
- **Types Directory**: 存储生成的类型定义文件的目录 (src/types/)
- **Services Directory**: 存储生成的 API 接口代码的目录 (src/services/)
- **Docs Directory**: 存储同步的 API 文档的目录 (docs/api/)

## Requirements

### Requirement 1

**User Story:** 作为开发者，我希望能够自动从 OpenAPI 文档生成 TypeScript 类型定义，以便在开发时获得类型安全和智能提示

#### Acceptance Criteria

1. WHEN Type Generator 执行时，THE Type Generator SHALL 读取 OpenAPI Document 并生成 TypeScript 类型定义文件
2. THE Type Generator SHALL 将生成的类型文件按照 API 标签分组保存到 Types Directory
3. THE Type Generator SHALL 为每个 API 标签生成独立的类型文件，文件名使用小写加连字符格式
4. THE Type Generator SHALL 生成的类型定义包含请求参数、响应数据和错误类型
5. THE Type Generator SHALL 确保生成的类型符合 TypeScript 严格模式要求

### Requirement 2

**User Story:** 作为开发者，我希望能够自动从 OpenAPI 文档生成 API 接口调用代码，以便快速集成后端接口而无需手动编写请求代码

#### Acceptance Criteria

1. WHEN API Generator 执行时，THE API Generator SHALL 读取 OpenAPI Document 并生成 API 接口函数
2. THE API Generator SHALL 将生成的接口代码按照 API 标签分组保存到 Services Directory
3. THE API Generator SHALL 为每个 API 标签生成独立的服务文件，文件名使用小写加连字符格式
4. THE API Generator SHALL 生成的接口函数使用项目现有的 request 工具 (src/utils/request.ts)
5. THE API Generator SHALL 为每个接口函数提供完整的类型注解，包括参数类型和返回类型

### Requirement 3

**User Story:** 作为开发者，我希望能够通过简单的命令同步远程 API 文档到本地，以便离线查看和版本控制

#### Acceptance Criteria

1. WHEN Sync Script 执行时，THE Sync Script SHALL 从 <http://localhost:8080/swagger/doc.yaml> 下载 OpenAPI Document
2. THE Sync Script SHALL 将下载的文档保存到 Docs Directory 并命名为 doc.yaml
3. IF 下载失败，THEN THE Sync Script SHALL 输出清晰的错误信息并返回非零退出码
4. THE Sync Script SHALL 在成功同步后输出确认消息
5. THE Sync Script SHALL 确保 Docs Directory 存在，如不存在则自动创建

### Requirement 4

**User Story:** 作为开发者，我希望能够通过 npm scripts 执行代码生成和文档同步，以便与现有的开发工作流集成

#### Acceptance Criteria

1. THE API Generator SHALL 通过 package.json 中的 "api:generate" 命令执行
2. THE Sync Script SHALL 通过 package.json 中的 "api:sync" 命令执行
3. THE API Generator SHALL 提供 "api:sync-and-generate" 命令，依次执行文档同步和代码生成
4. THE API Generator SHALL 在 package.json 中添加必要的 orval 依赖
5. THE API Generator SHALL 确保所有命令在 yarn 和 pnpm 包管理器下都能正常工作

### Requirement 5

**User Story:** 作为开发者，我希望生成的代码遵循项目的代码规范，以便保持代码库的一致性

#### Acceptance Criteria

1. THE Type Generator SHALL 生成的代码使用项目配置的 Prettier 格式
2. THE API Generator SHALL 生成的代码使用项目配置的 ESLint 规则
3. THE Type Generator SHALL 生成的导入语句使用路径别名 @/ 引用项目模块
4. THE API Generator SHALL 生成的代码使用命名导出而非默认导出
5. THE Type Generator SHALL 确保生成的文件通过 TypeScript 类型检查
