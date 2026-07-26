import { useCallback, useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Eye, Heart, MessageSquare, Sparkles, Loader2, Youtube, Instagram } from "lucide-react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { SEO } from "../../components/SEO";
import { TiktokIcon } from "../../components/TiktokIcon";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import {
  contentApi,
  feedApi,
  identityApi,
  extractValidImageUrl,
  type PlatformStatDto,
} from "../../services/apiClient";
import { getPersistedUser } from "../../services/auth/authService";
import { toast } from "sonner";

function PlatformMark({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === "youtube") return <Youtube size={16} className="text-red-500" />;
  if (p === "instagram") return <Instagram size={16} className="text-pink-500" />;
  if (p === "tiktok") return <TiktokIcon size={16} />;
  return null;
}

export default function PublicPostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creatorName, setCreatorName] = useState("Creator");
  const [creatorAvatar, setCreatorAvatar] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStatDto[]>([]);
  const [publishedLabel, setPublishedLabel] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      let data: any = null;
      try {
        data = await feedApi.getFeedItemById(id, { suppressErrorLog: true });
      } catch {
        data = await contentApi.getContentById(id, { suppressErrorLog: true });
      }

      const authorId = data.userId || data.user?.id;
      setUserId(authorId || null);
      setTitle(data.title || data.caption || data.description || "Untitled creation");
      setDescription(data.description || data.caption || "");
      setImageUrl(extractValidImageUrl(data) || data.thumbnailUrl || "");
      setPlatformStats(Array.isArray(data.platformStats) ? data.platformStats : []);
      setPublishedLabel(
        data.publishedAt
          ? new Date(data.publishedAt).toLocaleDateString()
          : data.createdAt
            ? new Date(data.createdAt).toLocaleDateString()
            : ""
      );

      if (authorId) {
        try {
          const [user, profile] = await Promise.allSettled([
            identityApi.getUserById(authorId),
            feedApi.getFeedUserProfile(authorId),
          ]);
          if (user.status === "fulfilled" && user.value) {
            setCreatorName(user.value.displayName || user.value.username || "Creator");
            setCreatorAvatar(user.value.avatarUrl || "");
          }
          if (profile.status === "fulfilled") {
            setIsFollowing(!!profile.value.isFollowing);
          }
        } catch {
          /* optional enrichment */
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Post not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFollow = async () => {
    const session = getPersistedUser();
    if (!session) {
      navigate("/signup");
      return;
    }
    if (!userId || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await feedApi.unfollowUser(userId);
        setIsFollowing(false);
        toast.success("Unfollowed");
      } else {
        await feedApi.followUser(userId);
        setIsFollowing(true);
        toast.success("Following");
      }
    } catch (err: any) {
      toast.error(Array.isArray(err?.message) ? err.message.join(", ") : err?.message || "Follow failed");
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="min-h-screen ui-bg-landing flex flex-col">
      <SEO 
        title={`${title || "Creator Post"} | nxclip.ai`} 
        description={description || "Check out this creator's latest performance on nxclip.ai."}
        type="article"
      />
      <Navbar />
      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="ui-card overflow-hidden shadow-xl">
            <div className="aspect-video bg-muted relative flex items-center justify-center">
              {loading ? (
                <Loader2 className="animate-spin text-primary" size={32} />
              ) : (
                <AuthenticatedImage
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-10">
              <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden border border-border">
                    <img
                      src={creatorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId || id}`}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-foreground">{creatorName}</p>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-widest">
                      {publishedLabel || "Published"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="brand-gradient"
                  className="font-bold gap-2"
                  disabled={followBusy || loading}
                  onClick={handleFollow}
                >
                  {followBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isFollowing ? "Following" : "Follow Creator"}
                </Button>
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-4">{title}</h1>
              {description && (
                <p className="text-muted-foreground text-xl leading-relaxed mb-10">
                  {description}
                </p>
              )}
              <div className="pt-8 border-t border-border space-y-4">
                {platformStats.length > 0 ? (
                  platformStats.map((s) => (
                    <div key={s.platform} className="flex items-center gap-6 text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-2 font-bold capitalize text-foreground min-w-[100px]">
                        <PlatformMark platform={s.platform} />
                        {s.platform}
                      </span>
                      <div className="flex items-center gap-2">
                        <Eye size={20} />
                        <span className="font-bold">{s.viewsDisplay ?? s.views ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart size={20} />
                        <span className="font-bold">{s.likesDisplay ?? s.likes ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={20} />
                        <span className="font-bold">{s.commentsDisplay ?? s.comments ?? "—"}</span>
                      </div>
                      {s.externalUrl && (
                        <a href={s.externalUrl} target="_blank" rel="noreferrer" className="text-primary text-sm font-bold hover:underline">
                          View on {s.platform}
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    Connect social for live stats
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="ui-card p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden bg-muted/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="text-primary" size={24} />
                <h3 className="text-2xl font-display font-bold">Create your own clips</h3>
              </div>
              <p className="text-muted-foreground font-medium">Join creators using nxclip.ai to scale their brand.</p>
            </div>
            <Link to="/signup">
              <Button size="hero" className="font-bold relative z-10 px-8">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
