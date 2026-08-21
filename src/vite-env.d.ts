/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_WS_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
