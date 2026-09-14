import React, { useState, useEffect, useRef } from "react";
import { getAccessToken } from "../services/auth/authService";
import { resolveBaseGatewayUrl } from "../services/apiClient";
import { cn } from "../lib/utils";
import nxclipLogo from "../contents/images/nexa-logo.png";
import { MediaTileLoadingPlaceholder } from "./MediaTileLoadingPlaceholder";

export interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  /** When true, never swap to the default Unsplash fallback (use empty/placeholder instead). */
  disableRemoteFallback?: boolean;
  priority?: boolean;
  blurDataURL?: string;
  wrapperClassName?: string;
  alt?: string;
  /** ms before a hanging media request is treated as failed (default 12000). */
  loadTimeoutMs?: number;
  /** CSS aspect-ratio used while loading / failed (e.g. "9 / 16"). */
  placeholderAspectRatio?: string;
  /** Smaller shimmer for list-row thumbnails */
  loadingCompact?: boolean;
}

const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";
const DEFAULT_BLUR_PLACEHOLDER = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%2318181b'/%3E%3Cpath d='M0 0h16v9H0z' fill='%2327272a' filter='blur(2px)'/%3E%3C/svg%3E";
const DEFAULT_LOAD_TIMEOUT_MS = 12000;
const TOKEN_WAIT_ATTEMPTS = 12;
const TOKEN_WAIT_INTERVAL_MS = 250;

