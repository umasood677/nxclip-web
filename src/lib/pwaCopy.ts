export const PWA_INSTALL = {
  badge: "Interactive App",
  title: "Install nxclip.app Creator OS",
  body: "Launch instantly from your home screen or dock. Run offline, enable faster loading, and get full screen canvas editing workspace with no browser bars.",
  cta: "Install",
  ctaLong: "Install Creator OS",
  later: "Maybe Later",
  welcomeTitle: "Welcome to nxclip.app OS",
  welcomeBody: "Installed. Open it from your home screen or dock for the full-screen canvas.",
} as const;

export const PWA_SURFACES = [
  { label: "Create Hub", href: "/create" },
  { label: "Image Studio", href: "/create/image" },
  { label: "Clip Studio", href: "/create/clip" },
  { label: "Library", href: "/my-content" },
  { label: "Feed", href: "/feed" },
  { label: "Analytics", href: "/analytics" },
  { label: "Creator Coach", href: "/coach" },
  { label: "Dashboard", href: "/dashboard" },
] as const;

export const PWA_DRAFT_TYPES = [
  { value: "image", label: "Image Studio still" },
  { value: "meme", label: "Meme Generator" },
  { value: "clip", label: "Clip Studio draft" },
  { value: "coach", label: "Creator Coach brief" },
] as const;
