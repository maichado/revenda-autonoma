/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string
  readonly VITE_PB_VIA_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
