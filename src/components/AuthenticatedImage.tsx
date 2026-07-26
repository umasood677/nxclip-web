import React, { useState, useEffect, useRef } from "react";
import { getAccessToken } from "../services/auth/authService";
import { resolveBaseGatewayUrl } from "../services/apiClient";
import { cn } from "../lib/utils";

export interface AuthenticatedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  priority?: boolean;
  blurDataURL?: string;
  wrapperClassName?: string;
  alt?: string;
}

const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";
const DEFAULT_BLUR_PLACEHOLDER = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%2318181b'/%3E%3Cpath d='M0 0h16v9H0z' fill='%2327272a' filter='blur(2px)'/%3E%3C/svg%3E";

export function AuthenticatedImage({
  src,
  fallbackSrc,
  className,
  wrapperClassName,
  alt,
  onError,
  onLoad,
  priority = false,
  blurDataURL,
  ...props
}: AuthenticatedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoaded(false);

    if (!src) {
      setResolvedSrc(fallbackSrc || DEFAULT_FALLBACK_IMAGE);
      return;
    }

    const baseGateway = resolveBaseGatewayUrl();
    const targetUrl = src.trim();

    // Check if this is a gateway or content API URL requiring proxying / authentication
    const isGatewayUrl =
      targetUrl.startsWith("/content/") ||
      targetUrl.startsWith("/api/gateway") ||
      targetUrl.startsWith(baseGateway) ||
      targetUrl.includes("api-gateway-") ||
      targetUrl.includes("nxclip.ai");

    if (isGatewayUrl) {
      let relativePath = targetUrl;
      if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
        relativePath = targetUrl.replace(/https?:\/\/[^\/]+/, "");
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

      setResolvedSrc(proxyUrl);
      return;
    }

    setResolvedSrc(targetUrl);
  }, [src, fallbackSrc]);

  // Priority preloading effect for top-of-page images
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

  // Instantly mark as loaded if image is already cached in memory
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [resolvedSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const fallback = fallbackSrc || DEFAULT_FALLBACK_IMAGE;
    if (resolvedSrc !== fallback) {
      setResolvedSrc(fallback);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <div className={cn("relative overflow-hidden bg-zinc-900/60 w-full h-full", wrapperClassName)}>
      {/* Blur-up Placeholder / Skeleton background */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-zinc-900/80 pointer-events-none">
          <div 
            className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-70 transition-opacity duration-500"
            style={{
              backgroundImage: `url(${blurDataURL || resolvedSrc || DEFAULT_BLUR_PLACEHOLDER})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/80 via-zinc-900/40 to-zinc-950/80 animate-pulse" />
        </div>
      )}

      {resolvedSrc && (
        <img
          ref={imgRef}
          src={resolvedSrc}
          className={cn(
            "relative z-[1] transition-all duration-500 ease-out",
            !isLoaded ? "opacity-0 blur-md scale-[1.03]" : "opacity-100 blur-0 scale-100",
            className
          )}
          alt={alt || "Post image"}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleImageLoad}
          onError={handleImageError}
          {...props}
        />
      )}
    </div>
  );
}



