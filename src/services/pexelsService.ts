export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number | null;
  height: number | null;
  link: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
  video_pictures?: { id: number; picture: string; nr: number }[];
}

export interface PexelsVideoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideo[];
  next_page?: string;
}

export async function searchGamingPhotos(
  query: string = "gaming",
  perPage: number = 15,
): Promise<PexelsPhoto[]> {
  try {
    const response = await fetch(
      `/api/pexels/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("Pexels proxy error, using fallback:", errorData);
      return generateFallbackPhotos(perPage, query);
    }

    const data: PexelsSearchResponse = await response.json();
    if (!data.photos?.length) return generateFallbackPhotos(perPage, query);
    return data.photos;
  } catch {
    return generateFallbackPhotos(perPage, query);
  }
}

/** Prefer mid-quality mp4 suitable for muted autoplay cards. */
export function pickVideoFile(video: PexelsVideo): string | null {
  const files = (video.video_files || []).filter(
    (f) => f.file_type?.includes("mp4") && f.link,
  );
  if (!files.length) return null;

  const hd = files.find((f) => f.quality === "hd" && (f.height || 0) <= 1080);
  if (hd) return hd.link;

  const sd = files.find((f) => f.quality === "sd");
  if (sd) return sd.link;

  return files.sort((a, b) => (a.height || 0) - (b.height || 0))[0]?.link || null;
}

export async function searchMarketingVideos(
  query: string = "esports highlight",
  perPage: number = 8,
): Promise<PexelsVideo[]> {
  try {
    const response = await fetch(
      `/api/pexels/videos?query=${encodeURIComponent(query)}&per_page=${perPage}`,
    );

    if (!response.ok) {
      console.warn("Pexels videos proxy error, using fallback");
      return generateFallbackVideos(perPage, query);
    }

    const data: PexelsVideoSearchResponse = await response.json();
    if (!data.videos?.length) return generateFallbackVideos(perPage, query);
    return data.videos;
  } catch {
    return generateFallbackVideos(perPage, query);
  }
}

function generateFallbackPhotos(count: number, seed: string): PexelsPhoto[] {
  const gamingSeeds = [
    "gaming",
    "esports",
    "cyberpunk",
    "neon",
    "controller",
    "setup",
    "keyboard",
    "mouse",
    "monitor",
    "headset",
  ];
  return Array.from({ length: count }, (_, i) => {
    const fallbackSeed = gamingSeeds[i % gamingSeeds.length] || seed;
    return {
      id: i + 1,
      width: 1920,
      height: 1080,
      url: "#",
      photographer: "nxclip.ai",
      photographer_url: "#",
      photographer_id: 0,
      avg_color: "#000000",
      src: {
        original: `https://picsum.photos/seed/${fallbackSeed}-${i}/1920/1080`,
        large2x: `https://picsum.photos/seed/${fallbackSeed}-${i}/1920/1080`,
        large: `https://picsum.photos/seed/${fallbackSeed}-${i}/1280/720`,
        medium: `https://picsum.photos/seed/${fallbackSeed}-${i}/800/600`,
        small: `https://picsum.photos/seed/${fallbackSeed}-${i}/400/300`,
        portrait: `https://picsum.photos/seed/${fallbackSeed}-${i}/600/800`,
        landscape: `https://picsum.photos/seed/${fallbackSeed}-${i}/800/600`,
        tiny: `https://picsum.photos/seed/${fallbackSeed}-${i}/200/200`,
      },
      alt: `Gaming fallback image - ${fallbackSeed}`,
    };
  });
}

function generateFallbackVideos(count: number, seed: string): PexelsVideo[] {
  // Public sample MP4s for offline / missing-key demos
  const samples = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: 9000 + i,
    width: 1280,
    height: 720,
    url: "#",
    image: `https://picsum.photos/seed/${seed}-v${i}/800/1200`,
    duration: 15,
    user: { id: 0, name: "nxclip.ai", url: "#" },
    video_files: [
      {
        id: i,
        quality: "hd",
        file_type: "video/mp4",
        width: 1280,
        height: 720,
        link: samples[i % samples.length],
      },
    ],
    video_pictures: [
      {
        id: i,
        picture: `https://picsum.photos/seed/${seed}-v${i}/800/1200`,
        nr: 0,
      },
    ],
  }));
}
