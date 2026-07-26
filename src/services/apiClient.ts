import axios from "axios";
import { apiGatewayInstance } from "./api/interceptors";
import { safeLocalStorage, safeSessionStorage } from "../lib/safeStorage";
import { STORAGE_KEYS, GATEWAY_CONFIG } from "../constants";
import { getRefreshToken, clearPersistedUser } from "./auth/authService";

// Interface for API Gateway responses and errors
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: string;
}

// Resolve dynamic API Gateway URL based on active environmental profiles (Best Practice 5)
export function resolveBaseGatewayUrl(overrideEnv?: string): string {
  const apiEnv = overrideEnv || safeLocalStorage.getItem(STORAGE_KEYS.API_ENV) || "development";
  
  if (apiEnv === "staging") {
    const stagingUrl = import.meta.env.VITE_API_GATEWAY_URL_STAGING;
    if (stagingUrl && !stagingUrl.includes("localhost") && !stagingUrl.includes("127.0.0.1") && stagingUrl !== "") {
      return stagingUrl;
    }
    // Fallback if env var is missing but staging is explicitly requested
    return GATEWAY_CONFIG.STAGING_FALLBACK;
  }
  
  if (apiEnv === "production") {
    const prodUrl = import.meta.env.VITE_API_GATEWAY_URL_PRODUCTION;
    if (prodUrl && !prodUrl.includes("localhost") && !prodUrl.includes("127.0.0.1") && prodUrl !== "") {
      return prodUrl;
    }
    // Fallback to a generic production endpoint if needed, but strictly prefer env
    return GATEWAY_CONFIG.PRODUCTION_FALLBACK;
  }
  
  // Under user instructions: use https://api-gateway-216098834386.us-central1.run.app and do not use local anywhere
  const envUrl = import.meta.env.VITE_API_GATEWAY_URL || import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1") && envUrl !== "") {
    return envUrl;
  }
  
  return "https://api-gateway-216098834386.us-central1.run.app";
}

/**
 * Returns the environment variable name associated with a specific gateway profile.
 * Useful for developer documentation and onboarding.
 */
export function getEnvVarNameForEnv(env: string): string {
  switch (env) {
    case "staging": return "VITE_API_GATEWAY_URL_STAGING";
    case "production": return "VITE_API_GATEWAY_URL_PRODUCTION";
    default: return "VITE_API_GATEWAY_URL";
  }
}

// ==========================================
// CIRCUIT BREAKER PATTERN & HYBRID CACHING STRATEGY
// ==========================================

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number;  // Number of failures before tripping to OPEN
  cooldownPeriodMs?: number;  // Time in OPEN state before trying HALF_OPEN
}

// Circuit Breaker logic strictly enforced to report real network failures only.
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 3,
      cooldownPeriodMs: options.cooldownPeriodMs ?? 15000,
    };
  }

  public getState(): CircuitState {
    if (this.state === "OPEN" && Date.now() - this.lastFailureTime > this.options.cooldownPeriodMs) {
      this.state = "HALF_OPEN";
      console.log(`[Circuit Breaker] Transitioned to HALF_OPEN. Attempting probe request.`);
    }
    return this.state;
  }

  public recordSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === "CLOSED" || this.state === "HALF_OPEN") {
      if (this.failureCount >= this.options.failureThreshold) {
        this.state = "OPEN";
        console.warn(
          `[Circuit Breaker] TRIPPED! Sequential failures: ${this.failureCount}. State is now OPEN. Cooldown: ${this.options.cooldownPeriodMs}ms`
        );
      }
    }
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public getLastFailureTime(): number {
    return this.lastFailureTime;
  }

  public forceOpen() {
    this.state = "OPEN";
    this.failureCount = this.options.failureThreshold;
    this.lastFailureTime = Date.now();
    console.warn(`[Circuit Breaker] Manually TRIPPED state to OPEN`);
  }

  public reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    console.log(`[Circuit Breaker] Manually RESET state to CLOSED`);
  }
}

// Registry of Circuit Breakers per root service module route
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(path: string): CircuitBreaker {
  const prefix = path.split("/")[1] || "default";
  if (!circuitBreakers.has(prefix)) {
    circuitBreakers.set(
      prefix,
      new CircuitBreaker({
        failureThreshold: 3,
        cooldownPeriodMs: 15000,
      })
    );
  }
  return circuitBreakers.get(prefix)!;
}

export interface CircuitStatusInfo {
  name: string;
  prefix: string;
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
}

