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
import { BrandTld } from "./components/Logo";
import logo from "./contents/images/nexa-logo.png";
import { motion } from "motion/react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setAuthUser, setAuthProfile, setAuthLoading, SerializedUser, selectAuthUser, selectAuthProfile, selectAuthLoading, logoutUser } from "./store/slices/authSlice";
import { selectAuthProvider } from "./store/slices/uiSlice";
import { identityApi } from "./services/apiClient";
import { getPersistedUser, setPersistedUser, useAuthToken } from "./services/auth/authService";
import { contentPlanFromOnboarding, isRenewingWeekPlan } from "./lib/weekPlan";
import { creatorFieldsFromIdentityMe } from "./lib/onboardingSnapshot";

const PageLoader = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_12%,transparent)_0%,transparent_62%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-6">
        <div className="relative mb-5">
          <motion.div
            className="absolute -inset-5 rounded-full bg-teal-500/15 blur-2xl"
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.96, 1.04, 0.96] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={logo}
            alt="nxClip"
            className="relative h-14 w-14 object-contain"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex items-end gap-0.5 mb-5">
          <span className="font-display text-lg font-bold tracking-tight">nxClip</span>
          <BrandTld className="text-[11px] pb-0.5" />
        </div>

        <div className="h-[2px] w-28 overflow-hidden rounded-full bg-foreground/10">
          <motion.div
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-teal-500 to-primary"
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
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
                  <Route path="/" element={<HomeV2 />} />
                  <Route path="/home-old" element={<Home />} />
                  <Route path="/home-2" element={<Navigate to="/" replace />} />
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
