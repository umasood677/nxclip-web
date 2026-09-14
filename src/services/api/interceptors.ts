import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { 
  getAccessToken, 
  getRefreshToken, 
  updateAccessToken, 
  clearPersistedUser,
  triggerTokenStateUpdate
} from "../auth/authService";
import { resolveBaseGatewayUrl } from "../apiClient";
import { isCorsError, showCorsErrorToast, isCrossOriginUrl } from "../../lib/corsInterceptor";

// Thread-safe token refresh coordination
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function isInvalidRefreshError(err: unknown): boolean {
  const status =
    (err as { response?: { status?: number }; status?: number })?.response?.status ??
    (err as { status?: number })?.status;
  // Only treat client auth failures as hard session end — not network/5xx.
  return status === 400 || status === 401 || status === 403;
}

// Create custom Axios instance with default credentials configuration for Dual-Layer authentication cookie transmission
export const apiGatewayInstance = axios.create({
  withCredentials: true,
});

// Request Interceptor: automatically attaches headers and base URL
apiGatewayInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Dynamic Base URL resolution via safe CORS proxy on browser
    const realGatewayUrl = resolveBaseGatewayUrl();
    if (typeof window !== "undefined") {
      config.baseURL = "/api/gateway-proxy";
      config.headers["X-Target-Gateway-Url"] = realGatewayUrl;
    } else {
      config.baseURL = realGatewayUrl;
    }

    // 2. Automatically attach Bearer access token from session/local storage
    const token = getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. Dynamic internal API key authentication
    if (config.url && config.url.includes("/internal/")) {
      const internalApiKey = import.meta.env.VITE_INTERNAL_API_KEY || "nx_local_secret_key_123";
      config.headers["X-Internal-API-Key"] = internalApiKey;
    }

    // 4. Distributed tracing correlation ID
    config.headers["X-Correlation-Id"] = `trace_axios_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: monitors 401 errors, handles token refresh, and retries requests
apiGatewayInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Monitor network/CORS errors when no response is received from the server
    if (error && !error.response && originalRequest) {
      const requestUrl = originalRequest.url || "";
      const method = originalRequest.method || "GET";
      const targetUrl = originalRequest.headers?.["X-Target-Gateway-Url"] || requestUrl;

      if (isCorsError(error, targetUrl) || (error.code === "ERR_NETWORK" && isCrossOriginUrl(targetUrl))) {
        showCorsErrorToast({
          url: targetUrl,
          method,
          origin: typeof window !== "undefined" ? window.location.origin : "",
          errorMessage: error.message || "Network Error / CORS Blocked",
          source: "axios"
        });
      }
    }

    // Check if error is 401 Unauthorized, not a refresh endpoint call, and not already retried
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest.url &&
      !originalRequest.url.includes("/auth/refresh") &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Queue parallel requests if a refresh is already in progress
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiGatewayInstance(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        onRefreshed("");
        clearPersistedUser();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("nx_session_expired"));
        }
        return Promise.reject(error);
      }

      try {
        console.log("[Axios Interceptor] Access token expired (401). Attempting automatic token refresh...");
        
        // Request new access token using standard axios (to avoid interceptor recursion)
        let refreshUrl = `${resolveBaseGatewayUrl()}/auth/refresh`;
        const headers: Record<string, string> = {};
        
        if (typeof window !== "undefined") {
          const realGatewayUrl = resolveBaseGatewayUrl();
          refreshUrl = `/api/gateway-proxy/auth/refresh`;
          headers["X-Target-Gateway-Url"] = realGatewayUrl;
        }
        
        const refreshResponse = await axios.post(
          refreshUrl,
          { refreshToken },
          { headers, withCredentials: true },
        );

        if (refreshResponse.status === 200 || refreshResponse.status === 201) {
          const tokenData = refreshResponse.data;
          const newAccessToken = tokenData.accessToken;
          const newRefreshToken = tokenData.refreshToken || refreshToken;

          updateAccessToken(newAccessToken, newRefreshToken);
          triggerTokenStateUpdate();

          console.log("[Axios Interceptor] Token refreshed successfully. Retrying original request...");

          isRefreshing = false;
          onRefreshed(newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiGatewayInstance(originalRequest);
        }

        throw new Error(`Refresh returned status ${refreshResponse.status}`);
      } catch (refreshErr) {
        console.warn("[Axios Interceptor] Session refresh attempt handled:", refreshErr);
        isRefreshing = false;
        onRefreshed("");

        // Only hard-logout when the refresh token itself is rejected.
        // Transient network / gateway 5xx must keep the session so later retries can succeed.
        if (isInvalidRefreshError(refreshErr)) {
          clearPersistedUser();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("nx_session_expired"));
          }
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
