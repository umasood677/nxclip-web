import React, { useEffect, useRef, useState } from "react";
import {
  contentApi,
  resolveBaseGatewayUrl,
  type ContentDto,
} from "../../../services/apiClient";
import { getAccessToken } from "../../../services/auth/authService";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import {
  selectableBrandImage,
  readLibraryImageFile,
} from "../lib/contentLibraryAsset";
function LibraryThumbnail({ id, title }: { id: string; title: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true,
      objectUrl = "",
      started = false;
    setUrl("");
    setFailed(false);
    const load = () => {
      if (started) return;
      started = true;
      void readLibraryImageFile(
        id,
        getAccessToken() || "",
        resolveBaseGatewayUrl(),
      )
        .then((file) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(file);
          setUrl(objectUrl);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                load();
                observer?.disconnect();
              }
            },
            { rootMargin: "120px" },
          )
        : null;
    if (observer && host.current) observer.observe(host.current);
    else load();
    return () => {
      active = false;
      observer?.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return (
    <div
      ref={host}
      className="flex items-center justify-center w-full h-28 bg-muted/30"
    >
      {url ? (
        <img src={url} alt={title} className="w-full h-28 object-contain" />
      ) : (
        <span className="text-xs text-muted-foreground px-2">
          {failed ? "Preview unavailable" : "Loading preview…"}
        </span>
      )}
    </div>
  );
}
export function BrandContentLibraryPicker({
  roleLabel,
  onClose,
  onSelect,
}: {
  roleLabel: string;
  onClose: () => void;
  onSelect: (file: File) => Promise<void>;
}) {
  const [items, setItems] = useState<ContentDto[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(100),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void contentApi
      .getUserContentList(limit, undefined, { excludeUploads: false })
      .then((result) => {
        if (!cancelled) setItems(result.filter(selectableBrandImage));
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Content Library could not be loaded. Your existing Brand Kit assets are unchanged.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit, retry]);
  async function attach() {
    if (!selected || !consent) return;
    setBusy(true);
    setError("");
    try {
      const file = await readLibraryImageFile(
        selected,
        getAccessToken() || "",
        resolveBaseGatewayUrl(),
      );
      await onSelect(file);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image could not be attached.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select from your Content Library</DialogTitle>
          <DialogDescription>
            Attach an existing image as {roleLabel}. This copies its original
            image into this Brand Kit through the secure upload flow. The source
            content stays unchanged. It does not approve the image for
            generation.
          </DialogDescription>
        </DialogHeader>
        <input
          aria-label="Search Content Library images"
          className="rounded-md border bg-background p-2"
          placeholder="Search your images…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {error && (
          <div role="alert">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
              Retry
            </Button>
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-3 gap-3" aria-label="Loading images">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items
              .filter((item) =>
                item.title?.toLowerCase().includes(query.toLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.id}
                  disabled={busy}
                  aria-pressed={selected === item.id}
                  className={`rounded-lg border overflow-hidden text-left ${selected === item.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    setSelected(item.id);
                    setConsent(false);
                  }}
                >
                  <LibraryThumbnail
                    id={item.id}
                    title={item.title || "Content Library image"}
                  />
                  <span className="block p-2 text-xs truncate">
                    {item.title || "Untitled image"}
                  </span>
                </button>
              ))}
          </div>
        )}
        {!loading && !items.length && !error && (
          <p className="text-sm text-muted-foreground">
            No image candidates in the loaded library. Upload an authorized
            image, or load more of your content.
          </p>
        )}
        <Button
          variant="outline"
          disabled={loading || busy || limit >= 1000}
          onClick={() => setLimit((v) => v + 100)}
        >
          Load more of my content
        </Button>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            disabled={!selected || busy}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I have permission to use this image for this Brand Kit.
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected || !consent || busy}
            onClick={() => void attach()}
          >
            {busy ? "Attaching…" : "Attach selected image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
