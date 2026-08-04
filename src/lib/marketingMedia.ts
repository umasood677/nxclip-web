/**
 * Marketing media abstraction for Home v2.
 * Today: Pexels photos + videos. Later: Admin CMS fills the same shape.
 */
import {
  pickVideoFile,
  searchGamingPhotos,
  searchMarketingVideos,
  type PexelsPhoto,
  type PexelsVideo,
} from "../services/pexelsService";

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

export type MarketingSlot =
  | "hero"
  | "imageStudio"
  | "meme"
  | "viralClips"
  | "clipEditor"
  | "coach"
  | "pipelineCreate"
  | "pipelineModerate"
  | "pipelinePublish"
  | "ctaWash"
  | "osCreate"
  | "osOrganize"
  | "osDistribute"
  | "osOperate"
  | "osMeasure"
  | "osGuide";

export type OsLayerKey =
  | "create"
  | "organize"
  | "distribute"
  | "operate"
  | "measure"
  | "guide";

type SlotQuery = {
  photoQuery?: string;
  videoQuery?: string;
  prefer: "image" | "video";
};

const SLOT_QUERIES: Record<MarketingSlot, SlotQuery> = {
  hero: { photoQuery: "esports arena cinematic lights crowd", videoQuery: "gaming cinematic highlight", prefer: "image" },
  imageStudio: { photoQuery: "digital art cinematic fantasy warrior", prefer: "image" },
  meme: { photoQuery: "expressive gamer reaction neon face", prefer: "image" },
  viralClips: { videoQuery: "vertical smartphone gaming action", prefer: "video" },
  clipEditor: { videoQuery: "gameplay highlight slow motion", prefer: "video" },
  coach: { photoQuery: "streamer planning content calendar desk", prefer: "image" },
  pipelineCreate: { photoQuery: "ai generative art neon workspace dual monitor", prefer: "image" },
  pipelineModerate: { photoQuery: "designer reviewing content on large monitor checklist", prefer: "image" },
  pipelinePublish: {
    photoQuery: "creator posting smartphone social media night",
    videoQuery: "hand holding phone social scrolling",
    prefer: "image",
  },
  ctaWash: { photoQuery: "dark gaming atmosphere neon", prefer: "image" },
  // Creator OS layers — concrete visual metaphors for each surface
  osCreate: { photoQuery: "creator designing gaming thumbnail dual monitor neon", prefer: "image" },
  osOrganize: { photoQuery: "digital asset library folders content archive desk", prefer: "image" },
  osDistribute: { photoQuery: "smartphone social media feed gaming creator night", prefer: "image" },
  osOperate: { photoQuery: "creator dashboard analytics monitors command center", prefer: "image" },
  osMeasure: { photoQuery: "growth analytics charts laptop metrics dashboard", prefer: "image" },
  osGuide: { photoQuery: "mentor coach planning strategy whiteboard creator", prefer: "image" },
};

const cache = new Map<string, MarketingMedia[]>();

function photoToMedia(photo: PexelsPhoto): MarketingMedia {
  return {
    type: "image",
    src: photo.src.large || photo.src.landscape || photo.src.medium,
    poster: photo.src.medium,
    creditName: photo.photographer || "Pexels",
    creditUrl: photo.photographer_url || photo.url || "https://www.pexels.com",
    source: photo.photographer === "nxclip.ai" ? "fallback" : "pexels",
    alt: photo.alt || "nxClip marketing visual",
    aspectHint: photo.height > photo.width ? "portrait" : "landscape",
  };
}

function videoToMedia(video: PexelsVideo): MarketingMedia | null {
  const src = pickVideoFile(video);
  if (!src) return null;
  const poster =
    video.video_pictures?.[0]?.picture || video.image || undefined;
  return {
    type: "video",
    src,
    poster,
    creditName: video.user?.name || "Pexels",
    creditUrl: video.user?.url || video.url || "https://www.pexels.com",
    source: video.user?.name === "nxclip.ai" ? "fallback" : "pexels",
    alt: "nxClip marketing clip",
    aspectHint: video.height > video.width ? "portrait" : "landscape",
  };
}

async function fetchForSlot(slot: MarketingSlot, count = 3): Promise<MarketingMedia[]> {
  const q = SLOT_QUERIES[slot];
  const key = `${slot}:${count}`;
  const hit = cache.get(key);
  if (hit?.length) return hit;

  const out: MarketingMedia[] = [];

  if (q.prefer === "video" || q.videoQuery) {
    const videos = await searchMarketingVideos(q.videoQuery || "gaming", count);
    for (const v of videos) {
      const m = videoToMedia(v);
      if (m) out.push(m);
    }
  }

  if (out.length < count && (q.prefer === "image" || q.photoQuery)) {
    const photos = await searchGamingPhotos(q.photoQuery || "gaming", count);
    out.push(...photos.map(photoToMedia));
  }

  const sliced = out.slice(0, Math.max(count, 1));
  cache.set(key, sliced);
  return sliced;
}

export async function getSlotMedia(slot: MarketingSlot): Promise<MarketingMedia | null> {
  const list = await fetchForSlot(slot, 2);
  return list[0] || null;
}

export async function getHeroReelMedia(): Promise<MarketingMedia[]> {
  const key = "hero-reel";
  const hit = cache.get(key);
  if (hit?.length) return hit;

  const [photos, videos] = await Promise.all([
    searchGamingPhotos("gaming creator cinematic", 4),
    searchMarketingVideos("esports highlight short", 3),
  ]);

  const reel: MarketingMedia[] = [];
  const photoMedia = photos.map(photoToMedia);
  const videoMedia = videos.map(videoToMedia).filter(Boolean) as MarketingMedia[];

  // Interleave: photo, photo, video, photo, video
  if (photoMedia[0]) reel.push(photoMedia[0]);
  if (photoMedia[1]) reel.push(photoMedia[1]);
  if (videoMedia[0]) reel.push(videoMedia[0]);
  if (photoMedia[2]) reel.push(photoMedia[2]);
  if (videoMedia[1]) reel.push(videoMedia[1]);

  if (!reel.length && photoMedia.length) reel.push(...photoMedia.slice(0, 3));

  cache.set(key, reel);
  return reel;
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

export function creditLabel(media: MarketingMedia | null | undefined): string {
  if (!media) return "";
  const kind = media.type === "video" ? "Video" : "Photo";
  return `${kind} via Pexels · ${media.creditName}`;
}
