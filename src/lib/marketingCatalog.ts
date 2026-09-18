/**
 * Pinned Pexels assets for marketing Home.
 * Live search ranking changes week to week — these IDs stay put and map to
 * nxClip features (Image Studio, memes, clips, editor, coach, Creator OS).
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

export type CatalogPin = {
  type: "image" | "video";
  photoId?: number;
  videoId?: number;
  alt: string;
  creditName: string;
  creditUrl: string;
};

export function pexelsPhotoSrc(id: number, width = 1600): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

export const MARKETING_CATALOG: Record<MarketingSlot, CatalogPin> = {
  hero: {
    type: "video",
    videoId: 30470989,
    photoId: 30469967,
    alt: "RGB creator station — cinematic clips and stills from one desk",
    creditName: "Atahan Demir",
    creditUrl: "https://www.pexels.com/video/modern-gaming-setup-with-rgb-lighting-30470989/",
  },
  imageStudio: {
    type: "image",
    photoId: 30111472,
    alt: "Neon digital artwork — Image Studio cinematic stills",
    creditName: "Steve A Johnson",
    creditUrl: "https://www.pexels.com/photo/colorful-abstract-digital-artwork-with-neon-hues-30111472/",
  },
  meme: {
    type: "image",
    photoId: 3930070,
    alt: "Gamer reaction — Meme Generator caption-ready still",
    creditName: "Robert Nagy",
    creditUrl: "https://www.pexels.com/photo/puzzled-gamer-in-illuminated-room-3930070/",
  },
  viralClips: {
    type: "video",
    videoId: 7774953,
    photoId: 442576,
    alt: "Neon controllers in motion — Viral Clips short-form energy",
    creditName: "Artem Podrez",
    creditUrl: "https://www.pexels.com/video/close-up-shot-of-game-controllers-7774953/",
  },
  clipEditor: {
    type: "video",
    videoId: 9068508,
    photoId: 3165335,
    alt: "Hands on a controller — Clip Studio trim and highlight flow",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/video/a-person-pressing-buttons-of-a-game-controller-9068508/",
  },
  coach: {
    type: "image",
    photoId: 30111699,
    alt: "Creator streaming with mic — Creator Coach week-plan energy",
    creditName: "Noland Live",
    creditUrl: "https://www.pexels.com/photo/focused-gamer-girl-streaming-live-online-30111699/",
  },
  pipelineCreate: {
    type: "image",
    photoId: 33888375,
    alt: "Dual-monitor RGB desk — Create images, memes, and clips",
    creditName: "Atahan Demir",
    creditUrl: "https://www.pexels.com/photo/rgb-gaming-setup-with-dual-monitors-and-pc-33888375/",
  },
  pipelineModerate: {
    type: "image",
    photoId: 9072394,
    alt: "Esports floor of setups — Moderate before anything goes Live",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/gaming-setup-for-competitive-esports-9072394/",
  },
  pipelinePublish: {
    type: "image",
    photoId: 788946,
    alt: "Phone in hand — Publish to Feed and go Live on social",
    creditName: "Lisa Fotios",
    creditUrl: "https://www.pexels.com/photo/person-holding-iphone-788946/",
  },
  ctaWash: {
    type: "image",
    photoId: 194511,
    alt: "Neon keyboard wash for the final CTA",
    creditName: "Pixabay",
    creditUrl: "https://www.pexels.com/photo/black-computer-keyboard-194511/",
  },
  osCreate: {
    type: "image",
    photoId: 33888375,
    alt: "Studio core — Create layer of the Creator OS",
    creditName: "Atahan Demir",
    creditUrl: "https://www.pexels.com/photo/rgb-gaming-setup-with-dual-monitors-and-pc-33888375/",
  },
  osOrganize: {
    type: "image",
    photoId: 1714208,
    alt: "Workstation archive — Organize layer of the Creator OS",
    creditName: "Garon Piceli",
    creditUrl: "https://www.pexels.com/photo/close-up-photo-of-programming-of-codes-1714208/",
  },
  osDistribute: {
    type: "image",
    photoId: 788946,
    alt: "Social on a phone — Distribute layer of the Creator OS",
    creditName: "Lisa Fotios",
    creditUrl: "https://www.pexels.com/photo/person-holding-iphone-788946/",
  },
  osOperate: {
    type: "image",
    photoId: 9072394,
    alt: "Command-week setups — Operate layer of the Creator OS",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/gaming-setup-for-competitive-esports-9072394/",
  },
  osMeasure: {
    type: "image",
    photoId: 590016,
    alt: "Charts on a laptop — Measure layer of the Creator OS",
    creditName: "Lukas",
    creditUrl: "https://www.pexels.com/photo/person-holding-white-ipad-590016/",
  },
  osGuide: {
    type: "image",
    photoId: 3184292,
    alt: "Mentorship at a table — Guide / Coach layer of the Creator OS",
    creditName: "fauxels",
    creditUrl: "https://www.pexels.com/photo/photo-of-people-doing-handshakes-3184292/",
  },
};

/** Creator Spotlight portraits — gaming/creator faces, not random lifestyle. */
export const SPOTLIGHT_CATALOG: CatalogPin[] = [
  {
    type: "image",
    photoId: 3930070,
    alt: "Gamer in neon light",
    creditName: "Robert Nagy",
    creditUrl: "https://www.pexels.com/photo/puzzled-gamer-in-illuminated-room-3930070/",
  },
  {
    type: "image",
    photoId: 9072246,
    alt: "Headset gamer in RGB light",
    creditName: "Yan Krukau",
    creditUrl: "https://www.pexels.com/photo/man-wearing-headset-while-playing-online-games-9072246/",
  },
  {
    type: "image",
    photoId: 28993060,
    alt: "Creator in headset at a gaming desk",
    creditName: "Matheus Bertelli",
    creditUrl: "https://www.pexels.com/photo/female-gamer-in-headset-focused-on-gaming-28993060/",
  },
  {
    type: "image",
    photoId: 30111699,
    alt: "Live streamer with microphone",
    creditName: "Noland Live",
    creditUrl: "https://www.pexels.com/photo/focused-gamer-girl-streaming-live-online-30111699/",
  },
];
