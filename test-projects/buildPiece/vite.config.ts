import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cjsCssPlugin } from '@collagejs/vite-css'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cjsCssPlugin({
    serverPort: 4550,
    entryPoints: "src/piece.tsx",
  })],
  base: 'http://localhost:4550/',
});
