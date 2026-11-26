import { defineConfig } from 'vite'

// Dawn Wars, Broken Past: the game page and the map editor. Port 5175, so it can run beside Void Wars (5174).
// Pictures, music and the build folder are served but not watched for changes.
export default defineConfig({
  server: { port: 5175, watch: { ignored: ['**/dist/**', '**/public/**', '**/sound_screen/**', '**/node_modules/**'] } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: { main: 'index.html', mapEditor: 'map-editor.html' } }
  }
})
