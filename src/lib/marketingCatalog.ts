/**
 * Pinned lookbook for Home — campaign stills/clips that read as nxClip output.
 * Each band owns exclusive photo/video IDs: hero ≠ capabilities ≠ operate ≠
 * pipeline ≠ OS ≠ spotlight. Do not alias one reel to another.
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
  | "vlog"
  | "travel"
  | "fitness"
  | "beauty"
  | "music"
  | "tech"
  | "cinematic"
  | "viral";

export type PinCut = "dissolve" | "cut" | "whip" | "zoom" | "flash" | "push";
export type PinCamera = "kenburns" | "handheld" | "crashzoom" | "drift" | "cinematic" | "trailer";

export const NICHE_LABEL: Record<NicheKey, string> = {
  gaming: "Gaming",
  fashion: "Fashion",
  food: "Food",
  influencer: "AI Influencer",
  vlog: "Personal Vlogs",
  travel: "Travel",
  fitness: "Fitness",
  beauty: "Beauty",
  music: "Music",
  tech: "Tech",
  cinematic: "Cinematic",
  viral: "Viral",
};

/** Current-gen titles for hero marquee + Gaming section. */
export const GAME_TITLES = [
  "Rocket League",
  "Roblox",
  "Street Fighter",
  "Fortnite",
  "League of Legends",
  "Valorant",
  "Minecraft",
  "GTA V",
] as const;

