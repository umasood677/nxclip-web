import { useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import {
  creditLabel,
  type MarketingMedia,
} from "../../../lib/marketingMedia";

type Props = {
  media: MarketingMedia | null;
  className?: string;
  imgClassName?: string;
  showCredit?: boolean;
  creditClassName?: string;
  /** Prefer portrait crop for short-form slots */
  portrait?: boolean;
};

/** Image or muted looping video with Pexels credit. Pauses video when off-screen. */
export function MarketingMediaFrame({
  media,
  className,
  imgClassName,
  showCredit = true,
  creditClassName,
  portrait = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || media?.type !== "video") return;

    const io = new IntersectionObserver(
      ([entry]) => setInView(!!entry?.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [media?.src, media?.type]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || media?.type !== "video") return;
    if (inView) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [inView, media?.type]);

  if (!media) {
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-teal-500/10",
          className,
        )}
      />
    );
  }

  return (
    <>
      {media.type === "video" ? (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            portrait && "object-[center_20%]",
            imgClassName,
          )}
          src={media.src}
          poster={media.poster}
          muted
          playsInline
          loop
          autoPlay
          preload="metadata"
        />
      ) : (
        <img
          src={media.src}
          alt={media.alt || ""}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            imgClassName,
          )}
          loading="lazy"
          decoding="async"
        />
      )}
      {showCredit && (
        <a
          href={media.creditUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "absolute bottom-2 start-2 z-20 max-w-[80%] truncate rounded-md bg-black/55 px-2 py-0.5 text-[9px] font-medium text-white/85 backdrop-blur-sm hover:text-white",
            creditClassName,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {creditLabel(media)}
        </a>
      )}
    </>
  );
}