export function getAllCircuitBreakersStatus(): CircuitStatusInfo[] {
  const services = [
    { name: "Identity Service (Auth & Users)", prefix: "auth" },
    { name: "Content Generation Engine", prefix: "content" },
    { name: "Trending Creator Feed", prefix: "feed" },
    { name: "Analytics Intel Processor", prefix: "analytics" },
    { name: "Notification Dispatcher", prefix: "notifications" },
  ];

  return services.map(s => {
    const cb = getCircuitBreaker(`/${s.prefix}`);
    return {
      name: s.name,
      prefix: s.prefix,
      state: cb.getState(),
      failureCount: cb.getFailureCount(),
      lastFailureTime: cb.getLastFailureTime(),
    };
  });
}

export function forceOpenCircuitBreaker(prefix: string) {
  const cb = getCircuitBreaker(`/${prefix}`);
  cb.forceOpen();
}

export function resetCircuitBreaker(prefix: string) {
  const cb = getCircuitBreaker(`/${prefix}`);
  cb.reset();
}

// Caching Helpers
function getCachedResponse(key: string): any | null {
  try {
    const data = safeLocalStorage.getItem(key) || safeSessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setCachedResponse(key: string, data: any) {
  try {
    const serialized = JSON.stringify(data);
    safeLocalStorage.setItem(key, serialized);
    safeSessionStorage.setItem(key, serialized);
  } catch {}
}

/**
 * Core generic Axios-based orchestrator that injects distributed tracking headers,
 * handles API authorization, implements secure API key injection for internal calls,
 * and handles fallbacks gracefully using circuit breakers and localized cache.
 */
async function performApiRequest<T = any>(
  path: string,
  options: RequestInit & { suppressErrorLog?: boolean } = {}
): Promise<T> {
  const method = options.method || "GET";
  const cacheKey = `nx_api_cache_${method}_${path}`;

  const breaker = getCircuitBreaker(path);
  const currentState = breaker.getState();

  if (currentState === "OPEN") {
    const cached = getCachedResponse(cacheKey);
    if (cached !== null) {
      console.log(`[Circuit Breaker Fallover] Serving cached response for ${method} ${path}`);
      return cached;
    }
    throw new Error(`Service is temporarily unavailable (Circuit OPEN for ${path})`);
  }

  try {
    let dataPayload: any = undefined;
    if (options.body) {
      try {
        dataPayload = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      } catch {
        dataPayload = options.body;
      }
    }

    const response = await apiGatewayInstance.request({
      url: path,
      method: method as any,
      headers: options.headers as any,
      data: dataPayload,
    });

    const result = response.data;
    
    // If the gateway proxy returned a bad gateway or service unavailable status structure, treat it as failure
    if (result && typeof result === "object" && "statusCode" in result && (result.statusCode === 502 || result.statusCode === 503)) {
      throw result;
    }

    breaker.recordSuccess();
    setCachedResponse(cacheKey, result);
    return result;
  } catch (error: any) {
    const isNetworkError = !error?.statusCode;
    const isServerError = error?.statusCode >= 500 && error?.statusCode < 600;

    if (isNetworkError || isServerError) {
      breaker.recordFailure();
    }

    const isClientError = (error?.statusCode >= 400 && error?.statusCode < 500) || (error?.response?.status >= 400 && error?.response?.status < 500);
    if (!options.suppressErrorLog && !isClientError) {
      console.error(`[API Client] Request failed for ${path}:`, error);
    }

    // Try to serve from cache on failure if it's a server/network error
    if (isNetworkError || isServerError) {
      const cached = getCachedResponse(cacheKey);
      if (cached !== null) {
        console.warn(`[API Client] Serving cached data for ${path} after failure.`);
        return cached;
      }
    }

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errJson: ApiError = error.response?.data || {
        statusCode,
        message: error.message || `Request failed with status Code ${statusCode}`,
      };
      throw errJson;
    }
    throw error;
  }
}

// ==========================================
// MOCK STATE SIMULATED STORAGE ENGINE (Fallback Best Practice 1)
// ==========================================

export function clearApiCache() {
  try {
    safeLocalStorage.keys().forEach((k) => {
      if (k.startsWith("nx_api_cache_")) {
        safeLocalStorage.removeItem(k);
      }
    });
    safeSessionStorage.keys().forEach((k) => {
      if (k.startsWith("nx_api_cache_")) {
        safeSessionStorage.removeItem(k);
      }
    });
  } catch {}
}

export const GLOBAL_FALLBACK_IMAGES = [];

export function extractValidImageUrl(item: any): string {
  if (!item) return "";

  // If item is directly a string URL
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (
      trimmed &&
      !trimmed.includes("undefined") &&
      !trimmed.includes("null")
    ) {
      if (trimmed.includes("gcs-mock-upload-bucket") || trimmed.includes("mock-bucket")) {
        return "";
      }
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image")) {
        return trimmed;
      }
      if (trimmed.startsWith("/")) {
        if (trimmed.startsWith("/content/")) {
          const baseGateway = resolveBaseGatewayUrl();
          return `${baseGateway}${trimmed}`;
        }
        return `${window.location.origin}${trimmed}`;
      }
      if (trimmed.includes(".") || trimmed.includes("/") || trimmed.length > 20) {
        return trimmed;
      }
      return "";
    }
  }

  const candidates = [
    item.imageUrl,
    item.thumbnailUrl,
    item.mediaUrl,
    item.cdnUrl,
    item.image,
    item.url,
    item.assetUrl,
    item.coverUrl,
    item.posterUrl,
    item.thumbnail,
    item.media,
    item.path,
    item.filePath,
    item.fileUrl,
    item.previewUrl,
    item.data?.imageUrl,
    item.data?.thumbnailUrl,
    item.data?.mediaUrl,
    item.data?.cdnUrl,
    item.data?.image,
    item.data?.url,
    item.data?.assetUrl,
    typeof item.data === "string" ? item.data : "",
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "string" &&
      candidate.trim() !== "" &&
      !candidate.includes("undefined") &&
      !candidate.includes("null")
    ) {
      const trimmed = candidate.trim();
      if (trimmed.includes("gcs-mock-upload-bucket") || trimmed.includes("mock-bucket")) {
        continue;
      }
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image")) {
        return trimmed;
      }
      if (trimmed.startsWith("/")) {
        if (trimmed.startsWith("/content/")) {
          const baseGateway = resolveBaseGatewayUrl();
          return `${baseGateway}${trimmed}`;
        }
        return `${window.location.origin}${trimmed}`;
      }
      if (trimmed.includes(".") || trimmed.includes("/") || trimmed.length > 20) {
        return trimmed;
      }
    }
  }

  // Authenticated media route fallback when DTO has an id but no URL fields
  const contentId = item.id || item.contentId;
  if (contentId && typeof contentId === "string") {
    const baseGateway = resolveBaseGatewayUrl();
    return `${baseGateway}/content/${contentId}/media`;
  }

  return "";
}

