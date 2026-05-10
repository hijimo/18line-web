import * as path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import vitePluginAliOss from 'vite-plugin-ali-oss';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  // 通过环境变量 ENABLE_OSS=true 控制是否上传 OSS，防止本地打包触发
  const enableOSS = env.VITE_ENABLE_OSS === 'true';

  const ossPlugins = enableOSS
    ? [
        vitePluginAliOss({
          region: 'oss-cn-hangzhou',
          accessKeyId: env.VITE_OSS_ACCESSKEY_ID,
          accessKeySecret: env.VITE_OSS_ACCESSKEY_SECRET,
          bucket: env.VITE_OSS_BUCKET,
          secure: true,
          headers: { 'Cache-Control': 'max-age=31536000' },
        }),
      ]
    : [];

  return {
    base: enableOSS
      ? 'https://oss.asyncb.com/front-static/18line-web/'
      : '/',
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
    build: {
      sourcemap: true,
    },
    plugins: [react(), ...ossPlugins],
    publicDir: 'public',
    server: {
      host: true,
      port: 3000,
      hmr: { overlay: false },
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      proxy: {
        '/api/': {
          target: 'http://8.136.229.208:8080',
          changeOrigin: true,
          
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
