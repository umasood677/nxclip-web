import React, { useMemo, useState } from "react";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import type { AdSceneGraph } from "../types";
import { isIntelligentAdStudioEnabled } from "../lib/intelligentAdStudioFlag";
import { IntelligentAdStudioPanel } from "./IntelligentAdStudioPanel";
import type { CreativeContext } from "./contracts/ad-creative-proposals";
import type { W87EnhancementSlot } from "../composition/W87SyntheticCompositionEditor";
import { buildIntelligentCreativeContext } from "./buildIntelligentCreativeContext";

type Props = {
  enabled?: boolean;
  ownerUserId: string;
  projectId: string | null;
  creativeId: string;
  graph: AdSceneGraph;
  brandKit: BrandKitSummary | null;
  assetUrls: Readonly<Record<string, string>>;
  onCommitGraph: (graph: AdSceneGraph) => void;
  /** Portal targets for L/R collapsible composition docks. */
  leftMount?: HTMLElement | null;
  rightMount?: HTMLElement | null;
};

/**
 * Wires existing IntelligentAdStudioPanel into the static editor.
 * LOCAL SYNTHETIC ONLY — no paid AI. Returns null when flag is off.
 */
export function IntelligentAdStudioHost({
  enabled,
  ownerUserId,
  projectId,
  creativeId,
  graph,
  brandKit,
  assetUrls,
  onCommitGraph,
  leftMount,
  rightMount,
}: Props) {
  const on = enabled ?? isIntelligentAdStudioEnabled();
  const [revision, setRevision] = useState(0);
  const [context, setContext] = useState<CreativeContext | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [hardBlock, setHardBlock] = useState(false);

  const built = useMemo(() => {
    if (!on) {
      return {
        context: null as CreativeContext | null,
        reason: null as string | null,
        hardBlock: false,
        code: null as string | null,
      };
    }
    const result = buildIntelligentCreativeContext({
      ownerUserId,
      projectId,
      creativeId,
      graph,
      brandKit,
      revision,
    });
    if (!result.ok) {
      return {
        context: null,
        reason: result.reason,
        hardBlock: true,
        code: result.code,
      };
    }
    return {
      context: result.context,
      reason: result.notice,
      hardBlock: false,
      code: null,
    };
  }, [on, projectId, brandKit, graph, ownerUserId, creativeId, revision]);

  React.useEffect(() => {
    setContext(built.context);
    setBlockReason(built.reason);
    setHardBlock(built.hardBlock);
  }, [built]);

  if (!on) return null;

  const gated = Boolean(hardBlock && blockReason && !context);

  const slot: W87EnhancementSlot = {
    graph,
    revision,
    variationId: creativeId,
    productLayerId: context?.roles.product?.[0] ?? "",
    commit: (next) => {
      onCommitGraph(next as AdSceneGraph);
      setRevision((r) => r + 1);
    },
    createVariation: (next) => {
      onCommitGraph(next as AdSceneGraph);
      setRevision((r) => r + 1);
    },
  };

  const store = {
    read: (k: string) => {
      try {
        return localStorage.getItem(`nxclip.intelligent.dna.${k}`);
      } catch {
        return null;
      }
    },
    write: (k: string, v: string) => {
      try {
        localStorage.setItem(`nxclip.intelligent.dna.${k}`, v);
      } catch {
        /* ignore quota */
      }
    },
    remove: (k: string) => {
      try {
        localStorage.removeItem(`nxclip.intelligent.dna.${k}`);
      } catch {
        /* ignore */
      }
    },
  };

  const docked = Boolean(leftMount && rightMount);

  return (
    <div
      className={docked ? undefined : "mt-3 space-y-2"}
      data-testid="intelligent-ad-studio-host"
    >
      {blockReason ? (
        <section
          className="w0a-note"
          aria-label={
            gated
              ? "Creative tools unavailable"
              : "Creative tools notice"
          }
          data-intelligent-block={built.code ?? (gated ? "HARD" : "SOFT")}
        >
          <p className="text-xs font-semibold tracking-wide" style={{ margin: 0 }}>
            {gated
              ? "Creative tools need a ready Brand Kit"
              : "Some brand assets are still linking"}
          </p>
          <p className="mt-1 text-xs" style={{ marginBottom: 0, opacity: 0.9 }}>
            {blockReason}
          </p>
        </section>
      ) : null}
      {context && !gated ? (
        <IntelligentAdStudioPanel
          enabled
          context={context}
          slot={slot}
          assetUrls={assetUrls}
          store={store}
          measure={() => ({ height: 48, maxWidth: 400, missingGlyphs: [] })}
          leftMount={leftMount}
          rightMount={rightMount}
          onContextChange={(c) => {
            setContext(c);
            setRevision(c.revision);
          }}
        />
      ) : null}
    </div>
  );
}
