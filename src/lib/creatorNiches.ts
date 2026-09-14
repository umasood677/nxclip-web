/** Creator niches aligned with Creator Coach onboarding (legacy + v1 + v2 master seed). */
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
  {
    category: "quiet-luxury-minimalism",
    label: "Quiet Luxury & Minimalism",
    suggestions: [
      "Capsule Wardrobes & Essential Style",
      "Monochromatic & Neutral Aesthetics",
      "Minimalist Home & Architecture",
      "Elevated Everyday Living",
    ],
  },
  {
    category: "gourmet-culinary-aesthetics",
    label: "Gourmet & Culinary Aesthetics",
    suggestions: [
      "Fine Dining & Michelin Experience",
      "Aesthetic Food Plating & ASMR",
      "Craft Cocktails & Sommelier Culture",
      "Luxury Hosting & Tablescapes",
    ],
  },
  {
    category: "fashion-personal-styling",
    label: "Fashion & Personal Styling",
    suggestions: [
      "High Fashion & Haute Couture",
      "Outfit vs. Venue (Contextual Styling)",
      "Seasonal Color & Palette Rules",
      "Luxury Accessories & Jewelry",
    ],
  },
  {
    category: "interior-spatial-design",
    label: "Interior & Spatial Design",
    suggestions: [
      "Modern Architectural Home Tours",
      "Luxury Interior Decorating",
      "Ambient Living Spaces",
      "Furniture & Product Design",
    ],
  },
  {
    category: "futuristic-digital-lifestyle",
    label: "Futuristic & Digital Lifestyle",
    suggestions: [
      "Digital Garments & AI Fashion",
      "Avant-Garde & Conceptual Design",
      "Future Living & Smart Home Aesthetics",
      "Cyber-Luxe Aesthetics",
    ],
  },
  {
    category: "digital-creator",
    label: "Digital Creator",
    suggestions: [
      "Personal Brand & Faceless Content",
      "UGC & Brand Collabs",
      "Short-Form Storytelling",
      "Behind-the-Scenes & Day-in-the-Life",
      "Multi-Platform Repurposing",
      "Newsletter & Community Building",
    ],
  },
  {
    category: "ai-content",
    label: "AI Content & Tools",
    suggestions: [
      "AI Art & Visual Generation",
      "Prompt Engineering Tutorials",
      "AI Tool Reviews & Comparisons",
      "AI Video & Motion Workflows",
      "Automation & Productivity Stacks",
      "AI News & Model Updates",
    ],
  },
  {
    category: "tech-saas",
    label: "Tech & SaaS Reviews",
    suggestions: [
      "Smartphones & Gadgets",
      "Laptops & PC Builds",
      "SaaS & Productivity Apps",
      "AI Software & APIs",
      "Smart Home & Wearables",
      "Creator Gear & Studio Setup",
    ],
  },
  {
    category: "fitness-wellness",
    label: "Fitness & Wellness",
    suggestions: [
      "Strength & Hypertrophy",
      "Home Workouts & Calisthenics",
      "Yoga & Mobility",
      "Running & Endurance",
      "Nutrition & Meal Prep",
      "Mindset & Recovery",
    ],
  },
  {
    category: "beauty-skincare",
    label: "Beauty & Skincare",
    suggestions: [
      "Skincare Routines & Science",
      "Makeup Tutorials & GRWM",
      "Hair Care & Styling",
      "Clean Beauty & Ingredients",
      "Men's Grooming",
      "K-Beauty & Trends",
    ],
  },
  {
    category: "finance-business",
    label: "Finance & Business",
    suggestions: [
      "Personal Finance & Budgeting",
      "Investing & Markets",
      "Side Hustles & Online Income",
      "Entrepreneurship & Startups",
      "Real Estate & Wealth Building",
      "Career Growth & Salary Negotiation",
    ],
  },
  {
    category: "education-how-to",
    label: "Education & How-To",
    suggestions: [
      "Language & Communication",
      "Coding & No-Code",
      "Design & Creative Skills",
      "Study Tips & Productivity",
      "Career & Interview Prep",
      "Life Skills & DIY How-To",
    ],
  },
  {
    category: "entertainment-culture",
    label: "Entertainment & Pop Culture",
    suggestions: [
      "Movies & TV Breakdowns",
      "Music & Artist Commentary",
      "Celebrity & Pop Culture News",
      "Gaming Lore & Fandom",
      "Sports Highlights & Hot Takes",
      "Memes & Viral Trend Commentary",
    ],
  },
];

export const ALL_NICHE_SUGGESTIONS = CREATOR_CATEGORY_NICHES.flatMap((c) => c.suggestions);

export type SocialPlatformId = "youtube" | "instagram" | "tiktok" | "facebook" | "twitch" | "twitter";

export interface SocialConnectDef {
  id: SocialPlatformId;
  label: string;
  description: string;
}

export const SOCIAL_CONNECT_PLATFORMS: SocialConnectDef[] = [
  { id: "youtube", label: "YouTube", description: "Publish Shorts & track Live views" },
  { id: "instagram", label: "Instagram", description: "Reels, posts & engagement" },
  { id: "facebook", label: "Facebook", description: "Post to a Facebook Page timeline. Instagram is not required." },
  { id: "tiktok", label: "TikTok", description: "Short-form reach & trends" },
];
