import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FontLoaderService, type LoaderEnvironment } from "./FontLoaderService";

describe("Clip FontLoaderService", () => {
  it("is lazy, selects subsets, deduplicates and caches concurrent loads", async () => {
    let calls = 0;
    const environment: LoaderEnvironment = { load: async (_family, url) => { calls++; assert.ok(url.startsWith('/fonts/clip-typography/1.0.0/')); return {}; }, remove: () => undefined };
    const loader = new FontLoaderService(environment);
    assert.equal(calls, 0);
    await Promise.all([loader.loadFont('inter', 700, 'normal', 'Hello!'), loader.loadFont('inter', 700, 'normal', 'Hello!')]);
    assert.equal(loader.getFontLoadStatus('inter', 700, 'normal', 'Hello!'), 'loaded');
    const count = calls;
    await loader.loadFont('inter', 700, 'normal', 'Hello!');
    assert.equal(calls, count);
    assert.ok(calls < 7);
  });
  it("rejects unknown IDs, unavailable styles/weights and unsupported characters", async () => {
    const loader = new FontLoaderService({ load: async () => ({}), remove: () => undefined });
    await assert.rejects(loader.loadFont('unknown', 700));
    await assert.rejects(loader.loadFont('inter', 400));
    await assert.rejects(loader.loadFont('inter', 700, 'italic'));
    await assert.rejects(loader.loadFont('anton', 400, 'normal', 'اردو'));
    await assert.rejects(loader.loadFont('anton', 400, 'normal', 'Ω'));
  });
  it("reports failures and allows an explicit retry", async () => {
    let fail = true;
    const loader = new FontLoaderService({ load: async () => { if (fail) throw new Error('network'); return {}; }, remove: () => undefined });
    await assert.rejects(loader.loadFont('anton', 400, 'normal', 'Aa'));
    assert.equal(loader.getFontLoadStatus('anton', 400, 'normal', 'Aa'), 'failed');
    fail = false;
    await loader.loadFont('anton', 400, 'normal', 'Aa');
    assert.equal(loader.getFontLoadStatus('anton', 400, 'normal', 'Aa'), 'loaded');
  });
  it("times out stalled loads and never caches late completion as success", async () => {
    let resolveLoad: ((face: unknown) => void) | undefined;
    let removed = 0;
    const loader = new FontLoaderService({ load: () => new Promise((resolve) => { resolveLoad = resolve; }), remove: () => { removed++; } }, 5);
    await assert.rejects(loader.loadFont('anton', 400, 'normal', 'Aa'), /timeout/);
    resolveLoad!({});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(removed, 1);
    assert.equal(loader.getFontLoadStatus('anton', 400, 'normal', 'Aa'), 'failed');
  });
  it("preloads only explicit popular requests and releases unused faces", async () => {
    let removed = 0;
    const loader = new FontLoaderService({ load: async () => ({}), remove: () => { removed++; } });
    await loader.preloadPopularFonts();
    assert.equal(loader.getFontLoadStatus('inter', 700, 'normal', 'Aa09!?'), 'loaded');
    assert.ok(loader.clearUnusedFonts(0) > 0);
    assert.ok(removed > 0);
    assert.equal(loader.getFontLoadStatus('inter', 700, 'normal', 'Aa09!?'), 'idle');
  });
  it("does not report document/system fallback as a successful face load", async () => {
    await assert.rejects(new FontLoaderService().loadFont('anton', 400, 'normal', 'Aa'), /FontFace API unavailable/);
  });
});
