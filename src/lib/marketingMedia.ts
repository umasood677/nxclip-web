/**
 * Marketing media for Home.
 * Pinned lookbook reels (see marketingCatalog) — campaign stills/clips, not live search.
 */
import {
  CLIP_EDITOR_REEL,
  COACH_REEL,
  HERO_REEL,
  IMAGE_STUDIO_REEL,
  MARKETING_CATALOG,
  MEME_REEL,
  PIPELINE_CREATE_REEL,
  PIPELINE_MODERATE_REEL,
  PIPELINE_PUBLISH_REEL,
  SPOTLIGHT_CATALOG,
  VIRAL_CLIPS_REEL,
  pexelsPhotoSrc,
  type CatalogPin,
  type MarketingSlot,
  type NicheKey,
} from "./marketingCatalog";
import {
  fetchPexelsPhotoById,
  fetchPexelsVideoById,
  pickVideoFile,
  type PexelsPhoto,
  type PexelsVideo,
} from "../services/pexelsService";

export type { MarketingSlot, NicheKey };

export type MarketingMediaSource = "pexels" | "cms" | "fallback";

export type MarketingMedia = {
  type: "image" | "video";
  src: string;
  poster?: string;
  creditName: string;
  creditUrl: string;
  source: MarketingMediaSource;
  alt?: string;
  niche?: NicheKey;
  aspectHint?: "landscape" | "portrait" | "square";
};

export type OsLayerKey =
  | "create"
  | "organize"
  | "distribute"
  | "operate"
  | "measure"
  | "guide";

const slotCache = new Map<string, MarketingMedia>();
const reelCache = new Map<string, MarketingMedia[]>();

function photoToMedia(photo: PexelsPhoto, pin?: CatalogPin): MarketingMedia {
  return {
    type: "image",
    src: photo.src.large || photo.src.landscape || photo.src.medium,
    poster: photo.src.medium,
    creditName: pin?.creditName || photo.photographer || "Pexels",
    creditUrl: pin?.creditUrl || photo.photographer_url || photo.url || "https://www.pexels.com",
    source: "pexels",
    alt: pin?.alt || photo.alt || "nxClip marketing visual",
    niche: pin?.niche,
    aspectHint: photo.height > photo.width ? "portrait" : "landscape",
  };
}

function videoToMedia(video: PexelsVideo, pin?: CatalogPin): MarketingMedia | null {
  const src = pickVideoFile(video);
  if (!src) return null;
  const poster =
    video.video_pictures?.[0]?.picture || video.image || undefined;
  return {
    type: "video",
    src,
    poster,
    creditName: pin?.creditName || video.user?.name || "Pexels",
    creditUrl: pin?.creditUrl || video.user?.url || video.url || "https://www.pexels.com",
    source: "pexels",
    alt: pin?.alt || "nxClip marketing clip",
    niche: pin?.niche,
    aspectHint: video.height > video.width ? "portrait" : "landscape",
  };
}

function pinToStaticImage(pin: CatalogPin): MarketingMedia | null {
  const id = pin.photoId;
  if (!id) return null;
  return {
    type: "image",
    src: pexelsPhotoSrc(id, 1600),
    poster: pexelsPhotoSrc(id, 800),
    creditName: pin.creditName,
    creditUrl: pin.creditUrl,
    source: "pexels",
    alt: pin.alt,
    niche: pin.niche,
    aspectHint: "landscape",
  };
}

async function resolvePin(pin: CatalogPin): Promise<MarketingMedia | null> {
  if (pin.type === "video" && pin.videoId) {
    const video = await fetchPexelsVideoById(pin.videoId);
    const media = video ? videoToMedia(video, pin) : null;
    if (media) return media;
  }

  if (pin.photoId) {
    const photo = await fetchPexelsPhotoById(pin.photoId);
    if (photo) return photoToMedia(photo, pin);
  }

  return pinToStaticImage(pin);
}

