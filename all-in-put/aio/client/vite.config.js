import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  return {
    plugins: [
      react(),
      {
        // local dev only: serve api/game.js the same way Vercel does in production
        name: 'local-api',
        configureServer(server) {
          for (const k of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SESSION_SECRET', 'ADMIN_PASS']) process.env[k] ??= env[k]
          server.middlewares.use('/api/game', async (req, res) => {
            const { default: handler } = await server.ssrLoadModule('/api/game.js')
            handler(req, res)
          })
        },
      },
    ],
    // the browser only ever gets the URL and the publishable key (read-only access to public_state)
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY),
    },
    server: { host: true },
  }
})
