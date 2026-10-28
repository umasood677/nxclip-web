import { BRAND_KIT_JSON_SAMPLE } from "../lib/brandKitJsonSample";
import { downloadJson, stringifyExport } from "../lib/brandKitExport";
import React, { useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import { brandApi } from "../../../services/apiClient";
import {
  executeBrandKitImport,
  type ImportKitPlan,
  type ImportKitResult,
} from "../lib/brandKitExecuteImport";
import { isImportable, mapImportDocument } from "../lib/brandKitImportMap";
import { parseBrandKitJsonText, readJsonFile } from "../lib/brandKitSafeJson";
import type { BrandKitSummary } from "../lib/brandKitTypes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingKits: BrandKitSummary[];
  onImported: (kits: BrandKitSummary[]) => void;
};

type Step = "input" | "preview" | "results";

export function BrandKitImportDialog({
  open,
  onOpenChange,
  existingKits,
  onImported,
}: Props) {
  const [step, setStep] = useState<Step>("input");
  const [paste, setPaste] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [plans, setPlans] = useState<ImportKitPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportKitResult[]>([]);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setStep("input");
    setPaste("");
    setParseError(null);
    setPlans([]);
    setResults([]);
    setBusy(false);
  };

  const findExisting = (name: string) =>
    existingKits.find(
      (k) => k.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  const applyParsed = (value: unknown) => {
    const mapped = mapImportDocument(value);
    if (!mapped.length) {
      setParseError("No Brand Kits found in JSON");
      return;
    }
    setPlans(
      mapped.map((m) => {
        const existing = findExisting(m.portable.brand.name);
        return {
          mapped: m,
          selected: isImportable(m),
          mode: "create" as const,
          existingId: existing?.id,
        };
      }),
    );
    setParseError(null);
    setStep("preview");
  };

  const onParsePaste = () => {
    const parsed = parseBrandKitJsonText(paste);
    if (parsed.ok === false) {
      setParseError(parsed.error);
      return;
    }
    applyParsed(parsed.value);
  };

  const onFile = async (file: File) => {
    const parsed = await readJsonFile(file);
    if (parsed.ok === false) {
      setParseError(parsed.error);
      toast.error(parsed.error);
      return;
    }
    setPaste(JSON.stringify(parsed.value, null, 2).slice(0, 200_000));
    applyParsed(parsed.value);
  };

  const selectedCount = plans.filter((p) => p.selected).length;
  const updateConflicts = useMemo(
    () =>
      plans.filter((p) => p.selected && p.mode === "update" && p.existingId)
        .length,
    [plans],
  );

  const runImport = async () => {
    if (!selectedCount) {
      toast.error("Select at least one kit to import");
      return;
    }
    const dangerous = plans.filter(
      (p) => p.selected && p.mode === "update" && !p.existingId,
    );
    if (dangerous.length) {
      toast.error("Update mode requires a matching existing kit");
      return;
    }
    if (updateConflicts > 0) {
      const ok = window.confirm(
        `You chose to update ${updateConflicts} existing Brand Kit(s). This overwrites name, voice, colors, and typography. Continue?`,
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      const importResults = await executeBrandKitImport(plans);
      setResults(importResults);
      setStep("results");

      const createdIds = importResults
        .filter((r) => r.status === "success" && r.kitId)
        .map((r) => r.kitId!);
      if (createdIds.length) {
        const refreshed: BrandKitSummary[] = [];
        for (const id of createdIds) {
          refreshed.push((await brandApi.getKit(id)) as BrandKitSummary);
        }
        onImported(refreshed);
      }
      const ok = importResults.filter((r) => r.status === "success").length;
      const fail = importResults.filter((r) => r.status === "failed").length;
      toast.message(`Import finished: ${ok} ok, ${fail} failed`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Brand Kits</DialogTitle>
          <DialogDescription>
            Upload or paste JSON (canonical NxClip format or seed format).
            Assets require re-upload after import — URLs and IDs are never
            fetched.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border p-3 text-sm">
          <p>
            Need a compatible format? Replace the sample fields with your own
            brand details. Upload images separately; JSON never grants asset
            permissions.
          </p>
          <Button
            type="button"
            variant="link"
            onClick={() =>
              downloadJson(
                "nxclip-brand-kit-sample.json",
                stringifyExport(BRAND_KIT_JSON_SAMPLE),
              )
            }
          >
            Download NxClip JSON sample
          </Button>
        </div>

        {step === "input" ? (
          <div className="space-y-4">
            <div
              className={cn(
                "rounded-xl border border-dashed p-6 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void onFile(file);
              }}
            >
              <Upload
                className="mx-auto mb-2 text-muted-foreground"
                size={22}
              />
              <p className="text-sm text-muted-foreground mb-3">
                Drop a .json file here
              </p>
              <InputFile onPick={(f) => void onFile(f)} />
            </div>
            <div>
              <Label htmlFor="bk-import-paste">Or paste JSON</Label>
              <Textarea
                id="bk-import-paste"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={10}
                placeholder='{ "schemaVersion": "1.0", "type": "nxclip.brand-kit", ... }'
                className="font-mono text-xs"
              />
            </div>
            {parseError ? (
              <p className="text-sm text-destructive">{parseError}</p>
            ) : null}
          </div>
        ) : null}

        {step === "preview" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review each kit before saving. Existing names can be created as
              new or explicitly updated.
            </p>
            {plans.map((plan, idx) => {
              const m = plan.mapped;
              const existing = findExisting(m.portable.brand.name);
              const colors = [
                m.portable.colors?.primary,
                m.portable.colors?.secondary,
                m.portable.colors?.accent,
              ].filter(Boolean) as string[];
              const hasErrors = !isImportable(m);
              return (
                <div
                  key={m.fingerprint + idx}
                  className={cn(
                    "rounded-xl border p-3 space-y-2",
                    hasErrors ? "border-destructive/40" : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={plan.selected}
                        disabled={hasErrors}
                        onChange={(e) => {
                          const selected = e.target.checked;
                          setPlans((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, selected } : p,
                            ),
                          );
                        }}
                      />
                      {m.portable.brand.name}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {m.portable.brand.industry ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {m.portable.brand.industry}
                        </Badge>
                      ) : null}
                      {existing ? (
                        <Badge variant="outline" className="text-[10px]">
                          Name exists
                        </Badge>
                      ) : null}
                      {m.assetsRequiringReupload.length ? (
                        <Badge variant="outline" className="text-[10px]">
                          {m.assetsRequiringReupload.length} assets need upload
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {colors.map((hex) => (
                      <span
                        key={hex}
                        className="h-6 w-6 rounded border border-border"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {m.portable.brand.description ||
                      m.portable.brand.tagline ||
                      "No description"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Type: {m.portable.typography?.headline || "—"} /{" "}
                    {m.portable.typography?.body || "—"}
                  </p>
                  {m.issues.length ? (
                    <ul className="text-xs space-y-0.5">
                      {m.issues.map((issue, i) => (
                        <li
                          key={i}
                          className={
                            issue.level === "error"
                              ? "text-destructive"
                              : "text-amber-700 dark:text-amber-300"
                          }
                        >
                          {issue.level}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {m.unsupportedFields.length ? (
                    <p className="text-[11px] text-muted-foreground">
                      Unsupported fields ignored:{" "}
                      {m.unsupportedFields.join(", ")}
                    </p>
                  ) : null}
                  {existing && plan.selected ? (
                    <div className="flex flex-wrap gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`mode-${idx}`}
                          checked={plan.mode === "create"}
                          onChange={() =>
                            setPlans((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? {
                                      ...p,
                                      mode: "create",
                                      existingId: existing.id,
                                    }
                                  : p,
                              ),
                            )
                          }
                        />
                        Create new (keep existing)
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`mode-${idx}`}
                          checked={plan.mode === "update"}
                          onChange={() =>
                            setPlans((prev) =>
                              prev.map((p, i) =>
                                i === idx
                                  ? {
                                      ...p,
                                      mode: "update",
                                      existingId: existing.id,
                                    }
                                  : p,
                              ),
                            )
                          }
                        />
                        Update existing (explicit)
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {step === "results" ? (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.fingerprint}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{r.name}</span>
                <Badge
                  variant={
                    r.status === "success"
                      ? "secondary"
                      : r.status === "skipped"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {r.status}
                  {r.error ? `: ${r.error}` : ""}
                </Badge>
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {step === "input" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onParsePaste}
                disabled={!paste.trim()}
              >
                Preview import
              </Button>
            </>
          ) : null}
          {step === "preview" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("input")}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={busy || !selectedCount}
                onClick={() => void runImport()}
              >
                {busy ? (
                  <Loader2 className="mr-1 animate-spin" size={16} />
                ) : null}
                Import {selectedCount} kit{selectedCount === 1 ? "" : "s"}
              </Button>
            </>
          ) : null}
          {step === "results" ? (
            <Button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InputFile({ onPick }: { onPick: (file: File) => void }) {
  return (
    <label className="inline-flex cursor-pointer">
      <input
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
      <span className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-muted">
        Choose file
      </span>
    </label>
  );
}
