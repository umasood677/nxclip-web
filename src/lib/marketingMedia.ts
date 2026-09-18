/**
 * Marketing media for Home.
 * Pinned Pexels photo/video IDs (see marketingCatalog) — not live search.
 */
import {
  MARKETING_CATALOG,
  SPOTLIGHT_CATALOG,
  pexelsPhotoSrc,
  type CatalogPin,
  type MarketingSlot,
} from "./marketingCatalog";
import {
  fetchPexelsPhotoById,
  fetchPexelsVideoById,
  pickVideoFile,
  type PexelsPhoto,
  type PexelsVideo,
} from "../services/pexelsService";

export type { MarketingSlot };

export type MarketingMediaSource = "pexels" | "cms" | "fallback";

export type MarketingMedia = {
  type: "image" | "video";
  src: string;
  poster?: string;
  creditName: string;
  creditUrl: string;
  source: MarketingMediaSource;
  alt?: string;
  aspectHint?: "landscape" | "portrait" | "square";
};

export type OsLayerKey =
  | "create"
  | "organize"
  | "distribute"
  | "operate"
  | "measure"
  | "guide";

const cache = new Map<string, MarketingMedia>();

function photoToMedia(photo: PexelsPhoto, pin?: CatalogPin): MarketingMedia {
  return {
    type: "image",
    src: photo.src.large || photo.src.landscape || photo.src.medium,
    poster: photo.src.medium,
    creditName: pin?.creditName || photo.photographer || "Pexels",
    creditUrl: pin?.creditUrl || photo.photographer_url || photo.url || "https://www.pexels.com",
    source: "pexels",
    alt: pin?.alt || photo.alt || "nxClip marketing visual",
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

export async function getSlotMedia(slot: MarketingSlot): Promise<MarketingMedia | null> {
  const hit = cache.get(slot);
  if (hit) return hit;

  const pin = MARKETING_CATALOG[slot];
  const media = await resolvePin(pin);
  if (media) cache.set(slot, media);
  return media;
}

export async function getHeroReelMedia(): Promise<MarketingMedia[]> {
  const hero = await getSlotMedia("hero");
  return hero ? [hero] : [];
}

export async function getCapabilityMedia(): Promise<Record<
  "imageStudio" | "meme" | "viralClips" | "clipEditor" | "coach",
  MarketingMedia | null
>> {
  const [imageStudio, meme, viralClips, clipEditor, coach] = await Promise.all([
    getSlotMedia("imageStudio"),
    getSlotMedia("meme"),
    getSlotMedia("viralClips"),
    getSlotMedia("clipEditor"),
    getSlotMedia("coach"),
  ]);
  return { imageStudio, meme, viralClips, clipEditor, coach };
}

export async function getPipelineMedia(): Promise<{
  create: MarketingMedia | null;
  moderate: MarketingMedia | null;
  publish: MarketingMedia | null;
}> {
  const [create, moderate, publish] = await Promise.all([
    getSlotMedia("pipelineCreate"),
    getSlotMedia("pipelineModerate"),
    getSlotMedia("pipelinePublish"),
  ]);
  return { create, moderate, publish };
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
  return Promise.all(SPOTLIGHT_CATALOG.map((pin) => resolvePin(pin))).then((list) =>
    list.filter((m): m is MarketingMedia => Boolean(m)),
  );
}

export function creditLabel(media: MarketingMedia | null | undefined): string {
  if (!media) return "";
  const kind = media.type === "video" ? "Video" : "Photo";
  return `${kind} via Pexels · ${media.creditName}`;
}
