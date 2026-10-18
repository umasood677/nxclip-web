/** First-party downloads only. --verify is offline; --replay uses immutable URLs/hashes in the lock. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const local = fileURLToPath(new URL("./", import.meta.url));
const fontkit = createRequire(resolve(root, "../NxClip/package.json"))("fontkit");
const revision = "47d54ca1ebb14fd864695f1d39dc734f39017c33";
const assetVersion = "1.0.0";
const base = `public/fonts/clip-typography/${assetVersion}`;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const lockPath = resolve(local, "font-source-lock.json");
const definitions = [
  ["bebas-neue", "Bebas Neue", "bebasneue", [[400,"normal"]]],
  ["anton", "Anton", "anton", [[400,"normal"]]],
  ["archivo-black", "Archivo Black", "archivoblack", [[400,"normal"]]],
  ["montserrat", "Montserrat", "montserrat", [[800,"normal"],[900,"normal"]]],
  ["poppins", "Poppins", "poppins", [[700,"normal"],[900,"normal"]]],
  ["inter", "Inter", "inter", [[700,"normal"],[900,"normal"]]],
  ["playfair-display", "Playfair Display", "playfairdisplay", [[700,"normal"],[400,"italic"]]],
  ["plus-jakarta-sans", "Plus Jakarta Sans", "plusjakartasans", [[700,"normal"],[800,"normal"]]],
  ["caveat", "Caveat", "caveat", [[700,"normal"]]],
  ["jetbrains-mono", "JetBrains Mono", "jetbrainsmono", [[700,"normal"]]],
];
const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
function write(path, bytes) {
  const target = resolve(root, path);
  if (!target.startsWith(resolve(root, base) + "/") && !target.startsWith(resolve(root, base) + "\\")) throw new Error("Outside font package");
  if (existsSync(target) && hash(readFileSync(target)) !== hash(bytes)) throw new Error(`Refusing to overwrite different bytes: ${path}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}
async function fetchBytes(url) {
  if (!["raw.githubusercontent.com", "fonts.googleapis.com", "fonts.gstatic.com"].includes(new URL(url).hostname)) throw new Error(`Unapproved download host: ${url}`);
  const response = await fetch(url, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(60000), redirect: "error" });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
function ranges(points) {
  const sorted = [...new Set(points)].sort((a,b) => a-b), result = [];
  const hex = (n) => n.toString(16).toUpperCase().padStart(4,"0");
  for (let i=0;i<sorted.length;i++) {
    const start=sorted[i]; let end=start;
    while(sorted[i+1]===end+1) end=sorted[++i];
    result.push(`U+${hex(start)}${end===start?"":`-${hex(end)}`}`);
  }
  return result;
}
export function inspectFont(bytes, family, weight, style) {
  const font = fontkit.create(bytes);
  const names = [font.familyName, font.name.records.preferredFamily?.en].filter(Boolean);
  const normalized = (name) => name.toLowerCase().replace(/[^a-z]/g, "");
  if (!names.some((name) => normalized(name).startsWith(normalized(family)))) throw new Error(`Wrong family: ${names} expected ${family}`);
  const axis = font.variationAxes.wght;
  if (axis ? weight < axis.min || weight > axis.max : font["OS/2"].usWeightClass !== weight) throw new Error(`Unavailable weight ${weight} for ${family}`);
  const italic = !!(font["OS/2"].fsSelection.italic || font.italicAngle !== 0 || /italic/i.test(font.subfamilyName));
  if (italic !== (style === "italic")) throw new Error(`Wrong style for ${family}: ${font.subfamilyName}`);
  // Force glyph decoding, not merely reading a table directory.
  font.layout("Aa09").glyphs.forEach((glyph) => glyph.path.toSVG());
  return {
    family: font.familyName, preferredFamily: font.name.records.preferredFamily?.en ?? null,
    subfamily: font.subfamilyName, reportedWeight: font["OS/2"].usWeightClass,
    style, kind: axis ? "variable" : "static", axes: font.variationAxes,
    version: font.name.records.version?.en ?? null,
    copyright: font.name.records.copyright?.en ?? "", embeddedLicense: font.name.records.license?.en ?? "",
    unicodeRanges: ranges(font.characterSet), codepointCount: font.characterSet.length,
  };
}

export function verifyFontPackage(lock, read = (path) => readFileSync(resolve(root,path))) {
  const errors=[], paths=new Set(), familyIds=new Set(), faceIds=new Set();
  const fail=(message)=>errors.push(message);
  if(lock.schemaVersion!=="1.0.0" || lock.assetVersion!==assetVersion || !/^[a-f0-9]{40}$/.test(lock.googleFontsRevision)) fail("Invalid package version/revision");
  const fileMap=new Map(lock.files.map((file)=>[file.path,file]));
  for(const file of lock.files) {
    if(paths.has(file.path)) fail(`Duplicate file: ${file.path}`);
    paths.add(file.path);
    if(!file.path.startsWith(`${base}/`) || file.path.split("/").includes("..")) { fail(`Invalid asset version/path: ${file.path}`); continue; }
    if(!/^[a-f0-9]{64}$/.test(file.sha256)) fail(`Invalid checksum: ${file.path}`);
    if(file.url) {
      const host=new URL(file.url).hostname;
      if(!["raw.githubusercontent.com","fonts.googleapis.com","fonts.gstatic.com"].includes(host)) fail(`Non-authoritative URL: ${file.url}`);
      if(host==="raw.githubusercontent.com" && !file.url.startsWith(`https://raw.githubusercontent.com/google/fonts/${lock.googleFontsRevision}/ofl/`)) fail(`Unpinned source: ${file.url}`);
      if(host==="fonts.gstatic.com" && !/\/v\d+\//.test(file.url)) fail(`Unversioned browser source: ${file.url}`);
      if(host==="fonts.googleapis.com" && !file.contentBase64) fail(`Mutable CSS missing replay snapshot: ${file.path}`);
    }
    try {
      const bytes=read(file.path);
      if(hash(bytes)!==file.sha256 || bytes.length!==file.bytes) fail(`Checksum/length mismatch: ${file.path}`);
      if(file.contentBase64 && hash(Buffer.from(file.contentBase64,"base64"))!==file.sha256) fail(`Replay content mismatch: ${file.path}`);
    } catch(error) { fail(`Missing/corrupt asset ${file.path}: ${error.message}`); }
  }
  for(const family of lock.families) {
    if(familyIds.has(family.id)) fail(`Duplicate family ID: ${family.id}`);
    familyIds.add(family.id);
    if(family.assetVersion!==lock.assetVersion || family.sourceRevision!==lock.googleFontsRevision) fail(`Family version mismatch: ${family.id}`);
    if(!/^https:\/\/(?:www\.)?github.com\//.test(family.officialRepository) || !/^[a-f0-9]{40}$/.test(family.officialRevision)) fail(`Official source evidence missing: ${family.id}`);
    try {
      const license=read(family.licensePath).toString("utf8"), notice=read(family.noticePath).toString("utf8");
      if(!license.includes("SIL OPEN FONT LICENSE Version 1.1") || !license.includes(family.copyrightNotice) || !license.includes("PERMISSION & CONDITIONS") || !license.includes("DISCLAIMER")) fail(`License incomplete: ${family.id}`);
      for(const face of family.faces) for(const asset of [face.original,...face.browserAssets]) if(!notice.includes(asset.inspection.copyright)) fail(`Copyright notice missing: ${face.id}`);
    } catch(error) { fail(`License/notice missing: ${family.id}: ${error.message}`); }
    for(const face of family.faces) {
      if(faceIds.has(face.id)) fail(`Duplicate face ID: ${face.id}`);
      faceIds.add(face.id);
      if(face.id!==`${family.id}-${face.weight}-${face.style}` || face.sourceRevision!==lock.googleFontsRevision) fail(`Face identity/revision mismatch: ${face.id}`);
      if(!face.browserAssets.length) fail(`Browser assets missing: ${face.id}`);
      for(const asset of [face.original,...face.browserAssets]) {
        const locked=fileMap.get(asset.path);
        if(!locked || locked.sha256!==asset.sha256 || locked.url!==asset.url) fail(`Asset lock mismatch: ${face.id}`);
        try {
          const actual=inspectFont(read(asset.path),family.family,face.weight,face.style);
          if(JSON.stringify(actual)!==JSON.stringify(asset.inspection)) fail(`Font identity/coverage metadata mismatch: ${asset.path}`);
        } catch(error) { fail(`Missing/corrupt font ${face.id}: ${error.message}`); }
      }
    }
  }
  const required=definitions.flatMap(([id,,,faces])=>faces.map(([weight,style])=>`${id}-${weight}-${style}`));
  if(familyIds.size!==10 || faceIds.size!==15 || required.some((id)=>!faceIds.has(id))) fail("Required face inventory mismatch");
  return errors;
}

async function main() {
  if (process.argv.includes("--finalize")) {
    const lock = JSON.parse(readFileSync(lockPath,"utf8"));
    for (const file of lock.files) {
      const bytes=readFileSync(resolve(root,file.path));
      if(hash(bytes)!==file.sha256) throw new Error(`Checksum mismatch: ${file.path}`);
      if(!file.url || new URL(file.url).hostname==="fonts.googleapis.com") file.contentBase64=bytes.toString("base64");
    }
    for(const family of lock.families) {
      const metadata=readFileSync(resolve(root,`${base}/${family.id}/METADATA.pb`),"utf8");
      family.upstreamCategories=[...metadata.matchAll(/category: "([^"]+)"/g)].map((m)=>m[1]);
    }
    writeFileSync(lockPath,`${JSON.stringify(lock,null,2)}\n`);
    console.log("Finalized offline replay content and upstream categories");
    return;
  }
  if (process.argv.includes("--verify") || process.argv.includes("--replay")) {
    const lock = JSON.parse(readFileSync(lockPath,"utf8"));
    for (const file of lock.files) {
      if (process.argv.includes("--replay")) {
        const bytes=file.contentBase64 ? Buffer.from(file.contentBase64,"base64") : await fetchBytes(file.url);
        if(hash(bytes)!==file.sha256) throw new Error(`Downloaded checksum mismatch: ${file.path}`);
        write(file.path,bytes);
      }
      const bytes = readFileSync(resolve(root,file.path));
      if (hash(bytes)!==file.sha256) throw new Error(`Checksum mismatch: ${file.path}`);
    }
    const errors=verifyFontPackage(lock);
    if(errors.length) throw new Error(errors.join("\n"));
    console.log(`Verified ${lock.files.length} files; ${lock.families.length} families; 15 faces`);
    return;
  }
  if (existsSync(lockPath)) throw new Error("Lock exists: use --verify or --replay; never refresh an existing asset version");
  const files = [], families = [], css = [];
  async function download(url,path) {
    const prior=files.find((file)=>file.path===path);
    if(prior) return readFileSync(resolve(root,path));
    const bytes=await fetchBytes(url); write(path,bytes);
    files.push({ path,url,sha256:hash(bytes),bytes:bytes.length }); return bytes;
  }
  for (const [id,family,slug,faces] of definitions) {
    console.log(`Packaging ${family}`);
    const prefix=`${base}/${id}`;
    const upstream=`https://raw.githubusercontent.com/google/fonts/${revision}/ofl/${slug}`;
    const metadata=(await download(`${upstream}/METADATA.pb`,`${prefix}/METADATA.pb`)).toString("utf8");
    const license=(await download(`${upstream}/OFL.txt`,`${prefix}/OFL.txt`)).toString("utf8");
    if(!license.includes("SIL OPEN FONT LICENSE Version 1.1")) throw new Error(`Unrecognized license: ${family}`);
    const sourceRepo=/repository_url: "([^"]+)"/.exec(metadata)?.[1];
    if(!sourceRepo) throw new Error(`Missing official source: ${family}`);
    const sourceCommit=/commit: "([^"]+)"/.exec(metadata)?.[1] ?? null;
    const fontBlocks=[...metadata.matchAll(/fonts \{([\s\S]*?)\n\}/g)].map((match)=>({
      style:/style: "([^"]+)"/.exec(match[1])?.[1], weight:Number(/weight: (\d+)/.exec(match[1])?.[1]), filename:/filename: "([^"]+)"/.exec(match[1])?.[1],
    }));
    const packagedFaces=[];
    for(const [weight,style] of faces) {
      const faceId=`${id}-${weight}-${style}`;
      const source=fontBlocks.find((font)=>font.style===style && font.weight===weight) ?? fontBlocks.find((font)=>font.style===style && font.filename?.includes("["));
      if(!source) throw new Error(`Required face absent upstream: ${faceId}`);
      const originalPath=`${prefix}/originals/${source.filename}`;
      const originalBytes=await download(`${upstream}/${encodeURIComponent(source.filename)}`,originalPath);
      const original=inspectFont(originalBytes,family,weight,style);
      const query=`https://fonts.googleapis.com/css2?family=${family.replaceAll(" ","+")}:ital,wght@${style==="italic"?1:0},${weight}&display=swap`;
      const sourceCssPath=`${prefix}/browser/${weight}-${style}/upstream.css`;
      const sourceCss=(await download(query,sourceCssPath)).toString("utf8");
      const blocks=[...sourceCss.matchAll(/\/\* ([^*]+) \*\/\s*@font-face\s*\{([^}]+)\}/g)];
      if(!blocks.length) throw new Error(`No WOFF2 subset declarations: ${faceId}`);
      const browserAssets=[];
      for(const [,subset,body] of blocks) {
        const url=/url\((https:\/\/fonts.gstatic.com\/[^)]+\.woff2)\)/.exec(body)?.[1];
        if(!url) throw new Error(`Not first-party WOFF2: ${faceId}`);
        const path=`${prefix}/browser/${weight}-${style}/${subset.trim()}.woff2`;
        const bytes=await download(url,path);
        const inspection=inspectFont(bytes,family,weight,style);
        const unicodeRange=/unicode-range:\s*([^;]+);/.exec(body)?.[1];
        const deliveryRelease=/\/v(\d+)\//.exec(url)?.[1];
        if(!unicodeRange || !deliveryRelease) throw new Error(`Missing delivery version/coverage: ${faceId}`);
        browserAssets.push({ path,sha256:hash(bytes),url,deliveryRelease:`v${deliveryRelease}`,subset:subset.trim(),cssUnicodeRange:unicodeRange,inspection });
        css.push(`/* ${faceId}: ${subset.trim()} */\n@font-face { font-family: "NxClip T2 ${family}"; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url("./${id}/browser/${weight}-${style}/${subset.trim()}.woff2") format("woff2"); unicode-range: ${unicodeRange}; }`);
      }
      packagedFaces.push({ id:faceId,weight,style,sourceRevision:revision,original:{path:originalPath,sha256:hash(originalBytes),url:`${upstream}/${encodeURIComponent(source.filename)}`,inspection:original},browserAssets,cssSourcePath:sourceCssPath });
    }
    const notices=[...new Set(packagedFaces.flatMap((face)=>[face.original.inspection.copyright,...face.browserAssets.map((asset)=>asset.inspection.copyright)]))];
    const noticePath=`${prefix}/NOTICE.txt`;
    const notice=Buffer.from(`NxClip font asset package ${assetVersion}\nFamily: ${family}\nLicense: OFL-1.1; see OFL.txt (unmodified source license).\nGoogle Fonts distribution revision: ${revision}\nOfficial project: ${sourceRepo}\n\nEmbedded copyright notices (preserved verbatim):\n${notices.join("\n\n")}\n\nOriginal source binaries and first-party browser subsets are independently versioned. No binary conversion or weight/style synthesis was performed by NxClip. See font-source-lock.json for per-file URLs and checksums.\n`);
    write(noticePath,notice);files.push({path:noticePath,url:null,sha256:hash(notice),bytes:notice.length});
    families.push({id,family,assetVersion,sourceRevision:revision,officialRepository:sourceRepo,officialRevision:sourceCommit,metadataUrl:`${upstream}/METADATA.pb`,licenseUrl:`${upstream}/OFL.txt`,licensePath:`${prefix}/OFL.txt`,noticePath,copyrightNotice:license.split(/\r?\n/)[0],reservedFontNames:[...license.matchAll(/Reserved Font Name "([^"]+)"/g)].map((m)=>m[1]),upstreamCategories:[...metadata.matchAll(/category: "([^"]+)"/g)].map((m)=>m[1]),upstreamSubsets:[...metadata.matchAll(/subsets: "([^"]+)"/g)].map((m)=>m[1]).filter((s)=>s!=="menu"),faces:packagedFaces});
  }
  const cssPath=`${base}/fonts.css`, cssBytes=Buffer.from(`${css.join("\n\n")}\n`);
  write(cssPath,cssBytes);files.push({path:cssPath,url:null,sha256:hash(cssBytes),bytes:cssBytes.length});
  const lock={schemaVersion:"1.0.0",assetVersion,googleFontsRevision:revision,cssPath,userAgent:ua,files,families};
  for(const file of files) if(!file.url || new URL(file.url).hostname==="fonts.googleapis.com") file.contentBase64=readFileSync(resolve(root,file.path)).toString("base64");
  writeFileSync(lockPath,`${JSON.stringify(lock,null,2)}\n`);
  console.log(`Packaged ${files.length} files; ${families.length} families; 15 faces`);
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
