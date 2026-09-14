import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  RefreshCw,
  ZoomIn,
  Move,
  LayoutGrid,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { cn } from "../lib/utils";
import { AuthenticatedImage } from "./AuthenticatedImage";
import {
  contentApi,
  extractValidImageUrl,
  resolveBaseGatewayUrl,
  type ContentDto,
} from "../services/apiClient";
import { getAccessToken } from "../services/auth/authService";

export type PhotoUploadVariant = "avatar" | "cover";

interface PhotoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (photoDataUrl: string) => void;
  /** Avatar = circular crop; cover = rectangular banner crop. */
  variant?: PhotoUploadVariant;
}

type DialogMode = "choice" | "camera" | "library" | "preview";

function isImageLikeContent(item: ContentDto): boolean {
  const type = String(item.contentType || "").toLowerCase();
  if (type === "clip" || type === "video") return false;
  if (type === "image" || type === "meme") return true;
  if (item.memeSpec || item.style === "meme") return true;
  // Uploads / unknown still usable if they have a media URL
  return !!extractValidImageUrl(item);
}

/** Resolve gated `/content/.../media` (or public URL) into a same-origin blob URL for canvas crop. */
async function mediaSrcToObjectUrl(src: string): Promise<string> {
  const targetUrl = src.trim();
  if (!targetUrl) throw new Error("Empty media URL");
  if (targetUrl.startsWith("data:") || targetUrl.startsWith("blob:")) return targetUrl;

  const baseGateway = resolveBaseGatewayUrl();
  const isGatewayUrl =
    targetUrl.startsWith("/content/") ||
    targetUrl.startsWith("/api/gateway") ||
    targetUrl.startsWith(baseGateway) ||
    targetUrl.includes("/content/") ||
    /\/content\/[^/]+\/media/.test(targetUrl);

  let fetchUrl = targetUrl;
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
    if (!relativePath.startsWith("/")) relativePath = `/${relativePath}`;
    const token = getAccessToken();
    fetchUrl = `/api/gateway-proxy${relativePath}`;
    if (token && !fetchUrl.includes("token=")) {
      fetchUrl += `${fetchUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
    }
  }

  const res = await fetch(fetchUrl, { credentials: "include" });
  if (!res.ok) throw new Error(`Could not load library media (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

const AVATAR_FRAME = { w: 256, h: 256 };
/** Must match `.ui-profile-cover` aspect-[3/1] so preview framing maps 1:1 to the live cover. */
const COVER_FRAME = { w: 540, h: 180 };
const AVATAR_OUT = { w: 400, h: 400 };
const COVER_OUT = { w: 1500, h: 500 };

function coverScale(imgW: number, imgH: number, frameW: number, frameH: number) {
  return Math.max(frameW / imgW, frameH / imgH);
}

function clampOffset(
  offset: { x: number; y: number },
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number,
  zoom: number,
) {
  const scale = coverScale(imgW, imgH, frameW, frameH) * zoom;
  const dispW = imgW * scale;
  const dispH = imgH * scale;
  const maxX = Math.max(0, (dispW - frameW) / 2);
  const maxY = Math.max(0, (dispH - frameH) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

export function PhotoUploadDialog({
  isOpen,
  onClose,
  onSelect,
  variant = "avatar",
}: PhotoUploadDialogProps) {
  const isCover = variant === "cover";
  const designFrame = useMemo(
    () => (isCover ? COVER_FRAME : AVATAR_FRAME),
    [isCover],
  );
  const outSize = isCover ? COVER_OUT : AVATAR_OUT;

  const [mode, setMode] = useState<DialogMode>("choice");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [frameSize, setFrameSize] = useState(designFrame);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [libraryItems, setLibraryItems] = useState<ContentDto[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [pickingLibraryId, setPickingLibraryId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  offsetRef.current = offset;
  zoomRef.current = zoom;

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (mode === "camera" && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [mode, stream]);

  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setFrameSize(designFrame);
  }, [isOpen, variant, designFrame]);

  useEffect(() => {
    if (mode !== "preview" || !frameRef.current) return;
    const el = frameRef.current;
    const sync = () => {
      // clientWidth/Height = visible crop area (excludes border); getBoundingClientRect does not
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setFrameSize({ w, h });
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, variant, sourceUrl]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const reset = useCallback(() => {
    stopStream();
    revokeObjectUrl();
    setMode("choice");
    setSourceUrl(null);
    setError(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImgSize({ w: 0, h: 0 });
    setConfirming(false);
    setLibraryError(null);
    setPickingLibraryId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [stopStream, revokeObjectUrl]);

  const openLibrary = useCallback(async () => {
    setMode("library");
    setLibraryError(null);
    setLibraryLoading(true);
    try {
      // Same source as Content Library (includes uploaded references, not only studio generations).
      const items = await contentApi.getUserContentList(400);
      setLibraryItems((items || []).filter(isImageLikeContent));
    } catch (err) {
      console.error("Failed to load content library:", err);
      setLibraryError("Could not load your content library.");
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const pickFromLibrary = useCallback(
    async (item: ContentDto) => {
      const mediaSrc = extractValidImageUrl(item);
      if (!mediaSrc || pickingLibraryId) return;
      setPickingLibraryId(item.id);
      setLibraryError(null);
      try {
        const objectUrl = await mediaSrcToObjectUrl(mediaSrc);
        revokeObjectUrl();
        objectUrlRef.current = objectUrl.startsWith("blob:") ? objectUrl : null;
        setSourceUrl(objectUrl);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setImgSize({ w: 0, h: 0 });
        setMode("preview");
      } catch (err) {
        console.error("Failed to open library image:", err);
        setLibraryError("Could not open that creation. Try another one.");
      } finally {
        setPickingLibraryId(null);
      }
    },
    [pickingLibraryId, revokeObjectUrl],
  );

  const startCamera = async () => {
    try {
      setError(null);
      setMode("camera");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isCover ? 1280 : 720 },
          height: { ideal: isCover ? 720 : 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Unable to access camera. Please check permissions.");
      setMode("choice");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setSourceUrl(dataUrl);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setMode("preview");
    stopStream();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceUrl(event.target?.result as string);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    setImgSize({ w: iw, h: ih });
    setOffset(
      clampOffset({ x: 0, y: 0 }, iw, ih, frameSize.w, frameSize.h, zoomRef.current),
    );
  };

  const applyOffset = useCallback(
    (next: { x: number; y: number }, nextZoom = zoomRef.current) => {
      if (!imgSize.w) {
        setOffset(next);
        return;
      }
      setOffset(
        clampOffset(next, imgSize.w, imgSize.h, frameSize.w, frameSize.h, nextZoom),
      );
    },
    [imgSize, frameSize.w, frameSize.h],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    applyOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragStart.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleZoomChange = (v: number | number[]) => {
    const val = Array.isArray(v) ? v[0] : v;
    if (typeof val !== "number") return;
    setZoom(val);
    applyOffset(offsetRef.current, val);
  };

  const cropToDataUrl = (
    url: string,
    ox: number,
    oy: number,
    z: number,
    fw: number,
    fh: number,
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || fw <= 0 || fh <= 0) {
          resolve(null);
          return;
        }
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        canvas.width = outSize.w;
        canvas.height = outSize.h;

        const clamped = clampOffset({ x: ox, y: oy }, iw, ih, fw, fh, z);
        const scale = coverScale(iw, ih, fw, fh) * z;
        const dispW = iw * scale;
        const dispH = ih * scale;
        const imgLeft = (fw - dispW) / 2 + clamped.x;
        const imgTop = (fh - dispH) / 2 + clamped.y;

        // Source rect in natural image pixels (same math as the on-screen preview)
        let sx = -imgLeft / scale;
        let sy = -imgTop / scale;
        let sw = fw / scale;
        let sh = fh / scale;

        // Clamp to image bounds so drawImage never samples outside
        if (sx < 0) {
          sw += sx;
          sx = 0;
        }
        if (sy < 0) {
          sh += sy;
          sy = 0;
        }
        if (sx + sw > iw) sw = iw - sx;
        if (sy + sh > ih) sh = ih - sy;
        if (sw <= 0 || sh <= 0) {
          resolve(null);
          return;
        }

        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, outSize.w, outSize.h);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outSize.w, outSize.h);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const handleConfirm = async () => {
    if (!sourceUrl || confirming) return;
    setConfirming(true);
    try {
      // Re-measure visible frame at confirm time so export matches what the user sees
      const el = frameRef.current;
      const fw = el?.clientWidth || frameSize.w;
      const fh = el?.clientHeight || frameSize.h;
      const cropped = await cropToDataUrl(
        sourceUrl,
        offset.x,
        offset.y,
        zoom,
        fw,
        fh,
      );
      if (!cropped) return;
      onSelect(cropped);
      onClose();
      setTimeout(reset, 200);
    } finally {
      setConfirming(false);
    }
  };

  const displayScale =
    imgSize.w > 0
      ? coverScale(imgSize.w, imgSize.h, frameSize.w, frameSize.h) * zoom
      : 1;
  const dispW = imgSize.w * displayScale;
  const dispH = imgSize.h * displayScale;

  const title =
    mode === "camera"
      ? isCover
        ? "Capture Cover"
        : "Capture Photo"
      : mode === "library"
        ? "Choose from Library"
        : mode === "preview"
          ? isCover
            ? "Adjust Cover"
            : "Adjust Photo"
          : isCover
            ? "Cover Photo"
            : "Profile Photo";

  const description =
    mode === "library"
      ? "Pick a creation or uploaded reference from your Content Library, then crop it to fit."
      : mode === "preview"
        ? "Drag to reposition, use zoom to frame the shot, then confirm."
        : isCover
          ? "Upload a banner, take a photo, or reuse something from your library."
          : "Update your creator identity — camera, upload, or Content Library.";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setTimeout(reset, 200);
        }
      }}
    >
      <DialogContent
        className={cn(
          "bg-card border-border p-0 overflow-hidden",
          mode === "library" ? "sm:max-w-2xl" : isCover ? "sm:max-w-xl" : "sm:max-w-md",
        )}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-display font-bold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 min-h-[280px] flex flex-col items-center justify-center">
          {mode === "choice" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Button
                variant="outline"
                className="h-28 sm:h-32 flex flex-col gap-3 group bg-muted/20 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                onClick={startCamera}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase">
                  Take Photo
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-28 sm:h-32 flex flex-col gap-3 group bg-muted/20 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase">
                  Upload File
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-28 sm:h-32 flex flex-col gap-3 group bg-muted/20 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                onClick={() => void openLibrary()}
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <LayoutGrid size={24} />
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase">
                  From Library
                </span>
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {mode === "library" && (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Your images & memes
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-bold"
                  onClick={() => {
                    setLibraryError(null);
                    setMode("choice");
                  }}
                >
                  Back
                </Button>
              </div>

              {libraryLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="animate-spin text-primary" size={28} />
                  <p className="text-xs font-medium">Loading library…</p>
                </div>
              ) : libraryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <ImageIcon className="text-muted-foreground/40" size={36} />
                  <p className="text-sm font-medium text-muted-foreground max-w-sm">
                    {libraryError ||
                      "No images or memes in your library yet. Create something in Image Studio first."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-bold"
                    onClick={() => setMode("choice")}
                  >
                    Choose another option
                  </Button>
                </div>
              ) : (
                <>
                  {libraryError ? (
                    <p className="text-xs font-medium text-destructive text-center">{libraryError}</p>
                  ) : null}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                    {libraryItems.map((item) => {
                      const thumb = extractValidImageUrl(item);
                      const busy = pickingLibraryId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!!pickingLibraryId}
                          onClick={() => void pickFromLibrary(item)}
                          className={cn(
                            "relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/40 group transition-all",
                            "hover:border-primary/60 hover:ring-2 hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            busy && "opacity-70 ring-2 ring-primary",
                            pickingLibraryId && !busy && "opacity-40",
                          )}
                          title={item.title || item.caption || "Select"}
                        >
                          {thumb ? (
                            <AuthenticatedImage
                              src={thumb}
                              alt=""
                              disableRemoteFallback
                              className="!absolute !inset-0 !h-full !w-full !object-cover"
                              wrapperClassName="!absolute !inset-0 !h-full !w-full !aspect-auto !bg-muted"
                              placeholderAspectRatio="1 / 1"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ImageIcon size={18} className="text-muted-foreground" />
                            </div>
                          )}
                          {busy ? (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                              <Loader2 className="animate-spin text-white" size={20} />
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {mode === "camera" && (
            <div
              className={cn(
                "relative w-full rounded-xl overflow-hidden bg-black border border-border group",
                isCover ? "aspect-[3/1]" : "aspect-square",
              )}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 border-[2px] border-dashed border-white/20 pointer-events-none rounded-xl m-3" />

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 rounded-full"
                  onClick={reset}
                >
                  <X size={20} />
                </Button>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full bg-white hover:bg-white/90 text-black shadow-xl"
                  onClick={capturePhoto}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-black/10" />
                </Button>
                <div className="w-10" />
              </div>

              {error && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <RefreshCw size={32} className="text-destructive mb-4" />
                  <p className="text-sm font-bold text-foreground mb-4">{error}</p>
                  <Button onClick={startCamera} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {mode === "preview" && sourceUrl && (
            <div className="space-y-5 w-full flex flex-col items-center">
              <div
                ref={frameRef}
                className={cn(
                  // ring (not border) so clientWidth/Height === visible crop area
                  "relative overflow-hidden ring-4 ring-primary/25 shadow-2xl bg-muted touch-none select-none shrink-0 w-full box-border",
                  isCover ? "rounded-xl" : "rounded-full mx-auto",
                  dragging ? "cursor-grabbing" : "cursor-grab",
                )}
                style={{
                  maxWidth: designFrame.w,
                  aspectRatio: `${designFrame.w} / ${designFrame.h}`,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <img
                  src={sourceUrl}
                  alt=""
                  draggable={false}
                  onLoad={onImageLoad}
                  className="absolute max-w-none pointer-events-none"
                  style={
                    imgSize.w
                      ? {
                          width: dispW,
                          height: dispH,
                          left: (frameSize.w - dispW) / 2 + offset.x,
                          top: (frameSize.h - dispH) / 2 + offset.y,
                        }
                      : {
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          left: 0,
                          top: 0,
                        }
                  }
                />
                <div
                  className={cn(
                    "absolute inset-0 ring-1 ring-inset ring-black/15 pointer-events-none",
                    isCover ? "rounded-xl" : "rounded-full",
                  )}
                />
                <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none">
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/55 text-white text-[9px] font-bold px-2 py-1 backdrop-blur-sm">
                    <Move size={10} /> Drag to adjust
                  </span>
                </div>
              </div>

              <div className="w-full space-y-2 max-w-[480px]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ZoomIn size={12} /> Zoom
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.05}
                  onValueChange={handleZoomChange}
                />
              </div>

              <div className="flex gap-3 w-full max-w-[480px]">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 font-bold"
                  disabled={confirming}
                  onClick={() => {
                    revokeObjectUrl();
                    setSourceUrl(null);
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                    setImgSize({ w: 0, h: 0 });
                    setMode("choice");
                  }}
                >
                  <RotateCcw size={16} />
                  Choose again
                </Button>
                <Button
                  className="flex-1 gap-2 font-bold"
                  disabled={confirming}
                  onClick={() => void handleConfirm()}
                >
                  <Check size={16} />
                  {confirming ? "Saving…" : "Use Photo"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
        <DialogFooter className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