export const NICHE_ORDER: NicheKey[] = [
  "gaming",
  "fashion",
  "influencer",
  "vlog",
  "travel",
  "food",
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
  cut?: PinCut;
  camera?: PinCamera;
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
    type: "video",
    videoId: 7855729,
    photoId: 1174746,
    niche: "gaming",
    cut: "whip",
    camera: "trailer",
    alt: "Straight-on pad close-up — hands, controller, game ahead",
    creditName: "Ron Lach",
    creditUrl: "https://www.pexels.com/video/person-holding-remote-controller-7855729/",
  }),
  pin({
    type: "video",
    videoId: 9068508,
    photoId: 275033,
    niche: "gaming",
    cut: "zoom",
    camera: "kenburns",
    alt: "Controller fills the frame — thumbs on sticks and buttons",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/video/a-person-pressing-buttons-of-a-game-controller-9068508/",
  }),
  pin({
    type: "video",
    videoId: 12715475,
    photoId: 3945683,
    niche: "gaming",
    cut: "push",
    camera: "drift",
    alt: "Straight-angle wireless pad — close-up play",
    creditName: "ROMAN ODINTSOV",
    creditUrl: "https://www.pexels.com/video/close-up-of-a-person-using-a-wireless-game-controller-12715475/",
  }),
  pin({
    type: "video",
    videoId: 8059279,
    photoId: 1926769,
    niche: "fashion",
    cut: "dissolve",
    camera: "cinematic",
    alt: "LED runway walk — luxury lookbook reel",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/video/a-woman-walking-in-a-hallway-with-led-lights-8059279/",
  }),
  pin({
    type: "video",
    videoId: 9509328,
    photoId: 1536619,
    niche: "fashion",
    cut: "whip",
    camera: "drift",
    alt: "White-dress runway — editorial campaign walk",
    creditName: "cottonbro studio",
    creditUrl: "https://www.pexels.com/video/a-model-wearing-a-white-dress-9509328/",
  }),
  pin({
    type: "video",
    videoId: 9510012,
    photoId: 985635,
    niche: "fashion",
    cut: "push",
    camera: "trailer",
    alt: "Black-dress pass — high-fashion still in motion",
    creditName: "cottonbro studio",
    creditUrl: "https://www.pexels.com/video/fashion-model-passing-by-9510012/",
  }),
  pin({
    type: "video",
    videoId: 36583182,
    photoId: 10179664,
    niche: "influencer",
    cut: "dissolve",
    camera: "cinematic",
    alt: "Glamorous AI persona at the vanity — campaign talent",
    creditName: "Frank Litschel",
    creditUrl: "https://www.pexels.com/video/glamorous-woman-posing-at-makeup-mirror-36583182/",
  }),
  pin({
    type: "video",
    videoId: 36583243,
    photoId: 1898555,
    niche: "influencer",
    cut: "push",
    camera: "kenburns",
    alt: "Hot studio pose — beautiful AI influencer look",
    creditName: "Frank Litschel",
    creditUrl: "https://www.pexels.com/video/stylish-woman-posing-in-modern-photo-studio-36583243/",
  }),
  pin({
    type: "video",
    videoId: 31223591,
    photoId: 1036623,
    niche: "influencer",
    cut: "zoom",
    camera: "trailer",
    alt: "Gold-dress glamour — luxury AI influencer reel",
    creditName: "paashuu",
    creditUrl: "https://www.pexels.com/video/elegant-fashion-model-in-glamorous-gold-dress-31223591/",
  }),
  pin({
    type: "video",
    videoId: 12433084,
    photoId: 2010812,
    niche: "vlog",
    cut: "cut",
    camera: "handheld",
    alt: "Ring-light vlog — talking to camera",
    creditName: "Hanna Pad",
    creditUrl: "https://www.pexels.com/video/a-female-influencer-recording-a-video-12433084/",
  }),
  pin({
    type: "video",
    videoId: 12433098,
    photoId: 415829,
    niche: "vlog",
    cut: "dissolve",
    camera: "drift",
    alt: "Mirror vlog — personal day-in-the-life",
    creditName: "Hanna Pad",
    creditUrl: "https://www.pexels.com/video/a-woman-talking-while-recording-a-video-with-her-camera-12433098/",
  }),
  pin({
    type: "video",
    videoId: 13929660,
    photoId: 15579920,
    niche: "vlog",
    cut: "whip",
    camera: "crashzoom",
    alt: "Tripod haul vlog — phone-in-hand personal reel",
    creditName: "Mizuno K",
    creditUrl: "https://www.pexels.com/video/a-smartphone-on-a-tripod-filming-a-woman-showing-fashion-accessories-13929660/",
  }),
  pin({
    type: "video",
    videoId: 12103937,
    photoId: 2325446,
    niche: "travel",
    cut: "dissolve",
    camera: "drift",
    alt: "Coastal promenade drone — travel day reel",
    creditName: "Czapp Árpád",
    creditUrl: "https://www.pexels.com/video/drone-video-of-people-walking-by-the-beach-in-a-coastal-city-12103937/",
  }),
  pin({
    type: "video",
    videoId: 19896957,
    photoId: 1285625,
    niche: "travel",
    cut: "push",
    camera: "cinematic",
    alt: "Sunset beach walk — wanderlust aerial",
    creditName: "Fanny Hagan-Södervall",
    creditUrl: "https://www.pexels.com/video/aerial-view-of-a-person-walking-on-the-beach-19896957/",
  }),
  pin({
    type: "video",
    videoId: 29561885,
    photoId: 2169880,
    niche: "travel",
    cut: "whip",
    camera: "kenburns",
    alt: "Coastal city and mountain — destination drone",
    creditName: "NGUYỄN THÀNH NHƠN",
    creditUrl: "https://www.pexels.com/video/aerial-view-of-coastal-city-landscape-with-mountain-29561885/",
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
    type: "video",
    videoId: 6247888,
    photoId: 1279330,
    niche: "food",
    alt: "Plating pasta clip — Viral Clips culinary",
    creditName: "Gary Barnes",
    creditUrl: "https://www.pexels.com/video/man-plating-pasta-6247888/",
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
    photoId: 839115,
    niche: "tech",
    alt: "Cinematic laptop still — premium tech look",
    creditName: "Filippo Bergamaschi",
    creditUrl: "https://www.pexels.com/photo/photography-of-a-turned-on-macbook-839115/",
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

/** Image Studio — exclusive stills (never reused in hero / operate / pipeline). */
export const IMAGE_STUDIO_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 7862508,
    niche: "gaming",
    alt: "Multi-monitor neon arena — generated gaming key art",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/7862508/",
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
    photoId: 8194817,
    niche: "food",
    alt: "Gourmet plated still — generated culinary content",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/8194817/",
  }),
  pin({
    type: "image",
    photoId: 9085380,
    niche: "influencer",
    alt: "Futurist glam AI lady — silver editorial still",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/9085380/",
  }),
  pin({
    type: "image",
    photoId: 5616280,
    niche: "travel",
    alt: "Luxury aerial resort — wanderlust campaign",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/5616280/",
  }),
  pin({
    type: "image",
    photoId: 17956264,
    niche: "fitness",
    alt: "Athlete start position — fitness campaign still",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/17956264/",
  }),
  pin({
    type: "image",
    photoId: 34362903,
    niche: "beauty",
    alt: "Luxury makeup close-up — beauty campaign still",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/34362903/",
  }),
  pin({
    type: "image",
    photoId: 2047909,
    niche: "tech",
    alt: "Cinematic desk tech — premium product still",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/2047909/",
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
    videoId: 19628994,
    photoId: 2333719,
    niche: "influencer",
    alt: "Glamorous AI lady walk — short-form trailer",
    creditName: "iddea photo",
    creditUrl: "https://www.pexels.com/video/19628994/",
  }),
  pin({
    type: "video",
    videoId: 19905870,
    photoId: 1327393,
    niche: "food",
    alt: "Gourmet plating short — culinary viral",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/video/19905870/",
  }),
  pin({
    type: "video",
    videoId: 34049118,
    photoId: 9071735,
    niche: "gaming",
    alt: "Cinematic esports motion — trailer cut",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/video/34049118/",
  }),
  pin({
    type: "video",
    videoId: 13082773,
    photoId: 2167381,
    niche: "viral",
    alt: "Concert-crowd energy — viral reel",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/video/13082773/",
  }),
  pin({
    type: "video",
    videoId: 6833910,
    photoId: 11540032,
    niche: "beauty",
    alt: "Makeup close-up reel — glam short",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/video/6833910/",
  }),
];

