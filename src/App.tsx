import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { auth, handleFirestoreError, OperationType } from "./firebase";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { UserProfile } from "./types";
import { ADMIN_EMAILS } from "./constants";
import { useTranslation } from "react-i18next";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import DashboardLayout from "./components/layouts/DashboardLayout";
import { PwaManager } from "./components/PwaManager";
import { safeLocalStorage, safeSessionStorage } from "./lib/safeStorage";
import { PwaProvider } from "./contexts/PwaContext";
import { motion } from "motion/react";
import { Sparkles, Cpu } from "lucide-react";
import logo from "./contents/images/nexa-logo.png";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setAuthUser, setAuthProfile, setAuthLoading, SerializedUser, selectAuthUser, selectAuthProfile, selectAuthLoading, logoutUser } from "./store/slices/authSlice";
import { selectAuthProvider } from "./store/slices/uiSlice";
import { identityApi } from "./services/apiClient";
import { getPersistedUser, setPersistedUser, useAuthToken } from "./services/auth/authService";
import { STORAGE_KEYS } from "./constants";
import { contentPlanFromOnboarding, isRenewingWeekPlan } from "./lib/weekPlan";
import { creatorFieldsFromIdentityMe } from "./lib/onboardingSnapshot";

// --- Loading Component ---
const PageLoader = () => {
  const [subsystemLog, setSubsystemLog] = useState("initializing creator os engine...");
  const [loadSource, setLoadSource] = useState<"cache" | "network" | "offline">("network");
  const [themeStatus, setThemeStatus] = useState("checking...");

  useEffect(() => {
    try {
      const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const osIsDark = darkQuery.matches;
      const localTheme = safeLocalStorage.getItem(STORAGE_KEYS.THEME) || "dark";
      const isSynced = (osIsDark && localTheme === "dark") || (!osIsDark && localTheme === "light");
      setThemeStatus(isSynced ? `synced (${localTheme} os)` : `custom (${localTheme})`);
    } catch (_) {
      setThemeStatus("offline default");
    }
  }, []);

  useEffect(() => {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        if (nav.workerStart > 0 || nav.transferSize === 0) {
          setLoadSource("cache");
        } else if (!navigator.onLine) {
          setLoadSource("offline");
        } else {
          setLoadSource("network");
        }
      } else {
        if (!navigator.onLine) {
          setLoadSource("offline");
        } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          setLoadSource("cache");
        }
      }
    } catch (_) {
      if (!navigator.onLine) setLoadSource("offline");
    }
  }, []);

  useEffect(() => {
    const sourceLabel = loadSource === "cache" 
      ? "local cache (pwa)" 
      : loadSource === "offline" 
        ? "offline cached instance" 
        : "remote cdn network";

    const logs = [
      "initializing creator os engine...",
      "powering viral processor core...",
      `diagnostic: loaded via [${sourceLabel}]`,
      "syncing theme...",
      "mounting media canvas workspace...",
      "syncing creator analytics node...",
      "connecting ai coach assistant..."
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % logs.length;
      setSubsystemLog(logs[index]);
    }, 1200);
    return () => clearInterval(interval);
  }, [loadSource]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white relative overflow-hidden select-none">
      {/* Background radial gradient representing premium energy */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0%,transparent_65%)] pointer-events-none" />
      
      {/* Container area */}
      <div className="flex flex-col items-center z-10 max-w-xs text-center px-6">
        {/* Glowing Logo Frame */}
        <div className="relative mb-6">
          {/* Pulsating back aura */}
          <motion.div 
            animate={{ 
              scale: [1, 1.12, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-4 bg-gradient-to-r from-primary to-brand-secondary rounded-2xl blur-xl opacity-50"
          />
          
          {/* Logo container matching PwaManager badge */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-24 h-24 bg-zinc-900 border border-white/10 rounded-2xl p-4 flex items-center justify-center shadow-2xl"
          >
            <img 
              src={logo} 
              alt="nxclip.ai Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          {/* Gold Sparkle accent */}
          <motion.div
            animate={{ 
              scale: [0.8, 1.2, 0.8],
              rotate: [0, 90, 180, 270, 360]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-1.5 -right-1.5 bg-zinc-950 border border-amber-500/30 p-1 rounded-lg shadow-lg"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
          </motion.div>
        </div>

        {/* Branding Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-xl font-bold font-display tracking-tight text-white mb-0.5">
              nxclip.ai
            </h1>
            <div className="inline-flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest text-purple-400 uppercase">
              Creator OS
            </div>
          </div>
          
          {/* Cycling Technical Logs */}
          <p className="text-[10px] font-mono tracking-wider text-zinc-400 h-4 mt-2 lowercase">
            {subsystemLog}
          </p>

          {/* Diagnostic Log Info Badges */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-wider select-none">
            {/* Diagnostic Log Source Badge */}
            <div className="flex items-center gap-1.5 text-zinc-500 bg-white/5 border border-white/5 py-1 px-2.5 rounded-lg">
              <span className="text-zinc-600">source:</span>
              {loadSource === "cache" ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1 w-1 bg-emerald-400 rounded-full animate-pulse" />
                  local cache (pwa)
                </span>
              ) : loadSource === "offline" ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <span className="h-1 w-1 bg-amber-400 rounded-full animate-pulse" />
                  offline cache
                </span>
              ) : (
                <span className="text-purple-400 font-semibold flex items-center gap-1">
                  <span className="h-1 w-1 bg-purple-400 rounded-full animate-pulse" />
                  cdn network
                </span>
              )}
            </div>

            {/* Diagnostic OS Theme Sync Badge */}
            <div className="flex items-center gap-1.5 text-zinc-500 bg-white/5 border border-white/5 py-1 px-2.5 rounded-lg">
              <span className="text-zinc-600">theme check:</span>
              {themeStatus === "checking..." ? (
                <span className="text-zinc-400 font-semibold flex items-center gap-1">
                  <span className="h-1 w-1 bg-zinc-400 rounded-full animate-ping" />
                  syncing...
                </span>
              ) : (
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <span className="h-1 w-1 bg-cyan-400 rounded-full" />
                  {themeStatus}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Dynamic Dual Progress bar */}
        <div className="w-48 h-1 bg-white/5 rounded-full mt-6 overflow-hidden relative border border-white/5">
          <motion.div 
            animate={{ 
              left: ["-100%", "100%"]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-primary to-brand-secondary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
          />
        </div>
      </div>
      
      {/* Outer corner ambient detail */}
      <div className="absolute bottom-6 text-[9px] font-mono text-zinc-500 flex items-center gap-1.5">
        <Cpu className="h-3 w-3 text-primary/70" />
        <span>nxclip.ai • platform active</span>
      </div>
    </div>
  );
};

// --- Lazy Load Pages ---
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const ImageStudio = lazy(() => import("./pages/ImageStudio/ImageStudio"));
const Analytics = lazy(() => import("./pages/Analytics/Analytics"));
const CreatorCoach = lazy(() => import("./pages/CreatorCoach/CreatorCoach"));
const AdminPanel = lazy(() => import("./pages/AdminPanel/AdminPanel"));
const DevSuite = lazy(() => import("./pages/DevSuite/DevSuite"));
const MigrationGuide = lazy(() => import("./pages/AdminPanel/MigrationGuide"));
const DesignSystem = lazy(() => import("./pages/AdminPanel/DesignSystem"));
const Home = lazy(() => import("./pages/Home/Home"));
const HomeV2 = lazy(() => import("./pages/HomeV2/HomeV2"));
const Onboarding = lazy(() => import("./pages/Onboarding/Onboarding"));
const Features = lazy(() => import("./pages/Features/Features"));
const Pricing = lazy(() => import("./pages/Pricing/Pricing"));
const Login = lazy(() => import("./pages/Login/Login"));
const Signup = lazy(() => import("./pages/Signup/Signup"));
const PublicPostView = lazy(() => import("./pages/PublicPostView/PublicPostView"));
const HomeFeed = lazy(() => import("./pages/HomeFeed/HomeFeed"));
const CreateHub = lazy(() => import("./pages/CreateHub/CreateHub"));
const ClipUpload = lazy(() => import("./pages/ClipUpload/ClipUpload"));
const ClipEditor = lazy(() => import("./pages/ClipEditor/ClipEditor"));
const PostDetail = lazy(() => import("./pages/PostDetail/PostDetail"));
const UserProfilePage = lazy(() => import("./pages/UserProfile/UserProfile"));
const OwnProfile = lazy(() => import("./pages/OwnProfile/OwnProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile/EditProfile"));
const ContentLibrary = lazy(() => import("./pages/ContentLibrary/ContentLibrary"));
const BillingSuccessPage = lazy(() => import("./pages/Billing/BillingSuccessPage"));
const BillingCancelPage = lazy(() => import("./pages/Billing/BillingCancelPage"));
const UpgradePage = lazy(() => import("./pages/UpgradePage/UpgradePage"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Notifications = lazy(() => import("./pages/Notifications/Notifications"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword/ForgotPassword"));

function AuthGuard({ children, profile, loading }: { children: React.ReactNode, profile: UserProfile | null, loading: boolean }) {
  const location = useLocation();
  const user = useAppSelector(selectAuthUser);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    if (location.pathname !== "/login" && location.pathname !== "/signup") {
      safeLocalStorage.setItem("nx_return_to", location.pathname);
    }
    return <Navigate to="/login" />;
  }

  if (!user.emailVerified) {
    if (location.pathname !== "/verify-email") {
      return <Navigate to="/verify-email" />;
    }
  }

  // Wait for /users/me before deciding onboarding — never treat "profile still loading" as incomplete.
  if (!profile) {
    return <PageLoader />;
  }

  const isFinishingOnboarding = safeSessionStorage.getItem("finishing_onboarding") === "true";

  // Only incomplete users (skipped or never finished) are sent to coach — not every login.
  if (
    profile.onboardingCompleted !== true &&
    location.pathname !== "/onboarding" &&
    !isFinishingOnboarding
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (profile.onboardingCompleted === true && isFinishingOnboarding) {
    safeSessionStorage.removeItem("finishing_onboarding");
  }

  return <>{children}</>;
}

function AdminGuard({ children, profile, loading }: { children: React.ReactNode, profile: UserProfile | null, loading: boolean }) {
  if (loading) return <PageLoader />;
  const user = useAppSelector(selectAuthUser);
  const isAdmin = profile?.role === "admin" || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function PublicGuard({ children, user, profile, loading }: { children: React.ReactNode, user: SerializedUser | null, profile: UserProfile | null, loading: boolean }) {
  if (loading) return <PageLoader />;
  if (user) {
    if (!user.emailVerified) {
      return <Navigate to="/verify-email" />;
    }
    // Profile may still be loading after login — wait before routing
    if (!profile) {
      return <PageLoader />;
    }
    if (profile.onboardingCompleted !== true) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/feed" replace />;
  }
  return <>{children}</>;
}

/** Allows completed users back into Coach when renewing / changing niche. */
function OnboardingEntry({
  user,
  profile,
}: {
  user: SerializedUser;
  profile: UserProfile | null;
}) {
  const location = useLocation();
  const navState = (location.state || {}) as {
    renewWeekPlan?: boolean;
    fromReset?: boolean;
    fromStudio?: string;
    reviseOnboarding?: boolean;
  };

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allowReentry =
    safeSessionStorage.getItem("finishing_onboarding") === "true" ||
    isRenewingWeekPlan() ||
    navState.renewWeekPlan === true ||
    navState.fromReset === true ||
    navState.reviseOnboarding === true;

  if (profile.onboardingCompleted === true && !allowReentry) {
    return <Navigate to="/feed" replace />;
  }

  return <Onboarding />;
}

export default function App() {
  const { i18n, t } = useTranslation();
  const dispatch = useAppDispatch();
  const sessionToken = useAuthToken(); // Safely access session token via the hook

  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(logoutUser());
      toast.error(t("session_expired", "Your session has expired. Please log in again."));
    };

    window.addEventListener("nx_session_expired", handleSessionExpired);
    return () => {
      window.removeEventListener("nx_session_expired", handleSessionExpired);
    };
  }, [dispatch, t]);

  const user = useAppSelector(selectAuthUser);
  const profile = useAppSelector(selectAuthProfile);
  const loading = useAppSelector(selectAuthLoading);
  const authProvider = useAppSelector(selectAuthProvider);

  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const parsed = getPersistedUser();

    if (parsed) {
      // Keep loading until /users/me resolves so we do not mis-route on a null profile.
      dispatch(setAuthLoading(true));
      dispatch(setAuthUser({
        uid: parsed.uid || parsed.id,
        email: parsed.email,
        displayName: parsed.displayName,
        photoURL: parsed.photoURL || null,
        emailVerified: parsed.emailVerified ?? true,
      }));
    } else {
      dispatch(setAuthUser(null));
      dispatch(setAuthProfile(null));
      dispatch(setAuthLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!user) {
      dispatch(setAuthProfile(null));
      return;
    }

    // Fetch profile from API Gateway
    let isSubscribed = true;
    const fetchGatewayProfile = async () => {
      try {
        const res = await identityApi.getUserMe();
        if (isSubscribed) {
          const isVerified = res.emailVerified ?? res.user?.emailVerified ?? user.emailVerified;
          if (user.emailVerified !== isVerified) {
            dispatch(setAuthUser({
              ...user,
              emailVerified: isVerified
            }));
            const persisted = getPersistedUser();
            if (persisted) {
              setPersistedUser({
                ...persisted,
                emailVerified: isVerified
              }, true);
            }
          }

          const me = res?.user ?? res;
          const finishing = safeSessionStorage.getItem("finishing_onboarding") === "true";
          // Prefer server truth; keep optimistic complete only while finishing this session.
          const completed =
            me.onboardingCompleted === true ||
            (finishing && profile?.onboardingCompleted === true);
          const creator = creatorFieldsFromIdentityMe(me as Record<string, unknown>);
          const onboardingPlan = creator.onboardingPlan ?? profile?.onboardingPlan ?? null;
          dispatch(setAuthProfile({
            ...profile,
            uid: me.id || me.uid || user.uid,
            displayName: me.displayName || me.username || "Creator",
            email: me.email || user.email,
            photoURL: me.avatarUrl || me.photoURL || null,
            coverUrl: me.coverUrl || profile?.coverUrl || null,
            plan: (me.plan || "free").toLowerCase() as any,
            role: (me.roles?.[0] || me.role || "creator") as any,
            onboardingCompleted: completed,
            onboardingPlan,
            creatorCategory: creator.creatorCategory,
            creatorCategoryLabel: creator.creatorCategoryLabel,
            creatorNiches: creator.creatorNiches,
            contentPlan: contentPlanFromOnboarding(onboardingPlan) ?? profile?.contentPlan,
            createdAt: me.createdAt || profile?.createdAt || new Date().toISOString(),
          }));
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        const status = err?.statusCode || err?.response?.status || err?.status;
        if (status === 401 || status === 403) {
          // Auth truly failed after refresh attempt — clear quietly
          // (nx_session_expired may already have fired from the interceptor)
          dispatch(logoutUser());
          return;
        }
        // Network / 5xx / gateway blips must NOT force logout mid-session.
        console.error("Failed to fetch gateway profile:", err);
        toast.error(
          t(
            "profile_sync_failed",
            "Could not refresh your profile. Your session is still active — retry in a moment.",
          ),
        );
      } finally {
        if (isSubscribed) {
          dispatch(setAuthLoading(false));
        }
      }
    };

    fetchGatewayProfile();
    return () => {
      isSubscribed = false;
    };
    // Only re-run when the signed-in user changes — a new `user` object
    // after setAuthUser was retriggering /users/me and amplifying 429s.
  }, [user?.uid, dispatch]);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <PwaProvider>
            <Toaster position="top-right" richColors theme="dark" />
            <PwaManager />
            <Router>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/home-2" element={<HomeV2 />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/p/:id" element={<PublicPostView />} />
                  
                  <Route 
                    path="/login" 
                    element={<PublicGuard user={user} profile={profile} loading={loading}><Login /></PublicGuard>} 
                  />
                  <Route 
                    path="/signup" 
                    element={<PublicGuard user={user} profile={profile} loading={loading}><Signup /></PublicGuard>} 
                  />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route 
                    path="/forgot-password" 
                    element={<PublicGuard user={user} profile={profile} loading={loading}><ForgotPassword /></PublicGuard>} 
                  />

                  {/* Auth Routes */}
                  <Route
                    path="/onboarding"
                    element={
                      user ? (
                        <OnboardingEntry user={user} profile={profile} />
                      ) : (
                        <Navigate to="/login" replace />
                      )
                    }
                  />
                  
                  <Route element={<AuthGuard profile={profile} loading={loading}><DashboardLayout /></AuthGuard>}>
                    <Route path="/feed" element={<HomeFeed />} />
                    <Route path="/feed/post/:id" element={<PostDetail />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/create" element={<CreateHub />} />
                    <Route path="/create/image" element={<ImageStudio />} />
                    <Route path="/image-studio" element={<ImageStudio />} />
                    <Route path="/create/clip" element={<ClipUpload />} />
                    <Route path="/create/clip/:id/edit" element={<ClipEditor />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/coach" element={<CreatorCoach />} />
                    <Route path="/my-content" element={<ContentLibrary />} />
                    <Route path="/profile" element={<OwnProfile />} />
                    <Route path="/profile/edit" element={<EditProfile />} />
                    <Route path="/users/:id" element={<UserProfilePage />} />
                    <Route path="/upgrade" element={<UpgradePage />} />
                    <Route path="/billing/success" element={<BillingSuccessPage />} />
                    <Route path="/billing/cancel" element={<BillingCancelPage />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route 
                      path="/admin" 
                      element={<AdminGuard profile={profile} loading={loading}><AdminPanel /></AdminGuard>} 
                    />
                    <Route 
                      path="/admin/dev-suite" 
                      element={<AdminGuard profile={profile} loading={loading}><DevSuite /></AdminGuard>} 
                    />
                    <Route 
                      path="/admin/migration" 
                      element={<Navigate to="/admin/dev-suite?tab=roadmap" replace />} 
                    />
                    <Route 
                      path="/admin/design-system" 
                      element={<Navigate to="/admin/dev-suite?tab=tokens" replace />} 
                    />
                  </Route>

                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </Router>
          </PwaProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
