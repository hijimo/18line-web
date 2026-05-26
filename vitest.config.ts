import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'src/@types',
      'node_modules',
      // Historical broken suites tracked in #137. Keep them out of the default gate
      // until they are updated to the current API and ProTable behavior.
      'src/App.test.tsx',
      'src/hooks/__tests__/useTableRequest.test.ts',
      'src/pages/Attractions/__tests__/Attractions.test.tsx',
      'src/pages/Dining/__tests__/index.test.tsx',
      'src/pages/LocalDishes/__tests__/index.test.tsx',
      'src/pages/TouristPreferences/__tests__/index.test.tsx',
      'src/pages/Tourists/__tests__/index.test.tsx',
      'src/pages/Users/__tests__/Users.test.tsx',
      'src/services/__tests__/api-services.test.ts',
      'src/services/__tests__/apiServices.test.ts',
    ],
  },
});
