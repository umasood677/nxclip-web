/**
 * Pinned lookbook for Home — campaign stills/clips that read as nxClip output
 * across Gaming, Fashion, Food, and AI Influencer. Not desk/stock B-roll.
 */

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

export type NicheKey = "gaming" | "fashion" | "food" | "influencer";

export const NICHE_LABEL: Record<NicheKey, string> = {
  gaming: "Gaming",
  fashion: "Fashion",
  food: "Food",
  influencer: "AI Influencer",
};

export type CatalogPin = {
  type: "image" | "video";
  photoId?: number;
  videoId?: number;
  niche?: NicheKey;
  alt: string;
  creditName: string;
  creditUrl: string;
};

export function pexelsPhotoSrc(id: number, width = 1600): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

const pin = (p: CatalogPin): CatalogPin => p;

/** Hero lookbook — rotates like a generated campaign reel. */
export const HERO_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 2387793,
    niche: "gaming",
    alt: "Cyberpunk night city still — Image Studio gaming campaign",
    creditName: "Aleksandar Pasaric",
    creditUrl: "https://www.pexels.com/photo/photography-of-highway-near-buildings-2387793/",
  }),
  pin({
    type: "image",
    photoId: 1926769,
    niche: "fashion",
    alt: "Editorial fashion portrait — Image Studio lookbook",
    creditName: "Godisable Jacob",
    creditUrl: "https://www.pexels.com/photo/woman-in-white-and-black-stripe-long-sleeve-shirt-1926769/",
  }),
  pin({
    type: "image",
    photoId: 1640777,
    niche: "food",
    alt: "Cinematic plated food — Image Studio culinary still",
    creditName: "Ella Olsson",
    creditUrl: "https://www.pexels.com/photo/pancake-with-sliced-strawberry-1640777/",
  }),
  pin({
    type: "image",
    photoId: 2010812,
    niche: "influencer",
    alt: "AI female model influencer portrait — Image Studio talent",
    creditName: "Marcelo Chagas",
    creditUrl: "https://www.pexels.com/photo/woman-in-black-spaghetti-strap-top-2010812/",
  }),
  pin({
    type: "video",
    videoId: 9068508,
    photoId: 442576,
    niche: "gaming",
    alt: "Gameplay hands-on clip — Viral Clips / Clip Studio",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/video/a-person-pressing-buttons-of-a-game-controller-9068508/",
  }),
  pin({
    type: "video",
    videoId: 6247888,
    photoId: 1279330,
    niche: "food",
    alt: "Plating pasta clip — Viral Clips culinary",
    creditName: "Gary Barnes",
    creditUrl: "https://www.pexels.com/video/man-plating-pasta-6247888/",
  }),
  pin({
    type: "video",
    videoId: 8371243,
    photoId: 1036623,
    niche: "influencer",
    alt: "Creator filming a short — AI influencer go-live",
    creditName: "Ron Lach",
    creditUrl: "https://www.pexels.com/video/young-woman-recording-on-smartphone-while-modeling-8371243/",
  }),
];

/** Image Studio — rotating generated-looking stills across niches. */
export const IMAGE_STUDIO_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 1761279,
    niche: "gaming",
    alt: "Cinematic aurora landscape — generated gaming key art",
    creditName: "Tobias Bjørkli",
    creditUrl: "https://www.pexels.com/photo/mountain-covered-with-snow-1761279/",
  }),
  pin({
    type: "image",
    photoId: 1055691,
    niche: "fashion",
    alt: "Red-dress editorial — generated fashion campaign",
    creditName: "Godisable Jacob",
    creditUrl: "https://www.pexels.com/photo/woman-standing-near-white-wall-1055691/",
  }),
  pin({
    type: "image",
    photoId: 1279330,
    niche: "food",
    alt: "Pasta still — generated food content",
    creditName: "Ella Olsson",
    creditUrl: "https://www.pexels.com/photo/pasta-with-vegetable-dish-on-gray-plate-beside-tomato-and-basil-1279330/",
  }),
  pin({
    type: "image",
    photoId: 1382734,
    niche: "influencer",
    alt: "Beauty-model close-up — AI influencer still",
    creditName: "Mentatdgt",
    creditUrl: "https://www.pexels.com/photo/close-up-photography-of-woman-1382734/",
  }),
];

export const MEME_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 3930070,
    niche: "gaming",
    alt: "Gamer reaction — meme caption chrome",
    creditName: "Robert Nagy",
    creditUrl: "https://www.pexels.com/photo/puzzled-gamer-in-illuminated-room-3930070/",
  }),
];

