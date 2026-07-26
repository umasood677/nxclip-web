import React from "react";
import { toast } from "sonner";
import { safeLocalStorage } from "./safeStorage";

const STORAGE_KEY_CORS_TOAST = "nxclip_cors_toast_enabled";

// Rate-limiting map to prevent flooding duplicate toasts for the same URL + Method within a short window
const recentToastMap = new Map<string, number>();
const COOLDOWN_MS = 4000;

export interface CorsErrorInfo {
  url: string;
  method?: string;
  origin?: string;
  errorMessage?: string;
  source?: "fetch" | "axios" | "xhr" | "window_error" | "test";
  timestamp?: string;
}

/**
 * Check if the CORS error toast feature is enabled (defaults to true in dev mode)
 */
export function isCorsToastEnabled(): boolean {
  const val = safeLocalStorage.getItem(STORAGE_KEY_CORS_TOAST);
  return val === null || val === "true";
}

/**
 * Enable or disable CORS error toast notifications
 */
export function setCorsToastEnabled(enabled: boolean): void {
  safeLocalStorage.setItem(STORAGE_KEY_CORS_TOAST, enabled ? "true" : "false");
}

/**
 * Checks if a target URL is cross-origin relative to current window origin
 */
export function isCrossOriginUrl(targetUrl: string): boolean {
  if (typeof window === "undefined" || !targetUrl) return false;
  try {
    const parsed = new URL(targetUrl, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Analyzes an error object, response, or URL to determine if it stems from a CORS block
 */
export function isCorsError(err: any, url?: string): boolean {
  if (!err) return false;

  const msg = typeof err === "string" ? err.toLowerCase() : (err.message || String(err)).toLowerCase();
  const name = (err.name || "").toLowerCase();
  const code = (err.code || "").toLowerCase();

  // Explicit CORS keyword match
  const hasCorsKeywords =
    msg.includes("cors") ||
    msg.includes("access-control-allow-origin") ||
    msg.includes("cross-origin") ||
    msg.includes("blocked by cors policy") ||
    code.includes("cors");

  if (hasCorsKeywords) return true;

  // Generic network / fetch failure on cross-origin URL (typical of browser CORS preflight blocks)
  const isGenericNetworkFailure =
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("networkerror") ||
    name === "typeerror" ||
    code === "err_network";

  if (isGenericNetworkFailure && url && isCrossOriginUrl(url) && (typeof navigator === "undefined" || navigator.onLine)) {
    return true;
  }

  return false;
}

/**
 * Displays a detailed, developer-friendly Toast notification detailing a CORS error and its triggering source
 */
export function showCorsErrorToast(info: CorsErrorInfo): void {
  if (!isCorsToastEnabled()) return;

  const method = (info.method || "GET").toUpperCase();
  const url = info.url || "Unknown Endpoint";
  const origin = info.origin || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const dedupeKey = `${method}:${url}`;

  const now = Date.now();
  const lastTime = recentToastMap.get(dedupeKey) || 0;
  if (now - lastTime < COOLDOWN_MS && info.source !== "test") {
    return; // Suppress duplicate toast during cooldown period
  }
  recentToastMap.set(dedupeKey, now);

  const formattedTime = info.timestamp || new Date().toLocaleTimeString();
  const rawDetails = `[CORS Policy Violation Detected]
HTTP Method: ${method}
Target URL (Source): ${url}
Request Origin: ${origin}
Detector Source: ${info.source || "Network Interceptor"}
Timestamp: ${formattedTime}
ErrorMessage: ${info.errorMessage || "Blocked by browser CORS policy"}
Reason: The browser blocked this cross-origin HTTP request because the target server did not return a valid 'Access-Control-Allow-Origin' header matching '${origin}'.`;

  toast.error(`🚨 CORS Error Detected (${info.source || "Dev Mode"})`, {
    description: React.createElement(
      "div",
      { className: "flex flex-col gap-2 mt-1.5 text-xs text-zinc-300 font-sans" },
      React.createElement(
        "div",
        { className: "flex items-center gap-2 flex-wrap" },
        React.createElement(
          "span",
          { className: "font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-red-500/30" },
          method
        ),
        React.createElement(
          "span",
          { className: "font-mono text-white font-semibold truncate max-w-[280px]", title: url },
          url
        )
      ),
      React.createElement(
        "div",
        { className: "text-[11px] text-zinc-400 font-mono bg-zinc-900/80 p-2 rounded border border-white/5 space-y-0.5" },
        React.createElement("div", null, React.createElement("span", { className: "text-zinc-500" }, "Origin: "), origin),
        React.createElement("div", null, React.createElement("span", { className: "text-zinc-500" }, "Time: "), formattedTime)
      ),
      React.createElement(
        "div",
        { className: "text-[11px] text-red-300/90 leading-tight" },
        "Blocked by browser CORS policy. Target server is missing ",
        React.createElement("code", { className: "bg-zinc-800 text-red-300 px-1 py-0.5 rounded font-mono text-[10px]" }, "Access-Control-Allow-Origin"),
        " header."
      )
    ),
    duration: 9000,
    action: {
      label: "Copy Details",
      onClick: () => {
        try {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(rawDetails);
            toast.success("CORS error details copied to clipboard!");
          } else {
            console.log("CORS Error details:\n", rawDetails);
          }
        } catch (_) {
          console.log("CORS Error details:\n", rawDetails);
        }
      },
    },
  });
}

/**
 * Triggers a test CORS error toast for verification and debugging
 */
export function triggerTestCorsError(customUrl?: string): void {
  const targetUrl = customUrl || "https://api.thirdparty.external-service.org/v1/analytics/stream";
  showCorsErrorToast({
    url: targetUrl,
    method: "POST",
    origin: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
    errorMessage: "TypeError: Failed to fetch (Cross-Origin Request Blocked)",
    source: "test",
    timestamp: new Date().toLocaleTimeString(),
  });
}

/**
 * Initializes global XHR and Window error event listeners to capture unhandled CORS errors
 */
let isInitialized = false;
export function initGlobalCorsMonitor(): void {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  // 1. Intercept XMLHttpRequest for direct CORS failures
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
    (this as any)._cors_method = method;
    (this as any)._cors_url = typeof url === "string" ? url : url.toString();
    return originalXhrOpen.apply(this, [method, url, ...args] as any);
  };

  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: unknown[]) {
    const method = (this as unknown as { _cors_method?: string })._cors_method || "GET";
    const targetUrl = (this as unknown as { _cors_url?: string })._cors_url || "";

    this.addEventListener("error", () => {
      // status === 0 on cross-origin URL indicates network or CORS failure
      if (this.status === 0 && isCrossOriginUrl(targetUrl) && typeof navigator !== "undefined" && navigator.onLine) {
        showCorsErrorToast({
          url: targetUrl,
          method,
          origin: typeof window !== "undefined" ? window.location.origin : "",
          errorMessage: "XMLHttpRequest status 0 (CORS preflight or policy block)",
          source: "xhr",
        });
      }
    });
    return originalXhrSend.apply(this, args as [Document | XMLHttpRequestBodyInit | null | undefined]);
  };

  // 2. Intercept unhandled promise rejections for CORS errors
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (reason && isCorsError(reason)) {
      const url = reason.config?.url || reason.url || "Unspecified Cross-Origin Request";
      showCorsErrorToast({
        url,
        method: reason.config?.method || "FETCH",
        origin: window.location.origin,
        errorMessage: reason.message || String(reason),
        source: "window_error",
      });
    }
  });

  // 3. Intercept window errors referencing CORS
  window.addEventListener("error", (event) => {
    if (event.message && isCorsError(event.message)) {
      showCorsErrorToast({
        url: event.filename || "Cross-Origin Script / Network Asset",
        method: "GET",
        origin: window.location.origin,
        errorMessage: event.message,
        source: "window_error",
      });
    }
  });
}
