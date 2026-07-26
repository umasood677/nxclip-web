import { TiktokIcon } from "../../../components/TiktokIcon";
import { Youtube, Instagram } from "lucide-react";

export const generateDailyTrend = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    name: [`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`][i % 7],
    views: Math.floor(Math.random() * 5000) + 2000,
    engagement: Math.floor(Math.random() * 800) + 200,
    shares: Math.floor(Math.random() * 300) + 50,
  }));
};

export const CONTENT_DATA = [];

export const PLATFORM_STATS = [];

export const GAME_PERFORMANCE = [];

export const AUDIENCE_STATS = {
  gender: [],
  age: [],
  activeHours: []
};

export const GEO_INTEL_DATA = [];

export const GEO_INTEL_STRATEGY = [];

export const REGION_TOTALS = {
  views: 0,
  avgDuration: "0:00",
  avgPercent: 0,
  watchTime: 0,
  reach: "0",
  bestRegion: "-",
  growthMomentum: "0%",
  topPlatform: "-"
};

export const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
