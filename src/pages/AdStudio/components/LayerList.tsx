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
  Square,
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

function typeIcon(type: string) {
  switch (type) {
    case "text":
      return Type;
    case "image":
    case "logo":
      return ImageIcon;
    case "shape":
      return Square;
    default:
      return Layers;
  }
}

function typeLabel(type: string): string {
  if (type === "logo") return "LOGO";
  if (type === "image") return "IMG";
  if (type === "text") return "T";
  if (type === "shape") return "SHAPE";
  return type.slice(0, 4).toUpperCase();
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
    <div className="space-y-1">
      {sorted.map((layer) => {
        const Icon = typeIcon(layer.type);
        const label = layer.name?.trim() || `${layer.type} layer`;
        return (
          <div
            key={layer.id}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm border",
              selectedLayerId === layer.id
                ? "bg-primary/10 border-primary/40"
                : "border-transparent hover:bg-muted/50",
            )}
            onClick={() => onSelect(layer.id)}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground"
              title={layer.type}
              aria-hidden
            >
              <Icon size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium" title={label}>
                {label}
              </span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">
                {typeLabel(layer.type)}
              </span>
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onReorder(layer.id, "up");
              }}
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onReorder(layer.id, "down");
              }}
            >
              <ChevronDown size={14} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisible(layer.id);
              }}
            >
              {layer.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(layer.id);
              }}
            >
              {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(layer.id);
              }}
            >
              <Copy size={14} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(layer.id);
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        );
      })}
      {!sorted.length && (
        <p className="text-xs text-muted-foreground px-1">No layers yet.</p>
      )}
    </div>
  );
}
