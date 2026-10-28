import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Image as ImageIcon,
  Shapes,
  BadgeCheck,
  Layers,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { sortLayers } from "../lib/sceneGraph";
import type { AdSceneLayer } from "../types";

interface LayerListProps {
  layers: AdSceneLayer[];
  selectedLayerId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
}

const LAYER_ACCENTS = [
  "#c4a574",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
];

function LayerTypeIcon({ type }: { type: string }) {
  if (type === "text") return <Type size={12} />;
  if (type === "logo") return <BadgeCheck size={12} />;
  if (type === "image") return <ImageIcon size={12} />;
  if (type === "shape") return <Shapes size={12} />;
  return <Layers size={12} />;
}

function typeLabel(type: string): string {
  if (type === "logo") return "Logo";
  if (type === "image") return "Image";
  if (type === "text") return "Text";
  if (type === "shape") return "Shape";
  return type;
}

function previewLabel(layer: AdSceneLayer): string {
  const named = layer.name?.trim();
  if (named) return named;
  if (layer.type === "text") {
    const t = (layer as { text?: string }).text?.trim();
    if (t) return t.length > 28 ? `${t.slice(0, 28)}…` : t;
  }
  if (layer.type === "shape") {
    const t = (layer as { text?: string }).text?.trim();
    if (t) return t;
  }
  return `${typeLabel(layer.type)} layer`;
}

export function LayerList({
  layers,
  selectedLayerId,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onDuplicate,
  onDelete,
  onReorder,
}: LayerListProps) {
  const sorted = sortLayers(layers).reverse();
  return (
    <div className="space-y-2" role="list" aria-label="Layers">
      <div className="flex items-center justify-between px-0.5 pb-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers size={12} className="text-[var(--w0a-accent)]" aria-hidden />
          Stack
        </span>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {sorted.length}
        </span>
      </div>

      {sorted.map((layer, index) => {
        const selected = selectedLayerId === layer.id;
        const accent = LAYER_ACCENTS[index % LAYER_ACCENTS.length]!;
        const hidden = layer.visible === false;
        const label = previewLabel(layer);
        return (
          <div
            key={layer.id}
            role="listitem"
            className={cn(
              "group rounded-lg border px-2 py-2 transition-colors",
              selected
                ? "w0a-layer-sel border-[var(--w0a-accent)]/50"
                : "border-border/40 bg-muted/5 hover:bg-white/[0.04] hover:border-border/70",
              hidden && "opacity-55",
            )}
            style={
              selected
                ? { boxShadow: `inset 3px 0 0 ${accent}` }
                : undefined
            }
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left min-w-0"
              onClick={() => onSelect(layer.id)}
              aria-pressed={selected}
              title={label}
            >
              <span
                className="w0a-layer-ico"
                title={typeLabel(layer.type)}
                aria-hidden
              >
                <LayerTypeIcon type={layer.type} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium leading-tight">
                  {label}
                </span>
                <span className="block text-[10px] text-muted-foreground tracking-wide">
                  {typeLabel(layer.type)}
                  {layer.locked ? " · locked" : ""}
                  {hidden ? " · hidden" : ""}
                </span>
              </span>
            </button>

            <div className="mt-1.5 flex items-center justify-end gap-0.5 opacity-80 group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Bring forward"
                aria-label="Bring forward"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layer.id, "up");
                }}
              >
                <ChevronUp size={13} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Send backward"
                aria-label="Send backward"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layer.id, "down");
                }}
              >
                <ChevronDown size={13} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={hidden ? "Show" : "Hide"}
                aria-label={hidden ? "Show layer" : "Hide layer"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
              >
                {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={layer.locked ? "Unlock" : "Lock"}
                aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(layer.id);
                }}
              >
                {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Duplicate"
                aria-label="Duplicate layer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(layer.id);
                }}
              >
                <Copy size={13} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                title="Delete"
                aria-label="Delete layer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(layer.id);
                }}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        );
      })}
      {!sorted.length && (
        <p className="text-xs text-muted-foreground px-1 py-3 text-center rounded-lg border border-dashed border-border/50">
          No layers yet.
        </p>
      )}
    </div>
  );
}
