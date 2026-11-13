import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  publicDir: 'public',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    //监听所有地址 
    host: '0.0.0.0',
    //服务启动时自动打开浏览器
    open: true, 
    //允许跨域
    cors: true,
    //启动端口
    port: 3200,
    //反向代理
    proxy: {
      '/api':{
        target: 'http://192.168.4.43:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/media':{
        target: 'http://192.168.4.43:8004/media',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/media/, '')
      }
    }
  },
})
