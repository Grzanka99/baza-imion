import { defineConfig } from "vite-plus"

export default defineConfig({
  pack: {
    // `index` is the standalone server, `handlers` what Vercel's api/ serves.
    entry: {
      index: "src/index.ts",
      handlers: "src/http/handlers.ts",
    },
    platform: "node",
    dts: false,
    // The shared package ships as TypeScript source, so it goes in the bundle.
    deps: { alwaysBundle: ["@baza-imion/shared"] },
  },
})
