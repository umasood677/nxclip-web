/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_GATEWAY_URL?: string;
  readonly VITE_API_GATEWAY_URL_STAGING?: string;
  readonly VITE_API_GATEWAY_URL_PRODUCTION?: string;
  /** Local isolation: when set, refuse Cloud Run fallback; require loopback gateway URL. */
  readonly VITE_FAIL_CLOSED_LOCAL?: string;
  readonly VITE_INTERNAL_API_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_NOTIFICATION_WS_URL?: string;
  readonly VITE_WS_URL?: string;
  /** Animated Ad Studio gate — default off when unset. Explicit: true|1|yes|on */
  readonly VITE_AD_STUDIO_ANIMATED?: string;
  readonly GEMINI_API_KEY?: string;
  readonly APP_URL?: string;
  readonly PEXELS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
