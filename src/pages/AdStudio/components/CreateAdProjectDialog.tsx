import { AD_FORMATS } from "../types";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FolderPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { adStudioApi } from "../../../services/apiClient";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { FeaturedExample } from "../lib/exampleCreatives";
import {
  projectWorkspacePath,
  type WorkspaceProject,
} from "../lib/projectWorkspace";
import { saveEntryProject } from "../lib/homeEntryFlow";
import { writeStoredBrandKitId } from "../lib/brandHomeCatalog";
type FormProps = {
  brandLocked?: boolean;
  brands: BrandKitSummary[];
  brandsLoading?: boolean;
  brandsError?: string | null;
  onRetryBrands?: () => void;
  onCancel: () => void;
  onCreated?: (project: WorkspaceProject) => void | Promise<void>;
  onBrandChange?: (id: string) => void;
  initialBrandId?: string;
  example?: FeaturedExample;
  format?: string;
  defaultTemplateId?: string;
  blockers?: string[];
  ideaFirst?: boolean;
};
export function AdProjectCreateForm({
  brandLocked = false,
  brands,
  brandsLoading = false,
  brandsError,
  onRetryBrands,
  onCancel,
  onCreated,
  onBrandChange,
  initialBrandId = "",
  example,
  format,
  defaultTemplateId,
  blockers = [],
  ideaFirst = false,
}: FormProps) {
  const navigate = useNavigate(),
    pending = useRef(false);
  const [name, setName] = useState(example?.catalogVersion ? "" : example?.briefDefaults.name || ""),
    [idea, setIdea] = useState(
      example?.catalogVersion ? "" : example?.exampleObjective || example?.briefDefaults.coreMessage || "",
    ),
    [brandId, setBrandId] = useState(initialBrandId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [formatOverride, setFormatOverride] = useState<string>();
  const selectedFormat = formatOverride ?? format ?? example?.briefDefaults.outputFormat ?? "portrait_1080x1350";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    pending.current = true;
    setBusy(true);
    try {
      if (brandId && !brands.some((brand) => brand.id === brandId))
        throw Error("Choose an available Brand Kit.");
      const project = await saveEntryProject(
        adStudioApi,
        { name: name.trim() || (ideaFirst ? idea.trim().split(/\r?\n/)[0].slice(0, 80) : ""), idea, brandId, example, format: selectedFormat, defaultTemplateId },
        blockers,
      );
      writeStoredBrandKitId(project.brandKitId ?? "");
      toast.success("Project created");
      if (onCreated) await onCreated(project);
      else navigate(projectWorkspacePath(project.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function cancel() {
    if (busy) return;
    if (
      (name.trim() || idea.trim()) &&
      !window.confirm("Discard this unsaved project draft?")
    )
      return;
    onCancel();
  }
  const nameField = (
      <div className="space-y-2">
        <Label htmlFor="project-name">{ideaFirst ? "Campaign name (optional)" : "Project name"}</Label>
        <Input
          id="project-name"
          autoFocus={!ideaFirst}
          required={!ideaFirst}
          maxLength={160}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          placeholder="Name your campaign"
        />
      </div>
  );
  return (
    <form onSubmit={submit} className={ideaFirst ? "space-y-5 ad-project-create-form ad-project-create-form--idea-first" : "space-y-5"} aria-busy={busy}>
      {!ideaFirst && nameField}
      <div className="space-y-2">
        <Label htmlFor="campaign-idea">{ideaFirst ? "What would you like to advertise?" : "Campaign Idea"}</Label>
        <Textarea
          id="campaign-idea"
          autoFocus={ideaFirst}
          required
          maxLength={4000}
          rows={5}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          disabled={busy}
          placeholder="Describe the advertisement you want to create."
        />
        <p className="text-xs text-muted-foreground ad-project-create-form__hint">
          {ideaFirst ? "A few sentences are enough." : "Saved in your own words."}
        </p>
      </div>
      {ideaFirst && nameField}
      <div className="space-y-2">
        <Label htmlFor="project-brand">{brandLocked ? "Brand Kit" : "Brand Kit (optional)"}</Label>
        <select
          id="project-brand"
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            onBrandChange?.(e.target.value);
          }}
          disabled={busy || brandsLoading || brandLocked}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Default Brand — no Brand Kit</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        {!ideaFirst && <p className="text-xs text-muted-foreground">
          Changing Brand Kit keeps your typed campaign idea and rechecks source requirements.
        </p>}
        {brandsLoading && <p role="status">Loading Brand Kits…</p>}
        {brandsError && (
          <p role="alert">
            {brandsError}
            <button type="button" onClick={onRetryBrands}>
              Retry
            </button>
          </p>
        )}
      </div>
      {ideaFirst && <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ad Format &amp; Aspect Ratio</legend>
        <div className="flex flex-wrap gap-2">
          {AD_FORMATS.map(({ id, label, width, height }) => {
            const scale = 22 / Math.max(width, height);
            return <label key={id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs has-[:checked]:border-[var(--w0a-accent)] has-[:checked]:bg-[var(--w0a-panel-2)] has-[:focus-visible]:outline">
              <input className="sr-only" type="radio" name="campaign-format" value={id} checked={selectedFormat === id}
                disabled={busy} onChange={() => setFormatOverride(id)} />
              <span aria-hidden className="rounded-sm border border-current" style={{ width: width * scale, height: height * scale }} />
              {label}
            </label>;
          })}
        </div>
      </fieldset>}
      {blockers.length > 0 && (
        <div role="alert" className="xp-notice">
          {blockers.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <DialogFooter className={ideaFirst ? "ad-project-create-form__actions" : undefined}>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={cancel}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant={ideaFirst ? "ghost" : "default"}
          className={ideaFirst ? "w0a-create-project" : undefined}
          disabled={
            busy ||
            brandsLoading ||
            !!blockers.length ||
            (!ideaFirst && !name.trim()) ||
            !idea.trim()
          }
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}{" "}
          {busy ? "Creating project…" : ideaFirst ? "Create campaign" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
export function CreateAdProjectDialog({
  open,
  onOpenChange,
  ...props
}: Omit<FormProps, "onCancel" | "onCreated"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <FolderPlus size={19} />
            New ad project
          </DialogTitle>
          <DialogDescription>
            One campaign idea. A workspace for every ad you create.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <AdProjectCreateForm
            {...props}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
