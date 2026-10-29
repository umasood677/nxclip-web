import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { brandFontPlan } from "./brandFontPreview";
import {
  brandBrochureTheme,
  brandSectionInk,
} from "../guided/brandBrochureTheme";

test("ZOE heading uses packaged Playfair while Montserrat 400/700 uses retained variable outlines, never synthetic weights", () => {
  const heading = brandFontPlan({ family: "Playfair Display", weight: "700" });
  assert.equal(heading?.weight, 700);
  assert.ok(heading?.font.faces[0].browser?.assets.length);
  for (const weight of ["400", "700"]) {
    const plan = brandFontPlan({ family: "Montserrat", weight });
    assert.ok(plan);
    const face = plan.font.faces[0],
      asset = face.browser!.assets[0];
    assert.equal(face.weight, Number(weight));
    assert.equal(asset.inspection.kind, "variable");
    assert.ok(asset.inspection.axes.wght.min <= Number(weight));
    assert.ok(asset.inspection.axes.wght.max >= Number(weight));
    assert.equal(
      createHash("sha256").update(readFileSync(asset.path)).digest("hex"),
      asset.sha256,
    );
    assert.equal(face.exportSupport, "blocked");
  }
});
test("unknown families and unsupported weights never substitute another branded face silently", () => {
  assert.equal(
    brandFontPlan({ family: "Unprovisioned custom font", weight: "400" }),
    null,
  );
  assert.equal(brandFontPlan({ family: "Montserrat", weight: "2000" }), null);
});
test("brochure uses saved brand colors with contrasting section text and rejects unsafe color values", () => {
  const theme = brandBrochureTheme({
    id: "synthetic",
    name: "Brand",
    colors: [
      { role: "primary", hex: "#A6192E" },
      { role: "secondary", hex: "#800020" },
      { role: "accent", hex: "#4A251C" },
    ],
  });
  assert.equal(theme.primary, "#A6192E");
  assert.equal(theme.secondary, "#800020");
  assert.equal(theme.primaryInk, "#ffffff");
  assert.equal(brandSectionInk("#ffffff"), "#111318");
  assert.equal(
    brandBrochureTheme({
      id: "test",
      name: "Test",
      colors: [{ role: "primary", hex: "url(https://example.test)" }],
    }).primary,
    "#31272c",
  );
});
