import { FONT_MANIFEST, type FontEntry, type FontStyle } from "./registry";

export interface FontRequest { fontId: string; weight: number; style?: FontStyle; text?: string }
export type FontLoadStatus = "idle" | "loading" | "loaded" | "failed";
export interface LoaderEnvironment {
  load(family: string, url: string, weight: number, style: FontStyle, unicodeRange: string, signal: AbortSignal, expectedSha256: string): Promise<unknown>;
  remove(face: unknown): void;
}

function browserEnvironment(): LoaderEnvironment {
  return {
    async load(family, url, weight, style, unicodeRange, signal, expectedSha256) {
      if (typeof document === "undefined" || !document.fonts) {
        // document.fonts.check/load alone can report system fallback as success.
        throw new Error("FontFace API unavailable; canonical loading is unsupported (no silent document fallback)");
      }
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Font HTTP ${response.status}: ${url}`);
      const bytes = await response.arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((value) => value.toString(16).padStart(2, '0')).join('');
      if (digest !== expectedSha256) throw new Error(`Font checksum mismatch: ${url}`);
      if (typeof FontFace === "undefined") {
        // Older documents may support CSS-created FontFaceSet entries without a constructor.
        // Wait on the exact newly registered face, never document.fonts.check/load alone.
        const format = url.endsWith('.ttf') ? 'truetype' : 'woff2';
        const objectUrl = URL.createObjectURL(new Blob([bytes], { type: format === 'truetype' ? 'font/ttf' : 'font/woff2' }));
        const element = document.createElement('style');
        element.textContent = `@font-face{font-family:"${family}";src:url("${objectUrl}") format("${format}");font-weight:${weight};font-style:${style};unicode-range:${unicodeRange}}`;
        const prior = new Set(document.fonts);
        document.head.append(element);
        const abort = () => { element.remove(); URL.revokeObjectURL(objectUrl); };
        signal.addEventListener('abort', abort, { once: true });
        try {
          const exact = [...document.fonts].find((entry) => !prior.has(entry) && entry.family.replaceAll('"', '') === family && entry.weight === String(weight) && entry.style === style);
          if (!exact) throw new Error('Document fallback cannot identify the exact registered font');
          await exact.load();
          if (signal.aborted || exact.status !== 'loaded') throw new Error('Document font load aborted');
          return { exact, element, objectUrl };
        } catch (error) { element.remove(); URL.revokeObjectURL(objectUrl); throw error; }
        finally { signal.removeEventListener('abort', abort); }
      }
      const face = new FontFace(family, bytes, { weight: String(weight), style, unicodeRange });
      await face.load();
      if (signal.aborted || face.status !== "loaded") throw new Error("Font load aborted or failed");
      document.fonts.add(face);
      return face;
    },
    remove(face) {
      if (typeof document === "undefined") return;
      if (face && typeof face === 'object' && 'exact' in face) {
        const handle = face as { exact: FontFace; element: HTMLStyleElement; objectUrl: string };
        document.fonts.delete(handle.exact); handle.element.remove(); URL.revokeObjectURL(handle.objectUrl);
      } else document.fonts.delete(face as FontFace);
    },
  };
}

function intersects(text: string, ranges: string): boolean {
  const intervals = ranges.split(",").map((range) => range.trim().replace(/^U\+/i, "").split("-").map((value) => parseInt(value, 16)));
  return [...text].some((character) => intervals.some(([start, end = start]) => character.codePointAt(0)! >= start && character.codePointAt(0)! <= end));
}

/** Lazy, Clip-scoped loading. Creating the service performs no downloads. */
export class FontLoaderService {
  private subsets = new Map<string, { status: FontLoadStatus; promise?: Promise<void>; face?: unknown; lastUsed: number; controller: AbortController }>();
  constructor(private readonly environment = browserEnvironment(), private readonly timeoutMs = 10000, private readonly catalog: {fonts: FontEntry[]} = FONT_MANIFEST) {}

  private request(fontId: string, weight: number, style: FontStyle, text?: string) {
    const face = this.catalog.fonts.find(font => font.id === fontId)?.faces.find(face => face.weight === weight && face.style === style);
    if (!face?.browser?.assets.length) throw new Error(`Unsupported font face: ${fontId}/${weight}/${style}`);
    const assets = text ? face.browser.assets.filter((asset) => intersects(text, asset.cssUnicodeRange)) : face.browser.assets;
    if (!assets.length) throw new Error(`No packaged Unicode subset covers the request: ${face.id}`);
    if (text && [...text].some((character) => !/[\r\n\t]/.test(character) && !face.browser!.assets.some((asset) => intersects(character, asset.cssUnicodeRange) && intersects(character, asset.inspection.unicodeRanges.join(","))))) throw new Error(`Unsupported codepoint in ${face.id}`);
    return { face, assets };
  }

  async loadFont(fontId: string, weight: number, style: FontStyle = "normal", text?: string): Promise<void> {
    const { face, assets } = this.request(fontId, weight, style, text);
    const family = this.catalog.fonts.find((font) => font.id === fontId)!.family;
    await Promise.all(assets.map((asset) => {
      const key = `${face.id}:${asset.subset}`;
      const cached = this.subsets.get(key);
      if (cached?.status === "loaded") { cached.lastUsed = Date.now(); return Promise.resolve(); }
      if (cached?.status === "loading") return cached.promise!;
      const entry = { status: "loading" as FontLoadStatus, lastUsed: Date.now(), controller: new AbortController(), face: undefined as unknown, promise: undefined as Promise<void> | undefined };
      this.subsets.set(key, entry);
      entry.promise = (async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const loading = this.environment.load(`NxClip T2 ${family}`, `/${asset.path.replace(/^public\//, "")}`, weight, style, asset.cssUnicodeRange, entry.controller.signal, asset.sha256).then((loaded) => {
            if (entry.controller.signal.aborted) { this.environment.remove(loaded); throw new Error("Late font load aborted"); }
            return loaded;
          });
          const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { entry.controller.abort(); reject(new Error(`Font load timeout: ${face.id}`)); }, this.timeoutMs); });
          entry.face = await Promise.race([loading, timeout]);
          entry.status = "loaded";
        } catch (error) { entry.status = "failed"; throw error; }
        finally { if (timer) clearTimeout(timer); }
      })();
      return entry.promise;
    }));
  }

  ensureFontsLoaded(requests: FontRequest[]): Promise<void> {
    return Promise.all(requests.map((request) => this.loadFont(request.fontId, request.weight, request.style, request.text))).then(() => undefined);
  }

  getFontLoadStatus(fontId: string, weight: number, style: FontStyle = "normal", text?: string): FontLoadStatus {
    const { face, assets } = this.request(fontId, weight, style, text);
    const statuses = assets.map((asset) => this.subsets.get(`${face.id}:${asset.subset}`)?.status ?? "idle");
    return statuses.includes("failed") ? "failed" : statuses.every((status) => status === "loaded") ? "loaded" : statuses.includes("loading") ? "loading" : "idle";
  }

  preloadPopularFonts(): Promise<void> {
    return this.ensureFontsLoaded([{ fontId: "inter", weight: 700, text: "Aa09!?" }, { fontId: "montserrat", weight: 900, text: "Aa09!?" }]);
  }

  clearUnusedFonts(maxIdleMs = 60000): number {
    let cleared = 0;
    for (const [key, entry] of this.subsets) if (entry.status !== "loading" && Date.now() - entry.lastUsed >= maxIdleMs) {
      if (entry.face) this.environment.remove(entry.face);
      this.subsets.delete(key); cleared++;
    }
    return cleared;
  }
}
