import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: {
      target: './docs/api/doc.yaml',
      override: {
        transformer: './scripts/openapi-transformer.cjs',
      },
    },
    output: {
      target: './src/services/api',
      schemas: './src/types/api',
      client: 'axios',
      mode: 'tags-split',
      prettier: true,
      fileExtension: '.ts',
      tsconfig: './tsconfig.json',
      override: {
        mutator: {
          path: './src/utils/orval-mutator.ts',
          name: 'orvalMutator',
        },
        useNamedParameters: true,
        useDates: true,
        useBigInt: false,
      },
    },
  },
})
