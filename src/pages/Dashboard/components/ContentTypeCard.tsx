import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

interface ContentTypePost {
  type: string;
  typeKey?: "clip" | "meme" | "image";
  totalCount: number;
  published: number;
  engagement: string;
  platform: string;
  topPost: string;
  topPostId?: string;
}

interface ContentTypeCardProps {
  post: ContentTypePost;
}

function typeBadgeClass(key?: string) {
  switch (key) {
    case "clip":
      return "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30";
    case "meme":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
    default:
      return "bg-primary/15 text-primary border-primary/30";
  }
}

export const ContentTypeCard = memo(({ post }: ContentTypeCardProps) => {
  const navigate = useNavigate();
  const hasPiece = Boolean(post.topPostId);
  const type = post.typeKey || "image";
  const libraryAllHref = `/my-content?type=${encodeURIComponent(type)}`;
  const libraryPublishedHref = `/my-content?type=${encodeURIComponent(type)}&status=published`;

  return (
    <Card className="ui-content-performance-card">
      <div className="flex items-center justify-between mb-1 gap-2">
        <h4 className="text-base font-display font-bold text-foreground tracking-tight">{post.type}</h4>
        <button
          type="button"
          title="Open Library filtered to this format (all states)"
          onClick={() => navigate(libraryAllHref)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 h-6 text-[11px] font-semibold transition-colors hover:bg-background",
            typeBadgeClass(post.typeKey),
          )}
        >
          {post.totalCount} in Library
          <ArrowUpRight size={11} />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground font-medium mb-4">
        Includes drafts, processing, published, and failed — open Library to browse them.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          type="button"
          className="text-start rounded-md p-2 -m-2 hover:bg-muted/50 transition-colors"
          title="View published items of this format in Library"
          onClick={() => navigate(libraryPublishedHref)}
        >
          <p className="text-xs font-semibold text-muted-foreground leading-none mb-1.5">Published</p>
          <p className="text-lg font-display font-bold text-foreground inline-flex items-center gap-1" dir="ltr">
            {post.published}
            <ArrowUpRight size={14} className="text-muted-foreground" />
          </p>
        </button>
        <div>
          <p className="text-xs font-semibold text-muted-foreground leading-none mb-1.5">Likes</p>
          <p className="text-lg font-display font-bold text-foreground" dir="ltr">
            {post.engagement}
          </p>
        </div>
      </div>

      <div className="p-3 rounded-md bg-muted/40 border border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Leading piece</p>
          {post.platform !== "—" ? (
            <span
              className={cn(
                "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold",
                post.platform === "Live"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
              )}
            >
              {post.platform}
            </span>
          ) : null}
        </div>
        {hasPiece ? (
          <button
            type="button"
            className="text-sm font-semibold text-foreground line-clamp-2 text-start hover:text-primary transition-colors w-full"
            onClick={() => navigate(`/feed/post/${post.topPostId}`)}
          >
            {post.topPost}
          </button>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">{post.topPost}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs font-semibold"
          onClick={() => navigate(libraryAllHref)}
        >
          Browse all {post.type.toLowerCase()} in Library
          <ArrowUpRight size={12} className="ms-1" />
        </Button>
      </div>
    </Card>
  );
});

ContentTypeCard.displayName = "ContentTypeCard";
