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
type FormProps = {
  brands: BrandKitSummary[];
  brandsLoading?: boolean;
  brandsError?: string | null;
  onRetryBrands?: () => void;
  onCancel: () => void;
  onCreated?: (project: WorkspaceProject) => void;
  initialBrandId?: string;
  example?: FeaturedExample;
  format?: string;
  blockers?: string[];
};
export function AdProjectCreateForm({
  brands,
  brandsLoading = false,
  brandsError,
  onRetryBrands,
  onCancel,
  onCreated,
  initialBrandId = "",
  example,
  format,
  blockers = [],
}: FormProps) {
  const navigate = useNavigate(),
    pending = useRef(false);
  const [name, setName] = useState(example?.briefDefaults.name || ""),
    [idea, setIdea] = useState(
      example?.exampleObjective || example?.briefDefaults.coreMessage || "",
    ),
    [brandId, setBrandId] = useState(initialBrandId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
        { name, idea, brandId, example, format },
        blockers,
      );
      toast.success("Project created");
      if (onCreated) onCreated(project);
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
  return (
    <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
      <div className="space-y-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          autoFocus
          required
          maxLength={160}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          placeholder="Name your campaign"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign-idea">Campaign Idea</Label>
        <Textarea
          id="campaign-idea"
          required
          maxLength={4000}
          rows={5}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          disabled={busy}
          placeholder="Describe the advertisement you want to create."
        />
        <p className="text-xs text-muted-foreground">
          Saved in your own words. Creating a project does not generate AI
          content.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-brand">Brand Kit (optional)</Label>
        <select
          id="project-brand"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          disabled={busy || brandsLoading || !!example || !!format}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Default Brand — no Brand Kit</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {example || format
            ? "This starting point keeps the Brand Kit you selected on Home. Go back to choose another."
            : "Default Brand does not inherit assets from any previous project."}
        </p>
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
      <DialogFooter>
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
          disabled={
            busy ||
            brandsLoading ||
            !!blockers.length ||
            !name.trim() ||
            !idea.trim()
          }
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}{" "}
          {busy ? "Creating project…" : "Create project"}
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
