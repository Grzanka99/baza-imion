import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import "./lib/theme-color.ts"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { loadAnalytics } from "@/lib/analytics.ts"

loadAnalytics()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
