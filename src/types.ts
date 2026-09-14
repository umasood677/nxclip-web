export type Plan = "free" | "pro" | "studio";

export interface ContentPlanItem {
  day: string | number;
  type?: "image" | "meme" | "clip" | string;
  contentType?: string;
  theme?: string;
  tip?: string;
  title?: string;
  hook?: string;
  icon?: string;
  description?: string;
  hashtags?: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  /** Banner / cover image */
  coverUrl?: string | null;
  gameNiches?: string[];
  games?: string[];
  bio?: string;
  audience?: string;
  goal?: string;
  frequency?: string;
  startPoint?: string;
  plan: Plan;
  role: "admin" | "user" | "creator";
  /** From GET /auth/me — false until Creator Coach generate-plan persists */
  onboardingCompleted?: boolean;
  /** Persisted Coach plan JSON from backend, or null until onboarding finishes */
  onboardingPlan?: Record<string, unknown> | null;
  /** Category slug from onboarding (Gaming, Travel, …) */
  creatorCategory?: string | null;
  /** Friendly category label */
  creatorCategoryLabel?: string | null;
  /** Sub-niches from onboarding Q1 */
  creatorNiches?: string[];
  socials?: {
    twitch?: string;
    youtube?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  /** Connected via OAuth (UI prep) */
  connectedSocials?: Partial<Record<"youtube" | "instagram" | "tiktok" | "facebook" | "twitch" | "twitter", boolean>>;
  coachQuestionsRemaining?: number;
  contentPlan?: ContentPlanItem[];
  updatedAt?: string | number | Date | any;
  createdAt: string | number | Date | any;
}

export interface Creation {
  id: string;
  uid: string;
  type: "image" | "meme" | "clip";
  url: string;
  prompt?: string;
  caption?: string;
  hashtags?: string[];
  status: "processing" | "published" | "rejected";
  createdAt: string | number | Date | any;
}

export interface AnalyticsReport {
  id: string;
  uid: string;
  weekEnding: string | number | Date | any;
  summary: string;
  metrics: {
    views: number;
    likes: number;
    shares: number;
    completionRate: number;
  };
  actionItems: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "engagement" | "update" | "insight";
  timestamp: Date;
  unread: boolean;
}