export const CLIP_EDITOR_REEL: CatalogPin[] = [
  pin({
    type: "video",
    videoId: 9071002,
    photoId: 7849511,
    niche: "gaming",
    alt: "Esports session — Clip Studio trim energy",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/video/9071002/",
  }),
  pin({
    type: "video",
    videoId: 7914772,
    photoId: 9072293,
    niche: "gaming",
    alt: "Tournament highlight — smash-cut bay",
    creditName: "RDNE Stock project",
    creditUrl: "https://www.pexels.com/video/7914772/",
  }),
  pin({
    type: "video",
    videoId: 7297394,
    photoId: 9534912,
    niche: "beauty",
    alt: "Glam grade pass — color and cut",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/video/7297394/",
  }),
];

export const COACH_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 5582426,
    niche: "influencer",
    alt: "Editorial talent — Coach week plan",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/5582426/",
  }),
  pin({
    type: "image",
    photoId: 39546276,
    niche: "fitness",
    alt: "Athlete creator — Coach growth plan",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/39546276/",
  }),
];

export const PIPELINE_CREATE_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 6489046,
    niche: "gaming",
    alt: "Home-studio RGB desk — create pass",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/6489046/",
  }),
  pin({
    type: "image",
    photoId: 32468572,
    niche: "fashion",
    alt: "Red-gown editorial — create pass",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/32468572/",
  }),
  pin({
    type: "image",
    photoId: 24289165,
    niche: "food",
    alt: "Gourmet shrimp plate — create pass",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/24289165/",
  }),
  pin({
    type: "image",
    photoId: 206343,
    niche: "influencer",
    alt: "Evening-gown AI lady — create pass",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/206343/",
  }),
  pin({
    type: "image",
    photoId: 14150566,
    niche: "travel",
    alt: "Bali aerial resort — create pass",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/14150566/",
  }),
];

export const PIPELINE_MODERATE_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 28609631,
    niche: "fashion",
    alt: "Motion-blur editorial in review",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/28609631/",
  }),
  pin({
    type: "image",
    photoId: 1761279,
    niche: "cinematic",
    alt: "Cinematic landscape in review",
    creditName: "Tobias Bjørkli",
    creditUrl: "https://www.pexels.com/photo/mountain-covered-with-snow-1761279/",
  }),
  pin({
    type: "image",
    photoId: 6389893,
    niche: "fitness",
    alt: "Training still in review",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/6389893/",
  }),
];

export const PIPELINE_PUBLISH_REEL: CatalogPin[] = [
  pin({
    type: "video",
    videoId: 9167968,
    photoId: 14577493,
    niche: "influencer",
    alt: "Glam walk ready to go Live",
    creditName: "cottonbro studio",
    creditUrl: "https://www.pexels.com/video/9167968/",
  }),
  pin({
    type: "video",
    videoId: 34059053,
    photoId: 6782328,
    niche: "viral",
    alt: "Crowd-energy publish reel",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/video/34059053/",
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

/**
 * Operate-the-week tiles — exclusive IDs (not reused in hero / studios / pipeline).
 * High-end Gaming, glamorous AI Influencer, and cinematic Tech sit here so
 * this band does not replay the header lookbook.
 */
export const OPERATE_PUBLISH_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 9072216,
    niche: "gaming",
    alt: "Tournament room ready to go Live",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/gaming-chairs-and-computers-9072216/",
  }),
  pin({
    type: "video",
    videoId: 7914809,
    photoId: 14266493,
    niche: "gaming",
    alt: "Esports arena motion — queue to social",
    creditName: "RDNE Stock project",
    creditUrl: "https://www.pexels.com/video/7914809/",
  }),
];

