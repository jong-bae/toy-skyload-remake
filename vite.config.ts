import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // 번들 대부분이 three.js(약 600KB, gzip 150KB)다. 한 번 내려받는 단일 페이지 게임이라
    // 나눠도 첫 로딩 총량은 같으므로 경고 기준만 올린다.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
