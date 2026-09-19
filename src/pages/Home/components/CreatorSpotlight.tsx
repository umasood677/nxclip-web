import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Radio } from "lucide-react";
import { getSpotlightMedia } from "../../../lib/marketingMedia";
import {
  feedApi,
  identityApi,
  type FeedItemDto,
} from "../../../services/apiClient";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";

type SpotlightCard = {
  kind: "live" | "example";
  key: string;
  userId?: string;
  postId?: string;
  handle: string;
  niche: string;
  quote: string;
  image: string;
  avatar: string;
  badge: string;
  followerCount?: number;
  viewsLabel?: string;
};

function handleFromUser(user: any, fallback: string): string {
  const username = String(user?.username || user?.Username || "").replace(/^@/, "");
  if (username) return `@${username}`;
  const display = String(user?.displayName || user?.DisplayName || "").trim();
  return display ? `@${display.replace(/\s+/g, "")}` : fallback;
}

function nicheFromUser(user: any, fallback: string): string {
  const niches = user?.creatorNiches || user?.CreatorNiches;
  if (Array.isArray(niches) && niches.length) {
    return niches.slice(0, 2).map(String).join(", ");
  }
  return String(user?.creatorCategoryLabel || user?.CreatorCategoryLabel || fallback);
}

function quoteFromCreator(user: any, post: FeedItemDto): string {
  const bio = String(user?.bio || user?.Bio || "").trim();
  if (bio) return bio.length > 160 ? `${bio.slice(0, 157)}…` : bio;
  const title = String(post.title || "").trim();
  if (title) return title;
  const desc = String(post.description || "").trim();
  if (desc) return desc.length > 160 ? `${desc.slice(0, 157)}…` : desc;
  return "Live on the nxClip network.";
}

function badgeFromUser(user: any, post: FeedItemDto): string {
  const plan = String(user?.plan || user?.Plan || "").toUpperCase();
  if (post.hasLiveExternal || post.socialRollup === "live") return "Live on social";
  if (plan === "STUDIO") return "Studio";
  if (plan === "PRO") return "Pro";
  if (user?.emailVerified || user?.EmailVerified) return "Verified";
  return "On the network";
}

function viewsLabel(post: FeedItemDto): string | undefined {
  const views = (post.platformStats || []).reduce((sum, s) => sum + (Number(s.views) || 0), 0);
  if (views > 0) return `${views.toLocaleString()} views`;
  const display = post.platformStats?.find((s) => s.viewsDisplay)?.viewsDisplay;
  return display || undefined;
}

function pickNetworkPosts(items: FeedItemDto[], limit = 4): FeedItemDto[] {
  const byUser = new Map<string, FeedItemDto>();
  for (const item of items) {
    if (!item.userId) continue;
    const prev = byUser.get(item.userId);
    if (!prev || (item.wesScore || 0) > (prev.wesScore || 0)) {
      byUser.set(item.userId, item);
    }
  }
  return [...byUser.values()]
    .sort((a, b) => (b.wesScore || 0) - (a.wesScore || 0))
    .slice(0, limit);
}

