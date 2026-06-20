import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type ConfigEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
function requiredEnv(env: Record<string, string>, name: string) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`Environment variable ${name} is required`)
  return value
}

export function createViteConfig({ command, mode }: Pick<ConfigEnv, 'command' | 'mode'>) {
  const envDir = fileURLToPath(new URL('../', import.meta.url))
  const env = loadEnv(mode, envDir, '')
  requiredEnv(env, 'VITE_API_BASE_URL')

  const server =
    command === 'serve'
      ? {
          proxy: {
            '/api': {
              target: requiredEnv(env, 'API_PROXY_TARGET'),
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/api/, ''),
            },
          },
        }
      : undefined

  return {
    envDir,
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server,
  }
}

export default defineConfig(createViteConfig)
