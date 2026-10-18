import { defineConfig } from "vite-plus"

import { lint } from "./lint.config.ts"

// Formatting and lint for the whole workspace. Each app keeps its own
// vite.config.ts for building and serving.
export default defineConfig({
  // Targets of bare `vp dev`, `vp build`, `vp preview` and `vp pack` here.
  defaultPackage: {
    dev: "./apps/web",
    build: "./apps/web",
    preview: "./apps/web",
    pack: "./apps/server",
  },
  fmt: {
    endOfLine: "lf",
    semi: false,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 80,
    sortTailwindcss: {
      stylesheet: "apps/web/src/index.css",
      functions: ["cn", "cva"],
    },
  },
  lint,
  // Run by .vite-hooks/pre-commit on the staged files.
  staged: {
    "*": "node scripts/check-file-size.ts",
  },
})
