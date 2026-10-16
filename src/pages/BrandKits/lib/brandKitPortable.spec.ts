import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  exportBrandKit,
  exportBrandKitBundle,
  stringifyExport,
} from "./brandKitExport";
import { isImportable, mapImportDocument } from "./brandKitImportMap";
import { parseBrandKitJsonText } from "./brandKitSafeJson";
import { adaptLegacySeedEnvelope, isLegacySeedEnvelope } from "./brandKitSeedAdapter";
import type { BrandKitSummary } from "./brandKitTypes";

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, "../fixtures/four-brand-kits.seed.json");

describe("Brand Kit portable JSON", () => {
  it("rejects malformed and polluted JSON", () => {
    assert.equal(parseBrandKitJsonText("{").ok, false);
    const polluted = parseBrandKitJsonText(
      JSON.stringify({ brand: { name: "X" }, constructor: { evil: true } }),
    );
    assert.equal(polluted.ok, false);
  });

  it("imports the four seed kits via legacy adapter", () => {
    const raw = readFileSync(seedPath, "utf8");
    const parsed = parseBrandKitJsonText(raw);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(isLegacySeedEnvelope(parsed.value), true);
    const adapted = adaptLegacySeedEnvelope(parsed.value as never);
    assert.equal(adapted.length, 4);
    assert.ok(adapted.some((k) => k.brand.name === "ZoeArtisan"));
    assert.ok(adapted.some((k) => k.brand.name === "Vortex Play"));
    assert.ok(adapted.some((k) => k.brand.name === "Aurelia Skin"));
    assert.ok(adapted.some((k) => k.brand.name === "FlowPay"));

    const mapped = mapImportDocument(parsed.value);
    assert.equal(mapped.length, 4);
    assert.ok(mapped.every(isImportable));
    const zoe = mapped.find((m) => m.portable.brand.name === "ZoeArtisan");
    assert.ok(zoe);
    assert.equal(zoe!.createPayload.voice.signatureProduct, "Signature Red Matte Lipstick");
    assert.ok(zoe!.assetsRequiringReupload.some((a) => a.role === "brand_model"));
    assert.ok(zoe!.colors.some((c) => c.role === "primary" && c.hex === "#A6192E"));
  });

  it("round-trips export → import for supported fields", () => {
    const kit: BrandKitSummary = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "FlowPay",
      description: "Payments",
      guidelines: "Keep it clear",
      voice: {
        industry: "Fintech / SaaS",
        tagline: "Money that moves with you.",
        preferredCta: "Start free",
        doSay: ["transparent fees"],
        creative: { visualStyle: "Clean emerald/navy" },
      },
      colors: [
        { role: "primary", hex: "#059669" },
        { role: "secondary", hex: "#0F172A" },
      ],
      typography: [
        { role: "heading", family: "Montserrat", weight: "700" },
        { role: "body", family: "Inter", weight: "400" },
      ],
      assets: [
        {
          id: "asset-1",
          role: "logo_primary",
          status: "ready",
          label: "Logo",
          readUrl: "https://signed.example/secret?token=abc",
        },
      ],
    };
    const exported = exportBrandKit(kit);
    const text = stringifyExport(exported);
    assert.ok(!text.includes("signed.example"));
    assert.ok(!text.includes("token=abc"));
    assert.ok(!text.includes("asset-1"));

    const reimported = mapImportDocument(JSON.parse(text));
    assert.equal(reimported.length, 1);
    assert.ok(isImportable(reimported[0]!));
    assert.equal(reimported[0]!.createPayload.name, "FlowPay");
    assert.equal(reimported[0]!.createPayload.voice.industry, "Fintech / SaaS");
    assert.ok(reimported[0]!.assetsRequiringReupload[0]?.requiresReupload);

    const bundle = exportBrandKitBundle([kit]);
    assert.equal(bundle.type, "nxclip.brand-kit-bundle");
    assert.equal(bundle.kits.length, 1);
  });

  it("rejects unsupported schema versions", () => {
    const mapped = mapImportDocument({
      schemaVersion: "9.9",
      type: "nxclip.brand-kit",
      brand: { name: "Nope" },
    });
    assert.ok(mapped.some((m) => m.issues.some((i) => i.level === "error")));
  });

  it("normalizes role-keyed assets object without throwing on preview", () => {
    const mapped = mapImportDocument({
      schemaVersion: "1.0",
      type: "nxclip.brand-kit",
      brand: { name: "ZoeArtisan" },
      assets: {
        logo_primary: { label: "Zoe mark", usageGuidance: "Keep clear space" },
        product_image: { name: "Lipstick" },
      },
    });
    assert.equal(mapped.length, 1);
    assert.ok(isImportable(mapped[0]!));
    const roles = mapped[0]!.assetsRequiringReupload.map((a) => a.role).sort();
    assert.deepEqual(roles, ["logo_primary", "product_image"]);
  });

  it("imports legacy seed with object-shaped assets", () => {
    const mapped = mapImportDocument({
      format: "nxclip-brand-seed",
      version: "seed-1",
      kits: [
        {
          brandName: "Object Assets Co",
          palette: { primary: "#112233" },
          assets: {
            logo_primary: { name: "Mark", usage: "Centered" },
          },
        },
      ],
    });
    assert.equal(mapped.length, 1);
    assert.ok(isImportable(mapped[0]!));
    assert.equal(mapped[0]!.assetsRequiringReupload[0]?.role, "logo_primary");
  });
});
