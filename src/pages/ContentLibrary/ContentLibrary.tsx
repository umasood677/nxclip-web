import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MoreVertical, 
  Eye, 
  Calendar,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Trash2,
  Download,
  Clapperboard,
  FileEdit,
  Filter,
  Search,
  Sparkles,
  Zap,
  X,
  FolderInput,
  Upload,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronDown,
  Plus,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthenticatedImage } from "../../components/AuthenticatedImage";
import { Button } from "../../components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../components/ui/dropdown-menu";
import { contentApi, extractValidImageUrl, ContentDto } from "../../services/apiClient";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { StatusBadge } from "./components/StatusBadge";
import { ContentCard } from "./components/ContentCard";

import { LibrarySkeleton } from "./skeletons/LibrarySkeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { PublishDraftModal } from "../../components/common/PublishDraftModal";

export default function ContentLibrary() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [activeType, setActiveType] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");
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

  const fetchContent = async (quiet = false) => {
    try {
      if (!quiet) setIsLoading(true);
      else setIsRefreshing(true);
      
      const data = await contentApi.getUserContentList(200); // Fetch up to 200 items for the library
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
    const matchesType = activeType === "all" || item.contentType === activeType;
    const matchesStatus = activeStatus === "all" || item.status === activeStatus;
    const matchesSearch = searchQuery === "" || 
      (item.title || item.caption || "").toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleDownload = (item: ContentDto) => {
    const url = extractValidImageUrl(item) || (item.mediaUrl as string) || `https://picsum.photos/seed/${item.id}/1280/720`;
    window.open(url, '_blank');
  };

  const handleEdit = (item: ContentDto) => {
    const imgUrl = extractValidImageUrl(item) || item.thumbnailUrl || (item.mediaUrl as string);
    navigate("/create/image", {
      state: {
        draftId: item.id,
        title: item.title || item.caption || "",
        prompt: item.title || item.caption || item.description || "",
        imageUrl: imgUrl,
        mode: item.contentType === "meme" ? "meme" : "image",
        description: item.description || "",
        item: item
      }
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
    <div className="min-h-screen bg-black/20">
      <div className="space-y-8 w-full px-6 md:px-10 lg:px-12 py-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8 border-b border-white/5">
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-bold tracking-tighter text-white flex items-center gap-4">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
                <Clapperboard className="text-primary w-8 h-8" />
              </div>
              {t('content_library.title')}
            </h1>
            <p className="text-sm text-zinc-500 font-medium ml-14">
              {t('content_library.subtitle', { defaultValue: 'Manage your AI-generated clips and images.' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={cn(
                "h-11 px-5 rounded-xl gap-2 font-bold uppercase tracking-widest text-[11px]",
                isSelectionMode ? "bg-primary text-primary-foreground" : "bg-zinc-900/40 border-white/5 text-white hover:bg-zinc-900"
              )}
            >
              <FileEdit size={16} />
              {isSelectionMode ? "Exit Selection" : "Bulk Select"}
            </Button>
          </div>
        </div>

          {/* Unified Filter Row - No wrapper/container as requested */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full pt-4">
          {/* Search Input - Primary focus */}
          <div className="relative group flex-1 min-w-[280px]">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('content_library.search_placeholder', { defaultValue: 'Search your library...' })}
              className="w-full bg-zinc-900/40 border border-white/5 rounded-xl h-11 pl-12 pr-4 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:bg-zinc-900/60 transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors">
              <Search size={18} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Category Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 px-4 bg-zinc-900/40 border-white/5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl gap-2.5 font-bold text-[11px] uppercase tracking-widest transition-all">
                  <Filter size={14} className="text-primary" />
                  Type: <span className="text-white">{activeType === 'all' ? 'All' : activeType}</span>
                  <ChevronDown size={14} className="opacity-50" />
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
                    onClick={() => setActiveType(f.id)}
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
                <Button variant="outline" className="h-11 px-4 bg-zinc-900/40 border-white/5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl gap-2.5 font-bold text-[11px] uppercase tracking-widest transition-all">
                  <Zap size={14} className="text-primary" />
                  Status: <span className="text-white">{activeStatus === 'all' ? 'All' : activeStatus === 'published' ? 'Live' : 'Draft'}</span>
                  <ChevronDown size={14} className="opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-zinc-900/95 border-white/10 backdrop-blur-xl p-1.5 rounded-xl">
                {[
                  { id: "all", label: "All Status" },
                  { id: "published", label: "Live Creations" },
                  { id: "draft", label: "Drafts Only" },
                ].map((f) => (
                  <DropdownMenuItem 
                    key={f.id}
                    onClick={() => setActiveStatus(f.id)}
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
                <Button variant="outline" className="h-11 px-4 bg-zinc-900/40 border-white/5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl gap-2.5 font-bold text-[11px] uppercase tracking-widest transition-all">
                  <ArrowUpDown size={14} className="text-primary" />
                  Sort: <span className="text-white">{sortBy}</span>
                  <ChevronDown size={14} className="opacity-50" />
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

            <div className="h-8 w-px bg-white/5 mx-1" />

            <div className="flex items-center p-1 bg-zinc-900/40 border border-white/5 rounded-xl">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "w-9 h-9 rounded-lg transition-all",
                  viewMode === "grid" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" : "text-zinc-500 hover:text-white"
                )}
              >
                <LayoutGrid size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setViewMode("list")}
                className={cn(
                  "w-9 h-9 rounded-lg transition-all",
                  viewMode === "list" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" : "text-zinc-500 hover:text-white"
                )}
              >
                <List size={16} />
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
                } else {
                  navigate('/create');
                }
              }}
              secondaryActionLabel={!searchQuery ? "Explore Feed" : undefined}
              onSecondaryAction={!searchQuery ? () => navigate('/feed') : undefined}
            />
          </div>
        ) : (
          <div className={cn(
            "w-full",
            viewMode === "grid" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8" 
              : "space-y-4"
          )}>
            <AnimatePresence mode="popLayout">
              {sortedItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  {viewMode === "grid" ? (
                    <ContentCard
                      item={item}
                      index={idx}
                      onViewDetails={(id) => navigate(`/feed/post/${id}`)}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onPublish={handlePublishClick}
                      isRtl={isRtl}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelect={() => toggleSelection(item.id)}
                    />
                  ) : (
                    <div 
                      onClick={() => isSelectionMode ? toggleSelection(item.id) : navigate(`/feed/post/${item.id}`)}
                      className={cn(
                        "group flex items-center gap-6 p-4 bg-zinc-900/40 border rounded-2xl transition-all cursor-pointer",
                        selectedIds.has(item.id) ? "border-primary bg-primary/5" : "border-white/5 hover:border-white/10 hover:bg-zinc-900/60"
                      )}
                    >
                      <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                        <AuthenticatedImage 
                          src={extractValidImageUrl(item) || "https://picsum.photos/seed/1/400/225"} 
                          className="w-full h-full object-cover"
                        />
                        {selectedIds.has(item.id) && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                              <Sparkles size={16} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors">
                          {item.title || item.caption || "Untitled Creation"}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          <StatusBadge status={item.status as any || "draft"} />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} />
                            {new Date(item.createdAt as string).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            {item.contentType === 'clip' ? <Video size={12} /> : <ImageIcon size={12} />}
                            {item.contentType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white" onClick={(e) => { e.stopPropagation(); handleDownload(item); }}>
                          <Download size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-rose-500" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  )}
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
