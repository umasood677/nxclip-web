import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar,
  Image as ImageIcon,
  Video,
  Trash2,
  Download,
  FileEdit,
  Filter,
  Search,
  Sparkles,
  Zap,
  X,
  FolderInput,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronDown,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthenticatedMediaPreview } from "../../components/AuthenticatedMediaPreview";
import { MediaTileSelectCheckbox, mediaTileSelectionRing } from "../../components/MediaTileSelectCheckbox";
import { Button } from "../../components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { contentApi, extractValidImageUrl, contentMediaRevision, ContentDto } from "../../services/apiClient";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { StatusBadge } from "./components/StatusBadge";
import { ContentCard } from "./components/ContentCard";
import { resolveLibraryTitle } from "./lib/title";

import { LibrarySkeleton } from "./skeletons/LibrarySkeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { PublishDraftModal } from "../../components/common/PublishDraftModal";
import {
  JustifiedGallery,
  JustifiedLayoutOptions,
  parseAspectRatio,
} from "../../components/JustifiedGallery";
import { resolveItemAspectRatio } from "./lib/aspectRatio";
import { contentKindLabel, resolveContentKind } from "../../lib/contentKind";
import { isReferenceAsset } from "../ImageStudio/components/RecentGenerations/statusStyles";

/**
 * The library is a dense browsing surface. The row-height band is raised well
 * above the default so tall media (9:16 covers and memes) stays readable, since
 * one row height sizes every tile in the row.
 */
const LIBRARY_LAYOUT: JustifiedLayoutOptions = {
  maxColumns: 6,
  minTileEdge: 190,
  minRowHeight: 360,
  maxRowHeight: 460,
};

const getLibraryRatio = (item: ContentDto) => parseAspectRatio(resolveItemAspectRatio(item));
const getLibraryKey = (item: ContentDto) => `${item.id}-${contentMediaRevision(item)}`;
// Uploaded references are stored without an aspect ratio, so the tile measures
// the image and reports it back under this key.
const getLibraryRatioKey = getLibraryKey;

const VALID_TYPES = new Set(["all", "clip", "image", "meme"]);
const VALID_STATUSES = new Set([
  "all",
  "draft",
  "published",
  "processing",
  "generation_failed",
  "moderation_rejected",
  "reference",
]);

