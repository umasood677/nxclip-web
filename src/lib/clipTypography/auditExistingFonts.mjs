/** Read-only binary audit. Uses the already installed backend fontkit; downloads nothing.
 * node src/lib/clipTypography/auditExistingFonts.mjs D:/NxClip
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("../../../", import.meta.url));
const backendRoot = resolve(process.argv[2] ?? resolve(webRoot, "../NxClip"));
const requireBackend = createRequire(resolve(backendRoot, "package.json"));
const fontkit = requireBackend("fontkit");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hex = (point) => point.toString(16).toUpperCase().padStart(4, "0");
function ranges(points) {
  const sorted = [...new Set(points)].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    let end = start;
    while (sorted[i + 1] === end + 1) end = sorted[++i];
    result.push(`U+${hex(start)}${end === start ? "" : `-${hex(end)}`}`);
  }
  return result;
}
const candidates = [
  ...["Anton-Regular.ttf", "BebasNeue-Regular.ttf", "Inter-Bold.ttf", "Montserrat-Black.ttf"].map((file) => ({
    root: backendRoot, repository: "backend", path: `apps/media-worker/assets/fonts/${file}`,
    notice: null,
  })),
  ...["anton", "inter", "montserrat"].map((family) => ({
    root: webRoot, repository: "frontend", path: `src/pages/ImageStudio/components/fonts/${family}.woff2`,
    notice: `src/pages/ImageStudio/components/fonts/${family}-LICENSE.txt`,
  })),
];
const files = candidates.map(({ root, repository, path, notice }) => {
  if (!existsSync(resolve(root, path))) throw new Error(`Missing audited asset: ${repository}/${path}`);
  const bytes = readFileSync(resolve(root, path));
  const font = fontkit.create(bytes);
  const noticeBytes = notice && existsSync(resolve(root, notice)) ? readFileSync(resolve(root, notice)) : null;
  return {
    repository, path, sha256: sha256(bytes), bytes: bytes.length,
    family: font.familyName, subfamily: font.subfamilyName,
    preferredFamily: font.name.records.preferredFamily?.en ?? null,
    preferredSubfamily: font.name.records.preferredSubfamily?.en ?? null,
    postscriptName: font.postscriptName, version: font.name.records.version?.en ?? null,
    reportedWeight: font["OS/2"].usWeightClass,
    variationAxes: font.variationAxes, namedVariations: font.namedVariations,
    glyphCount: font.numGlyphs, codepointCount: font.characterSet.length,
    unicodeRanges: ranges(font.characterSet),
    /** A script sample is diagnostic, not a language support guarantee. */
    sampleGlyphs: Object.fromEntries(Object.entries({ latinA: 0x41, cyrillicA: 0x410, greekAlpha: 0x391, arabicAlef: 0x627, devanagariKa: 0x915 }).map(([name, point]) => [name, font.hasGlyphForCodePoint(point)])),
    testedLanguages: [],
    embeddedLicense: font.name.records.license?.en ?? null,
    embeddedCopyright: font.name.records.copyright?.en ?? null,
    notice: noticeBytes ? { path: notice, sha256: sha256(noticeBytes), copyrightLine: noticeBytes.toString("utf8").split(/\r?\n/)[0], containsOfl11: noticeBytes.toString("utf8").includes("SIL OPEN FONT LICENSE Version 1.1") } : null,
    exportSupport: "unverified",
  };
});
process.stdout.write(`${JSON.stringify({ auditSchemaVersion: "1.0.0", files }, null, 2)}\n`);
