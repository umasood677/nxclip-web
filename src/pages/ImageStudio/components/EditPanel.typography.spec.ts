import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src/pages/ImageStudio/components");

describe("Image Studio Typography panel registration (P0)", () => {
  it("registers Typography accordion (not Captions) in EditPanel", () => {
    const src = readFileSync(join(root, "EditPanel.tsx"), "utf8");
    assert.match(src, /AccordionItem value="typography"/);
    assert.match(src, /ImageStudioTypographyControls/);
    assert.match(src, /defaultValue:\s*['"]Typography['"]/);
    assert.doesNotMatch(src, /AccordionItem value="captions"/i);
    assert.doesNotMatch(src, /AccordionItem value="text"/);
  });

  it("ships complete typography controls module", () => {
    const src = readFileSync(
      join(root, "ImageStudioTypographyControls.tsx"),
      "utf8",
    );
    assert.match(src, /Layer text|Characteristics|fontSizePct|outline/);
    assert.match(src, /onAddTextLayer|onUpdateSelectedLayer/);
    // Must not be a captions-only stub
    assert.ok(src.length > 2000);
  });
});