export const VIRAL_CLIPS_REEL: CatalogPin[] = [
  pin({
    type: "video",
    videoId: 8371243,
    photoId: 1036623,
    niche: "influencer",
    alt: "Influencer short-form clip",
    creditName: "Ron Lach",
    creditUrl: "https://www.pexels.com/video/young-woman-recording-on-smartphone-while-modeling-8371243/",
  }),
  pin({
    type: "video",
    videoId: 6247888,
    photoId: 1640777,
    niche: "food",
    alt: "Food plating short",
    creditName: "Gary Barnes",
    creditUrl: "https://www.pexels.com/video/man-plating-pasta-6247888/",
  }),
  pin({
    type: "video",
    videoId: 7774953,
    photoId: 442576,
    niche: "gaming",
    alt: "Neon controller motion clip",
    creditName: "Artem Podrez",
    creditUrl: "https://www.pexels.com/video/close-up-shot-of-game-controllers-7774953/",
  }),
];

export const CLIP_EDITOR_REEL: CatalogPin[] = [
  pin({
    type: "video",
    videoId: 9068508,
    photoId: 3165335,
    niche: "gaming",
    alt: "Controller gameplay — Clip Studio trim energy",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/video/a-person-pressing-buttons-of-a-game-controller-9068508/",
  }),
  pin({
    type: "video",
    videoId: 7986844,
    photoId: 442576,
    niche: "gaming",
    alt: "Console session — highlight cut",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/video/man-playing-video-game-while-using-joystick-7986844/",
  }),
];

export const COACH_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 1130626,
    niche: "influencer",
    alt: "Creator talent — Coach week plan",
    creditName: "Daniel Xavier",
    creditUrl: "https://www.pexels.com/photo/close-up-photography-of-woman-smiling-1130626/",
  }),
];

export const PIPELINE_CREATE_REEL: CatalogPin[] = IMAGE_STUDIO_REEL;

export const PIPELINE_MODERATE_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 1375736,
    niche: "fashion",
    alt: "Editorial still in review — quality pass",
    creditName: "Godisable Jacob",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-black-shirt-1375736/",
  }),
];

export const PIPELINE_PUBLISH_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 1036623,
    niche: "influencer",
    alt: "Influencer ready to post — Feed + Live",
    creditName: "Daniel Xavier",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-black-shirt-1036623/",
  }),
];

/** Single-slot fallbacks (OS tiles, CTA). Prefer output stills over desks. */
export const MARKETING_CATALOG: Record<MarketingSlot, CatalogPin> = {
  hero: HERO_REEL[0],
  imageStudio: IMAGE_STUDIO_REEL[0],
  meme: MEME_REEL[0],
  viralClips: VIRAL_CLIPS_REEL[0],
  clipEditor: CLIP_EDITOR_REEL[0],
  coach: COACH_REEL[0],
  pipelineCreate: PIPELINE_CREATE_REEL[0],
  pipelineModerate: PIPELINE_MODERATE_REEL[0],
  pipelinePublish: PIPELINE_PUBLISH_REEL[0],
  ctaWash: pin({
    type: "image",
    photoId: 2387793,
    niche: "gaming",
    alt: "Night-city wash",
    creditName: "Aleksandar Pasaric",
    creditUrl: "https://www.pexels.com/photo/photography-of-highway-near-buildings-2387793/",
  }),
  osCreate: IMAGE_STUDIO_REEL[1],
  osOrganize: IMAGE_STUDIO_REEL[2],
  osDistribute: HERO_REEL[3],
  osOperate: HERO_REEL[0],
  osMeasure: IMAGE_STUDIO_REEL[3],
  osGuide: COACH_REEL[0],
};

export const SPOTLIGHT_CATALOG: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 3930070,
    niche: "gaming",
    alt: "Gaming creator",
    creditName: "Robert Nagy",
    creditUrl: "https://www.pexels.com/photo/puzzled-gamer-in-illuminated-room-3930070/",
  }),
  pin({
    type: "image",
    photoId: 1926769,
    niche: "fashion",
    alt: "Fashion creator",
    creditName: "Godisable Jacob",
    creditUrl: "https://www.pexels.com/photo/woman-in-white-and-black-stripe-long-sleeve-shirt-1926769/",
  }),
  pin({
    type: "image",
    photoId: 1640777,
    niche: "food",
    alt: "Food creator still",
    creditName: "Ella Olsson",
    creditUrl: "https://www.pexels.com/photo/pancake-with-sliced-strawberry-1640777/",
  }),
  pin({
    type: "image",
    photoId: 2010812,
    niche: "influencer",
    alt: "AI influencer",
    creditName: "Marcelo Chagas",
    creditUrl: "https://www.pexels.com/photo/woman-in-black-spaghetti-strap-top-2010812/",
  }),
];
