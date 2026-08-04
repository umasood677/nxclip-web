/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_GATEWAY_URL?: string;
  readonly VITE_API_GATEWAY_URL_STAGING?: string;
  readonly VITE_API_GATEWAY_URL_PRODUCTION?: string;
  readonly VITE_INTERNAL_API_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_NOTIFICATION_WS_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly GEMINI_API_KEY?: string;
  readonly APP_URL?: string;
  readonly PEXELS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
