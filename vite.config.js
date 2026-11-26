import { defineConfig } from 'vite'

// Dawn Wars, Broken Past: the game page and the map editor. Port 5175, so it can run beside Void Wars (5174).
// Pictures, music and the build folder are served but not watched for changes.
// GITHUB PAGES. The game is played from an address such as https://tylenrahl.github.io/<repo>/, not from the site's root.
// The Pages build (.github/workflows/pages.yml) sets PAGES_BASE=/<repo>/, and then every '/images/...' path in the built
// code, and every pattern that reads such a path, gets that prefix. The source and an ordinary build keep '/images/...'.
const BASE = process.env.PAGES_BASE ?? '/'
const DIRS = 'images|sfx|dw|space|rules-book'
const escaped = BASE.replace(/\//g, '\\/')
const pagesPaths = {
  name: 'pages-paths',
  apply: 'build',
  renderChunk (code) {
    if (BASE === '/') return null
    return code.replace(new RegExp(`(['"\`(])/(${DIRS})/`, 'g'), `$1${BASE}$2/`)
               .replace(new RegExp(`\\\\/(${DIRS})\\\\/`, 'g'), `${escaped}$1\\/`)
  },
  transformIndexHtml (html) { return BASE === '/' ? html : html.replace(/href="\/"/g, `href="${BASE}"`) }
}

export default defineConfig({
  server: { port: 5175, watch: { ignored: ['**/dist/**', '**/public/**', '**/sound_screen/**', '**/node_modules/**'] } },
  plugins: [pagesPaths],
  base: BASE,
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: { main: 'index.html', mapEditor: 'map-editor.html' } }
  }
})
