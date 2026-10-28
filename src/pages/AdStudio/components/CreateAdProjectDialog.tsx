import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FolderPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { adStudioApi } from "../../../services/apiClient";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import type { BrandKitSummary } from "../../BrandKits/CreateBrandKitDialog";
import { newWorkspaceProject, projectWorkspacePath } from "../lib/projectWorkspace";

export function CreateAdProjectDialog({ open, onOpenChange, brands, brandsLoading = false, brandsError = null, onRetryBrands }: {
  open: boolean; onOpenChange: (open: boolean) => void; brands: BrandKitSummary[];
  brandsLoading?: boolean; brandsError?: string | null; onRetryBrands?: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [brandId, setBrandId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = (value: boolean) => {
    if (busy) return;
    if (!value && (name || idea) && !window.confirm("Discard this unsaved project?")) return;
    if (!value) { setName(""); setIdea(""); setBrandId(""); setError(null); }
    onOpenChange(value);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    try {
      const body = newWorkspaceProject(name, idea, brandId);
      if (brandId && !brands.some(b => b.id === brandId)) throw Error("Choose an available Brand Kit.");
      setBusy(true);
      const project = await adStudioApi.createProject(body);
      if (!project?.id) throw Error("Project creation did not return a saved project.");
      setName(""); setIdea(""); setBrandId("");
      onOpenChange(false);
      toast.success("Project created");
      navigate(projectWorkspacePath(project.id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create project. Please retry."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex gap-2 items-center"><FolderPlus size={19} /> New ad project</DialogTitle>
        <DialogDescription>One campaign idea. A workspace for every ad you create.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        <div className="space-y-2"><Label htmlFor="project-name">Project name</Label>
          <Input id="project-name" autoFocus required maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder="ZOE Matte Collection" disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="campaign-idea">Campaign Idea</Label>
          <Textarea id="campaign-idea" required maxLength={4000} rows={5} value={idea} onChange={e => setIdea(e.target.value)} disabled={busy} placeholder="Launch our matte lipstick in three shades. Make the campaign cinematic, mysterious and luxurious." aria-describedby="campaign-idea-help" />
          <p id="campaign-idea-help" className="text-xs text-muted-foreground">Saved in your own words. Creating a project does not generate AI content.</p></div>
        <div className="space-y-2"><Label htmlFor="project-brand">Brand Kit <span className="text-muted-foreground">(optional)</span></Label>
          <select id="project-brand" value={brandId} onChange={e => setBrandId(e.target.value)} disabled={busy || brandsLoading} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Default Brand — no Brand Kit</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Continue with default NxClip creative settings, or use one of your Brand Kits.</p>
          {brandsLoading ? <p className="text-xs" role="status">Loading your Brand Kits…</p> : null}
          {brandsError ? <p className="text-xs text-destructive" role="alert">Brand Kits could not load. You can continue with Default Brand. <button type="button" className="underline" onClick={onRetryBrands}>Retry</button></p> : null}
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter><Button type="button" variant="outline" onClick={() => close(false)} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy || !name.trim() || !idea.trim()}>{busy ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Plus size={16} aria-hidden className="mr-2"/>}{busy ? "Creating project…" : "Create project"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
