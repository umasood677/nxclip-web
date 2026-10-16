import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { adStudioApi } from "../../../services/apiClient";

interface VariationsPanelProps {
  creativeId: string;
  onOpenVariation?: (id: string) => void;
}

export function VariationsPanel({ creativeId, onOpenVariation }: VariationsPanelProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await adStudioApi.createVariations(creativeId, { count: 3 });
      setItems(res.items ?? []);
      toast.success(`${res.items?.length ?? 0} variations ready`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Variation generation failed");
    } finally {
      setBusy(false);
    }
  };

  const open = (id: string) => {
    if (onOpenVariation) onOpenVariation(id);
    else navigate(`/create/ad/${id}`);
  };

  return (
    <div className="space-y-3 border-t border-border pt-3 mt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Variations</div>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void generate()}>
          {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Sparkles size={14} className="mr-1" />}
          Generate 3
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Deterministic layout/color/CTA variants — original creative is preserved.
      </p>
      <div className="space-y-1">
        {items.map((v) => (
          <button
            key={v.id}
            type="button"
            className="w-full text-left rounded-md border border-border px-2 py-1.5 text-xs hover:border-primary/40"
            onClick={() => open(v.id)}
          >
            <div className="font-medium truncate">{v.name}</div>
            <Badge variant="secondary" className="mt-1">{v.variationType ?? "variation"}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
