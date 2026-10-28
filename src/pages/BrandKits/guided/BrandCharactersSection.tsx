import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { EmptyState } from "../../../components/common/EmptyState";
import { brandApi } from "../../../services/apiClient";
import type {
  BrandCharacterProfile,
  BrandKitSummary,
} from "../lib/brandKitTypes";
import {
  CHARACTER_SCOPES,
  characterReviewIssues,
  newBrandCharacter,
} from "./brandCharacterModel";
type Props = {
  kit: BrandKitSummary;
  disabled?: boolean;
  onKitUpdated: (kit: BrandKitSummary) => void;
};
export function BrandCharactersSection({
  kit,
  disabled = false,
  onKitUpdated,
}: Props) {
  const [draft, setDraft] = useState<BrandCharacterProfile | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const baseline = useRef(""),
    draftVersion = useRef(kit.version);
  const dirty = !!draft && JSON.stringify(draft) !== baseline.current;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const choose = (next: BrandCharacterProfile) => {
    if (dirty && !window.confirm("Discard unsaved character edits?")) return;
    setDraft(next);
    baseline.current = JSON.stringify(next);
    draftVersion.current = kit.version;
    setError("");
    setMessage("");
  };
  const profiles = kit.voice?.studio?.characters || [],
    assets = (kit.assets || []).filter(
      (a) => a.status === "ready" && a.mimeType?.startsWith("image/"),
    );
  const edit = (patch: Partial<BrandCharacterProfile>) => {
    if (draft)
      setDraft({ ...draft, ...patch, status: patch.status || "draft" });
  };
  const permission = (patch: Partial<BrandCharacterProfile["permissions"]>) =>
    draft && edit({ permissions: { ...draft.permissions, ...patch } });
  const save = async () => {
    if (!draft || !kit.voice?.studio || disabled) return;
    const issues = characterReviewIssues(draft, kit.assets || []);
    if (issues.length) {
      setError(issues.join(" "));
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated: BrandKitSummary = await brandApi.updateKit(kit.id, {
        expectedVersion: draftVersion.current,
        voice: {
          studio: {
            ...kit.voice.studio,
            characters: [...profiles.filter((p) => p.id !== draft.id), draft],
          },
        },
      });
      onKitUpdated(updated);
      baseline.current = JSON.stringify(draft);
      draftVersion.current = updated.version;
      setMessage(
        "Character profile saved with the Brand Kit version. No image generation occurred.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save character. Your draft is retained.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (!kit.voice?.studio)
    return (
      <EmptyState
        title="Connect character guidance to your Brand Kit"
        description="Complete the guided category and identity setup before adding models or mascots."
        actionLabel="Open guided setup"
        onAction={() => window.location.assign("/brands/" + kit.id + "/guided")}
      />
    );
  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold">Models & Mascots</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Reusable character identity and usage guidance. Uploading a person's
          photo does not establish permission to use their likeness.
        </p>
      </header>
      {disabled && (
        <p role="status" className="text-sm text-amber-200">
          Save your identity edits before changing character profiles.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-200">
          {message}
        </p>
      )}
      <fieldset disabled={disabled || saving} className="min-w-0 space-y-5">
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              onClick={() => {
                choose(structuredClone(p));
              }}
            >
              {p.name} · {p.status}
            </Button>
          ))}
          <Button
            onClick={() => {
              choose(newBrandCharacter());
            }}
          >
            <Plus size={15} /> Add model or mascot
          </Button>
        </div>
        {!profiles.length && !draft && (
          <EmptyState
            title="No character profiles yet"
            description="Add an authorized human reference, an original mascot or a fictional character. Approval remains an explicit decision."
          />
        )}
        {draft && (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <label className="grid gap-2 text-sm">
                Character name
                <Input
                  value={draft.name}
                  maxLength={120}
                  onChange={(e) => edit({ name: e.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Character type
                <select
                  className="h-10 rounded-md border border-input bg-background px-3"
                  value={draft.kind}
                  onChange={(e) =>
                    edit({
                      kind: e.target.value as BrandCharacterProfile["kind"],
                    })
                  }
                >
                  <option value="human-model">Authorized human model</option>
                  <option value="mascot">Fictional mascot</option>
                  <option value="fictional-character">
                    Fictional character
                  </option>
                </select>
              </label>
              {(
                [
                  "appearance",
                  "style",
                  "wardrobe",
                  "expressions",
                  "consistencyRules",
                ] as const
              ).map((key) => (
                <label className="grid gap-2 text-sm" key={key}>
                  {
                    {
                      appearance: "Appearance",
                      style: "Visual style",
                      wardrobe: "Wardrobe preferences",
                      expressions: "Expression preferences",
                      consistencyRules: "Character consistency rules",
                    }[key]
                  }
                  <Textarea
                    rows={2}
                    maxLength={
                      key === "consistencyRules"
                        ? 2000
                        : key === "appearance"
                          ? 1500
                          : 1000
                    }
                    value={draft[key]}
                    onChange={(e) => edit({ [key]: e.target.value })}
                  />
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                A fictional identity profile can be saved without an image.
                Creating artwork requires a separate explicit generation action
                once available.
              </p>
            </section>
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <h3 className="font-semibold">Reference images</h3>
              <p className="text-xs text-muted-foreground">
                Select up to eight authorized reference images.
              </p>
              {!assets.length ? (
                <EmptyState
                  title="No ready image references"
                  description="Upload references through the existing Brand Kit asset manager. Other accounts' assets cannot be selected."
                />
              ) : (
                assets.map((asset) => (
                  <label key={asset.id} className="flex gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.referenceAssetIds.includes(asset.id)}
                      disabled={
                        !draft.referenceAssetIds.includes(asset.id) &&
                        draft.referenceAssetIds.length >= 8
                      }
                      onChange={(e) =>
                        edit({
                          referenceAssetIds: e.target.checked
                            ? [...draft.referenceAssetIds, asset.id]
                            : draft.referenceAssetIds.filter(
                                (id) => id !== asset.id,
                              ),
                        })
                      }
                    />
                    <span>
                      {asset.label || asset.fileName || "Brand reference"}{" "}
                      <small className="text-muted-foreground">
                        {asset.role}
                      </small>
                    </span>
                  </label>
                ))
              )}
              <Link
                className="inline-flex text-sm underline underline-offset-4"
                to={"/brands/" + kit.id + "/guided?step=assets"}
                onClick={(event) => {
                  if (
                    dirty &&
                    !window.confirm(
                      "Leave without saving the character draft? Cancel to stay and save.",
                    )
                  )
                    event.preventDefault();
                }}
              >
                Manage uploaded references
              </Link>
              <hr className="border-white/10" />
              <h3 className="font-semibold">Usage authorization</h3>
              <label className="grid gap-2 text-sm">
                Authorization basis
                <select
                  className="h-10 rounded-md border border-input bg-background px-3"
                  value={draft.permissions.origin}
                  onChange={(e) =>
                    permission({
                      origin: e.target
                        .value as BrandCharacterProfile["permissions"]["origin"],
                    })
                  }
                >
                  <option value="unverified">Not established</option>
                  <option value="owner-created">
                    Original character created by owner
                  </option>
                  <option value="licensed">Licensed usage</option>
                  <option value="consented">Explicit likeness consent</option>
                </select>
              </label>
              <label className="flex gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.permissions.commercialUse}
                  onChange={(e) =>
                    permission({ commercialUse: e.target.checked })
                  }
                />
                I have authority for commercial use within the selected scopes
              </label>
              {draft.kind === "human-model" && (
                <label className="flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.permissions.likenessConsent}
                    onChange={(e) =>
                      permission({ likenessConsent: e.target.checked })
                    }
                  />
                  I have explicit permission to use this person's likeness
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {CHARACTER_SCOPES.map((scope) => (
                  <Button
                    key={scope}
                    variant={
                      draft.permissions.scopes.includes(scope)
                        ? "default"
                        : "outline"
                    }
                    aria-pressed={draft.permissions.scopes.includes(scope)}
                    onClick={() =>
                      permission({
                        scopes: draft.permissions.scopes.includes(scope)
                          ? draft.permissions.scopes.filter((s) => s !== scope)
                          : [...draft.permissions.scopes, scope],
                      })
                    }
                  >
                    {scope}
                  </Button>
                ))}
              </div>
              <label className="grid gap-2 text-sm">
                Authorization record / reference
                <Textarea
                  value={draft.permissions.evidence}
                  maxLength={1000}
                  onChange={(e) => permission({ evidence: e.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Authorization valid through (UTC, optional)
                <Input
                  type="date"
                  value={draft.permissions.expiresAt?.slice(0, 10) || ""}
                  onChange={(e) =>
                    permission({
                      expiresAt: e.target.value
                        ? e.target.value + "T23:59:59.000Z"
                        : undefined,
                    })
                  }
                />
              </label>
              <p className="text-xs text-muted-foreground">
                These are owner declarations, not independent legal
                verification. Approval does not guarantee identity preservation
                by a provider.
              </p>
              <label className="grid gap-2 text-sm">
                Review state
                <select
                  className="h-10 rounded-md border border-input bg-background px-3"
                  value={draft.status}
                  onChange={(e) =>
                    edit({
                      status: e.target.value as BrandCharacterProfile["status"],
                    })
                  }
                >
                  <option value="draft">
                    Draft — unavailable to generation
                  </option>
                  <option value="approved">Approved for declared scopes</option>
                  <option value="archived">
                    Archived — unavailable to generation
                  </option>
                </select>
              </label>
              <Button onClick={() => void save()} disabled={saving}>
                <Save size={15} />
                {saving ? "Saving…" : "Save character profile"}
              </Button>
            </section>
          </div>
        )}
      </fieldset>
    </section>
  );
}