// ==========================================
// 1. IDENTITY SERVICE MODULE
// ==========================================

export interface RegisterDto {
  email: string;
  username: string;
  displayName: string;
  password?: string;
}

export interface AuthResponseDto {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    plan: string;
    emailVerified: boolean;
    roles: string[];
    createdAt: string;
    onboardingCompleted?: boolean;
    onboardingPlan?: Record<string, unknown> | null;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface PlatformStatDto {
  platform: "youtube" | "instagram" | "tiktok" | string;
  externalUrl?: string;
  views?: number;
  likes?: number;
  comments?: number;
  viewsDisplay?: string;
  likesDisplay?: string;
  commentsDisplay?: string;
  syncedAt?: string;
  verified?: boolean;
}

export interface FeedItemDto {
  id: string;
  contentId: string;
  userId: string;
  title: string;
  description: string;
  contentType: string;
  thumbnailUrl: string;
  /** @deprecated — ignore for product UX; use platformStats */
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  platformStats?: PlatformStatDto[];
  wesScore?: number;
  socialRollup?: "idle" | "scheduled" | "publishing" | "live" | "failed" | string;
  hasLiveExternal?: boolean;
  publishedAt: string;
}

export interface FeedListResponseDto {
  items: FeedItemDto[];
  nextCursor?: string;
}

export interface CreateMemeRequestDto {
  mode: "ai" | "template" | "hybrid";
  prompt?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
  templateId?: string;
  texts?: Array<{ slot: string; text: string }>;
}

export interface UploadUrlResponseDto {
  uploadUrl: string;
  contentId: string;
  assetId: string;
  expiresIn: number;
}

/**
 * Binary PUT to a presigned upload URL (Journey B / reference uploads).
 * Uses raw fetch — not the API gateway client — so CORS/signed headers stay intact.
 */
export async function putToUploadUrl(
  uploadUrl: string,
  file: Blob | ArrayBuffer | Uint8Array,
  contentType: string
): Promise<Response> {
  const body =
    file instanceof Blob
      ? file
      : file instanceof ArrayBuffer
        ? file
        : file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: body as BodyInit,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw {
      statusCode: res.status,
      message: text || `Upload PUT failed with status ${res.status}`,
    } as ApiError;
  }

