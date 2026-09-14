import React, { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "../lib/utils";
import { resolveContentKind } from "../lib/contentKind";
import { buildGatewayProxyUrl } from "../lib/authenticatedMediaUrl";
import { AuthenticatedImage, type AuthenticatedImageProps } from "./AuthenticatedImage";
import { MediaTileLoadingPlaceholder } from "./MediaTileLoadingPlaceholder";
import { getAccessToken } from "../services/auth/authService";

const TOKEN_WAIT_ATTEMPTS = 12;
const TOKEN_WAIT_INTERVAL_MS = 250;
const DEFAULT_VIDEO_TIMEOUT_MS = 15000;

export type AuthenticatedMediaPreviewProps = Omit<
  AuthenticatedImageProps,
  "src" | "onLoad"
> & {
  src: string;
  /** When auto, uses resolveContentKind(item) — clips render as video, not img. */
  kind?: "auto" | "image" | "video";
  item?: Parameters<typeof resolveContentKind>[0];
  onLoad?: React.ReactEventHandler<HTMLImageElement | HTMLVideoElement>;
  showPlayBadge?: boolean;
  /** Smaller shimmer for list-row thumbnails */
  loadingCompact?: boolean;
};

function useGatewayMediaUrl(src: string, enabled: boolean): {
  url?: string;
  waiting: boolean;
} {
  const [url, setUrl] = useState<string | undefined>();
  const [waiting, setWaiting] = useState(enabled);

  useEffect(() => {
    if (!enabled || !src) {
      setUrl(undefined);
      setWaiting(false);
      return;
    }

    let cancelled = false;
    let tokenWaits = 0;

    const resolve = () => {
      if (cancelled) return;
      const token = getAccessToken();
      if (!token && tokenWaits < TOKEN_WAIT_ATTEMPTS) {
        tokenWaits += 1;
        window.setTimeout(resolve, TOKEN_WAIT_INTERVAL_MS);
        return;
      }
      setUrl(buildGatewayProxyUrl(src));
      setWaiting(false);
    };

    setWaiting(true);
    resolve();
    return () => {
      cancelled = true;
    };
  }, [src, enabled]);

  return { url, waiting };
}

function AuthenticatedVideoPreview({
  src,
  className,
  wrapperClassName,
  alt,
  priority,
  loadTimeoutMs = DEFAULT_VIDEO_TIMEOUT_MS,
  onClick,
  onLoad,
  onError,
  showPlayBadge = true,
  loadingCompact = false,
}: AuthenticatedMediaPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { url, waiting } = useGatewayMediaUrl(src, !failed);
  const resolvedUrl = url
    ? retryCount > 0
      ? buildGatewayProxyUrl(src, retryCount)
      : url
    : undefined;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setRetryCount(0);
  }, [src]);

  useEffect(() => {
    if (!resolvedUrl || loaded || failed || loadTimeoutMs <= 0) return;
    const timer = window.setTimeout(() => {
      if (retryCount < 1) {
        setRetryCount(1);
        return;
      }
      setFailed(true);
      onError?.({} as React.SyntheticEvent<HTMLVideoElement, Event>);
    }, loadTimeoutMs);
    return () => window.clearTimeout(timer);
  }, [resolvedUrl, loaded, failed, loadTimeoutMs, retryCount, onError]);

  const handleLoaded = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const el = e.currentTarget;
    try {
      if (el.readyState >= 1 && el.duration > 0.15) {
        el.currentTime = Math.min(0.12, el.duration * 0.05);
      }
    } catch {
      /* seek for poster frame — best effort */
    }
    setLoaded(true);
    onLoad?.(e);
  };

  return (
    <div
      className={cn("relative overflow-hidden", wrapperClassName)}
      onClick={onClick}
    >
      {(waiting || (!loaded && !failed)) ? (
        <MediaTileLoadingPlaceholder compact={loadingCompact} />
      ) : null}
      {resolvedUrl && !failed ? (
        <video
          ref={videoRef}
          key={resolvedUrl}
          src={resolvedUrl}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            !loaded ? "opacity-0" : "opacity-100",
            className,
          )}
          muted
          playsInline
          preload={priority ? "auto" : "metadata"}
          aria-label={alt}
          onLoadedData={handleLoaded}
          onError={(e) => {
            if (retryCount < 1) {
              setRetryCount(1);
              return;
            }
            setFailed(true);
            onError?.(e);
          }}
        />
      ) : null}
      {showPlayBadge && loaded && !failed ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/20">
            <Play size={18} className="ml-0.5 fill-white" />
          </div>
        </div>
      ) : null}
      {waiting && !resolvedUrl ? (
        <span className="sr-only">Loading clip preview</span>
      ) : null}
    </div>
  );
}

/** Image or clip video preview for library / feed tiles. */
export function AuthenticatedMediaPreview({
  kind = "auto",
  item,
  showPlayBadge,
  loadingCompact,
  ...props
}: AuthenticatedMediaPreviewProps) {
  const resolvedKind =
    kind === "auto" ? (item && resolveContentKind(item) === "clip" ? "video" : "image") : kind;

  if (resolvedKind === "video") {
    return (
      <AuthenticatedVideoPreview
        {...props}
        loadingCompact={loadingCompact}
        showPlayBadge={showPlayBadge ?? true}
      />
    );
  }

  return (
    <AuthenticatedImage
      {...props}
      loadingCompact={loadingCompact}
      onLoad={props.onLoad as AuthenticatedImageProps["onLoad"]}
    />
  );
}
