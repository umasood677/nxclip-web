/** Pixel size of an image file, measured in the browser before upload. */
export interface PixelSize {
  width: number;
  height: number;
}

/** Guards against a decode hanging and stalling the upload behind it. */
const MEASURE_TIMEOUT_MS = 4000;

function measureViaObjectUrl(file: Blob): Promise<PixelSize | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let settled = false;

    const finish = (size?: PixelSize) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(size);
    };

    const timer = window.setTimeout(() => finish(undefined), MEASURE_TIMEOUT_MS);

    image.onload = () =>
      finish(
        image.naturalWidth && image.naturalHeight
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : undefined,
      );
    image.onerror = () => finish(undefined);
    image.src = url;
  });
}

/**
 * Measure an image file's dimensions, or resolve undefined when it cannot be
 * read (non-image, vector without an intrinsic size, decode failure).
 *
 * Sent with the upload so the stored content carries a real aspect ratio:
 * galleries otherwise have to assume a square and letterbox tall media until the
 * image loads.
 */
export async function measureImageFile(file: File | Blob): Promise<PixelSize | undefined> {
  const type = (file as File).type || "";
  if (!type.startsWith("image/")) return undefined;

  // createImageBitmap decodes off the main thread, but is not universally
  // implemented for every image type — fall back to an <img> decode.
  if (typeof createImageBitmap === "function" && type !== "image/svg+xml") {
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      if (size.width > 0 && size.height > 0) return size;
    } catch {
      // Fall through to the <img> path.
    }
  }

  try {
    return await measureViaObjectUrl(file);
  } catch {
    return undefined;
  }
}
