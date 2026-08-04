export interface GenerationHistoryItem {
  id?: string;
  url: string;
  title?: string;
  /** Latest prompt (refine if refined, else base) — kept for reuse / filters. */
  prompt: string;
  /** Original generation prompt; frozen across refine. */
  basePrompt?: string;
  /** Most recent refine instruction; undefined until refined. */
  refinePrompt?: string;
  style?: string;
  type?: string;
  status?: string;
  aspectRatio?: string;
  watermarked?: boolean;
  storageKey?: string;
  /** Used to remount thumbs when regenerate keeps the same /content/{id}/media path. */
  mediaRevision?: string;
  captions?: string[];
  hashtagSets?: string[][];
  memeSpec?: {
    mode?: "ai" | "template" | "hybrid";
    templateId?: string;
    texts?: Array<{ slot: string; text: string }>;
  };
  timestamp: number;
}

export type ImageStudioAspectRatio = "1:1" | "16:9" | "9:16";
export type ImageStudioStyle = "cinematic" | "meme" | "pixel_art" | "cartoon" | "realistic";

/** Local upload chip shown in the References row (ordered left → right). */
export interface ReferenceUploadItem {
  localId: string;
  /** Server asset/content id once upload finishes. */
  id?: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "ready" | "error";
}

/** Unified chip for ordered Image 1…N display (uploads + library picks). */
export interface OrderedReferenceChip {
  key: string;
  label: string;
  previewUrl: string;
  status: "uploading" | "ready" | "error";
  source: "upload" | "library";
  /** Remove upload by localId, or toggle off library by content id. */
  removeId: string;
}

export interface GeneratePanelProps {
  mode: "image" | "meme";
  setMode: (mode: "image" | "meme") => void;
  memeMode: "ai" | "template" | "hybrid";
  setMemeMode: (mode: "ai" | "template" | "hybrid") => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  title: string;
  setTitle: (title: string) => void;
  isGeneratingTitle: boolean;
  handleGenerateTitle: () => void;
  style: string;
  setStyle: (style: string) => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  activeSuggestions: string[];
  refreshSuggestions: () => void;
  STYLE_PRESETS: { id: string; label: string; thumbnail?: string }[];
  handleSuggestionClick: (suggestion: string) => void;
  generationsLeft: number | null;
  /** Free plan daily cap; null means unlimited / Pro. */
  dailyGenerationLimit?: number | null;
  setIsQuickEditOpen: (open: boolean) => void;
  topText: string;
  setTopText: (text: string) => void;
  bottomText: string;
  setBottomText: (text: string) => void;
  memeTemplates: import("../../services/apiClient").MemeTemplateDto[];
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;
  slotTexts: Record<string, string>;
  setSlotText: (slotId: string, value: string) => void;
  lighting: string;
  setLighting: (l: string) => void;
  negativePrompt: string;
  setNegativePrompt: (p: string) => void;
  caption: string;
  setCaption: (c: string) => void;
  isGeneratingCaption: boolean;
  handleGenerateCaption: () => void;
  resultImage: string | null;
  captionSuggestions: string[];
  history: GenerationHistoryItem[];
  /** Library assets for reference picking (includes uploads + generations). */
  libraryImages: GenerationHistoryItem[];
  handleReuseGeneration: (item: GenerationHistoryItem) => void;
  setIsConfirmClearOpen: (open: boolean) => void;
  referenceContentIds: string[];
  toggleReferenceContent: (id: string) => void;
  referenceUploads: ReferenceUploadItem[];
  orderedReferenceChips: OrderedReferenceChip[];
  onUploadReference: (file: File) => Promise<void>;
  onRemoveReferenceUpload: (localId: string) => void;
  onClearReferences: () => void;
  isUploadingReference: boolean;
  maxReferences: number;
  /** Shown next to the counter, e.g. "Free plan". */
  referencePlanHint?: string;
  /** When true, Generate creates a new image instead of refining the current draft. */
  willCreateNewImage: boolean;
  /** Detach current draft and clear options so Generate creates a brand-new asset. */
  onStartFreshDraft?: () => void;
  onScrollToHistory?: () => void;
  /** Opens the canvas library browser for picking references. */
  libraryPickerOpen?: boolean;
  onLibraryPickerOpenChange?: (open: boolean) => void;
  className?: string;
}

export interface ScrollableSuggestionsProps {
  items: string[];
  onSelect: (s: string) => void;
  selectedValue?: string;
  truncateLimit?: number;
}

export interface CanvasPanelProps {
  resultImage: string | null;
  isGenerating: boolean;
  error: string | null;
  handleGenerate: () => void;
  handleRetry?: () => void;
  canRetry?: boolean;
  handleDownload: (url: string) => void;
  variations: string[];
  setResultImage: (url: string) => void;
  brightness: number;
  setBrightness: (val: number) => void;
  contrast: number;
  setContrast: (val: number) => void;
  saturation: number;
  setSaturation: (val: number) => void;
  aspectRatio: string;
  onPublishClick?: () => void;
  isPublishing?: boolean;
  isPublished?: boolean;
  watermarked?: boolean;
  contentStatus?: string | null;
  mode?: "image" | "meme";
  memeMode?: "ai" | "template" | "hybrid";
  /** Selected template (template/hybrid meme modes) so canvas can preview its layout. */
  memeTemplate?: import("../../services/apiClient").MemeTemplateDto | null;
  slotTexts?: Record<string, string>;
  /** Live editor text (next refine / new generate). */
  prompt?: string;
  /** Frozen original prompt for the active draft. */
  basePrompt?: string;
  /** Last refine instruction for the active draft. */
  refinePrompt?: string;
  /** Matches left-panel primary action so canvas footer is not a second conflicting verb. */
  willCreateNewImage?: boolean;
  onStartFreshDraft?: () => void;
  /** False until AuthenticatedImage fires onLoad — gates captions/hashtags. */
  previewReady?: boolean;
  onPreviewReady?: () => void;
  /** When true, canvas shows library browser for reference picking. */
  libraryPickerOpen?: boolean;
  onLibraryPickerOpenChange?: (open: boolean) => void;
  libraryImages?: GenerationHistoryItem[];
  referenceContentIds?: string[];
  toggleReferenceContent?: (id: string) => void;
  maxReferences?: number;
  /** Selected ref chips (left panel + selection badges in picker). */
  orderedReferenceChips?: OrderedReferenceChip[];
  captionSuggestions?: string[];
  selectedCaption?: string;
  generatedHashtags?: string[][];
  selectedHashtags?: string[];
  onSelectCaption?: (caption: string) => void;
  onSelectHashtagSet?: (tags: string[]) => void;
}

export interface EditPanelProps {
  resultImage: string | null;
  brightness: number;
  setBrightness: (val: number) => void;
  contrast: number;
  setContrast: (val: number) => void;
  saturation: number;
  setSaturation: (val: number) => void;
  isUpscaling: boolean;
  handleUpscale: () => void;
  isRemovingBg: boolean;
  handleRemoveBg: () => void;
  onPublishClick?: () => void;
  onViewHistoryClick?: () => void;
  isPublishing?: boolean;
  isPublished?: boolean;
  className?: string;
}
