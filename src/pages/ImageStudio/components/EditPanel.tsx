import React from "react";
import { useTranslation } from "react-i18next";
import { 
  Settings2, Loader2, Maximize2, Image as ImageIcon, Plus, Check,
  Type as TypeIcon, History 
} from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Slider } from "../../../components/ui/slider";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Separator } from "../../../components/ui/separator";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../components/ui/tabs";
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

export function EditPanel({ 
  resultImage, brightness, setBrightness, contrast, setContrast, saturation, setSaturation, 
  isUpscaling, handleUpscale, isRemovingBg, handleRemoveBg, onPublishClick, isPublishing, isPublished, className 
}: EditPanelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  return (
    <Card className={cn("flex flex-col border-border glass shrink-0", className, isRTL ? "direction-rtl" : "direction-ltr")}>
      <Tabs defaultValue="adjust" className="flex-1 flex flex-col">
        <div className="p-2 border-b border-border/50">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="adjust" className="text-[10px] font-bold">{t('image_studio.edit.tabs.adjust')}</TabsTrigger>
            <TabsTrigger value="text" className="text-[10px] font-bold">{t('image_studio.edit.tabs.text')}</TabsTrigger>
            <TabsTrigger value="layers" className="text-[10px] font-bold">{t('image_studio.edit.tabs.layers')}</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 h-full">
          <div className="p-4">
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
                        <span className="text-[10px] text-muted-foreground font-mono">{brightness}%</span>
                      </div>
                      <Slider 
                        value={[brightness]} 
                        onValueChange={(v: number | number[]) => {
                          const val = Array.isArray(v) ? v[0] : v;
                          if (typeof val === 'number') setBrightness(val);
                        }} 
                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        min={0} max={200} step={1} 
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
                        <span className="text-[10px] text-muted-foreground font-mono">{contrast}%</span>
                      </div>
                      <Slider 
                        value={[contrast]} 
                        onValueChange={(v: number | number[]) => {
                          const val = Array.isArray(v) ? v[0] : v;
                          if (typeof val === 'number') setContrast(val);
                        }} 
                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        min={0} max={200} step={1} 
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
                        <span className="text-[10px] text-muted-foreground font-mono">{saturation}%</span>
                      </div>
                      <Slider 
                        value={[saturation]} 
                        onValueChange={(v: number | number[]) => {
                          const val = Array.isArray(v) ? v[0] : v;
                          if (typeof val === 'number') setSaturation(val);
                        }} 
                        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                        min={0} max={200} step={1} 
                      />
                    </div>
                  </div>
              </div>
              <Separator className="bg-border/50" />
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('image_studio.edit.quick_actions')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] h-12 flex flex-col gap-1 font-bold border-border/50 hover:border-primary/50"
                        onClick={handleUpscale}
                        disabled={!resultImage || isUpscaling}
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
                      {t('image_studio.edit.upscale_tooltip')}
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] h-12 flex flex-col gap-1 font-bold border-border/50 hover:border-primary/50"
                        onClick={handleRemoveBg}
                        disabled={!resultImage || isRemovingBg}
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
                      {t('image_studio.edit.bg_remove_tooltip')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="m-0 space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-bold text-muted-foreground">{t('image_studio.edit.text_layers')}</Label>
                <Button variant="outline" className={cn("w-full gap-2 text-xs font-bold border-border/50", isRTL && "flex-row-reverse")}>
                  <Plus className="h-3 w-3" />
                  {t('image_studio.edit.add_text')}
                </Button>
                <div className="p-3 rounded-xl border border-border/50 bg-muted/30 space-y-3">
                  <Input placeholder={t('image_studio.edit.font_placeholder')} className={cn("h-9 text-xs bg-background/50 border-border/50", isRTL && "text-right")} />
                  <div className={cn("grid grid-cols-2 gap-2", isRTL && "flex-row-reverse")}>
                    <Select defaultValue="inter">
                      <SelectTrigger className="h-8 text-[10px] bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="impact">Impact</SelectItem>
                        <SelectItem value="mono">Mono</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                      <Button size="icon" variant="outline" className="h-8 w-8 border-border/50"><TypeIcon className="h-3 w-3" /></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 border-border/50"><TypeIcon className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              </div>
              <Separator className="bg-border/50" />
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('image_studio.edit.presets')}</Label>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: "gaming_meme", label: t('image_studio.edit.preset_labels.gaming_meme') },
                    { id: "stream_alert", label: t('image_studio.edit.preset_labels.stream_alert') },
                    { id: "thumbnail_title", label: t('image_studio.edit.preset_labels.thumbnail_title') }
                  ].map(p => (
                    <Button key={p.id} variant="ghost" className={cn("justify-start text-xs h-9 font-medium hover:bg-primary/5 hover:text-primary transition-colors", isRTL && "flex-row-reverse text-right")}>
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="layers" className="m-0 space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('image_studio.edit.tabs.layers')}</Label>
              <div className="space-y-2">
                <div className={cn("flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20", isRTL && "flex-row-reverse")}>
                  <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden border border-border">
                    {resultImage && <img src={resultImage} alt="layer bg" className="w-full h-full object-cover" />}
                  </div>
                  <div className={cn("flex-1", isRTL && "text-right")}>
                    <p className="text-[10px] font-bold">{t('image_studio.edit.background_layer')}</p>
                    <p className="text-[8px] text-muted-foreground font-bold">{t('image_studio.edit.ai_generation')}</p>
                  </div>
                  <Switch checked />
                </div>
                <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-border/50 opacity-50", isRTL && "flex-row-reverse")}>
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className={cn("flex-1", isRTL && "text-right")}>
                    <p className="text-[10px] font-bold">Text Layer 1</p>
                    <p className="text-[8px] text-muted-foreground font-bold">{t('image_studio.edit.empty_layer')}</p>
                  </div>
                  <Switch disabled />
                </div>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 space-y-2">
          {resultImage && (
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
          )}
          <Button variant="secondary" className={cn("w-full text-xs gap-2 h-9 font-bold", isRTL && "flex-row-reverse")}>
            <History className="h-3 w-3" />
            {t('image_studio.edit.view_history')}
          </Button>
        </div>
      </Tabs>
    </Card>
  );
}
