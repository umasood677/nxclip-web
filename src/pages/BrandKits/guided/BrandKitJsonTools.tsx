import React, { useState } from "react";
import { Download, FileJson } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { BRAND_KIT_JSON_SAMPLE } from "../lib/brandKitJsonSample";
import {
  downloadJson,
  exportBrandKit,
  stringifyExport,
} from "../lib/brandKitExport";
import { parseBrandKitJsonText, readJsonFile } from "../lib/brandKitSafeJson";
import { mapImportDocument, isImportable } from "../lib/brandKitImportMap";
import type { MappedImportKit } from "../lib/brandKitPortable";
import type { BrandKitSummary } from "../lib/brandKitTypes";
export function BrandKitJsonTools({
  kit,
  onImport,
}: {
  kit: BrandKitSummary;
  onImport: (mapped: MappedImportKit) => void;
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const [mapped, setMapped] = useState<MappedImportKit | null>(null);
  function review(value: unknown) {
    const items = mapImportDocument(value);
    if (items.length !== 1) {
      setError(
        "Import exactly one Brand Kit into this draft. Split bundles into individual kits.",
      );
      setMapped(null);
      return;
    }
    setMapped(items[0]);
    setError("");
  }
  return (
    <>
      <button className="xp-secondary" onClick={() => setOpen(true)}>
        <FileJson size={15} /> Import / export JSON
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bring your brand into NxClip</DialogTitle>
            <DialogDescription>
              Import into this Brand Kit draft. Review your changes, then save.
              Existing uploads and permissions stay attached to the same kit.
            </DialogDescription>
          </DialogHeader>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer font-medium">
              How to prepare compatible JSON
            </summary>
            <p className="text-sm text-muted-foreground mt-2">
              Download the sample and replace the example brand, voice,
              six-digit hex colors, fonts and creative guidelines. Keep
              schemaVersion and type unchanged. Use approved product
              information. Assets are descriptions, not uploads or consent
              grants.
            </p>
            <pre className="text-xs max-h-48 overflow-auto mt-3">
              {stringifyExport(BRAND_KIT_JSON_SAMPLE)}
            </pre>
          </details>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadJson(
                  "nxclip-brand-kit-sample.json",
                  stringifyExport(BRAND_KIT_JSON_SAMPLE),
                )
              }
            >
              <Download size={14} className="mr-2" />
              Download sample
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadJson(
                  "nxclip-brand-kit.json",
                  stringifyExport(exportBrandKit(kit)),
                )
              }
            >
              Export current draft
            </Button>
            <label className="text-sm">
              Choose JSON
              <input
                aria-label="Upload Brand Kit JSON"
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const result = await readJsonFile(file);
                  if (result.ok === true) {
                    setText(stringifyExport(result.value));
                    review(result.value);
                  } else {
                    setError(result.error);
                    setMapped(null);
                  }
                }}
              />
            </label>
          </div>
          <Textarea
            aria-label="Brand Kit JSON"
            rows={10}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setMapped(null);
              setError("");
            }}
            placeholder="Paste your NxClip Brand Kit JSON"
          />
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {mapped && (
            <section className="rounded-lg border p-3 text-sm">
              <h3 className="font-medium">
                Review: {mapped.portable.brand.name}
              </h3>
              <p>
                {mapped.colors.length} colors · {mapped.typography.length}{" "}
                typography roles
              </p>
              <p>
                Imported identity and guidelines require review. Images are not
                imported from URLs.
              </p>
              {mapped.issues.map((issue, i) => (
                <p
                  key={i}
                  className={
                    issue.level === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {issue.path}: {issue.message}
                </p>
              ))}
              {mapped.assetsRequiringReupload.length > 0 && (
                <p>
                  {mapped.assetsRequiringReupload.length} asset descriptions:
                  attach actual files in Assets.
                </p>
              )}
            </section>
          )}
          <div className="flex justify-end flex-wrap gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={!text.trim()}
              onClick={() => {
                const result = parseBrandKitJsonText(text);
                if (result.ok === true) review(result.value);
                else {
                  setError(result.error);
                  setMapped(null);
                }
              }}
            >
              Validate JSON
            </Button>
            <Button
              disabled={!mapped || !isImportable(mapped)}
              onClick={() => {
                if (mapped) {
                  onImport(mapped);
                  setOpen(false);
                  setMapped(null);
                }
              }}
            >
              Apply to draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
