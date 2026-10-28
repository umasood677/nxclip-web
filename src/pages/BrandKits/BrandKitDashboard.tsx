import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Copy as CopyIcon,
  Download,
  FileJson,
  Megaphone,
  Palette,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { SEO } from "../../components/SEO";
import { brandApi } from "../../services/apiClient";
import { BrandKitCard } from "./components/BrandKitCard";
import { BrandKitImportDialog } from "./components/BrandKitImportDialog";
import { Skeleton } from "../../components/ui/skeleton";
import "../AdStudio/uxPreview/preview.css";
import "../AdStudio/styles/production-theme.css";
import "./guided/brandKitLibrary.css";
import {
  downloadJson,
  exportBrandKit,
  exportBrandKitBundle,
  safeExportFilename,
  stringifyExport,
} from "./lib/brandKitExport";
import { duplicateBrandKit } from "./lib/duplicateBrandKit";
import type { BrandKitSummary } from "./lib/brandKitTypes";

export default function BrandKitDashboard() {
  const navigate = useNavigate();
  const [kits, setKits] = useState<BrandKitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadKits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await brandApi.listKits();
      setKits((res.items ?? []) as BrandKitSummary[]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load Brand Kits";
      setError(message);
      setKits([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKits();
  }, [loadKits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kits;
    return kits.filter((k) => {
      const hay = [
        k.name,
        k.description,
        k.voice?.industry,
        k.voice?.tagline,
        k.guidelines,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [kits, query]);

  const selectedKits = useMemo(
    () => kits.filter((k) => selectedIds.has(k.id)),
    [kits, selectedIds],
  );

  const upsertKits = (incoming: BrandKitSummary[]) => {
    setKits((prev) => {
      const map = new Map(prev.map((k) => [k.id, k]));
      for (const kit of incoming) map.set(kit.id, kit);
      return Array.from(map.values());
    });
  };

  const onDuplicate = async (kit: BrandKitSummary) => {
    setBusyId(kit.id);
    try {
      const copy = await duplicateBrandKit(kit);
      setKits((prev) => [copy, ...prev]);
      toast.success(`Duplicated as “${copy.name}”`);
      navigate(`/brands/${copy.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to duplicate");
    } finally {
      setBusyId(null);
    }
  };

  const onArchive = async (kit: BrandKitSummary) => {
    setBusyId(kit.id);
    try {
      const updated = (await brandApi.updateKit(kit.id, {
        status: "archived",
      })) as BrandKitSummary;
      setKits((prev) => prev.map((k) => (k.id === kit.id ? updated : k)));
      toast.success("Brand Kit archived");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (kit: BrandKitSummary) => {
    if (
      !window.confirm(
        `Delete “${kit.name}”? This soft-deletes the kit. Creatives that already snapshotted the brand are unchanged.`,
      )
    ) {
      return;
    }
    setBusyId(kit.id);
    try {
      await brandApi.deleteKit(kit.id);
      setKits((prev) => prev.filter((k) => k.id !== kit.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(kit.id);
        return next;
      });
      toast.success("Brand Kit deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  };

  const onExportOne = async (kit: BrandKitSummary) => {
    try {
      const full = (await brandApi.getKit(kit.id)) as BrandKitSummary;
      const json = stringifyExport(exportBrandKit(full));
      downloadJson(`${safeExportFilename(full.name)}.brand-kit.json`, json);
      toast.success("Exported Brand Kit JSON");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const onExportSelected = async () => {
    const targets = selectedKits.length ? selectedKits : kits;
    if (!targets.length) {
      toast.error("No Brand Kits to export");
      return;
    }
    try {
      const full = await Promise.all(
        targets.map((k) => brandApi.getKit(k.id) as Promise<BrandKitSummary>),
      );
      if (full.length === 1) {
        downloadJson(
          `${safeExportFilename(full[0]!.name)}.brand-kit.json`,
          stringifyExport(exportBrandKit(full[0]!)),
        );
      } else {
        downloadJson(
          `nxclip-brand-kits.json`,
          stringifyExport(exportBrandKitBundle(full)),
        );
      }
      toast.success(
        `Exported ${full.length} kit${full.length === 1 ? "" : "s"}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const onCopySelected = async () => {
    const targets = selectedKits.length ? selectedKits : kits;
    if (!targets.length) return;
    try {
      const full = await Promise.all(
        targets.map((k) => brandApi.getKit(k.id) as Promise<BrandKitSummary>),
      );
      const payload =
        full.length === 1
          ? exportBrandKit(full[0]!)
          : exportBrandKitBundle(full);
      await navigator.clipboard.writeText(stringifyExport(payload));
      toast.success("Copied JSON to clipboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Copy failed");
    }
  };

  const toggleSelect = (kit: BrandKitSummary) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(kit.id)) next.delete(kit.id);
      else next.add(kit.id);
      return next;
    });
  };

  return (
    <div className="xp-root nxclip-production bk-library space-y-6">
      <SEO title="Brand Kit Studio | NxClip" />

      <section className="bk-library-hero">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 text-primary">
              <Palette size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                Brand Kit Studio
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-foreground leading-[1.1]">
              A home for every brand you build.
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Your identity, products and creative direction — together in one
              place. Open any Brand Kit to refine its palette, voice and asset
              library.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/create/ad">
                <Megaphone size={16} className="mr-2" /> Ad Studio
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <FileJson size={16} className="mr-2" /> Import JSON
            </Button>
            <Button type="button" className="bk-create-brand" onClick={() => navigate("/brands/new")}>
              <Plus size={16} className="mr-2" /> Create Brand Kit
            </Button>
          </div>
        </div>
      </section>

      {!loading && !error && kits.length>0 && <div className="bk-library-summary" aria-label="Brand library overview"><div><strong>{kits.length}</strong><span>Brand identities</span></div><div><strong>{kits.reduce((total,kit)=>total+(kit.assets?.filter(asset=>asset.status==="ready").length||0),0)}</strong><span>Uploaded assets</span></div><div><strong>{kits.filter(kit=>kit.typography?.length).length}</strong><span>With typography</span></div>{import.meta.env.DEV && <Link to="/create/ad/uat">Open UAT checklist →</Link>}</div>}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, industry, tagline…"
            className="pl-9"
            aria-label="Search Brand Kits"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground mr-1">
            {loading
              ? "…"
              : `${filtered.length} kit${filtered.length === 1 ? "" : "s"}`}
            {selectedIds.size ? ` · ${selectedIds.size} selected` : ""}
            {busyId ? " · Working…" : ""}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!kits.length}
            onClick={() => void onExportSelected()}
          >
            <Download size={14} className="mr-1" />
            {selectedIds.size ? "Export selected" : "Export all"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!kits.length}
            onClick={() => void onCopySelected()}
          >
            <CopyIcon size={14} className="mr-1" /> Copy JSON
          </Button>
        </div>
      </div>

      {loading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading Brand Kits"
          aria-busy="true"
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-border glass p-8 text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadKits()}
          >
            Retry
          </Button>
        </div>
      ) : !kits.length ? (
        <div className="rounded-2xl border border-dashed border-border glass p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette size={22} />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold">
              No Brand Kits yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Build your identity step by step or import
              your own compatible Brand Kit JSON.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" className="bk-create-brand" onClick={() => navigate("/brands/new")}>
              <Plus size={16} className="mr-1" /> Create
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              Import JSON
            </Button>
          </div>
        </div>
      ) : !filtered.length ? (
        <div className="rounded-2xl border border-border glass p-8 text-center text-sm text-muted-foreground">
          No kits match “{query}”.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((kit) => (
            <BrandKitCard
              key={kit.id}
              kit={kit}
              selected={selectedIds.has(kit.id)}
              onToggleSelect={toggleSelect}
              onDuplicate={(k) => void onDuplicate(k)}
              onArchive={(k) => void onArchive(k)}
              onDelete={(k) => void onDelete(k)}
              onExport={(k) => void onExportOne(k)}
            />
          ))}
        </div>
      )}

      <BrandKitImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingKits={kits}
        onImported={(incoming) => {
          upsertKits(incoming);
          if (incoming[0]?.id) navigate(`/brands/${incoming[0].id}`);
        }}
      />

    </div>
  );
}
