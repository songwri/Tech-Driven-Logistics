import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // GitHub Pages project sites serve from /<repo-name>/, not the domain root
  base: '/Tech-Driven-Logistics/',
  build: {
    rolldownOptions: {
      // 방문자 사이트(/), 예약 전용 페이지(/reserve/), 관리자 대시보드(/admin/)를 각각의 페이지로 빌드한다.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
        reserve: fileURLToPath(new URL('./reserve/index.html', import.meta.url)),
      },
      output: {
        // Keep the rarely-changing runtimes in their own cacheable chunks.
        // React gets the highest priority: groups pull in their dependencies,
        // so without it react/react-dom land inside vendor-three and every page
        // (including /admin/) downloads three.js up front just to boot React.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'vendor-three', test: /node_modules[\\/](three|@react-three|three-stdlib)/, priority: 20 },
            { name: 'vendor-motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
