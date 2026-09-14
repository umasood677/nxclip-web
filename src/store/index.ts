import { configureStore, Middleware } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import contentReducer from "./slices/contentSlice";
import analyticsReducer from "./slices/analyticsSlice";
import uiReducer from "./slices/uiSlice";
import { safeLocalStorage, safeSessionStorage } from "../lib/safeStorage";
import { STORAGE_KEYS } from "../constants";

function readPersistedUserJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function hasAuthTokens(user: Record<string, unknown>): boolean {
  return !!(user.accessToken || user.refreshToken || user.token || user.jwtToken || user.idToken);
}

// Custom middleware to automatically synchronize the auth state to local storage or session storage
const authPersistenceMiddleware: Middleware = (_storeApi) => (next) => (action: any) => {
  const result = next(action);
  
  if (action.type === "auth/setAuthUser") {
    const user = action.payload;
    if (user) {
      const rememberFlag = safeLocalStorage.getItem("nx_remember_me");
      // Prefer the bucket that already holds tokens so profile-only setAuthUser
      // never strips access/refresh tokens or moves them to the wrong storage.
      const localExisting = readPersistedUserJson(
        safeLocalStorage.getItem(STORAGE_KEYS.PERSISTED_USER),
      );
      const sessionExisting = readPersistedUserJson(
        safeSessionStorage.getItem(STORAGE_KEYS.PERSISTED_USER),
      );
      const tokenSource = hasAuthTokens(localExisting)
        ? localExisting
        : hasAuthTokens(sessionExisting)
          ? sessionExisting
          : rememberFlag === "false"
            ? sessionExisting
            : localExisting;

      const isRemembered =
        rememberFlag === "true" ||
        (rememberFlag !== "false" && hasAuthTokens(localExisting));
      const storage = isRemembered ? safeLocalStorage : safeSessionStorage;

      // Profile updates from Redux omit tokens — always keep existing ones.
      const mergedUser = {
        ...tokenSource,
        ...user,
        accessToken:
          (user as any).accessToken ||
          tokenSource.accessToken ||
          tokenSource.token ||
          tokenSource.jwtToken ||
          tokenSource.idToken,
        refreshToken: (user as any).refreshToken || tokenSource.refreshToken,
      };
      
      storage.setItem(STORAGE_KEYS.PERSISTED_USER, JSON.stringify(mergedUser));
      storage.setItem(STORAGE_KEYS.LOGGED_IN, "true");
      if (isRemembered) {
        if (rememberFlag !== "true") {
          safeLocalStorage.setItem("nx_remember_me", "true");
        }
        safeSessionStorage.removeItem(STORAGE_KEYS.PERSISTED_USER);
        safeSessionStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      } else {
        safeLocalStorage.removeItem(STORAGE_KEYS.PERSISTED_USER);
        safeLocalStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      }

      // Notify any token listeners of state update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("nx_auth_state_changed"));
      }
    } else {
      safeLocalStorage.removeItem(STORAGE_KEYS.PERSISTED_USER);
      safeLocalStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      safeSessionStorage.removeItem(STORAGE_KEYS.PERSISTED_USER);
      safeSessionStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("nx_auth_state_changed"));
      }
    }
  } else if (action.type === "auth/logoutUser") {
    safeLocalStorage.removeItem(STORAGE_KEYS.PERSISTED_USER);
    safeLocalStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
    safeLocalStorage.removeItem("nx_remember_me");
    safeSessionStorage.removeItem(STORAGE_KEYS.PERSISTED_USER);
    safeSessionStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
    // Skip-onboarding pass only lasts this session; next login must re-prompt if incomplete.
    safeSessionStorage.removeItem("finishing_onboarding");
    safeSessionStorage.removeItem("renewing_week_plan");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("nx_auth_state_changed"));
    }
  }
  
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    content: contentReducer,
    analytics: analyticsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore specific actions or state paths if non-serializable objects get through
        ignoredActions: [
          "auth/setAuthUser", 
          "auth/setAuthProfile",
          "analytics/addReport",
          "analytics/setReports"
        ],
        ignoredPaths: [
          "auth.user", 
          "auth.profile",
          "analytics.latestReport",
          "analytics.reports"
        ],
      },
    }).concat(authPersistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

