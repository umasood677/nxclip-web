import { getAccessToken } from "../services/auth/authService";
import { resolveBaseGatewayUrl } from "../services/apiClient";

/** Build a same-origin gateway-proxy URL with JWT when available. */
export function buildGatewayProxyUrl(src: string, retryToken?: number): string {
  const targetUrl = src.trim();
  if (!targetUrl) return "";

  const baseGateway = resolveBaseGatewayUrl();
  const isGatewayUrl =
    targetUrl.startsWith("/content/") ||
    targetUrl.startsWith("/api/gateway") ||
    targetUrl.startsWith(baseGateway) ||
    targetUrl.includes("api-gateway-") ||
    targetUrl.includes("/content/") ||
    targetUrl.includes("nxclip.ai") ||
    /\/content\/[^/]+\/media/.test(targetUrl);

  if (!isGatewayUrl) {
    return targetUrl;
  }

  let relativePath = targetUrl;
  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    try {
      const u = new URL(targetUrl);
      relativePath = u.pathname + u.search;
    } catch {
      relativePath = targetUrl.replace(/https?:\/\/[^/]+/, "");
    }
  }
  if (!relativePath.startsWith("/")) {
    relativePath = `/${relativePath}`;
  }

  let proxyUrl = `/api/gateway-proxy${relativePath}`;
  const token = getAccessToken();
  if (token && !proxyUrl.includes("token=")) {
    const separator = proxyUrl.includes("?") ? "&" : "?";
    proxyUrl = `${proxyUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  if (retryToken != null) {
    const separator = proxyUrl.includes("?") ? "&" : "?";
    proxyUrl = `${proxyUrl}${separator}_retry=${retryToken}`;
  }
  return proxyUrl;
}

export function resolveContentMediaPath(contentId?: string | null): string {
  if (!contentId) return "";
  return `/content/${contentId}/media`;
}
