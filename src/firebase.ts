import { toast } from "sonner";
import { getPersistedUser } from "./services/auth/authService";
import { safeStringify } from "./lib/utils";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Mock Firebase Config check for compatibility
export const isFirebaseConfigured = true;

/**
 * Custom Auth Proxy that replaces Firebase Authentication.
 * It uses the nx_auth_state_changed event and local storage to track the user.
 */
export const auth = {
  get currentUser() {
    try {
      const user = getPersistedUser();
      if (user) {
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified ?? true,
          isAnonymous: false,
          providerData: [],
          tenantId: null,
        };
      }
    } catch (e) {
      console.error("Error reading persisted user:", e);
    }
    return null;
  },

  onAuthStateChanged(callback: (user: any) => void) {
    const getCurrentUser = () => {
      try {
        const user = getPersistedUser();
        if (user) {
          return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified ?? true,
            isAnonymous: false,
            providerData: [],
          };
        }
      } catch (e) {
        console.error("Error reading persisted user in onAuthStateChanged:", e);
      }
      return null;
    };

    // Fire immediately with current state
    callback(getCurrentUser());

    const handleAuthChange = () => {
      callback(getCurrentUser());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleAuthChange);
      window.addEventListener("nx_auth_state_changed", handleAuthChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleAuthChange);
        window.removeEventListener("nx_auth_state_changed", handleAuthChange);
      }
    };
  },

  signOut: async () => {
    // This is handled by identityApi.logout() usually, but providing a stub
    localStorage.clear();
    sessionStorage.clear();
    window.dispatchEvent(new Event("nx_auth_state_changed"));
  }
};

export const googleProvider = {
  setCustomParameters: () => {}
} as any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
  }
}

/**
 * Maintains compatibility for components that catch Firestore errors.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  
  console.error('API/Database Error: ', safeStringify(errInfo));

  let friendlyMessage = "Something went wrong. Please try again.";
  if (errorMessage.includes("permission") || errorMessage.includes("unauthorized")) {
    friendlyMessage = `You don't have permission to ${operationType} this data.`;
  } else if (errorMessage.includes("offline")) {
    friendlyMessage = "You appear to be offline. Please check your connection.";
  }

  toast.error("System Error", {
    description: friendlyMessage,
  });

  throw new Error(safeStringify(errInfo));
}