export default function ContentLibrary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const typeFromUrl = searchParams.get("type") || "all";
  const statusFromUrl = searchParams.get("status") || "all";

  const [activeType, setActiveType] = useState<string>(
    VALID_TYPES.has(typeFromUrl) ? typeFromUrl : "all",
  );
  const [activeStatus, setActiveStatus] = useState<string>(
    VALID_STATUSES.has(statusFromUrl) ? statusFromUrl : "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [items, setItems] = useState<ContentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Publish Modal state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [selectedItemForPublish, setSelectedItemForPublish] = useState<ContentDto | null>(null);

  useEffect(() => {
    const nextType = VALID_TYPES.has(typeFromUrl) ? typeFromUrl : "all";
    const nextStatus = VALID_STATUSES.has(statusFromUrl) ? statusFromUrl : "all";
    setActiveType(nextType);
    setActiveStatus(nextStatus);
  }, [typeFromUrl, statusFromUrl]);

  const updateFilters = (type: string, status: string) => {
    setActiveType(type);
    setActiveStatus(status);
    const next = new URLSearchParams(searchParams);
    if (type && type !== "all") next.set("type", type);
    else next.delete("type");
    if (status && status !== "all") next.set("status", status);
    else next.delete("status");
    setSearchParams(next, { replace: true });
  };

  const fetchContent = async (quiet = false) => {
    try {
      if (!quiet) setIsLoading(true);
      else setIsRefreshing(true);
      
      const data = await contentApi.getUserContentList(400); // Prefer generations surviving upload-heavy pages
      setItems(data);
    } catch (err) {
      console.error("Failed to load content:", err);
      toast.error("Failed to load content library.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const filteredItems = items.filter(item => {
    const isReference = isReferenceAsset(item);
    const matchesType =
      activeType === "all" || resolveContentKind(item) === activeType;
    let matchesStatus = true;
    if (activeStatus === "reference") {
      matchesStatus = isReference;
    } else if (activeStatus === "draft") {
      matchesStatus = !isReference && item.status === "draft";
    } else if (activeStatus !== "all") {
      matchesStatus = !isReference && item.status === activeStatus;
    }
    const matchesSearch = searchQuery === "" || 
      (item.title || item.caption || item.prompt || item.storageKey || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "name") {
      return (a.title || "").localeCompare(b.title || "");
    }
    const dateA = new Date(a.createdAt as string || 0).getTime();
    const dateB = new Date(b.createdAt as string || 0).getTime();
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size > 0) setIsSelectionMode(true);
    else setIsSelectionMode(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!window.confirm(t('content_library.bulk.confirm_delete', { count: selectedIds.size, defaultValue: `Are you sure you want to delete ${selectedIds.size} items?` }))) {
      return;
    }

    try {
      setIsRefreshing(true);
      await Promise.all(Array.from(selectedIds).map(id => contentApi.deleteContent(id)));
      setItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      toast.success(t('content_library.bulk.delete_success', { count: selectedIds.size, defaultValue: `Successfully deleted ${selectedIds.size} items.` }));
      clearSelection();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      toast.error(t('content_library.bulk.delete_error', { defaultValue: "Failed to delete some items." }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkDownload = () => {
    toast.info(t('content_library.bulk.download_start', { defaultValue: `Starting batch download for ${selectedIds.size} items...` }));
    // Logic for zipping or sequential download would go here
  };

  const handleBulkMove = () => {
    toast.info(t('content_library.bulk.move_coming_soon', { defaultValue: "Folder management is coming soon!" }));
  };

  const handleDelete = async (id: string) => {
    try {
      await contentApi.deleteContent(id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedIds.has(id)) {
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
        if (newSelected.size === 0) setIsSelectionMode(false);
      }
      toast.success("Creation deleted successfully!");
    } catch (err) {
      console.error("Failed to delete creation:", err);
      toast.error("Failed to delete creation.");
    }
  };

  const handleDownload = async (item: ContentDto) => {
    try {
      const { downloadContentMedia } = await import("../../lib/downloadContentMedia");
      await downloadContentMedia(item);
      toast.success("Download started");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleEdit = (item: ContentDto) => {
    const kind = resolveContentKind(item);
    if (kind === "clip") {
      navigate(`/create/clip/${item.id}/edit?step=trim`);
      toast.info("Opening Clip Studio…");
      return;
    }
    const imgUrl = extractValidImageUrl(item) || item.thumbnailUrl || (item.mediaUrl as string);
    navigate("/create/image", {
      state: {
        draftId: item.id,
        title: item.title || item.caption || "",
        prompt: item.prompt || item.caption || item.description || item.title || "",
        imageUrl: imgUrl,
        mode: kind === "meme" ? "meme" : "image",
        description: item.description || "",
        style: item.style || undefined,
        aspectRatio: item.aspectRatio || undefined,
        status: item.status,
        caption: item.selectedCaption || item.caption || item.captions?.[0] || "",
        captions: item.captions,
        hashtagSets: item.hashtagSets,
        watermarked: item.watermarked,
        studioSessionKey: `${item.id}-${Date.now()}`,
        item,
      },
    });
    toast.info(t('content_library.editing_draft_notice', { defaultValue: 'Continuing draft in Image Studio...' }));
  };

  const handlePublishClick = (item: ContentDto) => {
    setSelectedItemForPublish(item);
    setIsPublishModalOpen(true);
  };

  const handlePublishSuccess = (publishedId: string) => {
    setItems(prev => prev.map(item => 
      item.id === publishedId ? { ...item, status: "published" } : item
    ));
    fetchContent(true); // Refresh silently to get updated stats
  };

  if (isLoading) {
    return <LibrarySkeleton />;
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-4 w-full">
        {/* Compact toolbar — page title lives in TopBar */}
        <div className="flex flex-col gap-3 w-full sticky top-14 z-20 bg-background/80 backdrop-blur-md py-2 border-b border-border/40">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
            <div className="relative group flex-1 min-w-[200px]">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('content_library.search_placeholder', { defaultValue: 'Search your library...' })}
                className="w-full bg-zinc-900/40 border border-white/5 rounded-xl h-10 pl-11 pr-4 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-zinc-900/60 transition-all"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors">
                <Search size={16} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 px-3 bg-zinc-900/40 border-white/5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest transition-all">
                  <Filter size={13} className="text-primary" />
                  Type: <span className="text-white">{activeType === 'all' ? 'All' : activeType}</span>
                  <ChevronDown size={13} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-zinc-900/95 border-white/10 backdrop-blur-xl p-1.5 rounded-xl">
                {[
                  { id: "all", label: "All Types", icon: Sparkles },
                  { id: "clip", label: "Clips", icon: Video },
                  { id: "image", label: "Images", icon: ImageIcon },
                  { id: "meme", label: "Memes", icon: Zap },
                ].map((f) => (
                  <DropdownMenuItem 
                    key={f.id}
                    onClick={() => updateFilters(f.id, activeStatus)}
                    className={cn(
                      "gap-3 py-2.5 cursor-pointer rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors",
                      activeType === f.id ? "bg-primary/10 text-primary" : "text-zinc-400 focus:bg-white/5 focus:text-white"
                    )}
                  >
                    <f.icon size={14} />
                    {f.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 px-3 bg-zinc-900/40 border-white/5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest transition-all">
                  <Zap size={13} className="text-primary" />
                  Status: <span className="text-white">{activeStatus === 'all' ? 'All' : activeStatus === 'published' ? 'Live' : activeStatus === 'reference' ? 'Reference' : 'Draft'}</span>
                  <ChevronDown size={13} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-zinc-900/95 border-white/10 backdrop-blur-xl p-1.5 rounded-xl">
                {[
                  { id: "all", label: "All Status" },
                  { id: "published", label: "Live Creations" },
                  { id: "draft", label: "Drafts Only" },
                  { id: "reference", label: "References" },
                ].map((f) => (
                  <DropdownMenuItem 
                    key={f.id}
                    onClick={() => updateFilters(activeType, f.id)}
                    className={cn(
                      "gap-3 py-2.5 cursor-pointer rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors",
                      activeStatus === f.id ? "bg-primary/10 text-primary" : "text-zinc-400 focus:bg-white/5 focus:text-white"
                    )}
                  >
                    {f.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 px-3 bg-zinc-900/40 border-white/5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest transition-all">
                  <ArrowUpDown size={13} className="text-primary" />
                  Sort: <span className="text-white">{sortBy}</span>
                  <ChevronDown size={13} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-zinc-900/95 border-white/10 backdrop-blur-xl p-1.5 rounded-xl">
                {[
                  { id: "newest", label: "Newest First" },
                  { id: "oldest", label: "Oldest First" },
                  { id: "name", label: "Alphabetical" },
                ].map((s) => (
                  <DropdownMenuItem 
                    key={s.id}
                    onClick={() => setSortBy(s.id as any)}
                    className={cn(
                      "gap-3 py-2.5 cursor-pointer rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors",
                      sortBy === s.id ? "bg-primary/10 text-primary" : "text-zinc-400 focus:bg-white/5 focus:text-white"
                    )}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-7 w-px bg-white/10 hidden sm:block" />

            <div className="flex items-center p-0.5 bg-zinc-900/40 border border-white/5 rounded-xl">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all",
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-zinc-500 hover:text-white"
                )}
              >
                <LayoutGrid size={15} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setViewMode("list")}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "text-zinc-500 hover:text-white"
                )}
              >
                <List size={15} />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={cn(
                "h-10 px-3 rounded-xl gap-2 font-bold uppercase tracking-widest text-[10px]",
                isSelectionMode ? "bg-primary text-primary-foreground" : "bg-zinc-900/40 border-white/5 text-white hover:bg-zinc-900"
              )}
            >
              <FileEdit size={14} />
              {isSelectionMode ? "Exit" : "Select"}
            </Button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {sortedItems.length === 0 ? (
          <div className="bg-zinc-900/20 border border-dashed border-white/10 rounded-3xl py-32">
            <EmptyState
              variant="posts"
              title={searchQuery ? "No matching creations" : t('content_library.empty_state.title', { defaultValue: "Your Library is Waiting" })}
              description={searchQuery ? "We couldn't find any items matching your search. Try adjusting filters." : t('content_library.empty_state.desc', { defaultValue: "Start creating stunning AI clips and images to see them here." })}
              actionLabel={searchQuery ? "Clear Search" : t('content_library.empty_state.cta', { defaultValue: "Create Your First Asset" })}
              onAction={() => {
                if (searchQuery) {
                  setSearchQuery("");
                  setActiveType("all");
                  setActiveStatus("all");
                  setSearchParams({}, { replace: true });
                } else {
                  navigate('/create');
                }
              }}
              secondaryActionLabel={!searchQuery ? "Explore Feed" : undefined}
              onSecondaryAction={!searchQuery ? () => navigate('/feed') : undefined}
            />
          </div>
        ) : viewMode === "grid" ? (
          <JustifiedGallery
            items={sortedItems}
            getRatio={getLibraryRatio}
            getKey={getLibraryKey}
            getRatioKey={getLibraryRatioKey}
            options={LIBRARY_LAYOUT}
            renderItem={({ item, resolvedRatio, reportRatio, index }) => (
              <ContentCard
                item={item}
                index={index}
                aspectRatio={resolvedRatio ?? undefined}
                onMediaLoad={reportRatio}
                onViewDetails={(id) => {
                  const item = items.find((i) => i.id === id);
                  if (item && resolveContentKind(item) === "clip") {
                    navigate(`/create/clip/${id}/edit?step=trim`);
                    return;
                  }
                  if (item && item.status !== "published") {
                    handleEdit(item);
                    return;
                  }
                  navigate(`/feed/post/${id}`);
                }}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onPublish={handlePublishClick}
                isRtl={isRtl}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelection(item.id)}
              />
            )}
          />
        ) : (
          <div className="w-full space-y-4">
            <AnimatePresence mode="popLayout">
              {sortedItems.map((item, idx) => (
                  <motion.div
                    key={`${item.id}-${contentMediaRevision(item)}`}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                  >
                    <div
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelection(item.id);
                          return;
                        }
                        if (resolveContentKind(item) === "clip") {
                          navigate(`/create/clip/${item.id}/edit?step=trim`);
                          return;
                        }
                        if (item.status !== "published") {
                          handleEdit(item);
                          return;
                        }
                        navigate(`/feed/post/${item.id}`);
                      }}
                      className={cn(
                        "group flex items-center gap-6 p-4 bg-zinc-900/40 border rounded-2xl transition-all cursor-pointer",
                        mediaTileSelectionRing(selectedIds.has(item.id)),
                        selectedIds.has(item.id)
                          ? "bg-zinc-900/55"
                          : "border-white/5 hover:border-white/10 hover:bg-zinc-900/60",
                      )}
                    >
                      <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-zinc-600 shrink-0">
                        <AuthenticatedMediaPreview
                          key={contentMediaRevision(item)}
                          item={item}
                          loadingCompact
                          src={
                            extractValidImageUrl(item) ||
                            "https://picsum.photos/seed/1/400/225"
                          }
                          className="w-full h-full object-cover"
                          showPlayBadge={resolveContentKind(item) === "clip"}
                        />
                        {isSelectionMode || selectedIds.has(item.id) ? (
                          <MediaTileSelectCheckbox
                            checked={selectedIds.has(item.id)}
                            visible
                            className="absolute top-2 left-2 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(item.id);
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors">
                          {resolveLibraryTitle(item)}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          <StatusBadge
                            status={
                              item.storageKey?.startsWith("uploads/")
                                ? ("reference" as any)
                                : ((item.status as any) || "draft")
                            }
                          />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} />
                            {new Date(item.createdAt as string).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            {resolveContentKind(item) === "clip" ? (
                              <Video size={12} />
                            ) : (
                              <ImageIcon size={12} />
                            )}
                            {contentKindLabel(resolveContentKind(item))}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-zinc-500 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(item);
                          }}
                        >
                          <Download size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-zinc-500 hover:text-rose-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Floating Bulk Action Toolbar */}
      <AnimatePresence>
        {isSelectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 min-w-[320px] md:min-w-[450px]"
          >
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[11px] font-black text-primary-foreground">
                {selectedIds.size}
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Selected
              </span>
            </div>

            <div className="flex items-center gap-2 flex-grow">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkMove}
                className="h-10 text-zinc-400 hover:text-white hover:bg-white/5 gap-2 px-3"
              >
                <FolderInput size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Move to Folder</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDownload}
                className="h-10 text-zinc-400 hover:text-white hover:bg-white/5 gap-2 px-3"
              >
                <Download size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Download</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                className="h-10 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 gap-2 px-3"
              >
                <Trash2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Delete</span>
              </Button>
            </div>

            <button
              onClick={clearSelection}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PublishDraftModal
        isOpen={isPublishModalOpen}
        onClose={() => {
          setIsPublishModalOpen(false);
          setSelectedItemForPublish(null);
        }}
        item={selectedItemForPublish}
        onPublishSuccess={handlePublishSuccess}
      />
      </div>
    </div>
  );
}
