import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { identityApi } from "../services/apiClient";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
            ux_mode?: "popup" | "redirect";
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            getNotDisplayedReason?: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services")),
      );
      if (window.google?.accounts?.id) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisScriptPromise = null;
      reject(new Error("Failed to load Google Identity Services"));
    };
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

function resolveEnvClientId(): string | undefined {
  const raw =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined);
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Full-width app-styled Google Sign-In button.
 * Avoids Google's renderButton iframe (breaks inside overflow-hidden cards).
 * Uses GIS One Tap / prompt for the ID token.
 */
export function GoogleSignInButton({
  onCredential,
  disabled,
  className,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(true);
  const [clientId, setClientId] = useState<string | undefined>(resolveEnvClientId());
  const [scriptError, setScriptError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const initializedFor = useRef<string | null>(null);

  const handleCredential = useCallback(
    async (credential: string) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setBusy(true);
      setScriptError(null);
      try {
        await onCredential(credential);
      } finally {
        pendingRef.current = false;
        setBusy(false);
      }
    },
    [onCredential],
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveClientId() {
      const fromEnv = resolveEnvClientId();
      if (fromEnv) {
        if (!cancelled) {
          setClientId(fromEnv);
          setResolving(false);
        }
        return;
      }

      try {
        const config = await identityApi.getGoogleSignInConfig();
        if (cancelled) return;
        if (config?.enabled && config.clientId) {
          setClientId(config.clientId);
        } else {
          setClientId(undefined);
        }
      } catch (err) {
        console.warn("[GoogleSignIn] Failed to load /auth/google/config", err);
        if (!cancelled) setClientId(undefined);
      } finally {
        if (!cancelled) setResolving(false);
      }
    }

    void resolveClientId();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    async function warmGis() {
      try {
        await loadGisScript();
        if (cancelled || !window.google?.accounts?.id) return;
        if (initializedFor.current === clientId) return;

        window.google.accounts.id.initialize({
          client_id: clientId!,
          callback: (response) => {
            if (response?.credential) {
              void handleCredential(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup",
        });
        initializedFor.current = clientId!;
      } catch (err: any) {
        if (!cancelled) {
          setScriptError(err?.message || "Google Sign-In failed to load");
        }
      }
    }

    void warmGis();
    return () => {
      cancelled = true;
    };
  }, [clientId, handleCredential]);

  const handleClick = async () => {
    setScriptError(null);
    if (!clientId) {
      setScriptError("Google Sign-In is not available yet. Please use email sign-in.");
      return;
    }

    setBusy(true);
    try {
      await loadGisScript();
      if (!window.google?.accounts?.id) {
        throw new Error("Google Identity Services unavailable");
      }

      if (initializedFor.current !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              void handleCredential(response.credential);
            } else {
              setBusy(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup",
        });
        initializedFor.current = clientId;
      }

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setTimeout(() => {
            if (!pendingRef.current) {
              setBusy(false);
              const reason = notification.getNotDisplayedReason?.() || "blocked";
              setScriptError(
                reason === "browser_not_supported" || reason === "opt_out_or_no_session"
                  ? "Google Sign-In was blocked by the browser. Allow pop-ups, or try another browser."
                  : "Google Sign-In did not open. Allow pop-ups for this site and try again.",
              );
            }
          }, 400);
        }
      });
    } catch (err: any) {
      setScriptError(err?.message || "Google Sign-In failed to start");
      setBusy(false);
    }
  };

  if (resolving) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn(
          "w-full h-11 gap-2 border-border/60 bg-background text-foreground font-semibold",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing Google Sign-In…
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy || !clientId}
        onClick={() => void handleClick()}
        className={cn(
          "w-full h-11 gap-2.5 border-border/60 bg-background hover:bg-muted/50",
          "text-foreground font-semibold shadow-none",
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <GoogleMark />
        )}
        <span className="truncate">{busy ? "Entering the AI studio…" : label}</span>
      </Button>
      {!clientId ? (
        <p className="text-[11px] text-muted-foreground font-medium text-center">
          Google Sign-In will activate once the workspace is linked. Use email for now.
        </p>
      ) : null}
      {scriptError ? (
        <p className="text-[11px] text-destructive font-medium text-center">{scriptError}</p>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
