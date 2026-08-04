import { safeLocalStorage } from "./safeStorage";

export interface ProfileExtras {
  niches?: string[];
  /** Cover / banner image URL (uploaded media path) */
  coverUrl?: string | null;
  socials?: {
    twitch?: string;
    youtube?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  /** OAuth connection flags (prep until real social OAuth ships) */
  connectedSocials?: Partial<Record<"youtube" | "instagram" | "tiktok" | "twitch" | "twitter", boolean>>;
}

function key(uid: string) {
  return `nxclip.profileExtras.${uid}`;
}

export function loadProfileExtras(uid?: string | null): ProfileExtras {
  if (!uid) return {};
  try {
    const raw = safeLocalStorage.getItem(key(uid));
    if (!raw) return {};
    return JSON.parse(raw) as ProfileExtras;
  } catch {
    return {};
  }
}

export function saveProfileExtras(uid: string, extras: ProfileExtras): void {
  safeLocalStorage.setItem(key(uid), JSON.stringify(extras));
}

/** Convert a data-URL (or blob URL) into a File for upload. */
export async function dataUrlToFile(dataUrl: string, filename = `avatar-${Date.now()}.jpg`): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}
