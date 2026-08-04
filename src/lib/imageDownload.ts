/**
 * Helpers for saving generated media. Template/hybrid memes are composed as SVG
 * by content-service, so a naive `.png` filename produces a file most viewers
 * refuse to open.
 */

export function extensionForMimeType(mimeType: string): string {
  const type = (mimeType || "").toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  return "png";
}

/** Draw an SVG blob onto a canvas so the download is a real raster image. */
export async function rasterizeSvgBlob(blob: Blob): Promise<Blob | null> {
  try {
    const markup = await blob.text();
    const widthMatch = markup.match(/\bwidth="(\d+(?:\.\d+)?)"/);
    const heightMatch = markup.match(/\bheight="(\d+(?:\.\d+)?)"/);
    const svgUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("svg decode failed"));
        img.src = svgUrl;
      });
      const width = Number(widthMatch?.[1]) || image.naturalWidth || 1080;
      const height = Number(heightMatch?.[1]) || image.naturalHeight || 1080;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(image, 0, 0, width, height);
      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((out) => resolve(out), "image/png"),
      );
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  } catch {
    return null;
  }
}

/** Rasterizes SVG media, then returns the blob that should hit disk. */
export async function toDownloadableBlob(blob: Blob): Promise<Blob> {
  if (!blob.type.includes("svg")) return blob;
  return (await rasterizeSvgBlob(blob)) || blob;
}
