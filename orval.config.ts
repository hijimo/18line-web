import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: './docs/api/doc.yaml',
    },
    output: {
      // API 服务代码输出目录
      target: './src/services/api',
      // 类型定义输出目录
      schemas: './src/types/api',
      // HTTP 客户端类型
      client: 'axios',
      // 按标签分组生成文件
      mode: 'tags-split',
      // 启用 Prettier 格式化（满足需求 5.1）
      prettier: true,
      // 文件扩展名
      fileExtension: '.ts',
      // 引用 tsconfig.json 确保生成的代码符合 TypeScript 严格模式（满足需求 5.4, 5.5）
      tsconfig: './tsconfig.json',
      override: {
        // 自定义请求函数适配器
        mutator: {
          path: './src/utils/orval-mutator.ts',
          name: 'orvalMutator',
        },
        // 使用命名参数提高代码可读性
        useNamedParameters: true,
        // 自动转换日期字符串为 Date 对象
        useDates: true,
        // 类型生成选项（满足需求 1.4, 1.5, 2.5）
        // Orval 默认会生成以下类型：
        // 1. 完整的请求参数类型（路径参数、查询参数、请求体）- 需求 1.4
        // 2. 完整的响应数据类型 - 需求 1.5
        // 3. 错误类型（从 OpenAPI responses 中提取）- 需求 2.5
        // 4. JSDoc 注释（从 OpenAPI description 字段生成）- 需求 2.5

        // 使用 BigInt 类型（如果 OpenAPI 中有 int64 类型）
        useBigInt: false,
      },
    },
  },
})
