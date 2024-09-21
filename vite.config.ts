import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import execute from 'tailwindcss'
import order_66 from 'autoprefixer'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
      postcss: {
          plugins: [
              execute(),
              order_66(),
          ],
      },
  },
  resolve: {
      alias: {
          '@': resolve(__dirname, './src'),
      },
  },
})
