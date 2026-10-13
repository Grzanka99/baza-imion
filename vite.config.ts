import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, lazyPlugins } from "vite-plus"

import { lint } from "./lint.config.ts"

// https://vite.dev/config/
export default defineConfig({
  fmt: {
    endOfLine: "lf",
    semi: false,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 80,
    sortTailwindcss: {
      stylesheet: "src/index.css",
      functions: ["cn", "cva"],
    },
  },
  lint,
  plugins: lazyPlugins(() => [react(), tailwindcss()]),
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
