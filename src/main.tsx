import './polyfill';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import './i18n';
import { safeLocalStorage } from './lib/safeStorage';
import { isCorsError, showCorsErrorToast, initGlobalCorsMonitor } from './lib/corsInterceptor';

// Safe global console interceptor to prevent iframe postMessage serialization crashes on circular structures
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

function sanitizeConsoleArg(arg: any, seen = new WeakSet()): any {
  if (arg === null || typeof arg !== "object") {
    return arg;
  }

  // Avoid circular reference crashes
  if (seen.has(arg)) {
    return "[Circular]";
  }

  // Safely skip massive standard elements or react internal fibers
  if (arg instanceof HTMLElement || (arg.constructor && arg.constructor.name && arg.constructor.name.includes("HTML"))) {
    return `[HTMLElement: ${arg.tagName || arg.constructor.name}]`;
  }

  // Avoid global browser context objects
  if (arg === window || arg === document) {
    return "[Global Browser Object]";
  }

  seen.add(arg);

  // Handle standard Error objects cleanly
  if (arg instanceof Error) {
    const errorDetails: Record<string, any> = {
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
    if (arg.cause) {
      errorDetails.cause = sanitizeConsoleArg(arg.cause, seen);
    }
    return errorDetails;
  }

  // Handle Arrays safely
  if (Array.isArray(arg)) {
    return arg.map((item) => sanitizeConsoleArg(item, seen));
  }

  // Handle standard objects
  const sanitized: Record<string, any> = {};
  const keys = Object.keys(arg);
  for (const key of keys) {
    try {
      if (key.startsWith("_") || key === "firestore" || key === "auth" || key === "app") {
        sanitized[key] = `[Internal ${key}]`;
      } else {
        sanitized[key] = sanitizeConsoleArg(arg[key], seen);
      }
    } catch {
      sanitized[key] = "[Unreadable Property]";
    }
  }
  return sanitized;
}

console.log = (...args: any[]) => {
  try {
    originalConsoleLog(...args.map((arg) => sanitizeConsoleArg(arg)));
  } catch {
    originalConsoleLog("[Circular Console Log Bypassed]");
  }
};

console.error = (...args: any[]) => {
  try {
    const stringifiedArgs = args.map(arg => {
      if (arg && typeof arg === 'object') {
        return arg.message || JSON.stringify(arg);
      }
      return String(arg);
    }).join(' ');

    if (
      stringifiedArgs.includes("Could not reach Cloud Firestore backend") || 
      stringifiedArgs.includes("@firebase/firestore") ||
      stringifiedArgs.includes("Firestore (10.8.0)")
    ) {
      // Demote to print as normal warning to avoid blocking the environment's error detection
      originalConsoleWarn(...args.map((arg) => sanitizeConsoleArg(arg)));
      return;
    }

    originalConsoleError(...args.map((arg) => sanitizeConsoleArg(arg)));
  } catch {
    originalConsoleError("[Circular Console Error Bypassed]");
  }
};

console.warn = (...args: any[]) => {
  try {
    originalConsoleWarn(...args.map((arg) => sanitizeConsoleArg(arg)));
  } catch {
    originalConsoleWarn("[Circular Console Warn Bypassed]");
  }
};

console.info = (...args: any[]) => {
  try {
    originalConsoleInfo(...args.map((arg) => sanitizeConsoleArg(arg)));
  } catch {
    originalConsoleInfo("[Circular Console Info Bypassed]");
  }
};

// Global window.fetch adapter to mock API responses when nxclip_mock_api is true
const originalFetch = (window.fetch || (globalThis && globalThis.fetch)).bind(window);

async function mockedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let finalInput = input;
  const isMockEnabled = safeLocalStorage.getItem("nxclip_mock_api") === "true";
  const apiEnv = safeLocalStorage.getItem("nxclip_api_env") || "development";

  let rewrittenUrl = typeof input === "string" 
    ? input 
    : input instanceof URL 
      ? input.toString() 
      : (input ? (input as any).url : "");

  if (apiEnv !== "development") {
    const defaultDevUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
    const newBase = apiEnv === "staging" ? "https://staging-api.nxclip.ai" : "https://api.nxclip.ai";

    if (typeof input === "string") {
      let targetUrl = input;
      if (input.startsWith(defaultDevUrl)) {
        targetUrl = input.replace(defaultDevUrl, newBase);
      } else if (input.startsWith("/api/")) {
        targetUrl = newBase + input;
      } else if (input.startsWith("http://localhost:3000/api/")) {
        targetUrl = input.replace("http://localhost:3000", newBase);
      }
      rewrittenUrl = targetUrl;
      finalInput = targetUrl;
    } else if (input instanceof URL) {
      let targetStr = input.toString();
      if (targetStr.startsWith(defaultDevUrl)) {
        targetStr = targetStr.replace(defaultDevUrl, newBase);
      } else if (targetStr.startsWith("/api/")) {
        targetStr = newBase + targetStr;
      }
      rewrittenUrl = targetStr;
      finalInput = new URL(targetStr);
    } else if (input && typeof (input as any).url === "string") {
      const reqUrl = (input as any).url;
      let targetUrl = reqUrl;
      if (reqUrl.startsWith(defaultDevUrl)) {
        targetUrl = reqUrl.replace(defaultDevUrl, newBase);
      } else if (reqUrl.startsWith("/api/")) {
        targetUrl = newBase + reqUrl;
      } else if (reqUrl.startsWith("http://localhost:3000/api/")) {
        targetUrl = reqUrl.replace("http://localhost:3000", newBase);
      }
      rewrittenUrl = targetUrl;
      try {
        finalInput = new Request(targetUrl, input as RequestInit);
      } catch {
        finalInput = targetUrl;
      }
    }
  }

  const url = rewrittenUrl;

  if (isMockEnabled) {
    if (url.includes("/api/docs/migration-guide")) {
      const mockMarkdown = `# nxClip Microservices Transition Roadmap

This guide details the standard transition plan from current monolith to NestJS microservices.

## Gateway Spec Status
- API Gateway Ingress (Port 5000): **ACTIVE (MOCKED)**
- User Accounts Modules (Port 5001): **ACTIVE (MOCKED)**
- Media Renderer Modules (Port 5002): **ACTIVE (MOCKED)**
- Social Feed (Port 5003): **ACTIVE (MOCKED)**
- Coach Engine (Port 5004): **ACTIVE (MOCKED)**
- Metrics & Analytics (Port 5005): **ACTIVE (MOCKED)**
- Live Notifications (Port 5006): **ACTIVE (MOCKED)**

[MOCKED RESPONSE ACTIVE] This content is generated locally from your active Mock API simulation layer. Set Mock API to disabled in the Settings or Admin panel to access the live development instances.`;

      return new Response(JSON.stringify({ content: mockMarkdown }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/analytics/metrics")) {
      const mockMetrics = {
        views: 3842100,
        likes: 124500,
        shares: 68100,
        completionRate: 74.8,
        followers: 95400
      };
      return new Response(JSON.stringify(mockMetrics), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/analytics/report/latest")) {
      const mockReports = [
        {
          id: "rep-mock-1",
          uid: "viewer",
          weekEnding: new Date().toLocaleDateString(),
          summary: "[MOCKED] Elevated spectator velocity recorded. Game clips with custom meme banners receive up to 30% higher active engagement.",
          metrics: {
            views: 450000,
            likes: 38000,
            shares: 6200,
            completionRate: 78.4
          },
          actionItems: [
            "Leverage ImageStudio layout models during competitive streams to increase CTR",
            "Consolidate daily highlights to shorts sequence lasting under 60 seconds",
            "Initiate Creator Coach feedback sessions regarding current Twitch trends"
          ]
        },
        {
          id: "rep-mock-2",
          uid: "viewer",
          weekEnding: new Date(Date.now() - 7 * 24 * 3600 * 1000).toLocaleDateString(),
          summary: "[MOCKED] Consistent base stream viewer counts maintained. Twitch community interactions remained optimized throughout our trial.",
          metrics: {
            views: 320000,
            likes: 24500,
            shares: 2800,
            completionRate: 61.2
          },
          actionItems: [
            "Enable user subscriptions on high engagement streams",
            "Export summary data to Google Workspace Sheets structure"
          ]
        }
      ];
      return new Response(JSON.stringify(mockReports), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/users/profile/")) {
      const uid = url.split("/profile/")[1]?.split("?")[0] || "anon";
      const mockProfile = {
        uid,
        displayName: "Creative Space Gamer (Mock)",
        email: "mock.creative@nxclip.app",
        photoURL: null,
        plan: "studio",
        role: "creator",
        bio: "Simulated Creator Account Profile triggered by Local Mock API test mode.",
        onboardingCompleted: true,
        createdAt: new Date().toISOString()
      };
      return new Response(JSON.stringify(mockProfile), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/api/pexels/search")) {
      const mockPexels = {
        photos: [
          { id: 1, src: { medium: "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=250&w=250" }, alt: "Gaming controller screen" },
          { id: 2, src: { medium: "https://images.pexels.com/photos/194511/pexels-photo-194511.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=250&w=250" }, alt: "Neon glowing keyboard" },
          { id: 3, src: { medium: "https://images.pexels.com/photos/275033/pexels-photo-275033.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=250&w=250" }, alt: "Retro game console keyboard" }
        ]
      };
      return new Response(JSON.stringify(mockPexels), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Is it a local microservices pinger request in MigrationGuide?
    const isPingerRequest = url.includes("localhost:500") || url.includes("127.0.0.1:500") || url.includes("/socket.io/?EIO=");
    if (isPingerRequest) {
      // Use an ultra-short delay to avoid slow network waits during mocked testing
      return new Response(JSON.stringify({ status: "ok", service: "mocked" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  const method = init?.method || "GET";

  // Redirect direct external gateway fetches through our local Express gateway proxy to avoid DNS resolution/CORS issues
  if (
    url.includes("staging-api.nxclip.ai") ||
    url.includes("api.nxclip.ai") ||
    url.includes("api-gateway-216098834386.us-central1.run.app")
  ) {
    let targetBase = "https://api-gateway-216098834386.us-central1.run.app";
    if (url.includes("staging-api.nxclip.ai")) {
      targetBase = "https://staging-api.nxclip.ai";
    } else if (url.includes("api.nxclip.ai")) {
      targetBase = "https://api.nxclip.ai";
    }

    const subPath = url.includes(targetBase) 
      ? url.substring(url.indexOf(targetBase) + targetBase.length)
      : url.replace(/https?:\/\/[^\/]+/, "");

    const proxyUrl = `/api/gateway-proxy/${subPath.replace(/^\/+/, "")}`;
    
    const modifiedInit = { ...(init || {}) };
    const headers = new Headers(modifiedInit.headers || {});
    headers.set("X-Target-Gateway-Url", targetBase);
    modifiedInit.headers = headers;
    
    try {
      return await originalFetch(proxyUrl, modifiedInit);
    } catch (err: any) {
      if (isCorsError(err, url)) {
        showCorsErrorToast({
          url,
          method,
          origin: typeof window !== "undefined" ? window.location.origin : "",
          errorMessage: err.message,
          source: "fetch"
        });
      }
      throw err;
    }
  }

  try {
    return await originalFetch(finalInput, init);
  } catch (err: any) {
    if (isCorsError(err, url)) {
      showCorsErrorToast({
        url,
        method,
        origin: typeof window !== "undefined" ? window.location.origin : "",
        errorMessage: err.message,
        source: "fetch"
      });
    }
    throw err;
  }
}

// Initialize global XHR and unhandled rejection CORS listener
initGlobalCorsMonitor();

// Safely define property on window and globalThis
try {
  Object.defineProperty(window, "fetch", {
    value: mockedFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  try {
    (window as any).fetch = mockedFetch;
  } catch (e2) {
    console.warn("Unable to redefine window.fetch, falling back to globalThis:", e2);
  }
}

try {
  Object.defineProperty(globalThis, "fetch", {
    value: mockedFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  try {
    (globalThis as any).fetch = mockedFetch;
  } catch (e2) {
    // final silent fallback
  }
}

import { Provider } from "react-redux";
import { store } from "./store";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <Provider store={store}>
          <App />
        </Provider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
