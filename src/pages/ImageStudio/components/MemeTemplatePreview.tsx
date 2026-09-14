import { useId, useMemo } from "react";
import type { MemeTemplateDto } from "../../../services/apiClient";
import { cn } from "../../../lib/utils";
import { canvasSizeForAspect, renderMemeSvg, type MemeSvgAspect } from "../lib/memeSvg";
// Inlined as a data URI: the placeholder is nested inside an <image> href, and
// an SVG loaded that way cannot resolve external asset URLs.
import logoDataUri from "../../../contents/images/nexa-mark.png?inline";

/**
 * Live layout preview. Uses the exact renderer content-service composes with,
 * so what the user sees here is what gets generated.
 */

interface MemeTemplatePreviewProps {
  template: MemeTemplateDto;
  slotTexts: Record<string, string>;
  aspectRatio: string;
  /** Hybrid mode: an AI image will fill the background behind the overlay. */
  withBaseImage?: boolean;
  /** Optional vision focus for safe-zone crop preview. */
  subjectFocus?: { x: number; y: number };
  /** Preview recommended motion with CSS + optional SVG animate hints. */
  showMotion?: boolean;
  className?: string;
}

/**
 * Dashed, brand-marked stand-in so hybrid users can see where the AI plate
 * will sit. Sized to the target canvas so the frame is not cropped by the
 * renderer's `slice` fit.
 */
function baseImagePlaceholder(aspect: MemeSvgAspect): string {
  const { width, height } = canvasSizeForAspect(aspect);
  const u = Math.min(width, height) / 100;
  const logo = u * 15;
  const cx = width / 2;
  const cy = height / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="ph-bg" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="#131a2b"/>
        <stop offset="100%" stop-color="#070910"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#ph-bg)"/>
    <rect x="${u * 3}" y="${u * 3}" width="${width - u * 6}" height="${height - u * 6}"
      rx="${u * 4}" fill="none" stroke="rgba(148,163,184,0.4)"
      stroke-width="${u * 0.4}" stroke-dasharray="${u * 2.4} ${u * 1.8}"/>
    <image href="${logoDataUri}" x="${cx - logo / 2}" y="${cy - logo * 1.1}"
      width="${logo}" height="${logo}" opacity="0.9"/>
    <text x="${cx}" y="${cy + logo * 0.5}" text-anchor="middle"
      font-family="Segoe UI,Inter,Arial,sans-serif" font-size="${u * 4.2}"
      font-weight="700" fill="rgba(226,232,240,0.75)">AI image goes here</text>
    <text x="${cx}" y="${cy + logo * 0.5 + u * 5.4}" text-anchor="middle"
      font-family="Segoe UI,Inter,Arial,sans-serif" font-size="${u * 3}"
      font-weight="500" fill="rgba(148,163,184,0.65)">Your prompt generates this layer</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MemeTemplatePreview = ({
  template,
  slotTexts,
  aspectRatio,
  withBaseImage,
  subjectFocus,
  showMotion,
  className,
}: MemeTemplatePreviewProps) => {
  const instanceId = useId().replace(/:/g, "");
  const markup = useMemo(() => {
    const supported = template.supportedAspectRatios.includes(
      aspectRatio as MemeTemplateDto["defaultAspectRatio"],
    )
      ? (aspectRatio as MemeSvgAspect)
      : (template.defaultAspectRatio as MemeSvgAspect);

    const slots: Record<string, string> = {};
    const placeholderSlots: string[] = [];
    for (const slot of template.slots) {
      const typed = (slotTexts[slot.id] || "").trim();
      if (typed) {
        slots[slot.id] = typed;
      } else {
        slots[slot.id] = slot.placeholder || slot.label;
        placeholderSlots.push(slot.id);
      }
    }

    const { svg } = renderMemeSvg({
      templateId: template.id,
      slots,
      aspect: supported,
      placeholderSlots,
      baseImageHref: withBaseImage ? baseImagePlaceholder(supported) : undefined,
      // Preview mirrors free-plan output so users see the brand mark placement.
      watermark: true,
      brandLogoHref: logoDataUri,
      idPrefix: `tplprev-${template.id}-${instanceId}`,
      faceSafeZone: template.design?.safeZones?.face,
      subjectFocus,
      animate: !!showMotion,
      animation: template.design?.animation as
        | "slow_push_in"
        | "slow_dolly"
        | "dramatic_fade"
        | "zoom_cuts"
        | "parallax_drift"
        | "static_hold"
        | undefined,
    });

    return (
      svg
        // XML prolog is invalid when inlined into an HTML document.
        .replace(/<\?xml[^>]*\?>/, "")
        // Drop intrinsic pixel size so the SVG scales to its frame via viewBox.
        .replace(/(<svg\b[^>]*?)\swidth="\d+"\sheight="\d+"/, "$1")
        .trim()
    );
  }, [template, slotTexts, aspectRatio, withBaseImage, instanceId, subjectFocus, showMotion]);

  const motionClass =
    showMotion && template.design?.animation
      ? {
          slow_push_in: "animate-[meme-push_6s_ease-in-out_infinite]",
          slow_dolly: "animate-[meme-dolly_7s_ease-in-out_infinite]",
          dramatic_fade: "animate-[meme-fade_5s_ease-in-out_infinite]",
          zoom_cuts: "animate-[meme-zoom_2.4s_ease-in-out_infinite]",
          parallax_drift: "animate-[meme-drift_8s_ease-in-out_infinite]",
          static_hold: "",
        }[template.design.animation] || ""
      : "";

  return (
    <div
      className={cn(
        "[&>svg]:block [&>svg]:h-full [&>svg]:w-full overflow-hidden",
        motionClass,
        className,
      )}
      role="img"
      aria-label={`${template.name} layout preview`}
      // Renderer escapes all user text before it reaches the markup.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
};

export default MemeTemplatePreview;
