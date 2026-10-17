import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  readSelectedConceptId,
  writeSelectedConceptId,
} from "./selectedConceptStorage.ts";

describe("selectedConceptStorage (UX-1)", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    // @ts-expect-error test stub
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
  });

  it("persists and reads selected concept per project", () => {
    writeSelectedConceptId("proj-a", "concept-1");
    assert.equal(readSelectedConceptId("proj-a"), "concept-1");
    assert.equal(readSelectedConceptId("proj-b"), null);
  });

  it("clears selection when conceptId is null", () => {
    writeSelectedConceptId("proj-a", "concept-1");
    writeSelectedConceptId("proj-a", null);
    assert.equal(readSelectedConceptId("proj-a"), null);
  });
});

describe("concept preview state machine (UX-1)", () => {
  function resolvePreviewState(input: {
    conceptsLoading?: boolean;
    conceptsError?: string | null;
    projectId?: string | null;
    conceptsLength?: number;
    selectedConcept?: boolean;
  }): string {
    if (input.conceptsLoading) return "loading";
    if (input.conceptsError) return "error";
    if (!input.projectId) return "brief";
    if (!input.conceptsLength) return "empty";
    if (input.selectedConcept) return "selected";
    return "brief";
  }

  it("maps gallery selection to live preview selected state", () => {
    assert.equal(
      resolvePreviewState({
        projectId: "p1",
        conceptsLength: 3,
        selectedConcept: true,
      }),
      "selected",
    );
  });

  it("shows empty when project has no concepts", () => {
    assert.equal(
      resolvePreviewState({ projectId: "p1", conceptsLength: 0 }),
      "empty",
    );
  });

  it("shows loading while concepts fetch", () => {
    assert.equal(resolvePreviewState({ conceptsLoading: true }), "loading");
  });
});
