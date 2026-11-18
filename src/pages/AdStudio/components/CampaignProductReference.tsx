import { Button } from "../../../components/ui/button";
import { Link } from "react-router-dom";
import type { BrandKitSummary } from "../../BrandKits/lib/brandKitTypes";
import { approvedCampaignProductPhotos, campaignProductSuggestion } from "../lib/campaignProductReference";
import { isCampaignStyleReference } from "../../BrandKits/lib/assetSlots";

export function CampaignProductReference({ brand, campaignText, value, assetUrls, disabled, onChange, styleReferenceId, onStyleReferenceChange }: {
  brand: BrandKitSummary;
  campaignText: string;
  value?: string | null;
  assetUrls: Readonly<Record<string, string>>;
  disabled: boolean;
  onChange: (assetId: string | null) => void;
  styleReferenceId?: string | null;
  onStyleReferenceChange?: (assetId: string | null) => void;
}) {
  const photos = approvedCampaignProductPhotos(brand);
  const approvedIds = new Set(photos.map(photo => photo.id));
  const pendingPhotos = (brand.assets ?? []).filter(photo =>
    photo.role === "product_image" && photo.status === "ready" && !approvedIds.has(photo.id),
  );
  const selected = photos.find(photo => photo.id === value);
  const suggestion = value === undefined ? campaignProductSuggestion(brand, photos, campaignText) : undefined;
  const shown = selected ?? suggestion;
  const image = shown && (assetUrls[shown.id] || shown.readUrl);
  const styleReferences = (brand.assets ?? []).filter(asset => isCampaignStyleReference(asset, brand));
  const approvedStyles = styleReferences.filter(asset => brand.voice?.studio?.approvedAssetIds?.includes(asset.id));
  const pendingStyles = styleReferences.filter(asset => !approvedStyles.some(approved => approved.id === asset.id));

  return (
    <section className="campaign-brief__references" aria-labelledby="campaign-brand-references">
      <h2 id="campaign-brand-references" className="campaign-brief__label">Brand Kit references</h2>
      <div className="flex flex-wrap items-start gap-3">
        {image && <img src={image} alt="" className="size-16 rounded-md border border-border bg-background object-contain" />}
        <div className="min-w-0 flex-1 space-y-2">
          <label className="campaign-brief__field grid gap-1">
            <span className="sr-only">Product photograph</span>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              value={value ?? ""} disabled={disabled} onChange={event => onChange(event.target.value || null)}>
              <option value="">No product reference</option>
              {value && !selected && !pendingPhotos.some(photo => photo.id === value) && <option value={value} disabled>Saved reference unavailable</option>}
              {photos.map(photo => <option key={photo.id} value={photo.id}>{photo.label || photo.fileName || "Product photograph"}</option>)}
              {pendingPhotos.length > 0 && <optgroup label="Needs Brand Kit approval">
                {pendingPhotos.map(photo => <option key={photo.id} value={photo.id} disabled>{photo.label || photo.fileName || "Product photograph"}</option>)}
              </optgroup>}
            </select>
          </label>
          {suggestion && <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">Suggested from the brief · {suggestion.label}</p>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange(suggestion.id)}>Use reference</Button>
          </div>}
          {value && !selected
            ? <p role="alert" className="text-xs text-destructive">Choose an approved replacement or clear this reference before continuing.</p>
            : <p className="text-xs text-muted-foreground">{photos.length
              ? "Save the brief to carry this photo into Creative Directions and artwork generation."
              : pendingPhotos.length ? "Approve a product photo to use it in this campaign." : "Upload a product photo to this Brand Kit to use it as a reference."}</p>}
          {(!photos.length || pendingPhotos.length > 0 || pendingStyles.length > 0) && <Link
            className="w0a-link text-xs"
            to={`/brands/${encodeURIComponent(brand.id)}/guided?step=assets`}
            target="_blank"
            rel="noopener"
          >{pendingPhotos.length || pendingStyles.length ? "Review asset approvals" : "Open Brand Kit assets"}</Link>}
        </div>
      </div>
      {onStyleReferenceChange && <div className="mt-3 space-y-1.5">
        <label className="campaign-brief__field grid gap-1">
          <span>Style reference (optional)</span>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            value={styleReferenceId ?? ""} disabled={disabled}
            onChange={event => onStyleReferenceChange(event.target.value || null)}>
            <option value="">No style reference</option>
            {styleReferenceId && !styleReferences.some(asset => asset.id === styleReferenceId) &&
              <option value={styleReferenceId} disabled>Saved style reference unavailable</option>}
            {approvedStyles.map(asset => <option key={asset.id} value={asset.id}>{asset.label || asset.fileName || "Style reference"}</option>)}
            {pendingStyles.length > 0 && <optgroup label="Needs Brand Kit approval">
              {pendingStyles.map(asset => <option key={asset.id} value={asset.id} disabled>{asset.label || asset.fileName || "Style reference"}</option>)}
            </optgroup>}
          </select>
        </label>
        {styleReferenceId && !approvedStyles.some(asset => asset.id === styleReferenceId)
          ? <p role="alert" className="text-xs text-destructive">Replace or clear this style reference before generating.</p>
          : <p className="text-xs text-muted-foreground">An approved image can guide colors, lighting, or composition.</p>}
      </div>}
    </section>
  );
}
