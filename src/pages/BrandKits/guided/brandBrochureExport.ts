import { brandBrochureTheme } from "./brandBrochureTheme";
import { brandFontKey, loadBrandFontPreviews } from "../lib/brandFontPreview";
import type { BrandKitSummary } from "../lib/brandKitTypes";
export function brochureSections(kit: BrandKitSummary) {
  const voice = kit.voice || {},
    creative = voice.creative || {};
  const labels: Record<string, string> = {
    tone: "Tone",
    personality: "Personality",
    doSay: "Preferred language",
    dontSay: "Avoid",
    tagline: "Tagline",
    industry: "Industry",
    website: "Website",
    targetAudience: "Audience",
    signatureProduct: "Signature product",
    writingStyle: "Writing style",
    preferredCta: "Preferred CTA",
    exampleHeadlines: "Example headlines",
    copyGuidance: "Copy guidance",
  };
  const rows = (
    record: Record<string, unknown>,
    names?: Record<string, string>,
  ): [string, string][] =>
    Object.entries(record)
      .filter(
        ([key, value]) =>
          (!names || key in names) &&
          (typeof value === "string" || Array.isArray(value)) &&
          String(value).trim(),
      )
      .map(([key, value]) => [
        names?.[key] || key.replace(/[A-Z]/g, (c) => " " + c.toLowerCase()),
        Array.isArray(value) ? value.join("; ") : String(value),
      ]);
  return [
    {
      title: "Brand profile",
      rows: rows({
        category: voice.studio?.categoryId,
        niche: voice.studio?.nicheId,
        businessGoals: voice.studio?.businessGoals,
        businessType: voice.studio?.businessType,
      }),
    },
    { title: "Brand voice", rows: rows(voice, labels) },
    {
      title: "Creative guidelines",
      rows: [
        ...rows(creative),
        ...(kit.guidelines
          ? [["Usage rules", kit.guidelines] as [string, string]]
          : []),
      ],
    },
  ];
}
export async function exportBrochure(
  kit: BrandKitSummary,
  urls: Record<string, string>,
  format: "pdf" | "png",
) {
  const theme = brandBrochureTheme(kit);
  const specimenText = `${kit.name} ${kit.voice?.tagline || ""} Aa Bb Cc 0123456789 ${JSON.stringify(brochureSections(kit))}`;
  const fonts = await loadBrandFontPreviews(kit.typography || [], specimenText);
  const headingEntry = kit.typography?.find((t) => t.role === "heading"),
    bodyEntry = kit.typography?.find((t) => t.role === "body");
  const headingFont = headingEntry
      ? fonts[brandFontKey(headingEntry)]
      : undefined,
    bodyFont = bodyEntry ? fonts[brandFontKey(bodyEntry)] : undefined;
  let pageBackground = theme.primary,
    pageInk = theme.primaryInk;
  const pages: HTMLCanvasElement[] = [];
  let canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    y = 0;
  const page = () => {
    if (pages.length >= 40) throw Error("Brochure exceeds local export limit");
    canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1414;
    const context = canvas.getContext("2d");
    if (!context) throw Error("Canvas unavailable");
    ctx = context;
    ctx.fillStyle = pageBackground;
    ctx.fillRect(0, 0, 1000, 1414);
    ctx.fillStyle = pageInk;
    y = 72;
    pages.push(canvas);
  };
  page();
  const line = (text: string, size = 23) => {
    const font = size >= 30 ? headingFont : bodyFont;
    const fontSpec =
      font?.status === "loaded"
        ? `${font.style} ${font.weight} ${size}px "${font.family}"`
        : `${size}px sans-serif`;
    ctx.font = fontSpec;
    const words = text
      .split(/\s+/)
      .flatMap((word) =>
        word.length > 50 ? word.match(/.{1,50}/gu) || [] : [word],
      );
    let row = "";
    for (const word of words) {
      if (ctx.measureText(row + word).width > 856 && row) {
        if (y > 1300) page();
        ctx.font = fontSpec;
        ctx.fillText(row, 72, y);
        y += size * 1.5;
        row = "";
      }
      row += word + " ";
    }
    if (y > 1300) page();
    ctx.font = fontSpec;
    ctx.fillText(row, 72, y);
    y += size * 1.5;
  };
  line(kit.name, 42);
  line(`Brand Kit / saved version ${kit.version || 1}`, 18);
  line(kit.description || "Brand identity and creative guidance");
  if (kit.voice?.tagline) line(kit.voice.tagline, 30);
  pageBackground = theme.background;
  pageInk = theme.backgroundInk;
  page();
  line("Color palette", 30);
  for (const color of kit.colors || []) {
    if (y > 1260) page();
    if (/^#[0-9a-f]{6}$/i.test(color.hex)) {
      ctx.fillStyle = color.hex;
      ctx.fillRect(72, y, 40, 28);
      ctx.fillStyle = pageInk;
    }
    y += 36;
    line(`${color.role || "Brand color"}: ${color.hex}`, 20);
  }
  pageBackground = theme.background;
  pageInk = theme.backgroundInk;
  page();
  line("Typography", 30);
  for (const t of kit.typography || []) {
    line(`${t.role || "Type"}: ${t.family} / ${t.weight || "400"}`, 21);
    const f = fonts[brandFontKey(t)];
    if (y > 1150) page();
    ctx.font =
      f?.status === "loaded"
        ? `${f.style} ${f.weight} 46px "${f.family}"`
        : "46px sans-serif";
    ctx.fillText("Aa Bb Cc 0123", 72, y + 20);
    y += 90;
    line(f?.note || "Fallback font preview", 17);
  }

  for (const section of brochureSections(kit)) {
    const sectionColor =
      section.title === "Brand profile"
        ? theme.secondary
        : section.title === "Brand voice"
          ? theme.accent
          : theme.text;
    pageBackground = sectionColor;
    pageInk =
      section.title === "Brand profile"
        ? theme.secondaryInk
        : section.title === "Brand voice"
          ? theme.accentInk
          : theme.textInk;
    page();
    line(section.title, 30);
    for (const [label, value] of section.rows) line(`${label}: ${value}`, 21);
  }
  for (const asset of kit.assets || []) {
    pageBackground = theme.background;
    pageInk = theme.backgroundInk;
    page();
    line(asset.label || asset.fileName || asset.role || "Brand asset", 30);
    line(`${asset.role || "Asset"} / ${asset.status || "Processing"}`, 19);
    line(
      kit.voice?.studio?.approvedAssetIds?.includes(asset.id)
        ? "Approved creative source"
        : "Usage review required",
      19,
    );
    if (asset.mimeType && !asset.mimeType.startsWith("image/")) {
      line("Non-image attachment; preserved in Brand Kit", 19);
      continue;
    }
    const url = urls[asset.id];
    if (!url) throw Error("Asset preview not ready");
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(856 / img.naturalWidth, 1000 / img.naturalHeight);
    ctx.drawImage(
      img,
      72,
      y,
      img.naturalWidth * scale,
      img.naturalHeight * scale,
    );
  }
  const filename = kit.name.replace(/[^a-z0-9_-]/gi, "-") + "-brand-kit";
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    pages.forEach((p, i) => {
      if (i) doc.addPage();
      doc.addImage(p.toDataURL("image/png"), "PNG", 0, 0, 595.28, 841.89);
    });
    doc.save(filename + ".pdf");
  } else {
    const full = document.createElement("canvas");
    full.width = 1000;
    full.height = 1414 * pages.length;
    if (full.height > 30000) throw Error("Brochure too large; use PDF");
    const target = full.getContext("2d");
    if (!target) throw Error("Canvas unavailable");
    pages.forEach((p, i) => target.drawImage(p, 0, 1414 * i));
    const blob = await new Promise<Blob>((resolve, reject) =>
      full.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Export failed"))),
        "image/png",
      ),
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename + ".png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
