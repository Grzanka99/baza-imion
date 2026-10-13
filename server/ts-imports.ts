import { registerHooks } from "node:module"

// Imports on the server name their files with a .js extension, as Vercel
// needs. Node runs the .ts files themselves, so it is pointed at those.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      if (!specifier.endsWith(".js")) throw error
      return nextResolve(specifier.slice(0, -3) + ".ts", context)
    }
  },
})