export async function resolveReel(pins: CatalogPin[], cacheKey: string): Promise<MarketingMedia[]> {
  const hit = reelCache.get(cacheKey);
  if (hit?.length) return hit;
  const resolved = await Promise.all(pins.map((p) => resolvePin(p)));
  const list = resolved.filter((m): m is MarketingMedia => Boolean(m));
  reelCache.set(cacheKey, list);
  return list;
}

export async function getSlotMedia(slot: MarketingSlot): Promise<MarketingMedia | null> {
  const hit = slotCache.get(slot);
  if (hit) return hit;

  const pin = MARKETING_CATALOG[slot];
  const media = await resolvePin(pin);
  if (media) slotCache.set(slot, media);
  return media;
}

export async function getHeroReelMedia(): Promise<MarketingMedia[]> {
  return resolveReel(HERO_REEL, "hero-reel");
}

export async function getCapabilityReels(): Promise<Record<
  "imageStudio" | "meme" | "viralClips" | "clipEditor" | "coach",
  MarketingMedia[]
>> {
  const [imageStudio, meme, viralClips, clipEditor, coach] = await Promise.all([
    resolveReel(IMAGE_STUDIO_REEL, "cap-imageStudio"),
    resolveReel(MEME_REEL, "cap-meme"),
    resolveReel(VIRAL_CLIPS_REEL, "cap-viralClips"),
    resolveReel(CLIP_EDITOR_REEL, "cap-clipEditor"),
    resolveReel(COACH_REEL, "cap-coach"),
  ]);
  return { imageStudio, meme, viralClips, clipEditor, coach };
}

export async function getCapabilityMedia(): Promise<Record<
  "imageStudio" | "meme" | "viralClips" | "clipEditor" | "coach",
  MarketingMedia | null
>> {
  const reels = await getCapabilityReels();
  return {
    imageStudio: reels.imageStudio[0] || null,
    meme: reels.meme[0] || null,
    viralClips: reels.viralClips[0] || null,
    clipEditor: reels.clipEditor[0] || null,
    coach: reels.coach[0] || null,
  };
}

export async function getPipelineReels(): Promise<{
  create: MarketingMedia[];
  moderate: MarketingMedia[];
  publish: MarketingMedia[];
}> {
  const [create, moderate, publish] = await Promise.all([
    resolveReel(PIPELINE_CREATE_REEL, "pipe-create"),
    resolveReel(PIPELINE_MODERATE_REEL, "pipe-moderate"),
    resolveReel(PIPELINE_PUBLISH_REEL, "pipe-publish"),
  ]);
  return { create, moderate, publish };
}

export async function getPipelineMedia(): Promise<{
  create: MarketingMedia | null;
  moderate: MarketingMedia | null;
  publish: MarketingMedia | null;
}> {
  const reels = await getPipelineReels();
  return {
    create: reels.create[0] || null,
    moderate: reels.moderate[0] || null,
    publish: reels.publish[0] || null,
  };
}

export async function getOsLayerMedia(): Promise<Record<OsLayerKey, MarketingMedia | null>> {
  const [create, organize, distribute, operate, measure, guide] = await Promise.all([
    getSlotMedia("osCreate"),
    getSlotMedia("osOrganize"),
    getSlotMedia("osDistribute"),
    getSlotMedia("osOperate"),
    getSlotMedia("osMeasure"),
    getSlotMedia("osGuide"),
  ]);
  return { create, organize, distribute, operate, measure, guide };
}

export async function getSpotlightMedia(): Promise<MarketingMedia[]> {
  return resolveReel(SPOTLIGHT_CATALOG, "spotlight");
}

export function creditLabel(media: MarketingMedia | null | undefined): string {
  if (!media) return "";
  const kind = media.type === "video" ? "Video" : "Photo";
  return `${kind} via Pexels · ${media.creditName}`;
}
