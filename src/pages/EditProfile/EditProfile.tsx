import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  ChevronLeft,
  Save,
  X,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Youtube,
  Instagram,
  Twitch,
  Twitter,
} from "lucide-react";
import { useState, useEffect, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { auth, handleFirestoreError, OperationType } from "../../firebase";
import { UserProfile } from "../../types";
import { toast } from "sonner";
import { identityApi, contentApi } from "../../services/apiClient";
import { loadProfileExtras, saveProfileExtras, dataUrlToFile } from "../../lib/profileExtras";
import {
  CREATOR_CATEGORY_NICHES,
  SOCIAL_CONNECT_PLATFORMS,
  type SocialPlatformId,
} from "../../lib/creatorNiches";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAuthProfile, setAuthProfile, selectAuthUser, setAuthUser } from "../../store/slices/authSlice";

import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { FormField } from "../../components/ui/form-field";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { PhotoUploadDialog } from "../../components/PhotoUploadDialog";
import { ProfilePhoto } from "../../components/ProfilePhoto";
import { TiktokIcon } from "../../components/TiktokIcon";
import { cn } from "../../lib/utils";

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters"),
  bio: z.string().max(200, "Bio cannot exceed 200 characters"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const SOCIAL_ICONS: Record<SocialPlatformId, ComponentType<{ size?: number; className?: string }>> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: TiktokIcon,
  twitch: Twitch,
  twitter: Twitter,
};

