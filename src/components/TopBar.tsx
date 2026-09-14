import { useTranslation } from "react-i18next";
import { safeLocalStorage } from "../lib/safeStorage";
import type { ReactNode } from "react";
import { 
  Search, 
  Bell, 
  User, 
  LogOut, 
  Sparkles, 
  Zap, 
  TrendingUp, 
  MessageSquare, 
  LayoutDashboard, 
  BarChart3, 
  Wand2, 
  FolderHeart, 
  Settings,
  ShieldCheck,
  Video,
  Image as ImageIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import VoiceNavigation from "./VoiceNavigation";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ProfilePhoto } from "./ProfilePhoto";
import { cn } from "../lib/utils";
import { ADMIN_EMAILS } from "../constants";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { selectAuthProfile, selectAuthUser, selectResolvedUserPhoto, logoutUser } from "../store/slices/authSlice";
import { selectAuthProvider } from "../store/slices/uiSlice";
import { identityApi, notificationApi } from "../services/apiClient";
import { clearPersistedUser } from "../services/auth/authService";
import { normalizeNotificationList, type NormalizedNotification } from "../lib/notifications";
import { socketService } from "../services/socketService";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  CommandSeparator,
} from "./ui/command";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  titleIcon?: ReactNode;
}

export default function TopBar({ title, subtitle, titleIcon }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const authProvider = useAppSelector(selectAuthProvider);
  const authUser = useAppSelector(selectAuthUser);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifPreview, setNotifPreview] = useState<NormalizedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profile = useAppSelector(selectAuthProfile);
  const user = authUser;
  const avatarSrc = useAppSelector(selectResolvedUserPhoto);
  const navigate = useNavigate();

  const isAdmin = profile?.role === "admin" || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const isUnverified = authUser && !authUser.emailVerified;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await notificationApi.getNotifications(undefined, 8);
        if (cancelled) return;
        const items = normalizeNotificationList(res);
        setNotifPreview(items);
        setUnreadCount(items.filter((n) => !n.read).length);
      } catch {
        if (!cancelled) {
          setNotifPreview([]);
          setUnreadCount(0);
        }
      }
    };
    void load();

    socketService.init();
    const refresh = () => {
      void load();
    };
    const unsubs = [
      socketService.subscribe("content:moderation_complete", refresh),
      socketService.subscribe("content:generation_complete", refresh),
      socketService.subscribe("content:generation_failed", refresh),
      socketService.subscribe("content:render_failed", refresh),
      socketService.subscribe("content:render_complete", refresh),
      socketService.subscribe("onboarding:complete", refresh),
    ];

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await identityApi.logout();
    } catch (err) {
      console.warn("Logout request did not complete on server, clearing session locally:", err);
    } finally {
      clearPersistedUser();
      dispatch(logoutUser());
      navigate("/login");
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <div className="w-full flex flex-col">
      {isUnverified && (
        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border-b border-amber-500/20 py-1.5 px-4 text-center text-[11px] text-amber-200/90 font-medium flex items-center justify-center gap-2 relative z-50">
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span>Account in sandbox mode. Verify your email to unlock all premium rendering engines.</span>
          <Link to="/verify-email" className="text-amber-400 hover:text-white underline font-bold transition-colors shrink-0 ml-1">
            Verify Email
          </Link>
        </div>
      )}
      <header className="h-14 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-3 min-w-0">
        {titleIcon ? (
          <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            {titleIcon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-bold text-foreground truncate max-w-[160px] md:max-w-none">
            {title || t('top_bar.dashboard')}
          </h1>
          {subtitle ? (
            <p className="hidden md:block text-[11px] text-muted-foreground truncate max-w-md leading-tight mt-0.5">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {/* Search */}
        <div 
          onClick={() => setOpen(true)}
          className={cn(
            "hidden lg:flex items-center gap-2.5 bg-muted border border-transparent px-3 py-1.5 rounded-md w-64 hover:border-border hover:bg-card transition-all cursor-pointer group",
            isAr && "flex-row-reverse"
          )}
        >
          <Search size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">{t('top_bar.search_placeholder')}</span>
          <kbd className={cn(
            "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100",
            isAr ? "mr-auto" : "ml-auto"
          )}>
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder={t('top_bar.command_placeholder')} />
          <CommandList>
            <CommandEmpty>{t('top_bar.no_results')}</CommandEmpty>
            <CommandGroup heading={t('top_bar.quick_actions')}>
              <CommandItem onSelect={() => runCommand(() => navigate("/editor"))}>
                <Video className={cn("h-4 w-4 text-primary", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.editor')}</span>
                <CommandShortcut>⌘E</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/image-studio"))}>
                <ImageIcon className={cn("h-4 w-4 text-amber-500", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.studio')}</span>
                <CommandShortcut>⌘I</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setOpen(false))}>
                <MessageSquare className={cn("h-4 w-4 text-brand-secondary", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.coach')}</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t('top_bar.navigation')}>
              <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                <LayoutDashboard className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.dashboard')}</span>
                <CommandShortcut>⌘D</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/analytics"))}>
                <BarChart3 className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.analytics')}</span>
                <CommandShortcut>⌘A</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/coach"))}>
                <Wand2 className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.ai_coach')}</span>
                <CommandShortcut>⌘K</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/my-content"))}>
                <FolderHeart className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.library')}</span>
                <CommandShortcut>⌘L</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t('top_bar.settings')}>
              <CommandItem onSelect={() => runCommand(() => navigate("/profile"))}>
                <User className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.profile')}</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                <Settings className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.settings')}</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t('top_bar.theme')}>
              <CommandItem onSelect={() => runCommand(() => {
                const html = document.documentElement;
                if (html.classList.contains('dark')) {
                  html.classList.remove('dark');
                  safeLocalStorage.setItem('theme', 'light');
                } else {
                  html.classList.add('dark');
                  safeLocalStorage.setItem('theme', 'dark');
                }
              })}>
                <Sparkles className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                <span>{t('top_bar.actions.toggle_theme')}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        <div className="lg:hidden text-muted-foreground hover:text-foreground">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Open Search"
          >
            <Search size={20} />
          </Button>
        </div>

        <VoiceNavigation />
        <ThemeToggle />
        <LanguageSwitcher />

        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications ${unreadCount > 0 ? "(Unread items)" : ""}`}
            aria-expanded={showNotifications}
            className="relative text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-background" />
            )}
          </Button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">{t('top_bar.notifications')}</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-none">
                        {unreadCount} {t('top_bar.new')}
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifPreview.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
                    ) : (
                      notifPreview.map((notif) => (
                      <button 
                        key={notif.id} 
                        type="button"
                        className={cn(
                          "w-full text-left p-4 border-b border-border last:border-none hover:bg-muted/50 transition-colors cursor-pointer group outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                          !notif.read && "bg-primary/5"
                        )}
                        onClick={() => {
                          setShowNotifications(false);
                          navigate("/notifications");
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-primary">
                            <Bell size={16} />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-bold text-foreground leading-none truncate">{notif.title}</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                              {notif.body}
                            </p>
                            {!notif.read && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{t('top_bar.unread')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      asChild
                      className="w-full text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors h-9"
                      onClick={() => setShowNotifications(false)}
                    >
                      <Link to="/notifications">
                        {t('top_bar.view_all')}
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        <div className="relative">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User profile and navigation"
            aria-expanded={showUserMenu}
            className="flex items-center gap-2 p-0.5 rounded-full hover:bg-muted transition-all cursor-pointer"
          >
            <ProfilePhoto
              src={avatarSrc}
              email={user?.email || profile?.email}
              shape="circle"
              className="w-7 h-7"
            />
          </Button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-border">
                    <p className="text-[13px] font-bold text-foreground">{user?.displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <Button 
                      variant="ghost"
                      size="sm"
                      asChild
                      className={cn(
                        "w-full items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground h-auto",
                        isAr ? "justify-end text-right" : "justify-start text-left"
                      )}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Link to="/profile">
                        <User size={14} />
                        {t('top_bar.my_profile')}
                      </Link>
                    </Button>
                    
                    {isAdmin && (
                      <Button 
                        variant="ghost"
                        size="sm"
                        asChild
                        className={cn(
                          "w-full items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-primary hover:bg-primary/5 h-auto",
                          isAr ? "justify-end text-right" : "justify-start text-left"
                        )}
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Link to="/admin">
                          <ShieldCheck size={14} />
                          {t('nav.admin_panel')}
                        </Link>
                      </Button>
                    )}
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className={cn(
                        "w-full items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-red-600 hover:bg-red-500/10 h-auto",
                        isAr ? "justify-end text-right" : "justify-start text-left"
                      )}
                    >
                      <LogOut size={14} />
                      {t('top_bar.sign_out')}
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
    </div>
  );
}
