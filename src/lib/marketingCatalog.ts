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

export type NicheKey =
  | "gaming"
  | "fashion"
  | "food"
  | "influencer"
  | "travel"
  | "fitness"
  | "beauty"
  | "music"
  | "tech"
  | "cinematic"
  | "viral";

export const NICHE_LABEL: Record<NicheKey, string> = {
  gaming: "Gaming",
  fashion: "Fashion",
  food: "Food",
  influencer: "AI Influencer",
  travel: "Travel",
  fitness: "Fitness",
  beauty: "Beauty",
  music: "Music",
  tech: "Tech",
  cinematic: "Cinematic",
  viral: "Viral",
};

export const NICHE_ORDER: NicheKey[] = [
  "gaming",
  "fashion",
  "food",
  "influencer",
  "travel",
  "fitness",
  "beauty",
  "music",
  "tech",
  "cinematic",
  "viral",
];

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
    photoId: 2115257,
    niche: "gaming",
    alt: "RGB mechanical keyboard — ultra-real gaming still",
    creditName: "John Petalcurin",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-gaming-keyboard-2115257/",
  }),
  pin({
    type: "image",
    photoId: 2681751,
    niche: "fashion",
    alt: "Editorial fashion portrait — luxury lookbook still",
    creditName: "Ali Pazani",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-brown-fur-beanies-and-white-and-balck-top-2681751/",
  }),
  pin({
    type: "image",
    photoId: 4138626,
    niche: "beauty",
    alt: "Ultra-real beauty close-up — red lip glam still",
    creditName: "Amir SeilSepour",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-woman-with-red-lips-4138626/",
  }),
  pin({
    type: "video",
    videoId: 8058474,
    photoId: 1482476,
    niche: "viral",
    alt: "Neon cinematic short — viral campaign motion",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/video/a-stylist-woman-posing-with-neon-light-background-8058474/",
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
    videoId: 6498240,
    photoId: 442576,
    niche: "gaming",
    alt: "Cinematic VR gaming clip — neon campaign motion",
    creditName: "Tima Miroshnichenko",
    creditUrl: "https://www.pexels.com/video/woman-enjoying-virtual-games-6498240/",
  }),
  pin({
    type: "video",
    videoId: 8059279,
    photoId: 2681751,
    niche: "fashion",
    alt: "LED runway walk — cinematic fashion reel",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/video/a-woman-walking-in-a-hallway-with-led-lights-8059279/",
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
  pin({
    type: "image",
    photoId: 2325446,
    niche: "travel",
    alt: "Aerial travel still — cinematic wanderlust campaign",
    creditName: "Pixabay",
    creditUrl: "https://www.pexels.com/photo/aerial-photography-of-city-2325446/",
  }),
  pin({
    type: "image",
    photoId: 416778,
    niche: "fitness",
    alt: "Fitness campaign still — peak-performance content",
    creditName: "Pixabay",
    creditUrl: "https://www.pexels.com/photo/action-adult-athlete-fitness-416778/",
  }),
  pin({
    type: "image",
    photoId: 4484838,
    niche: "beauty",
    alt: "Beauty mascara close-up — photoreal glam still",
    creditName: "AŃDY",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-woman-with-red-lipstick-and-black-mascara-4484838/",
  }),
  pin({
    type: "image",
    photoId: 1763075,
    niche: "music",
    alt: "Concert lights — music viral reel energy",
    creditName: "Sebastiaan Stam",
    creditUrl: "https://www.pexels.com/photo/group-of-people-inside-dark-room-1763075/",
  }),
  pin({
    type: "image",
    photoId: 3861969,
    niche: "tech",
    alt: "AI / tech still — futurist product look",
    creditName: "Google DeepMind",
    creditUrl: "https://www.pexels.com/photo/an-artist-s-illustration-of-artificial-intelligence-3861969/",
  }),
  pin({
    type: "image",
    photoId: 1117132,
    niche: "cinematic",
    alt: "Cinematic reel still — filmic grade",
    creditName: "David Bartus",
    creditUrl: "https://www.pexels.com/photo/man-standing-near-the-lights-1117132/",
  }),
];

/** Image Studio — rotating generated-looking stills across niches. */
export const IMAGE_STUDIO_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 442576,
    niche: "gaming",
    alt: "Cinematic controller still — generated gaming key art",
    creditName: "Pixabay",
    creditUrl: "https://www.pexels.com/photo/black-sony-ps4-dualshock-controller-442576/",
  }),
  pin({
    type: "image",
    photoId: 2584269,
    niche: "fashion",
    alt: "Black-blazer editorial — generated fashion campaign",
    creditName: "Ali Pazani",
    creditUrl: "https://www.pexels.com/photo/woman-in-black-blazer-2584269/",
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
  pin({
    type: "image",
    photoId: 1271619,
    niche: "travel",
    alt: "Mountain travel still — wanderlust campaign",
    creditName: "Sanaan Mazhar",
    creditUrl: "https://www.pexels.com/photo/mountain-covered-with-green-trees-1271619/",
  }),
  pin({
    type: "image",
    photoId: 2294361,
    niche: "fitness",
    alt: "Training still — fitness creator content",
    creditName: "Li Sun",
    creditUrl: "https://www.pexels.com/photo/man-doing-exercise-2294361/",
  }),
  pin({
    type: "image",
    photoId: 4138626,
    niche: "beauty",
    alt: "Glam portrait — beauty campaign still",
    creditName: "Amir SeilSepour",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-woman-with-red-lips-4138626/",
  }),
  pin({
    type: "image",
    photoId: 1190297,
    niche: "cinematic",
    alt: "Crowd lights — cinematic concert grade",
    creditName: "Sebastiaan Stam",
    creditUrl: "https://www.pexels.com/photo/group-of-people-having-a-concert-1190297/",
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
  pin({
    type: "image",
    photoId: 3812745,
    niche: "viral",
    alt: "Laugh reaction — viral meme still",
    creditName: "Andrea Piacquadio",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-black-crew-neck-shirt-3812745/",
  }),
  pin({
    type: "image",
    photoId: 762080,
    niche: "viral",
    alt: "Expressive face — punchline-ready still",
    creditName: "Andrea Piacquadio",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-coat-762080/",
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
  pin({
    type: "video",
    videoId: 8058474,
    photoId: 1482476,
    niche: "viral",
    alt: "Neon cinematic viral reel",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/video/a-stylist-woman-posing-with-neon-light-background-8058474/",
  }),
  pin({
    type: "video",
    videoId: 8626672,
    photoId: 1640777,
    niche: "food",
    alt: "Chef steam reel — culinary viral",
    creditName: "Kampus Production",
    creditUrl: "https://www.pexels.com/video/chef-cooking-in-the-kitchen-8626672/",
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
  pin({
    type: "image",
    photoId: 1117132,
    niche: "cinematic",
    alt: "Filmic still — color-grade energy",
    creditName: "David Bartus",
    creditUrl: "https://www.pexels.com/photo/man-standing-near-the-lights-1117132/",
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
  pin({
    type: "image",
    photoId: 3764119,
    niche: "fitness",
    alt: "Athlete creator — Coach growth plan",
    creditName: "Andrea Piacquadio",
    creditUrl: "https://www.pexels.com/photo/woman-in-black-tank-top-and-black-leggings-3764119/",
  }),
];

export const PIPELINE_CREATE_REEL: CatalogPin[] = IMAGE_STUDIO_REEL;

export const PIPELINE_MODERATE_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 2681751,
    niche: "fashion",
    alt: "Editorial still in review — quality pass",
    creditName: "Ali Pazani",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-brown-fur-beanies-and-white-and-balck-top-2681751/",
  }),
  pin({
    type: "image",
    photoId: 4138626,
    niche: "beauty",
    alt: "Beauty still in review",
    creditName: "Amir SeilSepour",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-woman-with-red-lips-4138626/",
  }),
  pin({
    type: "image",
    photoId: 1761279,
    niche: "cinematic",
    alt: "Cinematic still in review",
    creditName: "Tobias Bjørkli",
    creditUrl: "https://www.pexels.com/photo/mountain-covered-with-snow-1761279/",
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
  pin({
    type: "video",
    videoId: 8058474,
    photoId: 1482476,
    niche: "viral",
    alt: "Go-live reel — social publish",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/video/a-stylist-woman-posing-with-neon-light-background-8058474/",
  }),
  pin({
    type: "image",
    photoId: 2087018,
    niche: "travel",
    alt: "Travel creator post-ready",
    creditName: "Oleksandr Pidvalnyi",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-backpack-2087018/",
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
    photoId: 2115257,
    niche: "gaming",
    alt: "Night-city wash",
    creditName: "John Petalcurin",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-gaming-keyboard-2115257/",
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
    photoId: 2115257,
    niche: "gaming",
    alt: "Gaming creator",
    creditName: "John Petalcurin",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-gaming-keyboard-2115257/",
  }),
  pin({
    type: "image",
    photoId: 2681751,
    niche: "fashion",
    alt: "Fashion creator",
    creditName: "Ali Pazani",
    creditUrl: "https://www.pexels.com/photo/woman-wearing-brown-fur-beanies-and-white-and-balck-top-2681751/",
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