export default function CreatorSpotlight() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAppSelector(selectAuthUser);
  const [cards, setCards] = useState<SpotlightCard[]>([]);
  const [liveCount, setLiveCount] = useState(0);

  const exampleSeeds: SpotlightCard[] = [
    {
      kind: "example",
      key: "aura",
      handle: t("spotlight.creators.aura.handle"),
      niche: t("spotlight.creators.aura.niche"),
      quote: t("spotlight.creators.aura.quote"),
      image: "",
      avatar: "",
      badge: t("spotlight.example", { defaultValue: "Example" }),
    },
    {
      kind: "example",
      key: "sage",
      handle: t("spotlight.creators.sage.handle"),
      niche: t("spotlight.creators.sage.niche"),
      quote: t("spotlight.creators.sage.quote"),
      image: "",
      avatar: "",
      badge: t("spotlight.example", { defaultValue: "Example" }),
    },
    {
      kind: "example",
      key: "pixel",
      handle: t("spotlight.creators.pixel.handle"),
      niche: t("spotlight.creators.pixel.niche"),
      quote: t("spotlight.creators.pixel.quote"),
      image: "",
      avatar: "",
      badge: t("spotlight.example", { defaultValue: "Example" }),
    },
    {
      kind: "example",
      key: "knight",
      handle: t("spotlight.creators.knight.handle"),
      niche: t("spotlight.creators.knight.niche"),
      quote: t("spotlight.creators.knight.quote"),
      image: "",
      avatar: "",
      badge: t("spotlight.example", { defaultValue: "Example" }),
    },
  ];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stock = await getSpotlightMedia().catch(() => []);
      const examples = exampleSeeds.map((card, i) => ({
        ...card,
        image: stock[i]?.src || card.image,
        avatar: stock[i]?.src || card.avatar,
      }));

      try {
        const trending = await feedApi.getTrendingFeed(undefined, 24);
        const posts = pickNetworkPosts(trending.items || [], 4);
        const uniqueUsers = new Set((trending.items || []).map((p) => p.userId).filter(Boolean));
        if (!cancelled) setLiveCount(uniqueUsers.size);

        const live = (
          await Promise.all(
            posts.map(async (post) => {
              const profile = await identityApi.getUserById(post.userId).catch(() => null);
              const social = await feedApi.getFeedUserProfile(post.userId).catch(() => null);
              const image = post.thumbnailUrl || profile?.coverUrl || profile?.avatarUrl || "";
              const avatar = profile?.avatarUrl || profile?.coverUrl || image;
              return {
                kind: "live" as const,
                key: post.userId,
                userId: post.userId,
                postId: post.contentId || post.id,
                handle: handleFromUser(profile, "@Creator"),
                niche: nicheFromUser(profile, "Creator"),
                quote: quoteFromCreator(profile, post),
                image,
                avatar,
                badge: badgeFromUser(profile, post),
                followerCount: social?.followerCount,
                viewsLabel: viewsLabel(post),
              } satisfies SpotlightCard;
            }),
          )
        ).filter((card) => card.image || card.handle);

        if (cancelled) return;
        const merged = [...live];
        for (const extra of examples) {
          if (merged.length >= 4) break;
          merged.push(extra);
        }
        setCards(merged.length ? merged : examples);
      } catch {
        if (!cancelled) {
          setLiveCount(0);
          setCards(examples);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const openCard = (card: SpotlightCard) => {
    if (card.kind === "live" && card.userId) {
      navigate(`/users/${card.userId}`);
      return;
    }
    navigate(user ? "/feed" : "/signup");
  };

  const networkLabel =
    liveCount > 0
      ? `+${liveCount}`
      : t("spotlight.counts");

  return (
    <section className="ui-landing-section bg-muted/20">
      <div className="ui-container-landing relative z-10">
        <div className="text-center mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="ui-landing-label !mb-4"
          >
            <span>{t("spotlight.label")}</span>
          </motion.div>
          <h2 className="ui-landing-title mx-auto max-w-4xl">
            {t("spotlight.title")} <br />
            <span className="brand-text-gradient">{t("spotlight.title_gradient")}</span>
          </h2>
          <p className="ui-landing-description mx-auto !mb-0">
            {t("spotlight.description")}
          </p>

          <div className="flex items-center justify-center mt-6">
            <div className="flex -space-x-3 rtl:space-x-reverse">
              {cards.map((c) => (
                <div
                  key={`stack-${c.key}`}
                  className="w-12 h-12 rounded-full border-2 border-background overflow-hidden glass bg-muted"
                >
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-foreground glass">
                {networkLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cards.map((creator, index) => (
            <motion.button
              type="button"
              key={creator.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.8 }}
              onClick={() => openCard(creator)}
              className="ui-glass-card group flex flex-col p-4 rounded-xl border-border/5 h-full bg-card/10 backdrop-blur-md text-start"
            >
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-6 bg-muted">
                {creator.image ? (
                  <img
                    src={creator.image}
                    alt={creator.handle}
                    className="w-full h-full object-cover transition-transform duration-1000 will-change-transform scale-[1.02] group-hover:scale-[1.08]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-teal-500/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute inset-x-6 bottom-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase">
                      {creator.niche}
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white tracking-tight">
                    {creator.handle}
                  </h3>
                  {creator.viewsLabel && (
                    <p className="mt-1 text-[11px] font-semibold text-white/70">{creator.viewsLabel}</p>
                  )}
                </div>
              </div>

              <div className="px-3 pb-4 flex flex-col flex-grow">
                <p className="text-sm text-muted-foreground italic leading-relaxed font-medium mb-8">
                  "{creator.quote}"
                </p>
                <div className="mt-auto pt-6 border-t border-border/10 flex items-center justify-between">
                  {creator.kind === "live" ? (
                    <Radio size={16} className="text-teal-500" />
                  ) : (
                    <BadgeCheck size={16} className="text-muted-foreground/50" />
                  )}
                  <span className="text-[9px] font-bold text-muted-foreground tracking-widest group-hover:text-primary transition-colors">
                    {creator.badge}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[70%] bg-primary/5 rounded-full blur-[160px]" />
      </div>
    </section>
  );
}
