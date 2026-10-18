import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, lazyPlugins, type Plugin } from "vite-plus"

const CANONICAL = '<link rel="canonical" href="/"'

/**
 * Points the home page's canonical link at SITE_URL when the build has it,
 * as the server does for name pages, so the vercel.app address doesn't
 * compete with the real domain.
 */
function canonicalSiteUrl(): Plugin {
  return {
    name: "canonical-site-url",
    transformIndexHtml(html) {
      let site = process.env.SITE_URL?.trim()
      if (!site) {
        return html
      }
      while (site.endsWith("/")) {
        site = site.slice(0, -1)
      }
      return html.replace(CANONICAL, `<link rel="canonical" href="${site}/"`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: lazyPlugins(() => [react(), tailwindcss(), canonicalSiteUrl()]),
  define: {
    // Changes with every build; the app uses it to drop answers it cached
    // under an earlier version.
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
})
