/** Identifies the build; set in vite.config.ts. */
declare const __BUILD_ID__: string

interface ImportMetaEnv {
  readonly VITE_UMAMI_WEBSITE_ID?: string
}

interface Window {
  umami?: { track(event: string, data?: Record<string, string>): void }
}
