import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

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
          }) => void;
          prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton?: (parent: HTMLElement, options: Record<string, unknown>) => void;
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
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
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

export interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Loads Google Identity Services on demand, then requests an ID token (credential)
 * and forwards it to the caller for POST /auth/google.
 */
export function GoogleSignInButton({
  onCredential,
  disabled,
  className,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const handleCredential = useCallback(
    async (credential: string) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setBusy(true);
      try {
        await onCredential(credential);
      } finally {
        pendingRef.current = false;
        setBusy(false);
      }
    },
    [onCredential]
  );

  useEffect(() => {
    // Warm the script in the background when client id is configured
    if (!clientId) return;
    loadGisScript().catch((err) => {
      console.warn("[GoogleSignIn]", err);
    });
  }, [clientId]);

  const handleClick = async () => {
    setScriptError(null);
    if (!clientId) {
      setScriptError("VITE_GOOGLE_CLIENT_ID is not configured.");
      return;
    }

    setBusy(true);
    try {
      await loadGisScript();
      if (!window.google?.accounts?.id) {
        throw new Error("Google Identity Services unavailable");
      }

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
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: One Tap dismissed — still leave busy until callback or timeout
          setTimeout(() => {
            if (!pendingRef.current) setBusy(false);
          }, 800);
        }
      });
    } catch (err: any) {
      setScriptError(err?.message || "Google Sign-In failed to start");
      setBusy(false);
    }
  };

  if (!clientId) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn("w-full gap-2 opacity-60", className)}
        title="Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-In"
      >
        <GoogleMark />
        {label} (not configured)
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        onClick={handleClick}
        className={cn("w-full gap-2 border-border/60 bg-background hover:bg-muted/40", className)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        {busy ? "Connecting…" : label}
      </Button>
      {scriptError && (
        <p className="text-[11px] text-destructive font-medium text-center">{scriptError}</p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
