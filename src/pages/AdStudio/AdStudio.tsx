import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Megaphone, Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";
import { SEO } from "../../components/SEO";
import { adStudioApi, brandApi } from "../../services/apiClient";
import { AD_FORMATS, type AdConcept } from "./types";
import "../ImageStudio/components/image-edit-fonts.css";

const OBJECTIVES = [
  "brand_awareness",
  "product_promotion",
  "website_traffic",
  "lead_generation",
  "engagement",
  "event_promotion",
  "app_installation",
];

const PLATFORMS = [
  "instagram_feed",
  "instagram_story",
  "facebook_feed",
  "linkedin",
  "x_twitter",
  "generic",
];

export default function AdStudio() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<AdConcept[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "New ad project",
    brandKitId: "",
    productOrService: "",
    advertisingObjective: "product_promotion",
    targetAudience: "",
    coreMessage: "",
    desiredTone: "confident",
    platform: "instagram_feed",
    outputFormat: "portrait_1080x1350",
    cta: "Learn More",
  });

  useEffect(() => {
    void (async () => {
      try {
        const [p, b] = await Promise.all([
          adStudioApi.listProjects(),
          brandApi.listKits().catch(() => ({ items: [] })),
        ]);
        setProjects(p.items ?? []);
        setBrands(b.items ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load Ad Studio");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createProject = async () => {
    setBusy(true);
    try {
      const project = await adStudioApi.createProject({
        name: form.name,
        brandKitId: form.brandKitId || undefined,
        brief: {
          productOrService: form.productOrService,
          advertisingObjective: form.advertisingObjective,
          targetAudience: form.targetAudience,
          coreMessage: form.coreMessage,
          desiredTone: form.desiredTone,
          platform: form.platform,
          outputFormat: form.outputFormat,
          cta: form.cta,
        },
        routingProfile: "BALANCED",
      });
      setProjectId(project.id);
      setProjects((prev) => [project, ...prev]);
      toast.success("Project created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const generateConcepts = async () => {
    if (!projectId) {
      toast.error("Create or select a project first");
      return;
    }
    setBusy(true);
    try {
      const res = await adStudioApi.generateConcepts(projectId, { conceptCount: 4 });
      setConcepts(res.concepts ?? []);
      setGenerationSource(res.generationSource ?? res.provider ?? null);
      if (res.generationSource === "heuristic" || /heuristic/i.test(res.provider ?? "")) {
        toast.message("Concepts ready (heuristic)", {
          description: res.warnings?.[0] ?? "AI provider unavailable — templates used.",
        });
      } else {
        toast.success("Concepts generated");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Concept generation failed");
    } finally {
      setBusy(false);
    }
  };

  const openFromConcept = async (conceptId: string) => {
    if (!projectId) return;
    setBusy(true);
    try {
      const creative = await adStudioApi.createFromConcept(projectId, { conceptId });
      navigate(`/create/ad/${creative.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create creative");
    } finally {
      setBusy(false);
    }
  };

  const selectProject = async (id: string) => {
    setProjectId(id);
    try {
      const [listed, creativeList] = await Promise.all([
        adStudioApi.listConcepts(id),
        adStudioApi.listCreatives(id),
      ]);
      setConcepts(listed.concepts ?? []);
      setGenerationSource(listed.generationSource ?? listed.provider ?? null);
      setCreatives(creativeList.items ?? []);
    } catch {
      setConcepts([]);
      setCreatives([]);
    }
  };

  const generateBackground = async (conceptId?: string) => {
    if (!projectId) {
      toast.error("Select a project first");
      return;
    }
    setBusy(true);
    try {
      const res = await adStudioApi.generateImage(projectId, {
        conceptId,
      });
      toast.success(res.jobId ? `Image job queued (${res.jobId.slice(0, 8)}…)` : "Image generation started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground gap-2">
        <Loader2 className="animate-spin" size={18} /> Loading Ad Studio…
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <SEO title="Static Ad Studio | NxClip" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Megaphone size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Static Ad Studio</h1>
          <p className="text-sm text-muted-foreground">
            Brief → Brand Kit → Concepts → Editable creative
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 min-h-[calc(100vh-180px)]">
        <Card className="lg:col-span-4 glass border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project & brief</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-240px)] pr-3">
              <div className="space-y-3">
                <div>
                  <Label>Existing projects</Label>
                  <div className="space-y-1 mt-1">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`w-full text-left text-sm rounded-md border px-3 py-2 ${
                          projectId === p.id ? "border-primary bg-muted" : "border-border"
                        }`}
                        onClick={() => void selectProject(p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                    {!projects.length && (
                      <p className="text-xs text-muted-foreground">No projects yet.</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Project name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Brand Kit (optional)</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={form.brandKitId}
                    onChange={(e) => setForm({ ...form, brandKitId: e.target.value })}
                  >
                    <option value="">Neutral / no brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Product / service</Label>
                  <Input value={form.productOrService} onChange={(e) => setForm({ ...form, productOrService: e.target.value })} />
                </div>
                <div>
                  <Label>Core message</Label>
                  <Textarea value={form.coreMessage} onChange={(e) => setForm({ ...form, coreMessage: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>Audience</Label>
                  <Input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Objective</Label>
                    <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.advertisingObjective} onChange={(e) => setForm({ ...form, advertisingObjective: e.target.value })}>
                      {OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Platform</Label>
                    <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                      {PLATFORMS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Format</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.outputFormat} onChange={(e) => setForm({ ...form, outputFormat: e.target.value })}>
                    {AD_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>CTA</Label>
                  <Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="button" onClick={() => void createProject()} disabled={busy || !form.productOrService || !form.coreMessage}>
                    <Plus size={16} className="mr-1" /> Create project
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void generateConcepts()} disabled={busy || !projectId}>
                    <Sparkles size={16} className="mr-1" /> Generate concepts
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 glass border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Creative concepts</CardTitle>
            {generationSource && (
              <Badge variant="outline">{generationSource}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-3">
              {concepts.map((c) => (
                <div
                  key={c.conceptId}
                  className="text-left rounded-xl border border-border p-4 space-y-3"
                >
                  <button
                    type="button"
                    className="w-full text-left hover:opacity-90"
                    onClick={() => void openFromConcept(c.conceptId)}
                    disabled={busy}
                  >
                    <div className="font-semibold mb-1">{c.title}</div>
                    <div className="text-sm text-muted-foreground mb-2">{c.creativeDirection}</div>
                    <div className="text-base font-medium">{c.primaryHeadline}</div>
                    <div className="text-sm mt-1 opacity-80">{c.supportingCopy}</div>
                    <Badge className="mt-3" variant="secondary">{c.cta}</Badge>
                  </button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void openFromConcept(c.conceptId)}
                    >
                      Edit creative
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void generateBackground(c.conceptId)}
                    >
                      AI background
                    </Button>
                  </div>
                </div>
              ))}
              {!concepts.length && (
                <p className="text-sm text-muted-foreground col-span-2">
                  Create a project and generate concepts to open an editable creative.
                </p>
              )}
            </div>

            {!!creatives.length && (
              <div>
                <h3 className="text-sm font-medium mb-2">Saved creatives</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {creatives.map((cr) => (
                    <button
                      key={cr.id}
                      type="button"
                      className="text-left rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40"
                      onClick={() => navigate(`/create/ad/${cr.id}`)}
                    >
                      {cr.name}
                      <span className="block text-xs text-muted-foreground">
                        v{cr.currentVersion ?? 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
