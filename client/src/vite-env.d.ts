/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// The client talks to the backend over the same-origin /api path (Vite proxies
// it in dev), so no client-side env vars are needed yet. Add them here if that
// changes.
interface ImportMetaEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
