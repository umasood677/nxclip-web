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

export async function searchGamingPhotos(query: string = "gaming", perPage: number = 15): Promise<PexelsPhoto[]> {
  try {
    const response = await fetch(`/api/pexels/search?query=${encodeURIComponent(query)}&per_page=${perPage}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("Pexels proxy error, using fallback:", errorData);
      return generateFallbackPhotos(perPage, query);
    }

    const data: PexelsSearchResponse = await response.json();
    return data.photos;
  } catch {
    // Silent fallback for network errors to avoid console noise in dev environment
    return generateFallbackPhotos(perPage, query);
  }
}

function generateFallbackPhotos(count: number, seed: string): PexelsPhoto[] {
  const gamingSeeds = ["gaming", "esports", "cyberpunk", "neon", "controller", "setup", "keyboard", "mouse", "monitor", "headset"];
  return Array.from({ length: count }, (_, i) => {
    const fallbackSeed = gamingSeeds[i % gamingSeeds.length] || seed;
    return {
      id: Math.random(),
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
      alt: `Gaming fallback image - ${fallbackSeed}`
    };
  });
}