  return res;
}

export const identityApi = {
  register: async (dto: RegisterDto): Promise<AuthResponseDto> => {
    return performApiRequest<AuthResponseDto>(
      "/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );
  },

  login: async (email: string, password?: string): Promise<AuthResponseDto> => {
    return performApiRequest<AuthResponseDto>(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );
  },

  /** Google Identity Services ID token → same AuthResponse as login/register */
  googleAuth: async (idToken: string): Promise<AuthResponseDto> => {
    return performApiRequest<AuthResponseDto>(
      "/auth/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
  },

  refresh: async (refreshToken?: string): Promise<TokenResponseDto> => {
    return performApiRequest<TokenResponseDto>(
      "/auth/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }
    );
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = getRefreshToken();
      const bodyPayload = refreshToken ? { refreshToken } : {};
      await performApiRequest<void>(
        "/auth/logout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
          suppressErrorLog: true,
        } as any
      );
    } catch (err) {
      console.warn("Server-side logout call finished with notice:", err);
    } finally {
      clearPersistedUser();
    }
  },

  getMe: async (): Promise<any> => {
    return performApiRequest(
      "/auth/me",
      { method: "GET" }
    );
  },

  checkEmail: async (email: string): Promise<{ available: boolean }> => {
    return performApiRequest<{ available: boolean }>(
      `/auth/check-email?email=${encodeURIComponent(email)}`,
      { method: "GET" }
    );
  },

  checkUsername: async (username: string): Promise<{ available: boolean }> => {
    return performApiRequest<{ available: boolean }>(
      `/auth/check-username?username=${encodeURIComponent(username)}`,
      { method: "GET" }
    );
  },

  verifyEmail: async (token: string): Promise<void> => {
    return performApiRequest<void>(
      "/auth/verify-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
  },

  resendVerificationEmail: async (email: string): Promise<void> => {
    return performApiRequest<void>(
      "/auth/resend-verification",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );
  },

  getDevVerificationToken: async (email: string): Promise<{ email: string; token: string; expiresAt?: string; verifyUrl?: string }> => {
    return performApiRequest<{ email: string; token: string; expiresAt?: string; verifyUrl?: string }>(
      `/auth/dev/verification-token?email=${encodeURIComponent(email)}`,
      { method: "GET" }
    );
  },

  getVerificationToken: async (email: string): Promise<{ email: string; token: string; expiresAt?: string; verifyUrl?: string }> => {
    return performApiRequest<{ email: string; token: string; expiresAt?: string; verifyUrl?: string }>(
      `/auth/dev/verification-token?email=${encodeURIComponent(email)}`,
      { method: "GET" }
    );
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    return performApiRequest<{ success: boolean; message: string }>(
      "/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );
  },

  resetPassword: async (dto: { email: string; code: string; newPassword?: string }): Promise<{ success: boolean }> => {
    return performApiRequest<{ success: boolean }>(
      "/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );
  },

  getUserMe: async (): Promise<any> => {
    return performApiRequest(
      "/users/me",
      { method: "GET" }
    );
  },

  updateProfile: async (data: { 
    displayName?: string; 
    bio?: string; 
    avatarUrl?: string; 
    niches?: string[]; 
    socials?: any;
    email?: string;
    onboardingCompleted?: boolean;
  }) => {
    return performApiRequest(
      "/users/me",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
  },

  getUserById: async (id: string): Promise<any> => {
    return performApiRequest(
      `/users/${id}`,
      { method: "GET" }
    );
  },

  getInternalUserById: async (userId: string): Promise<any> => {
    return performApiRequest(
      `/internal/users/${userId}`,
      { method: "GET" }
    );
  },

  getAllUsers: async (): Promise<any[]> => {
    return performApiRequest<any[]>(
      "/users",
      { method: "GET" }
    );
  },

  updateUserRole: async (userId: string, role: string): Promise<any> => {
    return performApiRequest(
      `/users/${userId}/role`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      }
    );
  },

  updateUserPlan: async (userId: string, plan: string): Promise<any> => {
    return performApiRequest(
      `/users/${userId}/plan`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      }
    );
  },

  deleteUser: async (userId: string): Promise<void> => {
    return performApiRequest<void>(
      `/users/${userId}`,
      { method: "DELETE" }
    );
  }
};

// ==========================================
// 2. CONTENT SERVICE MODULE
// ==========================================

export interface ContentDto {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: "draft" | "processing" | "generation_failed" | "publishing" | "moderation_rejected" | "published" | "deleted" | string;
  contentType: "image" | "meme" | "clip" | string;
  thumbnailUrl: string;
  imageUrl?: string;
  mediaUrl?: string;
  cdnUrl?: string;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  caption?: string;
  selectedCaption?: string;
  hashtags?: string[];
  selectedHashtags?: string[];
  prompt?: string;
  style?: string;
  aspectRatio?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagement?: number;
  creatorName?: string;
  creatorAvatar?: string;
}

export const contentApi = {
  requestUploadUrl: async (
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<UploadUrlResponseDto> => {
    return performApiRequest<UploadUrlResponseDto>(
      "/content/upload-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, mimeType, fileSize }),
      }
    );
  },

  /** Journey B helper: request upload URL then binary PUT the file. */
  uploadFile: async (file: File): Promise<UploadUrlResponseDto> => {
    const meta = await contentApi.requestUploadUrl(
      file.name,
      file.type || "application/octet-stream",
      file.size
    );
    await putToUploadUrl(meta.uploadUrl, file, file.type || "application/octet-stream");
    return meta;
  },

  generateImage: async (
    prompt: string, 
    style = "cinematic", 
    aspectRatio = "16:9", 
    model = "default",
    referenceContentIds?: string[],
    referenceUploadIds?: string[]
  ) => {
    const payload: Record<string, any> = { prompt, style, aspectRatio, model };
    if (referenceContentIds && referenceContentIds.length > 0) payload.referenceContentIds = referenceContentIds;
    if (referenceUploadIds && referenceUploadIds.length > 0) payload.referenceUploadIds = referenceUploadIds;

    return performApiRequest(
      "/content/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  },

  regenerateImage: async (
    id: string, 
    data: { 
      prompt?: string; 
      style?: string; 
      aspectRatio?: string; 
      model?: string; 
      referenceContentIds?: string[]; 
      referenceUploadIds?: string[];
    }
  ): Promise<any> => {
    return performApiRequest(
      `/content/${id}/regenerate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
  },

  createMeme: async (dto: CreateMemeRequestDto): Promise<any> => {
    return performApiRequest(
      "/content/meme",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }
    );
  },

  getContentList: async (cursor?: string, limitCount = 20): Promise<{ items: ContentDto[]; nextCursor?: string }> => {
    const safeLimit = Math.min(Math.max(1, limitCount), 100);
    const path = `/content?limit=${safeLimit}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
    return performApiRequest(
      path,
      { method: "GET" }
    );
  },

  getUserContentList: async (limitCount = 100, cursor?: string): Promise<ContentDto[]> => {
    const pageLimit = Math.min(Math.max(1, limitCount || 100), 100);
    const allItems: ContentDto[] = [];
    let currentCursor = cursor;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = Math.ceil((limitCount || 100) / pageLimit);

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      const url = `/content/mine?limit=${pageLimit}` + (currentCursor ? `&cursor=${encodeURIComponent(currentCursor)}` : "");
      const res = await performApiRequest<any>(
        url,
        { method: "GET" }
      );

      let items: ContentDto[] = [];
      let nextCursor: string | undefined = undefined;

      if (Array.isArray(res)) {
        items = res;
      } else if (res && typeof res === "object") {
        if (Array.isArray(res.items)) items = res.items;
        else if (Array.isArray(res.data)) items = res.data;
        nextCursor = res.nextCursor || res.cursor;
      }

      allItems.push(...items);

      if (nextCursor && items.length > 0 && allItems.length < (limitCount || 100)) {
        currentCursor = nextCursor;
      } else {
        hasMore = false;
      }
    }

    return allItems;
  },

  getContentById: async (id: string, options?: { suppressErrorLog?: boolean }): Promise<ContentDto> => {
    return performApiRequest(
      `/content/${id}`,
      { method: "GET", ...options }
    );
  },

  getUserContentById: async (id: string, options?: { suppressErrorLog?: boolean }): Promise<ContentDto> => {
    return performApiRequest(
      `/content/mine/${id}`,
      { method: "GET", ...options }
    );
  },

  editContent: async (id: string, data: { title?: string; description?: string }): Promise<ContentDto> => {
    return performApiRequest(
      `/content/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
  },

  retryGeneration: async (id: string): Promise<{ jobId: string; status: string }> => {
    return performApiRequest<{ jobId: string; status: string }>(
      `/content/${id}/retry-generation`,
      { method: "POST" }
    );
  },

  publish: async (id: string, data?: { title?: string; caption?: string; hashtags?: string[]; description?: string; thumbnailUrl?: string; imageUrl?: string; mediaUrl?: string }) => {
    // Whitelist only allowed properties for NestJS PublishContentDto (title, caption, hashtags, description)
    const payload: Record<string, any> = {};
    if (data) {
      if (data.title) payload.title = data.title;
      if (data.caption) payload.caption = data.caption;
      if (data.hashtags && Array.isArray(data.hashtags) && data.hashtags.length > 0) payload.hashtags = data.hashtags;
      if (data.description) payload.description = data.description;
    }

    return performApiRequest(
      `/content/${id}/publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
      }
    );
  },

  deleteContent: async (id: string): Promise<void> => {
    return performApiRequest<void>(
      `/content/${id}`,
      { method: "DELETE" }
    );
  },

  createContent: async (data: any): Promise<any> => {
    return performApiRequest(
      "/content",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
  },

  // Internal callbacks testing API pipeline
  moderationCallback: async (id: string, jobId: string, approved: boolean, flags?: string[]): Promise<void> => {
    return performApiRequest<void>(
      `/internal/content/${id}/callbacks/moderation`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, approved, flags })
      }
    );
  },

  generationCallback: async (id: string, jobId: string, storageKey: string, thumbnailUrl?: string): Promise<void> => {
    return performApiRequest<void>(
      `/internal/content/${id}/callbacks/generation`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, storageKey, thumbnailUrl })
      }
    );
  },

  generationFailedCallback: async (id: string, jobId: string, reason: string, retryable?: boolean): Promise<void> => {
    return performApiRequest<void>(
      `/internal/content/${id}/callbacks/generation-failed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, reason, retryable })
      }
    );
  },

  transcriptionCallback: async (id: string, jobId: string, transcript: string, language?: string): Promise<void> => {
    return performApiRequest<void>(
      `/internal/content/${id}/callbacks/transcription`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, transcript, language })
      }
    );
  },

  getInternalContentById: async (id: string): Promise<ContentDto> => {
    return performApiRequest<ContentDto>(
      `/internal/content/${id}`,
      { method: "GET" }
    );
  }
};

// ==========================================
// 3. FEED SERVICE MODULE
// ==========================================

export interface CommentDto {
  id: string;
  userId: string;
  contentId: string;
  body: string;
  createdAt: string;
}

export interface FeedUserProfileDto {
  userId: string;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

/** @deprecated Use FeedUserProfileDto */
export type UserProfileDto = FeedUserProfileDto;

function normalizeFeedList(res: any): FeedListResponseDto {
  if (Array.isArray(res)) {
    return { items: res };
  }
  if (res && typeof res === "object") {
    const items = Array.isArray(res.items)
      ? res.items
      : Array.isArray(res.data)
        ? res.data
        : [];
    return {
      items,
      nextCursor: res.nextCursor || res.cursor || undefined,
    };
  }
  return { items: [] };
}

export const feedApi = {
  /** Explore / WES — Live+verified social posts. Returns `{ items, nextCursor }`. */
  getTrendingFeed: async (cursor?: string, limitCount = 20): Promise<FeedListResponseDto> => {
    const safeLimit = Math.min(Math.max(1, limitCount), 100);
    const path =
      `/feed/trending?limit=${safeLimit}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
    const res = await performApiRequest<any>(path, { method: "GET" });
    return normalizeFeedList(res);
  },

  /** @deprecated Prefer getTrendingFeed — same endpoint, normalized shape */
  fetchTrendingTimeline: async (cursor?: string, limitCount = 20): Promise<FeedListResponseDto> => {
    return feedApi.getTrendingFeed(cursor, limitCount);
  },

  fetchPersonalFeed: async (cursor?: string, limitCount = 20): Promise<FeedListResponseDto> => {
    const safeLimit = Math.min(Math.max(1, limitCount), 100);
    const res = await performApiRequest<any>(
      `/feed?limit=${safeLimit}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
      { method: "GET" }
    );
    return normalizeFeedList(res);
  },

  getFeedItemById: async (id: string, options?: { suppressErrorLog?: boolean }): Promise<FeedItemDto> => {
    return performApiRequest<FeedItemDto>(
      `/feed/${id}`,
      { method: "GET", ...options }
    );
  },

  /**
   * @deprecated Legacy in-app like — not product engagement.
   * SPA must render `platformStats` only. Kept for compatibility / admin tooling.
   */
  likeContent: async (contentId: string) => {
    return performApiRequest(
      `/content/${contentId}/like`,
      { method: "POST" }
    );
  },

  addComment: async (contentId: string, body: string): Promise<CommentDto> => {
    return performApiRequest<CommentDto>(
      `/content/${contentId}/comment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }
    );
  },

  getCommentsList: async (contentId: string, cursor?: string, limitCount = 20): Promise<{ items: CommentDto[]; nextCursor?: string }> => {
    return performApiRequest<{ items: CommentDto[]; nextCursor?: string }>(
      `/content/${contentId}/comments?limit=${limitCount}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
      { method: "GET" }
    );
  },

  followUser: async (targetUserId: string): Promise<{ userId: string; following: boolean; followerCount: number }> => {
    return performApiRequest<{ userId: string; following: boolean; followerCount: number }>(
      `/feed/users/${targetUserId}/follow`,
      { method: "POST" }
    );
  },

  unfollowUser: async (targetUserId: string): Promise<void> => {
    return performApiRequest<void>(
      `/feed/users/${targetUserId}/follow`,
      { method: "DELETE" }
    );
  },

  getFeedUserProfile: async (userId: string): Promise<FeedUserProfileDto> => {
    return performApiRequest<FeedUserProfileDto>(
      `/feed/users/${userId}/profile`,
      { method: "GET" }
    );
  },

  /** @deprecated Prefer getFeedUserProfile */
  getUserProfile: async (userId: string): Promise<FeedUserProfileDto> => {
    return feedApi.getFeedUserProfile(userId);
  },

  internalProjections: async (dto: any): Promise<{ contentId: string }> => {
    return performApiRequest<{ contentId: string }>(
      "/internal/feed/projections",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto)
      }
    );
  }
};

// ==========================================
// 3b. SOCIAL PERFORMANCE HUB (stubs — OAuth/adapters later)
// ==========================================

export type SocialPlatform = "youtube" | "instagram" | "tiktok";

export const socialApi = {
  listAccounts: async (): Promise<any[]> => {
    const res = await performApiRequest<any>("/social/accounts", { method: "GET" });
    return Array.isArray(res) ? res : res?.items ?? res?.accounts ?? [];
  },

  connectAccount: async (platform: SocialPlatform, body?: Record<string, unknown>): Promise<any> => {
    return performApiRequest(`/social/accounts/${platform}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  },

  disconnectAccount: async (platform: SocialPlatform): Promise<void> => {
    return performApiRequest<void>(`/social/accounts/${platform}`, { method: "DELETE" });
  },

  getDistributions: async (contentId: string): Promise<any> => {
    return performApiRequest(`/social/content/${contentId}/distributions`, { method: "GET" });
  },

  linkExternalPost: async (contentId: string, body: Record<string, unknown>): Promise<any> => {
    return performApiRequest(`/social/content/${contentId}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  publishNow: async (contentId: string, body?: Record<string, unknown>): Promise<any> => {
    return performApiRequest(`/social/content/${contentId}/publish-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  },

  schedule: async (contentId: string, body: Record<string, unknown>): Promise<any> => {
    return performApiRequest(`/social/content/${contentId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  checkEligibility: async (contentId: string, body?: Record<string, unknown>): Promise<any> => {
    return performApiRequest(`/social/content/${contentId}/eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  },
};

// ==========================================
// 4. ANALYTICS SERVICE MODULE
// ==========================================

export interface DashboardMetricsDto {
  views: number;
  likes: number;
  comments: number;
  followers: number;
  reach: number;
}

export interface WeeklyReportDto {
  reportId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  views: number;
  likes: number;
  comments: number;
  followers: number;
  growthRate: number;
}

export const analyticsApi = {
  fetchSummaryMetrics: async (): Promise<DashboardMetricsDto> => {
    return performApiRequest<DashboardMetricsDto>(
      "/analytics/metrics",
      { method: "GET" }
    );
  },

  ingestEvent: async (eventType: string, contentId: string) => {
    return performApiRequest(
      "/analytics/events",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          contentId,
          occurredAt: new Date().toISOString(),
        }),
      }
    );
  },

  fetchLatestWeeklyReport: async (): Promise<WeeklyReportDto> => {
    return performApiRequest<WeeklyReportDto>(
      "/analytics/report/latest",
      { method: "GET" }
    );
  },

  internalIngestEvent: async (eventType: string, contentId: string, userId?: string): Promise<{ eventId: string; status: string }> => {
    return performApiRequest<{ eventId: string; status: string }>(
      "/internal/events",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, contentId, userId, occurredAt: new Date().toISOString() })
      }
    );
  }
};