export function AuthenticatedImage({
  src,
  fallbackSrc,
  disableRemoteFallback = false,
  className,
  wrapperClassName,
  alt,
  onError,
  onLoad,
  priority = false,
  blurDataURL,
  loadTimeoutMs = DEFAULT_LOAD_TIMEOUT_MS,
  placeholderAspectRatio = "1 / 1",
  loadingCompact = false,
  ...props
}: AuthenticatedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const notifyError = (e?: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (onErrorRef.current) {
      onErrorRef.current((e || ({} as React.SyntheticEvent<HTMLImageElement, Event>)));
    }
  };

  useEffect(() => {
    setIsLoaded(false);
    setFailed(false);
    setRetryCount(0);

    if (!src) {
      if (disableRemoteFallback) {
        setResolvedSrc(undefined);
        setFailed(true);
        notifyError();
        return;
      }
      setResolvedSrc(fallbackSrc || DEFAULT_FALLBACK_IMAGE);
      return;
    }

    const baseGateway = resolveBaseGatewayUrl();
    const targetUrl = src.trim();

    const isGatewayUrl =
      targetUrl.startsWith("/content/") ||
      targetUrl.startsWith("/api/gateway") ||
      targetUrl.startsWith(baseGateway) ||
      targetUrl.includes("api-gateway-") ||
      targetUrl.includes("/content/") ||
      targetUrl.includes("nxclip.ai") ||
      /\/content\/[^/]+\/media/.test(targetUrl);

    if (isGatewayUrl) {
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

      // Auth may still be hydrating on first paint. Firing the request without a
      // token yields a 401 the <img> can never recover from, so wait briefly.
      let cancelled = false;
      let tokenWaits = 0;

      const resolveWithToken = () => {
        if (cancelled) return;
        const token = getAccessToken();
        if (!token && tokenWaits < TOKEN_WAIT_ATTEMPTS) {
          tokenWaits += 1;
          window.setTimeout(resolveWithToken, TOKEN_WAIT_INTERVAL_MS);
          return;
        }

        let proxyUrl = `/api/gateway-proxy${relativePath}`;
        if (token && !proxyUrl.includes("token=")) {
          const separator = proxyUrl.includes("?") ? "&" : "?";
          proxyUrl = `${proxyUrl}${separator}token=${encodeURIComponent(token)}`;
        }
        setResolvedSrc(proxyUrl);
      };

      resolveWithToken();
      return () => {
        cancelled = true;
      };
    }

    setResolvedSrc(targetUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-resolve when src inputs change
  }, [src, fallbackSrc, disableRemoteFallback]);

  // Hang protection: media that never loads/errors still collapses masonry tiles
  useEffect(() => {
    if (!resolvedSrc || isLoaded || failed || loadTimeoutMs <= 0) return;
    const timer = window.setTimeout(() => {
      // One automatic retry for gated media (large hybrid SVGs often need a second pass).
      if (retryCount < 1 && disableRemoteFallback && resolvedSrc.includes("/api/gateway-proxy")) {
        setRetryCount((n) => n + 1);
        setIsLoaded(false);
        setFailed(false);
        const sep = resolvedSrc.includes("?") ? "&" : "?";
        setResolvedSrc(`${resolvedSrc}${sep}_retry=${Date.now()}`);
        return;
      }
      setFailed(true);
      if (disableRemoteFallback) {
        setResolvedSrc(undefined);
      }
      notifyError();
    }, loadTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [resolvedSrc, isLoaded, failed, loadTimeoutMs, disableRemoteFallback, retryCount]);

  useEffect(() => {
    if (priority && resolvedSrc) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = resolvedSrc;
      document.head.appendChild(link);
      return () => {
        try {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        } catch {
          // ignore cleanup errors
        }
      };
    }
  }, [priority, resolvedSrc]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      setFailed(false);
      // Cached images may not fire onLoad again — still notify consumers (e.g. Studio previewReady).
      if (onLoad) {
        onLoad({ currentTarget: imgRef.current } as React.SyntheticEvent<HTMLImageElement, Event>);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire when src resolves; onLoad identity ignored
  }, [resolvedSrc]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (
      disableRemoteFallback &&
      retryCount < 1 &&
      resolvedSrc &&
      resolvedSrc.includes("/api/gateway-proxy")
    ) {
      setRetryCount((n) => n + 1);
      setIsLoaded(false);
      setFailed(false);
      const sep = resolvedSrc.includes("?") ? "&" : "?";
      setResolvedSrc(`${resolvedSrc}${sep}_retry=${Date.now()}`);
      return;
    }
    if (disableRemoteFallback) {
      setFailed(true);
      setResolvedSrc(undefined);
    } else {
      const fallback = fallbackSrc || DEFAULT_FALLBACK_IMAGE;
      if (resolvedSrc !== fallback) {
        setResolvedSrc(fallback);
      }
    }
    notifyError(e);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    // Raster broken-image handlers can fire load with 0×0; meme SVGs from /media
    // sometimes report 0 briefly in some browsers — still accept the load event.
    if (!img.naturalWidth || !img.naturalHeight) {
      const hint = img.currentSrc || resolvedSrc || "";
      const likelySvgMedia = /\/media\b|\.svg(\?|$)/i.test(hint);
      if (!likelySvgMedia) {
        handleImageError(e);
        return;
      }
    }
    setIsLoaded(true);
    setFailed(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  const showFailedPlaceholder = disableRemoteFallback && failed;
  const showLoadingPlaceholder = !isLoaded && !failed;
  const isAbsoluteFill = /\b(?:!?absolute|inset-0)\b/.test(wrapperClassName || "");
  const reserveTileSpace = (!isLoaded || (failed && disableRemoteFallback)) && !isAbsoluteFill;

  return (
    <div
      className={cn(
        "relative overflow-hidden w-full",
        !reserveTileSpace && !showLoadingPlaceholder && "bg-zinc-900/60 h-full",
        wrapperClassName,
        reserveTileSpace && "!h-auto bg-[#6b7280]",
        isAbsoluteFill && failed && disableRemoteFallback && "bg-[#6b7280]",
      )}
      style={
        reserveTileSpace
          ? { aspectRatio: placeholderAspectRatio }
          : undefined
      }
    >
      {showLoadingPlaceholder ? <MediaTileLoadingPlaceholder compact={loadingCompact} /> : null}

      {showFailedPlaceholder ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none bg-[#6b7280]">
          <img
            src={nxclipLogo}
            alt=""
            className="w-[72px] h-[72px] object-contain grayscale brightness-125 contrast-75 opacity-55 select-none"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        </div>
      ) : null}

      {!isLoaded && !failed && !disableRemoteFallback && (
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-zinc-900/80 pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-70 transition-opacity duration-500"
            style={{
              backgroundImage: `url(${blurDataURL || resolvedSrc || DEFAULT_BLUR_PLACEHOLDER})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/80 via-zinc-900/40 to-zinc-950/80 animate-pulse" />
        </div>
      )}

      {resolvedSrc && !failed && (
        <img
          ref={imgRef}
          src={resolvedSrc}
          className={cn(
            "relative z-[2] transition-all duration-500 ease-out",
            !isLoaded ? "opacity-0" : "opacity-100",
            className,
          )}
          alt={alt || "Post image"}
          loading={priority || src.startsWith("blob:") ? "eager" : "lazy"}
          fetchPriority={priority || src.startsWith("blob:") ? "high" : "auto"}
          onLoad={handleImageLoad}
          onError={handleImageError}
          {...props}
        />
      )}
    </div>
  );
}