export default function EditProfile() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [niches, setNiches] = useState<string[]>([]);
  const [nicheInput, setNicheInput] = useState("");
  const [connectedSocials, setConnectedSocials] = useState<
    Partial<Record<SocialPlatformId, boolean>>
  >({});
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
    },
  });

  const dispatch = useAppDispatch();
  const reduxProfile = useAppSelector(selectAuthProfile);
  const authUser = useAppSelector(selectAuthUser);
  const bioValue = watch("bio") || "";

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        let data: UserProfile | null = reduxProfile;

        if (!data) {
          const res = await identityApi.getUserMe();
          const me = res?.user ?? res;
          data = {
            uid: me.id || me.uid,
            displayName: me.displayName || me.username || "Creator",
            email: me.email,
            photoURL: me.avatarUrl || null,
            plan: (me.plan || "free").toLowerCase() as any,
            role: (me.roles?.[0] || "creator") as any,
            onboardingCompleted: me.onboardingCompleted ?? false,
            onboardingPlan: me.onboardingPlan ?? null,
            createdAt: me.createdAt || new Date().toISOString(),
            bio: me.bio || "",
            gameNiches: me.niches || [],
            socials: me.socials || {},
          };
          dispatch(setAuthProfile(data));
        }

        const extras = loadProfileExtras(data.uid);
        const loadedNiches = data.gameNiches?.length
          ? data.gameNiches
          : data.games || extras.niches || [];

        reset({
          displayName: data.displayName || "",
          bio: data.bio || "",
        });

        setNiches(loadedNiches);
        setConnectedSocials(
          data.connectedSocials || extras.connectedSocials || {}
        );
        setCoverUrl(data.coverUrl ?? extras.coverUrl ?? null);
        setPhotoURL(data.photoURL || "");
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setFetching(false);
      }
    };

    loadProfile();
  }, [navigate, reset, reduxProfile, dispatch]);

  const toggleNiche = (niche: string) => {
    if (niches.includes(niche)) {
      setNiches(niches.filter((n) => n !== niche));
    } else {
      setNiches([...niches, niche]);
    }
  };

  const handleAddNiches = () => {
    if (!nicheInput.trim()) return;

    const newNiches = nicheInput
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n !== "" && !niches.includes(n));

    if (newNiches.length > 0) {
      setNiches([...niches, ...newNiches]);
    }
    setNicheInput("");
  };

  const handleSocialConnect = (id: SocialPlatformId) => {
    toast.info(t("profile.edit.oauth_coming_soon"));
    setConnectedSocials((prev) => ({ ...prev, [id]: true }));
  };

  const handleSave = async (data: ProfileFormData) => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      let avatarUrl = photoURL;
      if (photoURL.startsWith("data:")) {
        const file = await dataUrlToFile(photoURL);
        const meta = await contentApi.uploadFile(file);
        const id = meta.contentId || meta.assetId;
        if (!id) throw new Error("Avatar upload failed");
        avatarUrl = `/content/${id}/media`;
        setPhotoURL(avatarUrl);
      }

      await identityApi.updateProfile({
        displayName: data.displayName,
        bio: data.bio,
        ...(avatarUrl ? { avatarUrl } : {}),
      });

      const uid = reduxProfile?.uid || auth.currentUser.uid;
      saveProfileExtras(uid, {
        niches,
        connectedSocials,
        coverUrl,
      });

      const updatedProfile: UserProfile = {
        ...reduxProfile!,
        uid,
        displayName: data.displayName,
        bio: data.bio,
        gameNiches: niches,
        games: niches,
        connectedSocials,
        coverUrl: coverUrl ?? reduxProfile?.coverUrl ?? null,
        photoURL: avatarUrl || reduxProfile?.photoURL || null,
        updatedAt: new Date().toISOString(),
      };
      dispatch(setAuthProfile(updatedProfile));
      if (authUser) {
        dispatch(
          setAuthUser({
            ...authUser,
            displayName: data.displayName,
            photoURL: avatarUrl || authUser.photoURL,
          })
        );
      }

      setLoading(false);
      setSuccess(true);
      toast.success(t("profile.edit.toast.success_title"), {
        description: t("profile.edit.toast.success_desc"),
      });

      setTimeout(() => {
        navigate("/profile");
      }, 800);
    } catch (err) {
      setLoading(false);
      setSuccess(false);
      setError(t("profile.edit.toast.generic_error"));
      toast.error(t("profile.edit.toast.error_title"), {
        description: t("profile.edit.toast.error_desc"),
      });
      try {
        handleFirestoreError(err, OperationType.UPDATE, `profile`);
      } catch {
        // handleFirestoreError throws
      }
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center gap-4 mb-10">
        <Link
          to="/profile"
          className={cn(
            "p-2 hover:bg-accent rounded-md transition-all text-muted-foreground hover:text-foreground",
            isRtl && "rotate-180"
          )}
        >
          <ChevronLeft size={24} />
        </Link>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {t("profile.edit.title")}
        </h2>
      </div>

      <div className="bg-card rounded-lg border border-border p-8 md:p-12 shadow-sm space-y-10">
        {/* Avatar Edit */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-32 h-32 relative group cursor-pointer"
            onClick={() => setIsPhotoDialogOpen(true)}
          >
            <ProfilePhoto
              src={photoURL}
              email={auth.currentUser?.email}
              shape="square"
              className="w-32 h-32 rounded-lg"
            />
            <div className="absolute inset-0 bg-background/40 flex flex-col items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] rounded-lg">
              <Camera size={24} className="mb-1" />
              <span className="text-[10px] font-bold tracking-widest">
                {t("profile.edit.change_photo")}
              </span>
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground tracking-widest">
            {t("profile.edit.photo_label")}
          </p>
        </div>

        <PhotoUploadDialog
          isOpen={isPhotoDialogOpen}
          onClose={() => setIsPhotoDialogOpen(false)}
          onSelect={(url) => setPhotoURL(url)}
          variant="avatar"
        />

        {/* Form */}
        <form
          id="edit-profile-form"
          onSubmit={handleSubmit(handleSave)}
          className="space-y-8"
        >
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4"
              >
                <Alert variant="destructive">
                  <AlertCircle className={cn("h-4 w-4", isRtl && "ml-2")} />
                  <AlertTitle>{t("profile.edit.error_title")}</AlertTitle>
                  <AlertDescription tabIndex={0}>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4"
              >
                <Alert variant="premium">
                  <Check className={cn("h-4 w-4", isRtl && "ml-2")} />
                  <AlertTitle>{t("profile.edit.success_title")}</AlertTitle>
                  <AlertDescription tabIndex={0}>
                    {t("profile.edit.success_msg")}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <FormField
            label={t("profile.edit.display_name_label")}
            id="displayName"
            description={t("profile.edit.display_name_desc")}
            disabled={loading || success}
            className={isRtl ? "text-right" : "text-left"}
            error={errors.displayName?.message}
          >
            <Input
              id="displayName"
              type="text"
              {...register("displayName")}
              className={cn(
                "h-14 px-6 py-4 bg-muted/20 border-border/50 rounded-xl focus:bg-background transition-all text-foreground font-bold",
                isRtl && "text-right"
              )}
              placeholder={t("profile.edit.display_name_placeholder")}
              disabled={loading || success}
            />
          </FormField>

          <FormField
            label={t("profile.edit.bio_label")}
            id="bio"
            description={t("profile.edit.bio_desc")}
            disabled={loading || success}
            className={isRtl ? "text-right" : "text-left"}
            error={errors.bio?.message}
          >
            <Textarea
              id="bio"
              {...register("bio")}
              className={cn(
                "w-full px-6 py-4 bg-muted/20 border-border/50 rounded-xl focus:bg-background transition-all text-foreground font-medium min-h-[140px] resize-none",
                isRtl && "text-right"
              )}
              placeholder={t("profile.edit.bio_placeholder")}
              maxLength={200}
              disabled={loading || success}
            />
            <div
              className={cn(
                "flex mt-2",
                isRtl ? "justify-start" : "justify-end"
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-bold tracking-widest transition-all duration-300 px-2 py-1 rounded-md",
                  bioValue.length >= 200
                    ? "bg-destructive/10 text-destructive animate-pulse"
                    : bioValue.length >= 160
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-muted/50 text-muted-foreground"
                )}
              >
                {bioValue.length} / 200
              </span>
            </div>
          </FormField>

          {/* Content Niches */}
          <div className="space-y-4">
            <div className={cn("px-1", isRtl ? "text-right" : "text-left")}>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                {t("profile.edit.games_label")}
              </label>
              <p className="text-[10px] text-muted-foreground/60 font-medium mt-1">
                {t("profile.edit.games_desc")}
              </p>
            </div>

            <div
              className={cn(
                "flex flex-wrap gap-2 min-h-[50px] p-4 bg-muted/10 border border-border/50 rounded-xl",
                isRtl && "flex-row-reverse"
              )}
            >
              {niches.length === 0 && (
                <span className="text-xs text-muted-foreground italic ms-1">
                  {t("profile.edit.no_niches")}
                </span>
              )}
              <AnimatePresence>
                {niches.map((niche) => (
                  <motion.div
                    key={niche}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-8 px-3 py-0 gap-2 bg-primary/10 text-primary border-primary/20 rounded-md font-bold text-[11px]",
                        isRtl && "flex-row-reverse"
                      )}
                    >
                      {niche}
                      <button
                        type="button"
                        onClick={() => toggleNiche(niche)}
                        className="hover:text-destructive transition-colors"
                        disabled={loading || success}
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="space-y-3">
              <div
                className={cn(
                  "flex gap-2",
                  isRtl && "flex-row-reverse text-right"
                )}
              >
                <Input
                  type="text"
                  placeholder={t("profile.edit.custom_niche_placeholder")}
                  value={nicheInput}
                  onChange={(e) => setNicheInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNiches();
                    }
                  }}
                  className={cn(
                    "h-12 px-4 bg-muted/30 border-border rounded-lg focus:bg-background transition-all text-foreground font-medium",
                    isRtl && "text-right"
                  )}
                  disabled={loading || success}
                />
                <Button
                  type="button"
                  onClick={handleAddNiches}
                  variant="outline"
                  className="h-12 w-12 p-0 border-border hover:bg-primary hover:text-white transition-all shrink-0"
                  disabled={loading || success}
                >
                  <Plus size={20} />
                </Button>
              </div>

              <div
                className={cn(
                  "space-y-5",
                  isRtl ? "text-right" : "text-left"
                )}
              >
                <p className="text-[10px] text-muted-foreground ms-1 font-bold tracking-widest uppercase">
                  {t("profile.edit.popular_suggestions")}
                </p>
                {CREATOR_CATEGORY_NICHES.map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <p className="text-[11px] font-bold text-foreground/80">
                      {cat.label}
                    </p>
                    <div
                      className={cn(
                        "flex flex-wrap gap-1.5",
                        isRtl && "flex-row-reverse"
                      )}
                    >
                      {cat.suggestions.map((suggestion) => {
                        const isSelected = niches.includes(suggestion);
                        return (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => toggleNiche(suggestion)}
                            disabled={loading || success}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                              isSelected
                                ? "bg-primary border-primary text-white"
                                : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                            )}
                          >
                            {isSelected && (
                              <Check
                                size={10}
                                className={cn(
                                  "inline",
                                  isRtl ? "ml-1" : "mr-1"
                                )}
                              />
                            )}
                            {suggestion}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Social Channels — OAuth connect */}
          <div className="space-y-4">
            <div className={cn("px-1", isRtl ? "text-right" : "text-left")}>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                {t("profile.edit.social_links_label")}
              </label>
              <p className="text-[10px] text-muted-foreground/60 font-medium mt-1">
                {t("profile.edit.social_links_desc")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {SOCIAL_CONNECT_PLATFORMS.map((platform) => {
                const Icon = SOCIAL_ICONS[platform.id];
                const isConnected = !!connectedSocials[platform.id];
                return (
                  <div
                    key={platform.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/10",
                      isRtl && "flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background",
                        isConnected && "border-primary/40 text-primary"
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <div className={cn("flex-1 min-w-0", isRtl && "text-right")}>
                      <p className="text-sm font-bold text-foreground">
                        {platform.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
                        {platform.description}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={isConnected ? "secondary" : "outline"}
                      size="sm"
                      className={cn(
                        "shrink-0 h-9 px-4 font-bold text-xs",
                        isConnected && "bg-primary/10 text-primary border-primary/20"
                      )}
                      disabled={loading || success || isConnected}
                      onClick={() => handleSocialConnect(platform.id)}
                    >
                      {isConnected
                        ? t("profile.edit.connected_btn")
                        : t("profile.edit.connect_btn")}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        <div
          className={cn(
            "pt-6 border-t border-border flex gap-3",
            isRtl && "flex-row-reverse"
          )}
        >
          <Button
            variant="outline"
            onClick={() => navigate("/profile")}
            className="flex-grow h-14 font-bold"
            disabled={loading || success}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form="edit-profile-form"
            disabled={loading || success}
            className={cn(
              "flex-grow h-14 font-bold transition-all duration-300",
              success
                ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/20"
                : "shadow-lg shadow-primary/20"
            )}
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="animate-spin" size={18} />
                </motion.div>
              ) : success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "flex items-center gap-2",
                    isRtl && "flex-row-reverse"
                  )}
                >
                  <Check size={18} />
                  {t("profile.edit.saved_btn")}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "flex items-center gap-2",
                    isRtl && "flex-row-reverse"
                  )}
                >
                  <Save size={18} />
                  {t("profile.edit.save_btn")}
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </div>
  );
}
