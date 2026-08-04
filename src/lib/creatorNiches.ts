/** Creator niches aligned with Creator Coach onboarding categories. */
export const CREATOR_CATEGORY_NICHES: Array<{
  category: string;
  label: string;
  suggestions: string[];
}> = [
  {
    category: "Gaming",
    label: "Gaming",
    suggestions: ["Valorant", "Fortnite", "CS2", "Apex Legends", "Minecraft", "FIFA", "League of Legends", "GTA V"],
  },
  {
    category: "General",
    label: "Lifestyle / General",
    suggestions: ["Daily Vlogs", "Motivation", "Productivity", "Fashion", "Tech Reviews", "Comedy Skits"],
  },
  {
    category: "Travel",
    label: "Travel / Adventure",
    suggestions: [
      "Solo Backpacking",
      "Luxury Destinations",
      "Budget Travel",
      "Outdoor Adventure",
      "Hidden Gems",
      "Digital Nomad",
    ],
  },
  {
    category: "Food",
    label: "Food / Dining",
    suggestions: [
      "Restaurant Reviews",
      "Street Food",
      "Cafe Culture",
      "Fine Dining",
      "Healthy Eating",
      "Dessert Spots",
    ],
  },
  {
    category: "Cooking",
    label: "Cooking / Recipes",
    suggestions: ["Quick Recipes", "Baking", "Meal Prep", "Home Cooking", "DIY Kitchen", "Comfort Food"],
  },
];

export const ALL_NICHE_SUGGESTIONS = CREATOR_CATEGORY_NICHES.flatMap((c) => c.suggestions);

export type SocialPlatformId = "youtube" | "instagram" | "tiktok" | "twitch" | "twitter";

export interface SocialConnectDef {
  id: SocialPlatformId;
  label: string;
  description: string;
}

export const SOCIAL_CONNECT_PLATFORMS: SocialConnectDef[] = [
  { id: "youtube", label: "YouTube", description: "Publish Shorts & track Live views" },
  { id: "instagram", label: "Instagram", description: "Reels, posts & engagement" },
  { id: "tiktok", label: "TikTok", description: "Short-form reach & trends" },
  { id: "twitch", label: "Twitch", description: "Clips from streams" },
  { id: "twitter", label: "X (Twitter)", description: "Share drops & updates" },
];
