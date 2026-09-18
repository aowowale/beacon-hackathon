/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_AAD_CLIENT_ID?: string
  readonly VITE_AAD_TENANT_ID?: string
  readonly VITE_AAD_REDIRECT_URI?: string
  readonly VITE_SHOW_MODE_TOGGLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