export const OPERATE_FEED_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 9617682,
    niche: "influencer",
    alt: "Glamorous AI influencer post on the feed",
    creditName: "Inna Mykytas",
    creditUrl: "https://www.pexels.com/photo/woman-in-gold-sleeveless-dress-standing-beside-a-studio-light-9617682/",
  }),
  pin({
    type: "image",
    photoId: 10236999,
    niche: "beauty",
    alt: "Beauty close-up live on the feed",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/10236999/",
  }),
  pin({
    type: "image",
    photoId: 23644633,
    niche: "food",
    alt: "Gourmet plate published to the feed",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/23644633/",
  }),
];

export const OPERATE_SCHEDULE_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 7858742,
    niche: "gaming",
    alt: "Cinematic RGB desk — scheduled publish window",
    creditName: "Ron Lach",
    creditUrl: "https://www.pexels.com/photo/computer-on-the-table-7858742/",
  }),
];

export const OPERATE_ANALYTICS_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 15367435,
    niche: "gaming",
    alt: "Focused gamer — performance after Live",
    creditName: "Helmy Zairy",
    creditUrl: "https://www.pexels.com/photo/man-playing-pc-game-with-headphones-15367435/",
  }),
];

export const OPERATE_PLANNING_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 12429764,
    niche: "beauty",
    alt: "Cinematic beauty still — Monday draft",
    creditName: "Beyza Kaplan",
    creditUrl: "https://www.pexels.com/photo/a-woman-wearing-a-dress-12429764/",
  }),
  pin({
    type: "image",
    photoId: 17706044,
    niche: "fitness",
    alt: "Athlete still — Thursday Live window",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/17706044/",
  }),
  pin({
    type: "image",
    photoId: 6327536,
    niche: "food",
    alt: "Gourmet plate — Saturday caption day",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/6327536/",
  }),
];

export const OPERATE_WORKFLOW_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 9072376,
    niche: "gaming",
    alt: "Clutch session — next ranked move",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/9072376/",
  }),
  pin({
    type: "image",
    photoId: 20201999,
    niche: "tech",
    alt: "Futurist creator — unlock platform split",
    creditName: "Vika Glitter",
    creditUrl: "https://www.pexels.com/photo/woman-in-futuristic-goggles-standing-by-device-20201999/",
  }),
];

/** Four idea tiles — labels only make sense on real stills. */
export const OPERATE_SUGGEST_REEL: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 9072394,
    niche: "gaming",
    alt: "High-end esports house — 9:16 clip idea",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/gaming-setup-for-competitive-esports-9072394/",
  }),
  pin({
    type: "image",
    photoId: 6833997,
    niche: "beauty",
    alt: "Editorial glam still idea",
    creditName: "Mikhail Nilov",
    creditUrl: "https://www.pexels.com/photo/woman-with-sequence-on-face-and-red-lipstick-touching-her-head-6833997/",
  }),
  pin({
    type: "image",
    photoId: 7748833,
    niche: "travel",
    alt: "Luxury aerial — travel reel idea",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/7748833/",
  }),
  pin({
    type: "image",
    photoId: 7240876,
    niche: "influencer",
    alt: "Glamorous AI lady — caption-ready look",
    creditName: "Gunel Zeynalova",
    creditUrl: "https://www.pexels.com/photo/a-woman-in-spaghetti-strap-dress-standing-near-the-illuminated-hanging-decorations-7240876/",
  }),
];

export type GamingTitleCard = {
  title: string;
  line: string;
  pin: CatalogPin;
};

/** Dedicated Gaming band — exclusive IDs, current-title energy (not desktop B-roll). */
export const GAMING_STAGE_REEL: CatalogPin[] = [
  pin({
    type: "video",
    videoId: 4488355,
    photoId: 210019,
    niche: "gaming",
    cut: "whip",
    camera: "trailer",
    alt: "Race-line motion — car game energy",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/video/4488355/",
  }),
  pin({
    type: "video",
    videoId: 7774953,
    photoId: 3165335,
    niche: "gaming",
    cut: "cut",
    camera: "handheld",
    alt: "Neon controller motion — close-up play",
    creditName: "Artem Podrez",
    creditUrl: "https://www.pexels.com/video/close-up-shot-of-game-controllers-7774953/",
  }),
  pin({
    type: "video",
    videoId: 7774734,
    photoId: 5475761,
    niche: "gaming",
    cut: "push",
    camera: "cinematic",
    alt: "Neon competitive motion — battle energy",
    creditName: "Artem Podrez",
    creditUrl: "https://www.pexels.com/video/7774734/",
  }),
  pin({
    type: "video",
    videoId: 30470989,
    photoId: 7862491,
    niche: "gaming",
    cut: "dissolve",
    camera: "drift",
    alt: "RGB station — cinematic play desk",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/video/modern-gaming-setup-with-rgb-lighting-30470989/",
  }),
];

