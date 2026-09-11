/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_WS_BASE?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_MAP_TILE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