// ==========================================
// 5. NOTIFICATION SERVICE MODULE
// ==========================================

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferencesDto {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  eventPreferences: {
    [key: string]: boolean;
  };
}

export const notificationApi = {
  registerToken: async (token: string, platform = "web"): Promise<void> => {
    return performApiRequest<void>(
      "/notifications/register-token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, platform })
      }
    );
  },

  getNotifications: async (cursor?: string, limitCount = 20): Promise<{ items: NotificationDto[]; nextCursor?: string }> => {
    return performApiRequest<{ items: NotificationDto[]; nextCursor?: string }>(
      `/notifications?limit=${limitCount}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
      { method: "GET" }
    );
  },

  getPreferences: async (): Promise<NotificationPreferencesDto> => {
    return performApiRequest<NotificationPreferencesDto>(
      "/notifications/preferences",
      { method: "GET" }
    );
  },

  updatePreferences: async (prefs: Partial<NotificationPreferencesDto>): Promise<NotificationPreferencesDto> => {
    return performApiRequest<NotificationPreferencesDto>(
      "/notifications/preferences",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs)
      }
    );
  },

  markAsRead: async (id: string): Promise<NotificationDto> => {
    return performApiRequest<NotificationDto>(
      `/notifications/${id}/read`,
      { method: "PATCH" }
    );
  },

  internalEmit: async (userId: string, eventName: string, payload: any): Promise<void> => {
    return performApiRequest<void>(
      "/internal/emit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, eventName, payload })
      }
    );
  }
};

// ==========================================
// 6. CREATOR COACH & ONBOARDING SERVICE MODULE
// ==========================================

export interface CoachQuestionResponse {
  message: string;
  question: number; // 0 = category picker, 1-5 = question index
  category: string | null;
  chips: string[];
  chipLabels?: string[];
  multiSelect: boolean;
  totalQuestions: number;
  answeredCount: number;
  status: "category" | "not_started" | "in_progress" | "ready_for_plan" | "completed";
}

export interface CoachPlanResponse {
  message: string;
  category: string;
  onboardingCompleted: boolean;
  plan: {
    introMessage: string;
    days: Array<{
      day: string;
      icon: string;
      contentType: string;
      theme: string;
    }>;
    recommendedHashtags: string[];
    workspaceTheme: {
      primaryColor: string;
      motivationalQuote: string;
    };
  };
}

export const coachApi = {
  start: async (category?: string, reset = false): Promise<CoachQuestionResponse> => {
    return performApiRequest<CoachQuestionResponse>(
      "/coach/onboarding/start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, reset })
      }
    );
  },

  getStatus: async (): Promise<CoachQuestionResponse> => {
    return performApiRequest<CoachQuestionResponse>(
      "/coach/onboarding/status",
      { method: "GET" }
    );
  },

  answer: async (question: number, answer: string | string[]): Promise<CoachQuestionResponse> => {
    return performApiRequest<CoachQuestionResponse>(
      "/coach/onboarding/answer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer })
      }
    );
  },

  generatePlan: async (): Promise<CoachPlanResponse> => {
    return performApiRequest<CoachPlanResponse>(
      "/coach/onboarding/generate-plan",
      { method: "POST" }
    );
  },

  getChats: async (): Promise<any[]> => {
    return performApiRequest<any[]>(
      "/coach/chats",
      { method: "GET" }
    );
  },

  createChat: async (title: string): Promise<any> => {
    return performApiRequest(
      "/coach/chats",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      }
    );
  },

  getChatById: async (id: string): Promise<any> => {
    return performApiRequest(
      `/coach/chats/${id}`,
      { method: "GET" }
    );
  },

  sendMessage: async (chatId: string, message: string): Promise<any> => {
    return performApiRequest(
      `/coach/chats/${chatId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      }
    );
  },

  deleteChat: async (id: string): Promise<void> => {
    return performApiRequest<void>(
      `/coach/chats/${id}`,
      { method: "DELETE" }
    );
  }
};