export const GAMING_TITLE_CARDS: GamingTitleCard[] = [
  {
    title: "Rocket League",
    line: "Boost cams, overtime, and thumbnail explosions.",
    pin: pin({
      type: "image",
      photoId: 210019,
      niche: "gaming",
      alt: "Sports car at speed — Rocket League boost energy",
      creditName: "Pixabay",
      creditUrl: "https://www.pexels.com/photo/210019/",
    }),
  },
  {
    title: "Roblox",
    line: "Ugc worlds, avatar drops, and short-form loops.",
    pin: pin({
      type: "image",
      photoId: 1619654,
      niche: "gaming",
      alt: "Colorful brick world — Roblox-style UGC energy",
      creditName: "Pixabay",
      creditUrl: "https://www.pexels.com/photo/1619654/",
    }),
  },
  {
    title: "Street Fighter",
    line: "Combos, reaction memes, and round-win stills.",
    pin: pin({
      type: "image",
      photoId: 163403,
      niche: "gaming",
      alt: "Fight-night gloves — Street Fighter combo energy",
      creditName: "Pixabay",
      creditUrl: "https://www.pexels.com/photo/163403/",
    }),
  },
  {
    title: "Fortnite",
    line: "Drop trailers, clutch cuts, and seasonal key art.",
    pin: pin({
      type: "image",
      photoId: 417074,
      niche: "gaming",
      alt: "Colorful island drop — Fortnite-era skybox energy",
      creditName: "Pixabay",
      creditUrl: "https://www.pexels.com/photo/417074/",
    }),
  },
  {
    title: "League of Legends",
    line: "Baron calls, highlight packs, and Worlds-grade thumbs.",
    pin: pin({
      type: "image",
      photoId: 775201,
      niche: "gaming",
      alt: "Night castle — League of Legends fantasy stage",
      creditName: "Pixabay",
      creditUrl: "https://www.pexels.com/photo/775201/",
    }),
  },
  {
    title: "Valorant",
    line: "Ace clips, agent stills, and ranked-night recaps.",
    pin: pin({
      type: "image",
      photoId: 1671325,
      niche: "gaming",
      alt: "Neon tactical city — Valorant night energy",
      creditName: "Pixabay",
      creditUrl: "https://www.pexels.com/photo/1671325/",
    }),
  },
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
    photoId: 1190297,
    niche: "viral",
    alt: "Concert-light wash",
    creditName: "Sebastiaan Stam",
    creditUrl: "https://www.pexels.com/photo/group-of-people-having-a-concert-1190297/",
  }),
  osCreate: pin({
    type: "image",
    photoId: 7862518,
    niche: "gaming",
    alt: "Esports floor — studio core",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/7862518/",
  }),
  osOrganize: pin({
    type: "image",
    photoId: 5878303,
    niche: "tech",
    alt: "Sleek desk vault — organize",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/5878303/",
  }),
  osDistribute: pin({
    type: "image",
    photoId: 32399568,
    niche: "viral",
    alt: "Night crowd — distribute",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/32399568/",
  }),
  osOperate: pin({
    type: "image",
    photoId: 9072205,
    niche: "gaming",
    alt: "Tournament row — command week",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/9072205/",
  }),
  osMeasure: pin({
    type: "image",
    photoId: 10883732,
    niche: "tech",
    alt: "Premium device still — growth lens",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/10883732/",
  }),
  osGuide: pin({
    type: "image",
    photoId: 5582421,
    niche: "influencer",
    alt: "Editorial talent — coach orbit",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/5582421/",
  }),
};

export const SPOTLIGHT_CATALOG: CatalogPin[] = [
  pin({
    type: "image",
    photoId: 9072385,
    niche: "gaming",
    alt: "High-end gaming creator",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/9072385/",
  }),
  pin({
    type: "image",
    photoId: 6548077,
    niche: "fashion",
    alt: "Fashion creator",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/6548077/",
  }),
  pin({
    type: "image",
    photoId: 28448379,
    niche: "food",
    alt: "Food creator still",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/28448379/",
  }),
  pin({
    type: "image",
    photoId: 25309659,
    niche: "influencer",
    alt: "Glamorous AI influencer",
    creditName: "Pexels",
    creditUrl: "https://www.pexels.com/photo/25309659/",
  }),
];
