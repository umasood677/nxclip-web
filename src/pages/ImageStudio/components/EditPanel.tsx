import React from "react";
import { useTranslation } from "react-i18next";
import { 
  Settings2, Loader2, Maximize2, Image as ImageIcon, Plus, Check, History, Clapperboard,
} from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Slider } from "../../../components/ui/slider";
import { Input } from "../../../components/ui/input";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Separator } from "../../../components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";
import { EditPanelProps } from "../types";
import { ImageStudioTypographyControls } from "./ImageStudioTypographyControls";

export function EditPanel({ 
  resultImage, brightness, setBrightness, contrast, setContrast, saturation, setSaturation, 
  isUpscaling, handleUpscale, isRemovingBg, handleRemoveBg,
  backgroundMode, setBackgroundMode, backgroundColor, setBackgroundColor,
  isApplyingAdjust, handleApplyAdjust, isApplyingCompose, handleApplyCompose,
  isApplyingToImage, handleApplyToImage, hasPendingAdjust = false, hasPendingText = false,
  editLayers = [], selectedLayerId, onSelectLayer, onAddTextLayer,
  onUpdateSelectedLayer, onRemoveSelectedLayer, onToggleLayerVisible, onMoveLayer,
  editToolsDisabled, editDisabledReason, hasComposedText = false,
  useCanonicalTypography = false,
  onPublishClick, onAnimateAsClipClick, isAnimatingAsClip, canAnimateAsClip = true, animateCtaLabel = "Animate in Clip Studio", onViewHistoryClick, isPublishing, isPublished, className
}: EditPanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [activeTab, setActiveTab] = React.useState("adjust");
  const toolsLocked = Boolean(editToolsDisabled || !resultImage);

  return (
    <Card className={cn("flex flex-col border-border glass shrink-0 h-full min-h-0 overflow-hidden", className, isRTL ? "direction-rtl" : "direction-ltr")}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="p-2 border-b border-border/50 shrink-0">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="adjust" className="text-[10px] font-bold">{t('image_studio.edit.tabs.adjust')}</TabsTrigger>
            <TabsTrigger value="typography" className="text-[10px] font-bold">
              {t('image_studio.edit.tabs.typography', { defaultValue: 'Typography' })}
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {editDisabledReason ? (
              <p className="mb-4 text-[10px] text-muted-foreground leading-relaxed rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                {editDisabledReason}
              </p>
            ) : null}

            <TabsContent value="adjust" className="m-0 space-y-6">
              <div className="space-y-4">
                <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('image_studio.edit.adjustments')}</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[8px] font-bold uppercase"
                    onClick={() => {
                      setBrightness(100);
                      setContrast(100);
                      setSaturation(100);
                    }}
                    disabled={toolsLocked}
                  >
                    {t('image_studio.canvas.reset')}
                  </Button>
                </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className={cn("flex justify-between items-center group/lt", isRTL && "flex-row-reverse")}>
                        <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                          <Label className="text-[10px] font-bold">{t('image_studio.canvas.brightness')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help"><Settings2 size={8} className="text-muted-foreground/50" /></div>
                            </TooltipTrigger>
                            <TooltipContent side={isRTL ? "left" : "right"}>{t('image_studio.edit.brightness_tooltip')}</TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{brightness}%</span>
                      </div>
                      <Slider 
                        value={[brightness]} 
                        onValueChange={(v: number | number[]) => {
                          const val = Array.isArray(v) ? v[0] : v;
                          if (typeof val === 'number') setBrightness(val);
                        }} 
                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        min={0} max={200} step={1}
                        disabled={toolsLocked}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className={cn("flex justify-between items-center group/lt", isRTL && "flex-row-reverse")}>
                        <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                          <Label className="text-[10px] font-bold">{t('image_studio.canvas.contrast')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help"><Settings2 size={8} className="text-muted-foreground/50" /></div>
                            </TooltipTrigger>
                            <TooltipContent side={isRTL ? "left" : "right"}>{t('image_studio.edit.contrast_tooltip')}</TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{contrast}%</span>
                      </div>
                      <Slider 
                        value={[contrast]} 
                        onValueChange={(v: number | number[]) => {
                          const val = Array.isArray(v) ? v[0] : v;
                          if (typeof val === 'number') setContrast(val);
                        }} 
                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        min={0} max={200} step={1}
                        disabled={toolsLocked}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className={cn("flex justify-between items-center group/lt", isRTL && "flex-row-reverse")}>
                        <div className={cn("flex items-center gap-1.5", isRTL && "flex-row-reverse")}>
                          <Label className="text-[10px] font-bold">{t('image_studio.canvas.saturation')}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help"><Settings2 size={8} className="text-muted-foreground/50" /></div>
                            </TooltipTrigger>
                            <TooltipContent side={isRTL ? "left" : "right"}>{t('image_studio.edit.saturation_tooltip')}</TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{saturation}%</span>
                      </div>
                      <Slider 
                        value={[saturation]} 
                        onValueChange={(v: number | number[]) => {
                          const val = Array.isArray(v) ? v[0] : v;
                          if (typeof val === 'number') setSaturation(val);
                        }} 
                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        min={0} max={200} step={1}
                        disabled={toolsLocked}
                      />
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-[10px] h-9 font-bold"
                        onClick={handleApplyAdjust}
                        disabled={toolsLocked || isApplyingAdjust}
                      >
                        {isApplyingAdjust ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        ) : null}
                        {t('image_studio.edit.apply_adjust')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{t('image_studio.edit.apply_adjust_tooltip')}</TooltipContent>
                  </Tooltip>
              </div>
              <Separator className="bg-border/50" />
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('image_studio.edit.quick_actions')}</Label>
                <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-2.5">
                  <Label className="text-[10px] font-bold">{t('image_studio.edit.background_output')}</Label>
                  <Select value={backgroundMode} onValueChange={(value) => setBackgroundMode(value as "transparent" | "solid")} disabled={toolsLocked}>
                    <SelectTrigger className="h-8 text-[11px]" aria-label={t('image_studio.edit.background_output')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transparent">{t('image_studio.edit.background_transparent')}</SelectItem>
                      <SelectItem value="solid">{t('image_studio.edit.background_solid')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {backgroundMode === "solid" ? (
                    <div className="flex items-center gap-2">
                      <Input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} disabled={toolsLocked} className="h-8 w-12 cursor-pointer p-1" aria-label={t('image_studio.edit.background_color')} />
                      <span className="text-[11px] font-mono text-muted-foreground">{backgroundColor.toUpperCase()}</span>
                    </div>
                  ) : null}
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{t('image_studio.edit.background_help')}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] h-12 flex flex-col gap-1 font-bold border-border/50"
                        onClick={handleUpscale}
                        disabled={toolsLocked || isUpscaling}
                      >
                        {isUpscaling ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Maximize2 className="h-3 w-3" />
                        )}
                        {isUpscaling ? t('image_studio.edit.processing') : t('image_studio.edit.upscale')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {editDisabledReason || t('image_studio.edit.upscale_tooltip')}
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] h-12 flex flex-col gap-1 font-bold border-border/50"
                        onClick={handleRemoveBg}
                        disabled={toolsLocked || isRemovingBg}
                      >
                        {isRemovingBg ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ImageIcon className="h-3 w-3" />
                        )}
                        {isRemovingBg ? t('image_studio.edit.removing') : t('image_studio.edit.bg_remove')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {editDisabledReason || t('image_studio.edit.bg_remove_tooltip')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="typography" className="m-0">
              <ImageStudioTypographyControls
                editLayers={editLayers}
                selectedLayerId={selectedLayerId}
                onSelectLayer={onSelectLayer}
                onAddTextLayer={onAddTextLayer}
                onUpdateSelectedLayer={onUpdateSelectedLayer}
                onRemoveSelectedLayer={onRemoveSelectedLayer}
                onToggleLayerVisible={onToggleLayerVisible}
                onMoveLayer={onMoveLayer}
                onApplyCompose={handleApplyCompose}
                isApplyingCompose={isApplyingCompose}
                hasComposedText={hasComposedText}
                toolsLocked={toolsLocked}
                useCanonicalFaces={useCanonicalTypography}
              />
            </TabsContent>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 space-y-2 shrink-0 bg-background/90">
          {resultImage && handleApplyToImage ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(
                    "w-full text-xs gap-2 h-10 font-bold",
                    isRTL && "flex-row-reverse",
                  )}
                  onClick={handleApplyToImage}
                  disabled={
                    toolsLocked ||
                    Boolean(isApplyingToImage) ||
                    (!hasPendingAdjust && !hasPendingText)
                  }
                >
                  {isApplyingToImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {t('image_studio.edit.apply_to_image', { defaultValue: 'Apply to Image' })}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t('image_studio.edit.apply_to_image_tooltip', {
                  defaultValue:
                    'Permanently burn Adjust + Typography into this image (updates Recent Generations).',
                })}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {resultImage && (
            <>
            <Button
              variant="outline"
              className={cn("w-full text-xs gap-2 h-9 font-bold", isRTL && "flex-row-reverse")}
              onClick={onAnimateAsClipClick}
              disabled={isAnimatingAsClip || isPublishing || !canAnimateAsClip}
            >
              {isAnimatingAsClip ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Animating…
                </>
              ) : (
                <>
                  <Clapperboard className="h-4 w-4" />
                  {animateCtaLabel}
                </>
              )}
            </Button>
            {!canAnimateAsClip && isPublished ? (
              <p className="text-[10px] text-muted-foreground leading-snug">
                Published stills cannot be refined. Use Continue as draft &amp; animate from the week plan to create a clip.
              </p>
            ) : null}
            <Button 
              variant="brand-gradient" 
              className={cn("w-full text-xs gap-2 h-9 font-bold shadow-lg shadow-primary/20", isRTL && "flex-row-reverse")}
              onClick={onPublishClick}
              disabled={isPublishing || isPublished}
            >
              {isPublishing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Publishing...
                </>
              ) : isPublished ? (
                <>
                  <Check className="h-4 w-4" />
                  Published!
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Publish to Feed
                </>
              )}
            </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full text-xs gap-2 h-10 font-bold border-border bg-muted/40 hover:bg-muted/70",
              isRTL && "flex-row-reverse",
            )}
            onClick={onViewHistoryClick}
          >
            <History className="h-3.5 w-3.5" />
            View History
          </Button>
        </div>
      </Tabs>
    </Card>
  );
}
