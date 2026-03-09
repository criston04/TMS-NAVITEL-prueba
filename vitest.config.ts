import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'src/lib/mock-data/route-planner.ts',
        'src/services/routing.service.ts',
      ],
    },
    // Timeout alto para tests con OSRM
    testTimeout: 15000,
  },
});
