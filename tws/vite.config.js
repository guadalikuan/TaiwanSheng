import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
<<<<<<< HEAD
import { nodePolyfills } from 'vite-plugin-node-polyfills';
=======
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
>>>>>>> c2a122a082e6d53aebae375a0f065975513f98be

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  
  // 配置 resolve 以支持 Node.js polyfills
  resolve: {
    alias: {
      buffer: resolve(__dirname, 'node_modules/buffer'),
    },
  },
  
  // 定义全局变量
  define: {
    'process.env': '{}',
    'process.browser': 'true',
    global: 'globalThis',
  },
  
  // 优化依赖处理
  optimizeDeps: {
    include: ['buffer'],
    exclude: ['readable-stream'], // 排除可能导致 process 问题的依赖
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'leaflet-vendor': ['leaflet'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  
  // 服务器配置
  server: {
    port: 5173,
    open: true,
    cors: true,
  },
  
  // 预览配置
  preview: {
    port: 4173,
    open: true,
  },
  
  // 环境变量前缀
  envPrefix: 'VITE_',
});

