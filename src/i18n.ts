import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
const resources = {
  en: {
    translation: {
      "app": {
        "name": "nxclip.app",
        "tagline": "AI Operating System for Gaming Creators"
      },
      "nav": {
        "dashboard": "Dashboard",
        "create": "Create",
        "analytics": "Analytics",
        "library": "Library",
        "coach": "AI Coach",
        "settings": "Settings",
        "logout": "Logout",
        "home_feed": "Home Feed",
        "create_hub": "Create Hub",
        "image_studio": "Image Studio",
        "clip_editor": "Clip Studio",
        "content_library": "Content Library",
        "battles": "Battles",
        "admin_panel": "Admin Settings",
        "upgrade_pro": "Upgrade to Pro",
        "upgrade_studio": "Upgrade to Studio",
        "manage_studio": "Studio Plan",
        "tools": "Tools",
        "insights": "Insights",
        "home": "Home",
        "features": "Features",
        "platform": "Platform",
        "pricing": "Pricing",
        "how_it_works": "How It Works",
        "signin": "Sign In",
        "signup": "Start Free",
        "signout": "Sign Out",
        "creator": "Creator",
        "collapse": "Collapse",
        "expand": "Expand",
        "soon": "Soon",
        "home_tooltip": "nxclip.app Home",
        "growth_tip": {
          "title": "Growth Tip",
          "description": "Unlock unlimited creations & full analytics with Pro.",
          "cta": "Upgrade Now"
        },
        "language": {
          "en": "English",
          "ar": "العربية"
        }
      },
      "post": {
        "detail": "Post details"
      },
      "user": {
        "profile": "Creator profile"
      },
      "top_bar": {
        "dashboard": "Dashboard",
        "search_placeholder": "Search actions...",
        "command_placeholder": "Type a command or search...",
        "no_results": "No results found.",
        "quick_actions": "Quick Actions",
        "navigation": "Navigation",
        "settings": "Settings",
        "theme": "Theme",
        "actions": {
          "editor": "Open Clip Studio",
          "studio": "Image Studio",
          "coach": "New Coach Session",
          "dashboard": "Dashboard",
          "analytics": "Analytics",
          "ai_coach": "AI Coach",
          "library": "Media Library",
          "profile": "Profile",
          "settings": "Settings",
          "toggle_theme": "Toggle Theme"
        },
        "notifications": "Notifications",
        "new": "NEW",
        "unread": "Unread",
        "view_all": "View All Notifications",
        "my_profile": "My Profile",
        "sign_out": "Sign Out"
      },
      "dashboard": {
        "welcome": "Welcome back, {{name}}",
        "overview": "Overview",
        "recent_activity": "Recent Activity",
        "geo_intel": "Geo Intelligence",
        "soon": "Soon",
        "header": {
          "title": "Performance Overview",
          "subtitle": "Your content is trending up across all platforms.",
          "post_button": "Create New Post",
          "legacy_onboarding_note": "Older plan — revise niche and answers in Creator Coach to unlock full details.",
          "revise_cta": "Revise niche & answers",
          "niche_not_set": "Niche not set"
        },
        "performance": {
          "title": "Snapshot Performance",
          "subtitle": "Views & Reach Velocity Trend",
          "full_analytics": "Full Analytics",
          "views": "Views",
          "engagement": "Engagement"
        },
        "content_matrix": {
          "title": "Content Matrix",
          "subtitle": "Drill-down by content format",
          "published": "Published",
          "eng_rate": "Eng. Rate",
          "top_post": "Top Post",
          "clips": "Clips",
          "memes": "Memes",
          "images": "Images",
          "insight": "Insight",
          "last_30_days": "Last 30 Days",
          "insights": {
            "shorten": "Shorten intro by 2s.",
            "follow_up": "Create follow-up today.",
            "tutorial": "Use tutorial visuals."
          }
        },
        "top_content": {
          "title": "Top Content This Week",
          "subtitle": "Winning formats across platforms",
          "view_details": "View Details",
          "reuse_strategy": "Reuse Strategy",
          "why_worked": "Why it worked",
          "posts": {
            "valorant": "Valorant 1v4 Clutch That Went Viral",
            "cs2": "CS2 Hidden Smoke Meme",
            "minecraft": "Minecraft Build Tip Carousel",
            "reasons": {
              "hook": "Strong hook in first 3 seconds.",
              "humor": "Shareable tactical humor.",
              "visuals": "Tutorial-style visual appeal."
            }
          }
        },
        "days": {
          "mon": "Mon",
          "tue": "Tue",
          "wed": "Wed",
          "thu": "Thu",
          "fri": "Fri",
          "sat": "Sat",
          "sun": "Sun"
        },
        "kpis": {
          "growth": "Weekly Growth",
          "published": "Posts Published",
          "top_platform": "Top Platform",
          "attention": "Needs Attention",
          "opportunity": "Top Opportunity",
          "healthy": "Healthy",
          "target": "Target",
          "viral": "Viral",
          "action": "Action",
          "high": "High",
          "items": "Items",
          "active": "Active",
          "engagement": "Eng. Rate"
        },
        "command": {
          "title": "AI Command Center",
          "insight": "Your discovery stack is ready: AI hooks in the first 3 seconds, polished clips from upload or I2V, and Live posts from one pipeline.",
          "next_best": "Recommended moves",
          "cta": "Open Create Hub",
          "actions": [
            "Clip Studio: animate a still (Ken Burns or AI motion), generate hooks, render, then publish.",
            "Image Studio: create a niche meme or image — animate it into a vertical short with viral polish.",
            "Go Live: publish to Feed and push to TikTok, Reels, Shorts, or YouTube with connected accounts."
          ]
        },
        "workflows": {
          "title": "Workflow Intelligence",
          "subtitle": "AI evaluates your recent images & clips and suggests the next best move.",
          "empty": "Upload or generate content — intelligence will suggest I2V, hooks, and meme ideas here.",
          "loading": "Evaluating your library…",
          "refresh": "Refresh suggestions",
          "evaluated": "Evaluated {{count}} assets",
          "cached": "{{count}} cached",
          "powered_by": "Intelligence · {{provider}}",
          "meme_idea": "Idea",
          "minimize": "Minimize",
          "dock_ready": "{{count}} suggestions waiting",
          "dock_online": "Live suggestions · tap a move to run it"
        },
        "progress": {
          "title": "Weekly Progress",
          "on_track": "On Track",
          "goals": "Goals Completed",
          "scheduled": "Scheduled",
          "review": "Review",
          "up_next": "Up Next",
          "up_next_task": "Animate a still in Clip Studio, burn a viral hook, then Go Live",
          "open_feed": "Open Home Feed",
          "no_plan_badge": "No plan",
          "intro_fallback": "Your Creator Coach week plan",
          "empty": "No coach week plan yet. Create one for daily Image Studio, Clip Studio, and Live themes.",
          "create_plan": "Create week plan",
          "view_full": "View full week plan",
          "plan_new": "Plan a new week",
          "days_badge": "{{count}} days"
        },
        "attention": {
          "title": "Attention Required",
          "impact": {
            "high": "High Impact",
            "med": "Med Impact",
            "medium": "Medium",
            "low": "Low"
          },
          "items": {
            "a1": { "issue": "Opening hook is weak", "action": "Generate hooks in Clip Studio (first 1–3s)", "cta": "Open Clip Studio", "impact": "Retention risk" },
            "a2": { "issue": "Drafts waiting in pipeline", "action": "Resume Image or Clip Studio and publish", "cta": "Create Hub", "impact": "Shipping lag" },
            "a3": { "issue": "Feed post not Live yet", "action": "Schedule Live to TikTok, Reels, Shorts, or YouTube", "cta": "Go Live", "impact": "Missed reach" },
            "a4": { "issue": "Week plan incomplete", "action": "Finish remaining coach days or renew the plan", "cta": "View Plan", "impact": "Cadence gap" }
          },
          "clear": "You’re clear — keep creating and publishing."
        },
        "pulse": {
          "title": "Creator Pulse",
          "subtitle": "This week’s shipping status — tap a row to act.",
          "published_week": "Published this week",
          "published_hint": "Open Library to review",
          "published_empty": "Publish once to unlock pulse",
          "plan_progress": "Plan progress",
          "no_plan": "No plan",
          "plan_done": "Week plan covered",
          "plan_remaining": "{{count}} days left to cover",
          "plan_create_hint": "Create a coach week plan",
          "ready_live": "Ready to go Live",
          "ready_live_hint": "On Feed — schedule social Live",
          "ready_live_empty": "Nothing waiting for Live",
          "drafts_waiting": "Drafts waiting",
          "drafts_hint": "Resume in Create Hub",
          "drafts_empty": "No drafts in the queue"
        },
        "tip": {
          "title": "Quick Strategy Tip",
          "content": "Animate a still with I2V, burn a viral hook in the first 1–3 seconds, render, then Go Live.",
          "loading": "Generating a tip from your pipeline…",
          "refresh": "Refresh tip",
          "powered_by": "Realtime · {{provider}}"
        }
      },
      "create_post": {
        "title": "nxclip.app Creator Hub",
        "tabs": {
          "single": "Single Post",
          "plan": "Content Plan"
        },
        "plan_tooltip": "Use AI to generate a 7-day content schedule.",
        "labels": {
          "caption": "Caption",
          "tags": "Tags",
          "media": "Media",
          "overlay_text": "Overlay Text",
          "trim_range": "Trim Range",
          "target_games": "Target Games",
          "target_audience": "Target Audience",
          "content_style": "Content Style",
          "primary_goal": "Primary Goal"
        },
        "placeholders": {
          "caption": "What's happening in your gaming world?",
          "tags": "gaming, valorant, clutch",
          "upload": "Upload Image or Video",
          "upload_sub": "Drag and drop or click to browse",
          "overlay": "Type something epic...",
          "games": "e.g. Valorant, Apex",
          "audience": "e.g. Competitive",
          "style": "e.g. Tips, Clips",
          "goal": "e.g. Follower Growth"
        },
        "ai": {
          "generate": "Generate with AI",
          "regenerate": "Regenerate",
          "error_title": "AI Assistant Error",
          "strategist": "AI Content Strategist",
          "strategist_sub": "Generate a 7-day roadmap",
          "gen_plan": "Generate 7-Day Plan",
          "analyzing": "Analyzing Trends...",
          "strategy_ready": "Strategy Ready",
          "personalized_strategy": "Your Personalized Strategy",
          "empty_plan": "No plan generated yet",
          "empty_plan_sub": "Adjust your inputs above and click generate."
        },
        "tools": {
          "filters": "Filters",
          "text": "Text",
          "trim": "Trim",
          "reset_range": "Reset Range",
          "trim_hint": "Only the selected segment will be posted.",
          "filters_list": {
            "none": "None",
            "grayscale": "Grayscale",
            "sepia": "Sepia",
            "invert": "Invert",
            "high_contrast": "High Contrast",
            "warm": "Warm",
            "cool": "Cool"
          }
        },
        "preview": {
          "following": "Following",
          "for_you": "For You",
          "connect_media": "Connect your content to preview",
          "polish_active": "AI Polish Active",
          "polish_sub": "Preview reflects real-time enhancements"
        }
      },
      "onboarding": {
        "skip": "Skip for now",
        "start": "Start",
        "continue": "Continue",
        "back": "Back",
        "generate_plan": "Generate My Plan",
        "finish": "Finish Setup",
        "go_to_dashboard": "Go to Dashboard",
        "steps": {
          "niche": "Gaming Niche",
          "audience": "Target Audience",
          "style": "Content Style",
          "goal": "Primary Goal",
          "frequency": "Posting Frequency",
          "strategy": "Content Strategy",
          "tutorial": "Quick Tutorial"
        },
        "coach": {
          "tag": "AI Coach",
          "intro": "Welcome! I'm your nxclip.app Coach.",
          "intro_subtitle": "I'll help you set up your creator studio and prepare your first week of content in about 90 seconds.",
          "step_label": "STEP {{step}}",
          "of": "of",
          "complete": "Complete",
          "final_step": "Final Step",
          "how_it_works": "How nxclip.app Works",
          "how_it_works_subtitle": "Everything you need to dominate the gaming scene.",
          "tip_0": "Welcome! I'm here to help you build a content empire. Let's start by defining your niche.",
          "tip_1": "Focusing on 1-3 games helps the AI understand your specific style and audience interests.",
          "tip_2": "Knowing your audience allows me to suggest the right tone—whether it's pro-tips or pure entertainment.",
          "tip_3": "What kind of content do you enjoy making most? This helps me tailor your daily tasks.",
          "tip_4": "Your goal determines the strategy. Growth needs trends; community needs engagement.",
          "tip_5": "Consistency is key! Even posting once a week is better than a burst followed by silence.",
          "tip_6": "Whether you have clips or not, I'll make sure you have something amazing to post today.",
          "tip_7": "Almost there! Let's take a quick look at how nxclip.app works."
        },
        "questions": {
          "games": {
            "title": "What games do you play most?",
            "subtitle": "Pick up to 3 games to tailor your content plan.",
            "placeholder": "Other game..."
          },
          "audience": {
            "title": "Who do you create content for?",
            "options": {
              "casual": "Casual gamers",
              "competitive": "Competitive players",
              "entertained": "Entertained viewers",
              "mixed": "Mixed audience"
            }
          },
          "content_types": {
            "title": "What type of content do you make?",
            "subtitle": "Select all that apply.",
            "options": {
              "gameplay": { "label": "Gameplay", "desc": "Clutches, fails, and high-skill moments." },
              "tutorials": { "label": "Tutorials", "desc": "Tips, tricks, and educational guides." },
              "reviews": { "label": "Reviews", "desc": "Game analysis and hardware opinions." },
              "memes": { "label": "Memes", "desc": "Funny edits and community humor." }
            }
          },
          "goal": {
            "title": "What's your main goal?",
            "options": {
              "viral": { "label": "Go Viral", "desc": "Maximize reach and trend participation." },
              "community": { "label": "Build Community", "desc": "Foster deep engagement and loyalty." },
              "monetize": { "label": "Monetize", "desc": "Prepare for sponsorships and ads." }
            }
          },
          "frequency": {
            "title": "How often can you realistically post?",
            "options": {
              "daily": "Daily",
              "few_times": "Few times a week",
              "weekly": "Weekly",
              "occasionally": "Occasionally"
            }
          },
          "start_point": {
            "title": "Do you have existing clips or starting fresh?",
            "options": {
              "clips": { "label": "I have clips", "desc": "I'll upload my best gameplay moments." },
              "fresh": { "label": "Starting fresh", "desc": "I'll generate new content from scratch." }
            }
          }
        },
        "plan": {
          "title": "Your first week is ready",
          "viral_subtitle": "I've mapped out a strategy to help you grow fast.",
          "community_subtitle": "I've mapped out a strategy to help you build your community.",
          "day": "DAY",
          "ready": "Ready",
          "types": {
            "clip": "Viral Clip",
            "meme": "Meme",
            "insight": "Insight"
          }
        },
        "tutorial": {
          "studio": { "title": "AI Studio", "desc": "Generate high-quality gaming images and memes using our advanced AI models." },
          "editor": { "title": "Clip Studio", "desc": "Transform your gameplay clips into viral vertical videos for TikTok and Reels." },
          "feed": { "title": "Content Feed", "desc": "Get inspired by other gaming creators and see what's trending in your niche." }
        },
        "generating": {
          "title": "Creating your personalized 7-day plan...",
          "subtitle": "Analyzing your gaming niche and goals"
        },
        "errors": {
          "setup_failed": "Setup Failed",
          "plan_failed": "Plan Generation Failed",
          "empty_plan": "Received an empty content plan from AI.",
          "session_expired": "Your session has expired. Please log in again.",
          "no_email": "We couldn't find your email address. Please try logging in again.",
          "timeout": "The connection timed out (60s). Firestore might be struggling. Please try again.",
          "permission_denied": "Access denied. Please check your internet or try logging in again.",
          "generic": "Failed to save your profile."
        }
      },
      "hero": {
        "badge": "Elite AI Performance for Creator",
        "title_line1": "Viral content",
        "title_line2": "redefined by AI.",
        "subtitle": "The AI operating system built for next-gen creators. Transform your best moments into epic growth with elite-grade intelligence.",
        "cta_start": "Start Evolution",
        "cta_demo": "Watch Demo",
        "image_editor": "Image Editor",
        "clip_editor": "Clip Studio",
        "analytics": "Analytics",
        "feed": "Feed",
        "imaging_detail": "AI-powered creative studio",
        "video_detail": "Precision video trimming",
        "growth_detail": "Real-time growth insights",
        "curated_detail": "Curated creator highlights",
        "prompts": [
          "Cyberpunk neon gaming setup with dual monitors",
          "Viral Valorant clutch cinematic highlight",
          "Professional streamer setup with RGB lighting"
        ]
      },
      "features": {
        "label": "The Creator Ecosystem",
        "title_line1": "Built for the modern",
        "title_line2": "high-performance creator.",
        "description": "Eliminate the friction of content creation. Our AI toolset is engineered to help you design, edit, and strategize at elite levels.",
        "elite_tooling": "Elite Tooling",
        "image_studio": {
          "title": "AI Image & Meme Studio",
          "description": "Generate high-quality gaming images and viral memes from simple text prompts in seconds."
        },
        "clip_trimmer": {
          "title": "Clip Trimmer & AI Polish",
          "description": "Automatically identify and trim your best gameplay moments for TikTok, Reels, and Shorts."
        },
        "creator_coach": {
          "title": "Creator Coach (Gemini)",
          "description": "Get 24/7 personalized advice on content strategy, engagement, and channel growth.",
          "badge": "Powered by Gemini AI"
        }
      },
      "analytics": {
        "title": "Creator Analytics",
        "description": "Track gaming clip and meme performance across TikTok, YouTube, and Instagram.",
        "export": "Export",
        "spotlight": {
          "title": "Post spotlight",
          "open_detail": "View post details",
          "missing": "That post wasn’t found in your recent library."
        },
        "tabs": {
          "overview": "Overview",
          "content": "Content",
          "creative": "Creative",
          "platforms": "Platforms",
          "geo": "Geo Intel",
          "audience": "Audience",
          "games": "Games",
          "retention": "Retention",
          "ai": "AI Insights"
        },
        "metrics": {
          "views": "Total Views",
          "engagement": "Engagement",
          "watch_time": "Avg WatchTime",
          "followers": "Followers",
          "shares": "Shares",
          "virality": "Virality",
          "virality_desc": "Current reach is peaking",
          "avg_percent": "Avg. % Viewed",
          "first_3s_hook": "First 3s Hook",
          "rewatch_rate": "Rewatch Rate",
          "avg_view": "Avg View %"
        },
        "charts": {
          "performance_pulse": "Performance Pulse",
          "performance_desc": "Views vs Engagement trend",
          "views": "Views",
          "engagement": "Eng",
          "meme_virality": "Meme Virality Metrics",
          "meme_desc": "How images travel across social loops.",
          "inter_platform": "Inter-Platform Reach Comparison",
          "leaderboard": "Performance Leaderboard",
          "leaderboard_desc": "Views by title across all platforms"
        },
        "overview": {
          "top_5_title": "Top 5 Content Preview",
          "views_label": "{{count}}k VIEWS",
          "followers_label": "+{{count}}k FOLLOWERS",
          "shares_label": "{{count}}k SHARES",
          "date_range": "Jan 01 - Jan 30, 2024",
          "values": {
            "views": "482.5k",
            "engagement": "12.8%",
            "watch_time": "0:52s",
            "followers": "+1.2k",
            "shares": "18.9k",
            "virality": "82/100"
          }
        },
        "ai": {
          "title": "AI Insight",
          "opportunity": "Viral Opportunity",
          "opportunity_desc": "Your Apex clips under 15s are trending 3.4x higher on Sunday evenings. Post your backlogged clips tonight at 8PM.",
          "cta": "Apply Content Strategy",
          "strategic_pivot": "Strategic Pivot",
          "pivot_desc": "Your Apex content has a 2.4x higher conversion rate than shooter competitors. Allocate 60% of focus here.",
          "view_strategy": "View Strategy Plan",
          "language_ops": "Strategic Language Ops",
          "language_desc": "Your audience is 38% multilingual. Adding Spanish subtitles could improve LATAM conversion by +22%.",
          "apply_subtitles": "Apply AI Subtitles",
          "weekly_report": "Weekly Strategy Report",
          "growth_tactics": "Actionable Growth Tactics",
          "analyze_next": "Analyze My Next Post",
          "learn_strategy": "Learn Strategy",
          "viral_expansion": "Viral Expansion Phase",
          "reach_higher": "reach is {{percent}}% higher",
          "driven_by": "driven primarily by {{game}} memes",
          "insights_list": [
            { "title": "Hook Optimization", "tag": "Critical", "text": "TikTok retention drops 40% after 8 seconds. Move your highlight replay to the first 3 seconds." },
            { "title": "Cross-Pollination", "tag": "Opportunity", "text": "85% of your Instagram saves come from non-followers. Add a CTA to your bio in captions." },
            { "title": "Peak Exposure", "tag": "Timing", "text": "Engagement is 2.4x higher on Sunday at 8PM. Schedule your 'Weekly Clutch' montage for this slot." },
            { "title": "Niche Depth", "tag": "Content", "text": "Warzone memes are driving followers, but Valorant guides drive subs. Balance your mix 60/40." },
            { "title": "Game Sentiment", "tag": "Games", "text": "Apex Legends sentiment is at an all-time high. It's the best time to run a viewer giveaway post." },
            { "title": "Monetization Path", "tag": "Revenue", "text": "Your audience is 72% likely to buy merch. Consider launching a limited 'Nexa Clip' drop." }
          ]
        },
        "table": {
          "item": "Item",
          "game": "Game",
          "type": "Type",
          "views": "Views",
          "engagement": "Engagement",
          "retention": "Retention",
          "viral": "Viral",
          "types": {
            "video": "Video",
            "meme": "Meme"
          },
          "region_intel": "Region Intelligence",
          "reach_index": "Reach Index",
          "top_game": "Top Game",
          "format_score": "Format Score",
          "virality_pulse": "Virality Pulse",
          "game_title": "Game Title",
          "status": "Status",
          "trend": "Trend"
        },
        "platforms": {
          "deep_dive": "Deep Dive",
          "views": "Views",
          "eng_rate": "Eng Rate",
          "followers": "Followers",
          "shares": "Shares"
        },
        "creative": {
          "insights": "Creative Insights",
          "caption_perf": "Caption Performance",
          "save_density": "Save Density",
          "share_multiplier": "Share Multiplier",
          "format": "Best Format: Template",
          "format_desc": "Standard meme templates drive 45% more shares than original screenshots.",
          "caption": "Caption: Short Hand",
          "caption_desc": "Short captions (under 30 chars) result in 3x higher save rates for Instagram Reels posts."
        },
        "games": {
          "live_data": "Live Data",
          "top_performer": "Top Performer",
          "low_engagement": "Low Engagement",
          "steady": "Steady",
          "high_growth": "High Growth",
          "top_desc": "This game is driving 40% of your total revenue. Keep posting daily.",
          "low_desc": "Low visibility detected. Consider pivoting tags or content style.",
          "roi": "Maximize High ROI",
          "leaderboard_title": "Performance Leaderboard",
          "leaderboard_desc": "Views by title across all platforms",
          "pivot_title": "Strategic Pivot",
          "pivot_desc": "Your {{game}} content has a 2.4x higher conversion rate than shooter competitors. Allocate 60% of focus here.",
          "strategy_btn": "View Strategy Plan",
          "table": {
            "title": "Game Title",
            "views": "Views",
            "eng": "Eng Rate",
            "status": "Status",
            "trend": "Trend"
          }
        },
        "audience": {
          "gender": "Gender Distribution",
          "age": "Age Distribution",
          "active_hours": "Active Hours Heatmap",
          "gender_types": {
            "male": "Male",
            "female": "Female",
            "other": "Other"
          },
          "age_ranges": {
            "13_17": "13-17",
            "18_24": "18-24",
            "25_34": "25-34",
            "35_plus": "35+"
          },
          "days": {
            "mon": "Mon",
            "tue": "Tue",
            "wed": "Wed",
            "thu": "Thu",
            "fri": "Fri",
            "sat": "Sat",
            "sun": "Sun"
          },
          "heatmap": {
            "idle": "Idle",
            "active": "Active",
            "peak": "Peak",
            "tooltip": "{{day}} @ {{hour}}:00 - Activity: {{value}}%"
          },
          "metrics": {
            "ltv": "Follower LTV",
            "sentiment": "Chat Sentiment",
            "conversion": "Conversion Rate",
            "session": "Avg Session",
            "positive": "Positive"
          }
        },
        "performance_footer": {
          "title": "Creator Performance Intelligence",
          "ai_insight": "\"Your conversion from Shorts to long-form is up 22%. Maintain the current teaser strategy.\"",
          "live_tracking": "Live Tracking",
          "connected": "Connected",
          "view_model": "View Predictive Model"
        }
      },
      "geo": {
        "label": "Geo Intel",
        "metric_reach": "Regional Reach",
        "metric_best": "Target Area",
        "metric_retention": "Avg Retention",
        "metric_momentum": "Growth Momentum",
        "metric_platform": "Top Platform",
        "metric_viral": "Viral Score",
        "map_title": "Global Creator Intelligence Map",
        "map_subtitle": "Mapping virality hotspots by {{layer}}",
        "opportunities": "Regional Opportunities",
        "top_games": "Top Games by Region",
        "format_index": "Format Virality Index",
        "platform_strength": "Platform Strength",
        "posting_intel": "Posting Intelligence",
        "virality_signals": "Regional Virality Signals",
        "language_intel": "Language Intelligence",
        "all_regions": "All Regions",
        "data_layer": "Data Layer",
        "syncing": "Syncing Geo Intel...",
        "matching": "{{count}}% matching",
        "take_action": "Take Action",
        "high_retention": "High Retention",
        "strongest_in": "{{platform}} strongest in {{region}}",
        "lang_ops": "Strategic Language Ops",
        "multilingual_insight": "Your audience is <percent>38%</percent> multilingual. Adding {{lang}} subtitles to your {{game}} clips could improve {{region}} conversion by up to <boost>+22%</boost>.",
        "top_lang_duo": "Top Language Duo",
        "subtitle_pref": "Subtitle Pref.",
        "score": "SCORE: {{count}}",
        "best_languages": "EN/ES",
        "focus": "Focus",
        "top_percent": "TOP {{count}}%",
        "region": "Region",
        "top_game": "Top Game",
        "index": "Index",
        "avg_retention_score": "Avg Retention Score",
        "virality_pulse_index": "Virality Pulse Index",
        "format": "Format",
        "score_label": "Score",
        "metric_watchtime": "Watch Time",
        "layer_names": {
          "views": "Views",
          "avgPercent": "Retention",
          "watchTime": "Watch Time"
        },
        "peak_labels": {
          "us": "US Audience Peak",
          "brazil": "Brazil Engagement High",
          "india": "India Audience Spike",
          "weekends": "Weekends"
        },
        "signals": [
          "Your latest meme is trending in Brazil.",
          "Fortnite clips gaining traction in Philippines.",
          "High save-rate detected in Germany for strategy guides.",
          "Viral acceleration detected for Carousels in India."
        ],
        "formats": {
          "clutch": "Clutch Clips",
          "memes": "Meme Edits",
          "ai_packs": "AI Image Packs",
          "highlights": "Viral Highlights",
          "fails": "Funny Fails",
          "guides": "Strategy Guides"
        },
        "regions": {
          "USA": "United States",
          "IND": "India",
          "BRA": "Brazil",
          "PHL": "Philippines",
          "IDN": "Indonesia",
          "DEU": "Germany",
          "SEA": "Southeast Asia",
          "LATAM": "LATAM"
        },
        "insights": {
          "brazil_valorant": "Valorant clips perform 42% better in Brazil.",
          "sea_memes": "Meme content is heavily shared in Southeast Asia.",
          "usa_tutorial": "US audiences retain longer on tutorial clips.",
          "germany_traction": "Your clips are gaining traction in Germany.",
          "india_shortform": "India audience engages more with short-form edits.",
          "latam_subtitles": "Spanish subtitles improve LATAM engagement by 22%."
        },
        "strategy_types": {
          "growth": "Growth",
          "viral": "Viral",
          "retention": "Retention",
          "momentum": "Momentum",
          "engagement": "Engagement",
          "language": "Language"
        }
      },
      "settings": {
        "title": "Settings",
        "sections": {
          "account": "Account Settings",
          "notifications": "Notifications",
          "billing": "Billing",
          "privacy": "Privacy",
          "danger": "Danger Zone"
        },
        "account": {
          "title": "Account Profile",
          "subtitle": "Update your personal information and email address.",
          "display_name": "Display Name",
          "display_name_desc": "Your name in the nxclip community",
          "email": "Email Address",
          "email_desc": "Used for notifications and login",
          "reset_onboarding": "Reset Onboarding",
          "restart_guide": "Restart Creator Guide",
          "save_changes": "Save Changes",
          "saving": "Saving...",
          "saved_success": "Settings saved"
        },
        "billing": {
          "title": "Billing & Subscription",
          "subtitle": "Manage your plan and view your billing history.",
          "plans": {
            "free": "Free Forever",
            "pro": "Pro Creator",
            "studio": "Studio",
            "limited": "Limited Content Creator",
            "professional": "Professional Creative Suite",
            "limited_desc": "Basic access to creation tools and analytics.",
            "professional_desc": "Full access to unlimited creations, AI coaching, and deep analytics."
          },
          "pricing": {
            "free": "$0.00 / month",
            "pro": "$12.00 / month",
            "studio": "$39.00 / month"
          },
          "status": {
            "label": "Status",
            "active_basic": "Active (Basic)",
            "active_premium": "Active (Premium)"
          },
          "next_billing": "Next Billing",
          "next_renewal": "Next Renewal",
          "access_until": "Access Until",
          "renews_annually": "Renews annually",
          "renews_monthly": "Renews monthly",
          "interval": {
            "annual": "Annual",
            "monthly": "Monthly"
          },
          "na": "N/A",
          "upgrade": "Upgrade to Pro",
          "cancel": "Cancel Subscription",
          "payment_methods": "Payment Methods",
          "history": "Billing History",
          "last_12_months": "Last 12 Months",
          "empty_history": "No paid billing history yet.",
          "invoice_label": "Invoice #NX-00{{id}}",
          "download_pdf": "Download PDF"
        },
        "danger": {
          "title": "Danger Zone",
          "subtitle": "Irreversible actions related to your account.",
          "delete_title": "Delete Account",
          "delete_desc": "Once you delete your account, there is no going back. All your creations, analytics, and settings will be permanently removed from our servers.",
          "delete_button": "Delete My Account"
        }
      },
      "profile": {
        "title": "My Profile",
        "edit_profile": "Edit Profile",
        "complete_your_profile": "Complete your profile",
        "unlock_features": "Unlock full creator features",
        "progress": "Progress",
        "boost_visibility": "Boost your visibility by adding:",
        "finish_setup": "Finish Setup",
        "takes_less_than": "Takes less than 2 mins",
        "tabs": {
          "posts": "Published",
          "published": "Published",
          "live": "Live Posts",
          "scheduled": "Scheduled",
          "plan": "Strategy — Weekly Plan",
          "liked": "Liked",
          "saved": "Saved"
        },
        "stats": {
          "posts": "Posts",
          "followers": "Followers",
          "following": "Following",
          "engagement": "Engagement",
          "pro_only": "Pro Only"
        },
        "no_bio": "No bio yet. Add one to tell your story!",
        "no_niches": "No content niches added yet.",
        "niche_not_tagged": "Niche not tagged on this plan — revise in Creator Coach.",
        "strategy": {
          "title": "7-Day Content Strategy",
          "growth_mode": "Growth Mode",
          "community_mode": "Community Mode",
          "no_plan": "No content plan found. Complete onboarding to generate one!",
          "start_onboarding": "Start Onboarding",
          "onboarding_title": "Onboarding details",
          "onboarding_subtitle": "What you told Creator Coach — category, niches, and answers.",
          "legacy_answers_note": "Your saved plan includes category and niches only. Revise through Creator Coach to update your niche and re-answer audience, goal, posting rhythm, and starting point — then get a fresh week plan.",
          "legacy_answers_cta": "Revise niche & answers",
          "revise_cta": "Revise niche & answers",
          "fields": {
            "category": "Category",
            "niches": "Niches",
            "audience": "Audience",
            "goal": "Goal",
            "frequency": "Posting rhythm",
            "start": "Starting point"
          }
        },
        "actions": {
          "follow": "Follow",
          "following": "Following",
          "message": "Message",
          "back": "Back",
          "view_all": "View All",
          "recent_creations": "Recent Creations"
        },
        "missing_fields": {
          "display_name": "Display Name",
          "bio": "Bio",
          "games": "Content Niches",
          "avatar": "Profile Photo",
          "socials": "Social Channels",
          "onboarding": "Creator Onboarding"
        },
        "edit": {
          "title": "Profile Settings",
          "change_photo": "Change",
          "photo_label": "Profile Picture",
          "error_title": "Profile Error",
          "success_title": "Success",
          "success_msg": "Profile updated successfully! Redirecting...",
          "display_name_label": "Display Name",
          "display_name_desc": "This is how you will appear to other creators",
          "display_name_placeholder": "Your display name",
          "bio_label": "Bio",
          "bio_desc": "A short description of yourself and your content",
          "bio_placeholder": "Tell us about your content and audience...",
          "social_links_label": "Social Channels",
          "social_links_desc": "Connect YouTube, Instagram, Facebook, or TikTok to post Live and pull stats. Google Sign-In is not a YouTube connect.",
          "connect_btn": "Connect",
          "connected_btn": "Connected",
          "disconnect_btn": "Disconnect",
          "disconnect_title": "Disconnect this channel?",
          "disconnect_confirm": "Disconnect {{platform}}? You will need to connect it again to post Live to this channel.",
          "oauth_coming_soon": "OAuth coming soon",
          "twitch_placeholder": "Twitch Username",
          "youtube_placeholder": "YouTube Channel",
          "instagram_placeholder": "Instagram Handle",
          "twitter_placeholder": "Twitter Handle",
          "tiktok_placeholder": "TikTok Handle",
          "games_label": "Content Niches",
          "games_desc": "Pick niches that match your Creator Coach categories — Gaming, Lifestyle, Travel, Food, Cooking, Quiet Luxury, Gourmet Culinary, Fashion, Interior Design, and Futuristic Digital.",
          "no_niches": "No niches added yet...",
          "custom_niche_placeholder": "Add custom niches...",
          "popular_suggestions": "Popular Suggestions",
          "save_btn": "Save Changes",
          "saved_btn": "Saved!",
          "toast": {
            "success_title": "Profile Updated",
            "success_desc": "Your changes have been saved successfully.",
            "error_title": "Update Failed",
            "error_desc": "Consistency error during profile sync. Please try again.",
            "generic_error": "Failed to save changes. Please try again."
          }
        },
        "plans": {
          "pro": "Pro Creator",
          "studio": "Studio",
          "free": "Free"
        },
        "user_bio": "Competitive CS2 player and strategist. Sharing my best plays and tactical breakdowns daily. 🔫🔥",
        "demo_stats": {
          "posts": "124",
          "followers": "8.2k",
          "following": "245"
        }
      },
      "admin": {
        "header": {
          "title": "Admin Command Center",
          "subtitle": "Manage registered users and system permissions",
          "stats_label": "System Matrix",
          "stats_unit": "Nodes"
        },
        "table": {
          "search_placeholder": "Search by email...",
          "empty_title": "No users found",
          "empty_desc": "Try adjusting your search or filters",
          "columns": {
            "user": "User",
            "role": "Role",
            "plan": "Plan",
            "onboarding": "Onboarding",
            "joined": "Joined",
            "actions": "Actions"
          },
          "status": {
            "completed": "Completed",
            "pending": "Pending",
            "unknown": "Unknown"
          },
          "roles": {
            "admin": "Admin",
            "creator": "Creator",
            "user": "User"
          }
        },
        "status": {
          "anonymous": "Anonymous"
        },
        "notifications": {
          "role_updated": "Role Updated",
          "role_updated_desc": "Successfully updated role to {{role}}.",
          "plan_updated": "Plan Updated",
          "plan_updated_desc": "User is now on the {{plan}} plan.",
          "user_deleted": "User Terminated",
          "user_deleted_desc": "The account has been successfully removed.",
          "update_failed": "Update Failed",
          "update_failed_desc": "Could not update user role.",
          "plan_update_failed_desc": "Could not update user plan.",
          "delete_failed": "Operation Failed",
          "delete_failed_desc": "Could not delete user account."
        },
        "dialog": {
          "title": "Command Entry: {{name}}",
          "desc": "Comprehensive user profile and management tools for NexaClip administrators.",
          "tabs": {
            "overview": "Overview",
            "profile": "Profile",
            "management": "Management"
          },
          "overview": {
            "current_role": "Current Role",
            "role_desc": "System-wide permissions level",
            "active_plan": "Active Plan",
            "plan_desc": "Subscription levels & quotas",
            "activity_title": "Activity Stream"
          },
          "activity": {
            "gen_image": "Generated AI Image",
            "update_bio": "Updated Profile Bio",
            "login": "Logged In"
          },
          "profile": {
            "bio_title": "User Intel / Bio",
            "no_bio": "No biography provided by the user.",
            "niches_title": "Meta Niches",
            "no_niches": "No niches specified.",
            "games_title": "Primary Games",
            "no_games": "No games listed."
          },
          "management": {
            "role_title": "Permission Override",
            "plan_title": "Matrix Allocation (Plan)",
            "delete_title": "Security Protocol: Deletion",
            "delete_warning": "Executing this command will permanently remove all node data associated with {{name}}.",
            "confirm_btn": "Confirm Erase",
            "abort_btn": "Abort",
            "delete_btn": "Terminate Data Stream (Delete)"
          },
          "exit_btn": "Exit Management",
          "joined": "Joined {{date}}",
          "onboarded": "Onboarded",
          "pending_onboarding": "Pending Onboarding"
        }
      },
      "coach": {
        "title": "Creator Coach",
        "badge": "AI Powered",
        "untitled_chat": "Untitled Chat",
        "creator_dna": "Creator DNA",
        "dna_desc": "Configure your identity and goals",
        "identity": "Identity",
        "creator_name": "Creator Handle / Name",
        "creator_name_placeholder": "e.g. Ninja, Pokimane...",
        "focus": "Focus",
        "games_you_play": "Games You Play",
        "games_placeholder": "e.g. Valorant, Minecraft",
        "games_hint": "Separate games with commas.",
        "audience_goals": "Audience & Goals",
        "target_audience": "Target Audience",
        "audience_placeholder": "Who are you targeting?",
        "audiences": {
          "competitive": "Competitive Hardcore Gamers",
          "casual": "Casual / Variety Viewers",
          "gen_z": "Gen Z / Shorts Enthusiasts",
          "technical": "Technical / Meta Analysts",
          "funny": "Funny Moments / Fail Lovers"
        },
        "main_goal": "Main Content Goal",
        "goal_placeholder": "What is your priority?",
        "goals": {
          "viral": "Pure Viral Growth (Reach)",
          "community": "Building a Loyal Community",
          "brand": "Securing Brand Deals/Sponsors",
          "skill": "Showcasing Elite Gameplay Skill",
          "full_time": "Becoming a Full-Time Streamer"
        },
        "consistency": "Consistency",
        "posting_frequency": "Posting Frequency",
        "frequency_placeholder": "How often do you post?",
        "frequencies": {
          "daily": "Daily Uploads / Streams",
          "multi_weekly": "3-4 Times Per Week",
          "weekly": "Weekly Consistency",
          "bi_weekly": "Every 2 Weeks",
          "monthly": "High-Production Monthly"
        },
        "save_changes": "Save Creator DNA",
        "questions_left": "{{count}} questions left today",
        "unlimited": "Unlimited questions",
        "upgrade_promo": "Upgrade for unlimited AI coaching",
        "upgrade_btn": "Upgrade to Pro",
        "input_placeholder": "Ask your coach something...",
        "send_aria": "Send message",
        "chat_welcome": "Hi! I'm your nxclip.app Creator Coach. I'm ready to help you grow. What's on your mind?",
        "error_connectivity": "Connectivity Issue",
        "error_generic": "I encountered an error trying to connect to the neural network.",
        "no_history": "No conversation history yet.",
        "delete_confirm": "Delete Chat?",
        "categories": {
          "viral": "Viral",
          "growth": "Growth",
          "analytics": "Analytics",
          "mastery": "Mastery"
        },
        "onboarding": {
          "incomplete": "Your Creator DNA is incomplete. Set it up for better advice!",
          "setup_btn": "Setup Now",
          "title": "Ready to Optimize?",
          "desc": "Optimize your virality engine. Choose a focus area below to get expert tactical advice on growing your channel.",
          "dna_required": "DNA Alignment Required",
          "dna_required_desc": "To provide surgical growth tactics, I need your Creator DNA. Set your niche to unlock personalized coaching.",
          "initialize_btn": "INITIALIZE DNA",
          "shuffled_refresher": "REFRESH IDEAS"
        },
        "history": {
          "new_chat_title": "New Conversation",
          "welcome_msg": "Hi! I'm your nxclip.app Creator Coach. I'm ready to help you grow. What's on your mind?"
        },
        "errors": {
          "processing": "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
          "connectivity": "I encountered an error trying to connect to the neural network: {{error}}"
        },
        "sidebar": {
          "history": "History",
          "chat_history": "Chat History",
          "new_chat": "NEW CHAT",
          "new_conversation": "NEW CONVERSATION",
          "loading_archive": "Loading Archive",
          "no_conversations": "No Conversations Found",
          "untitled": "Untitled Chat",
          "archived": "ARCHIVED",
          "queries_left": "{{count}} QUERIES LEFT",
          "unlimited": "Unlimited AI",
          "limit_reached": "LIMIT REACHED",
          "station": "Coach Access Station"
        },
        "header": {
          "title": "CREATOR COACH",
          "beta": "BETA",
          "neural_link": "Neural Link Stable",
          "latency": "Response Latency",
          "latency_value": "1.2ms",
          "snapshot_tooltip": "Snapshot Transcript",
          "dna_tooltip": "Creator Profile (DNA)",
          "new_hub": "New Hub"
        },
        "chat": {
          "evaluated_tokens": "EVALUATED AT 1024K TOKENS",
          "copy_intel": "COPY INTEL",
          "copied": "COPIED TO NEURAL LINK",
          "creator_access": "CREATOR ACCESS",
          "coach_response": "COACH RESPONSE",
          "scroll_to_hub": "Scroll to Hub"
        },
        "input": {
          "limit_title": "COACH TRANSMISSION LIMIT REACHED",
          "limit_desc": "You've exhausted your free coaching queries. Professional creators use Pro for unlimited growth intel.",
          "upgrade_btn": "UPGRADE TO PRO ACCESS",
          "placeholder": "Transmit coaching request...",
          "attach_tooltip": "Attach Context",
          "llm": "LLM: GEMINI 3 FLASH",
          "context_window": "Context: 1.2M Tokens",
          "shortcuts": "Neural Link • Shift+Enter for Multi-Line"
        },
        "dna": {
          "title": "CREATOR DNA",
          "sections": {
            "identity": "Identity",
            "focus": "Focus",
            "audience_goals": "Audience & Goals",
            "consistency": "Consistency"
          },
          "labels": {
            "handle": "Creator Handle / Name",
            "games": "Games You Play",
            "audience": "Target Audience",
            "goal": "Main Content Goal",
            "frequency": "Posting Frequency"
          },
          "placeholders": {
            "handle": "e.g. Ninja or Your Gaming Name",
            "games": "e.g. Valorant, Minecraft, GTA V",
            "audience": "Who are you targeting?",
            "goal": "What is your priority?",
            "frequency": "How often do you post?"
          },
          "help": {
            "games": "Separate games with commas.",
            "recalibrate": "THIS RECALIBRATES THE AI COACH"
          },
          "save_btn": "SAVE CREATOR DNA"
        },
        "options": {
          "audience": {
            "competitive": "Competitive Hardcore Gamers",
            "casual": "Casual / Variety Viewers",
            "genz": "Gen Z / Shorts Enthusiasts",
            "technical": "Technical / Meta Analysts",
            "funny": "Funny Moments / Fail Lovers"
          },
          "goals": {
            "viral": "Pure Viral Growth (Reach)",
            "community": "Building a Loyal Community",
            "brand": "Securing Brand Deals/Sponsors",
            "skill": "Showcasing Elite Gameplay Skill",
            "fulltime": "Becoming a Full-Time Streamer"
          },
          "frequency": {
            "daily": "Daily Uploads / Streams",
            "multi_weekly": "3-4 Times Per Week",
            "weekly": "Weekly Consistency",
            "bi_weekly": "Every 2 Weeks",
            "monthly": "High-Production Monthly"
          }
        },
        "prompts": {
          "viral": [
            "Viral hooks for TikTok gaming clips?",
            "How to trend on the YouTube Shorts feed?",
            "Instagram Reels gaming trends for this week?",
            "How to make a cinematic YouTube intro?",
            "Best AI settings for viral gaming thumbnails?"
          ],
          "growth": [
            "How can Image Studio help my YouTube CTR?",
            "Strategies for consistent viewer retention",
            "Growing a gaming community using nxclip?",
            "How to convert Shorts viewers to long-form?",
            "Using nxclip memes to grow on Instagram?"
          ],
          "analytics": [
            "Analyze my YouTube CTR and retention",
            "What are good TikTok completion rates?",
            "Instagram Insights: What metrics matter?",
            "How to use nxclip data to improve views?",
            "Best time to post gaming content on IG?"
          ],
          "mastery": [
            "How to optimize my nxclip workflow?",
            "Advanced prompting for gaming images",
            "Using clips effectively for channel teasers",
            "How to edit faster using nxclip tools",
            "Best export settings for high-quality vertical"
          ]
        }
      },
      "image_studio": {
        "seo_title": "AI Image & Meme Studio | NexaClip.ai",
        "seo_description": "Generate stunning AI images and viral memes with our advanced Image Studio. Powered by Gemini AI for professional creators.",
        "tabs": {
          "generate": "Generate",
          "canvas": "Canvas",
          "edit": "Edit"
        },
        "config": {
          "title": "Configuration",
          "mode_label": "Studio Mode",
          "mode_tooltip": "Switch between standard AI Image generation or optimized Meme creation with text overlays.",
          "model_label": "AI Model",
          "model_tooltip": "Select the engine powering your generation. Flash is faster, while Pro offers higher creative fidelity.",
          "model_placeholder": "Select Model"
        },
        "title_input": {
          "label": "Clip Title",
          "placeholder": "Give your creation a name...",
          "ai_suggest": "AI Suggest",
          "tooltip": "Generate a catchy title based on your prompt."
        },
        "prompt": {
          "label": "Prompt",
          "placeholder": "Describe your gaming scene or meme idea...",
          "clear": "Clear prompt",
          "refine": "Refine Prompt",
          "refine_desc": "Focus on the details of your vision.",
          "limit_reached": "No generations left today. Upgrade your plan for more!",
          "suggested": "Suggested for {{style}}",
          "apply": "Apply Changes"
        },
        "generations_left": {
          "label": "Generations Left",
          "upgrade": "Upgrade for Unlimited Generations"
        },
        "recent_prompts": {
          "label": "Recent Prompts",
          "tooltip": "Clear History"
        },
        "caption_studio": {
          "title": "Caption Studio",
          "description": "Add AI-generated captions to your creation",
          "ai_generate": "AI Generate",
          "placeholder": "Social media caption...",
          "ai_suggestions_label": "AI Suggestions",
          "tooltip": "Uses Gemini Vision to analyze your image and craft engagement-optimized social media captions."
        },
        "meme": {
          "top_text": "Top Text",
          "top_placeholder": "ENTER TOP TEXT",
          "bottom_text": "Bottom Text",
          "bottom_placeholder": "ENTER BOTTOM TEXT",
          "style_label": "Caption Style",
          "style_tooltip": "Choose the typeface for your meme captions.",
          "styles": {
            "impact": "Impact",
            "modern": "Modern Sans",
            "classic": "Classic Serif"
          }
        },
        "aspect_ratio": {
          "title": "Aspect Ratio",
          "presets": {
            "square": "Square",
            "widescreen": "Widescreen",
            "social": "Social story",
            "portrait": "Portrait",
            "classic": "Classic",
            "ultrawide_p": "Ultrawide Port.",
            "ultrawide_l": "Ultrawide Land."
          }
        },
        "style_presets": {
          "title": "Style Presets",
          "tooltip": "Apply {{label}} style to guide the AI's artistic direction.",
          "realistic": "Realistic",
          "cinematic": "Cinematic",
          "cartoon": "Cartoon",
          "thumbnail": "Thumbnail",
          "meme": "Meme Style"
        },
        "advanced": {
          "title": "Advanced Settings",
          "creativity": "Creativity",
          "creativity_tooltip": "Higher values allow the AI more artistic freedom. Lower values stick closer to your literal prompt.",
          "lighting": "Lighting / Tone",
          "lighting_tooltip": "Applies specific cinematic lighting profiles to the generation.",
          "lighting_options": {
            "natural": "Natural",
            "neon": "Neon / Cyberpunk",
            "golden": "Golden Hour",
            "dramatic": "Dramatic Noir"
          },
          "negative": "Negative Prompt",
          "negative_tooltip": "List elements you explicitly WANT TO AVOID in the image (e.g., \"blurry, distorted hands, text\").",
          "negative_placeholder": "Avoid: blurry, low res..."
        },
        "history": {
          "title": "Recent Generations",
          "subtitle": "Your creative legacy",
          "items_count_one": "{{count}} item",
          "items_count_other": "{{count}} items",
          "saved_desc": "Your last {{count}} generations are saved locally.",
          "clear_all": "Clear All",
          "no_generations": "No generations yet",
          "studio_history": "Studio history",
          "start_creating": "Start creating above to build your history.",
          "reuse": "Reuse Prompt",
          "download": "Download",
          "untitled": "Untitled Creation",
          "clear_confirm_title": "Clear History?",
          "clear_confirm_desc": "This will permanently delete your local generation history. This action cannot be undone.",
          "clear_everything": "Clear Everything"
        },
        "canvas": {
          "quick_adjust": "Quick Adjust",
          "reset": "Reset",
          "brightness": "Brightness",
          "contrast": "Contrast",
          "saturation": "Saturation",
          "ready_to_create": "Ready to Create?",
          "ready_desc": "Enter a prompt to generate high-quality gaming images, thumbnails, or memes using our advanced AI engine.",
          "generating": "Generating...",
          "crafting": "AI is crafting your vision",
          "failed": "Generation Failed",
          "try_again": "Try Again"
        },
        "edit": {
          "tabs": {
            "adjust": "Adjust",
            "text": "Text",
            "layers": "Layers"
          },
          "adjustments": "Adjustments",
          "brightness_tooltip": "Adjust overall image light levels.",
          "contrast_tooltip": "Adjust the difference between light and dark areas.",
          "saturation_tooltip": "Adjust the intensity and vividness of colors.",
          "quick_actions": "Quick Actions",
          "upscale": "Upscale",
          "upscale_tooltip": "Uses AI to double the resolution and clarify details without losing quality.",
          "bg_remove": "BG Remove",
          "bg_remove_tooltip": "Instantly segment the subject and remove the background for PNG exports.",
          "processing": "Processing...",
          "removing": "Removing...",
          "add_text": "Add Text Layer",
          "text_layers": "Text Layers",
          "font_placeholder": "Enter text...",
          "presets": "Presets",
          "preset_labels": {
            "gaming_meme": "Gaming Meme",
            "stream_alert": "Stream Alert",
            "thumbnail_title": "Thumbnail Title"
          },
          "background_layer": "Background",
          "ai_generation": "AI Generation",
          "empty_layer": "Empty",
          "view_history": "View History"
        },
        "buttons": {
          "generate": "Generate",
          "generating": "Generating...",
          "regenerate": "Regenerate",
          "save_library": "Save to Library"
        }
      },
      "content_library": {
        "title": "Content Library",
        "search_placeholder": "Search your content...",
        "columns": {
          "content": "Content",
          "type": "Type",
          "status": "Status",
          "stats": "Stats",
          "date": "Date",
          "actions": "Actions"
        },
        "types": {
          "clip": "Clip",
          "image": "Image",
          "clips": "Clips",
          "images": "Images"
        },
        "status": {
          "published": "Published",
          "publishing": "Publishing",
          "processing": "Processing",
          "draft": "Draft",
          "moderation_rejected": "Moderation Rejected",
          "rejected": "Rejected",
          "generation_failed": "Generation Failed",
          "failed": "Failed",
          "deleted": "Deleted"
        },
        "actions": {
          "view_details": "View Details",
          "download": "Download",
          "delete": "Delete"
        },
        "empty_state": {
          "title": "Your Library is Empty",
          "desc": "Start your journey by creating high-quality gaming clips or AI-generated images. Your masterpieces will appear here.",
          "cta": "Create Your First Piece"
        }
      },
      "buttons": {
        "generate": "Generate",
        "generating": "Generating...",
        "regenerate": "Regenerate",
        "save_library": "Save to Library"
      },
      "clip_editor": {
        "header": {
          "subtitle": "Upload and edit short-form clips."
        },
        "steps": {
          "upload": "Upload",
          "trim": "Trim",
          "polish": "Polish & Publish"
        },
        "player": {
          "live_preview": "Live Preview",
          "play": "Play video",
          "pause": "Pause video",
          "unmute": "Unmute video",
          "mute": "Mute video",
          "adjust_volume": "Adjust clip volume",
          "playback_time": "Playback time",
          "reset_trim": "Reset Trim",
          "fullscreen": "Fullscreen",
          "total": "Total"
        },
        "trim": {
          "calculating": "Calculating Smart Trim...",
          "scanning": "AI Scanning...",
          "action_moments": "Finding the strongest beats to keep",
          "analyzing_cues": "Reading the clip for hook, peak, and close",
          "timeline_trimmer": "Timeline Trimmer",
          "ai_scan": "AI Scan",
          "ai_scan_tooltip": "Finds the strongest moments in your clip (hook, peak, close) and marks them on the timeline so you can trim around them.",
          "ai_scan_tooltip_niche": "Finds the strongest beats in this {{category}} clip and marks them on the timeline so you can trim around them.",
          "scan_found": "Marked {{count}} highlight beats on the timeline",
          "scan_found_hint": "Hook = start, peak = keep, close = end. Handles snap to these marks.",
          "scan_fallback": "Placed generic beats on this clip so you can still trim.",
          "scan_results": "Highlight beats",
          "scan_help": "These marks are the story of the clip: open on the hook, keep the peak, cut after the close. Click a beat to jump there. Drag handles snap to them.",
          "scan_empty": "AI Scan marks hook, peak, and close so you know what to keep — it does not cut the clip by itself.",
          "trim_to_beats": "Trim to these beats",
          "trim_to_beats_done": "Keep range set from opening beat to close",
          "marker_roles": {
            "hook": "Open here — first beat that stops the scroll",
            "build": "Keep this rise — energy is climbing",
            "peak": "Protect this payoff — the moment people rewind",
            "close": "End here — last beat before it goes cold",
            "clutch": "Protect this clutch",
            "win": "End on the win",
            "kill": "Protect this peak hit",
            "victory": "End on the victory",
            "prep": "Keep the setup",
            "plating": "Protect the plate-up",
            "taste": "End on the reaction",
            "arrival": "Open on arrival",
            "vista": "Protect the view",
            "moment": "Keep this moment",
            "effort": "Keep the work",
            "finish": "End on the finish",
            "point": "Keep the key point",
            "punchline": "Protect the punchline",
            "look": "Keep the look",
            "detail": "Protect the detail"
          },
          "ai_smart_trim": "AI Smart Trim",
          "ai_smart_trim_tooltip": "Automatically suggests the perfect start and end points based on peak engagement metrics and visual cues.",
          "precision_trim": "Precision Trim",
          "zoom": "Zoom",
          "apply_continue": "Apply Trim & Continue",
          "markers": {
            "action_start": "Hook",
            "kill": "Peak",
            "clutch": "Clutch",
            "victory": "Close",
            "hook": "Hook",
            "build": "Build",
            "peak": "Peak",
            "close": "Close",
            "win": "Win",
            "prep": "Prep",
            "plating": "Plating",
            "taste": "Taste",
            "arrival": "Arrival",
            "vista": "Vista",
            "moment": "Moment",
            "effort": "Effort",
            "finish": "Finish",
            "point": "Point",
            "punchline": "Punchline",
            "look": "Look",
            "detail": "Detail"
          },
          "ai_suggestion": "AI Suggestion",
          "apply_ai_trim": "Apply AI Trim",
          "trim_help": "Drag the handles to choose which part of the clip to keep.",
          "keep_from": "Keep from",
          "keep_to": "Keep to",
          "clip_length": "Length"
        },
        "polish": {
          "editor": "Editor",
          "polishing": "Polishing",
          "ai_enhanced_preview": "AI Enhanced Preview",
          "insane_clutch": "INSANE CLUTCH!",
          "tabs": {
            "details": "Details",
            "meme": "Captions",
            "captions": "Captions",
            "audio": "Audio",
            "enhance": "Enhance"
          },
          "details": {
            "title": "Clip Details",
            "duration": "Duration",
            "change": "Change",
            "context_label": "AI writing context",
            "context_placeholder": "e.g., Epic 1v5 clutch in Valorant...",
            "context_help": "This helps AI generate better titles and captions.",
            "clip_title": "Clip Title",
            "ai_suggest": "AI Suggest",
            "title_tooltip": "Uses Gemini AI to generate catchy, high-CTR titles based on your clip's visual content and context.",
            "title_placeholder": "Enter a catchy title...",
            "caption": "Caption",
            "ai_generate": "Generate with AI",
            "caption_tooltip": "Drafts multiple social-ready captions with relevant hashtags and calls-to-action.",
            "caption_placeholder": "Add a caption for your post...",
            "ai_suggestions_label": "AI Suggestions",
            "hashtags": "Hashtags",
            "hashtags_placeholder": "Add #hashtag and press Enter",
            "generate_hooks": "Generate hooks",
            "viral_hooks": "Viral hooks",
            "cut_silence": "Cut dead air (silence)"
          },
          "meme": {
            "title": "Captions / Overlays",
            "beta": "Beta",
            "top_text": "Top Text",
            "top_placeholder": "ENTER TOP TEXT",
            "bottom_text": "Bottom Text",
            "bottom_placeholder": "ENTER BOTTOM TEXT",
            "drag_hint": "Drag top and bottom text on the preview to place them. Download/Render burns the same positions.",
            "caption_style": "Caption Style",
            "caption_font": "Caption font",
            "pro_tip": "Pro Tip",
            "tip_content": "Meme text works best with short, punchy captions. Use 'Impact' for that classic viral look!",
            "styles": {
              "kinetic": "Kinetic (Hormozi)",
              "clean": "Clean subtitle",
              "impact_meme": "Impact meme",
              "impact": "Impact (Classic)",
              "modern": "Modern Sans",
              "classic": "Classic Serif",
              "neon": "Neon Glow"
            }
          },
          "audio": {
            "title": "Audio Mixer",
            "master_mix": "Master Mix",
            "final_output": "Final Output",
            "original_clip": "Original Clip",
            "bg_music": "Background Music",
            "sound_library": "Sound Library",
            "previews": "15s Previews",
            "play_mix": "Play clip + music mix",
            "mix_hint": "Tap Play on the preview to hear clip audio plus BGM only when a track is selected. Final Output scales both, including above 100%.",
            "animate_no_source": "Animated clips often have no source audio — raise BGM or keep this low."
          },
          "enhance": {
            "title": "AI Enhancements",
            "beta": "Beta",
            "preview_now": "Live preview",
            "live_preview": "Live preview",
            "preview_hint": "Watch the 9:16 preview. Play the clip, toggle noise reduction, drag color, then Compare original.",
            "compare_original": "Compare original",
            "comparing": "Showing original",
            "color_pct": "Color {{pct}}%",
            "noise_on": "Noise reduced",
            "audio_polish": "Audio Polish",
            "audio_polish_hint": "Cuts rumble and hiss and lifts the voice. Play, toggle this, then Compare original.",
            "noise_reduction": "Background Noise Reduction",
            "voice_isolation": "Voice isolation",
            "noise_reduction_desc": "Automatically isolates voice and removes background hum, keyboard clicks, and fan noise.",
            "noise_reduction_tooltip": "High-pass, hiss cut, and voice lift on the clip mix. Play the preview to hear it.",
            "visual_polish": "Visual Polish",
            "visual_polish_hint": "Drag toward Vibrant — saturation and contrast update on the 9:16 preview immediately.",
            "auto_applied": "Auto Applied",
            "auto_correct": "Auto Correct",
            "auto_correct_tooltip": "Instantly balances exposure, contrast, and saturation to professional standards using AI analysis.",
            "smart_color": "Smart Color Correction",
            "natural": "Natural",
            "vibrant": "Vibrant",
            "transitions_title": "AI Transition Suggestions",
            "transition": "Transition",
            "analyze_clip": "Analyze Clip",
            "transitions_tooltip": "Finds the best moments for cinematic transitions and suggests appropriate visual effects and sound SFX.",
            "no_transitions": "No transitions suggested yet. Let AI analyze your clip for the best flow.",
            "coach_title": "Creator Coach",
            "coach_tip": "Adding a '{{type}}' transition at {{time}} hits the peak beat in this {{duration}} clip.",
            "coach_tip_empty": "This clip is {{duration}}. Tap Analyze Clip for transition beats that fit inside it.",
            "coach_tip_pick": "Adding a '{{type}}' transition at {{time}} hits the peak beat in this {{duration}} clip.",
            "apply_btn": "Apply",
            "applied_btn": "Replay",
            "transition_preview": "Previewing {{type}} at {{time}}",
            "transition_preview_note": "Preview is live on the 9:16 player. Burn-in in the export is coming next."
          },
          "publish_preview": {
            "title": "Review post",
            "subtitle": "This is what goes live on your feed and selected socials.",
            "no_preview": "No preview",
            "hook": "Hook",
            "feed_only": "NxClip feed only — no social accounts selected.",
            "confirm": "Publish now",
            "publishing": "Publishing..."
          },
          "actions": {
            "publish": "Publish Clip",
            "download": "Download HD (.mp4)",
            "publish_socials": "Publish to feed",
          }
        },
        "overlays": {
          "review_title": "Reviewing Selection",
          "review_desc": "Playing your {{duration}} keep range once, then we transcribe and write captions for real.",
          "cancel": "Cancel",
          "skip_polish": "Continue to AI polish",
          "polishing_title": "Polishing Your Clip",
          "polishing_desc": "Saving the trim, then running transcription, captions, and effects on this clip.",
          "steps": {
            "transcribing": "Transcribing audio (Whisper)",
            "transcribing_sub": "Sending the clip to speech-to-text…",
            "transcribing_queued": "Queued speech-to-text…",
            "transcribing_wait": "Listening for words… {{attempt}}/{{attempts}}",
            "transcribing_done": "Transcript ready",
            "transcribing_empty": "No speech detected — continuing",
            "transcribing_slow": "Still processing — you can transcribe again on Captions",
            "transcribing_fail": "Transcription skipped",
            "generating_captions": "Generating captions",
            "generating_captions_sub": "Writing social caption and hashtags…",
            "captions_done": "Caption and hashtags drafted",
            "suggesting_effects": "Suggesting hooks and transitions",
            "suggesting_effects_sub": "Finding hooks and transition beats…",
            "effects_done": "Hooks and transition beats ready"
          },
          "overall_progress": "Overall Progress"
        }
      },
      "home": {
        "header": {
          "title": "Home Feed",
          "subtitle": "Your daily command center for gaming clips, memes, and growth."
        },
        "tabs": {
          "posts": "My Posts",
          "plan": "Weekly Plan",
          "scheduled": "Scheduled",
          "trending": "Trending",
          "insights": "Insights"
        },
        "focus": {
          "title": "Today's Focus",
          "due": "Due {{time}}",
          "task": "Turn your latest {{game}} {{type}} into a viral post and schedule it for {{platform}}.",
          "task_gen": "Generate a {{game}} {{type}} and schedule it for {{platform}}.",
          "goal": "Goal: {{objective}}",
          "action_edit": "Open Editor",
          "action_gen": "Generate Meme",
          "est": "Estimated: {{time}} mins"
        },
        "post": {
          "view_stats": "View Stats",
          "remix": "Remix Idea",
          "schedule": "Schedule Follow-up",
          "step": "Step: {{step}}",
          "views": "Views",
          "reach": "Reach",
          "eng": "Eng",
          "retent": "Retent",
          "saves": "Saves",
          "shares": "Shares",
          "analytics": "Analytics",
          "share": "Share Post"
        },
        "insights": {
          "recent_posts": "Recent Posts",
          "recent_subtitle": "Latest clips, memes, and images created through nxclip.app.",
          "full_library": "View Full Library",
          "no_posts": "No posts yet",
          "no_posts_subtitle": "Complete your first weekly plan task to start tracking performance and insights.",
          "start_task": "Start Today's Task",
          "open_create": "Open Create Hub",
          "library_title": "My Post Library",
          "library_subtitle": "Full collection of generated and published content.",
          "boost_title": "Boost Your Engagement",
          "boost_desc": "Your Valorant clips are performing 40% better on TikTok between 6PM and 8PM. Schedule your next clip for that window.",
          "boost_action": "Schedule Now",
          "tutorial_title": "Create a Tutorial Meme",
          "tutorial_desc": "Trending: Fast-paced gaming tutorials with funny reaction clips. Your audience loves learning new CS2 smoke lineups.",
          "tutorial_action": "Create Tutorial"
        },
        "metrics": {
          "today_tasks": "Today's Tasks",
          "ready_publish": "Ready to Publish",
          "needs_attention": "Needs Attention",
          "weekly_progress": "Weekly Progress",
          "streak": "+1 Streak",
          "goal_desc": "Goal: Publish 3 clips + 2 memes this week. You're almost there!"
        },
        "pipeline": {
            "title": "Creator Pipeline",
            "edit": "Edit",
            "gen": "Generate Meme",
            "schedule": "Schedule Post",
            "ready": "Ready",
            "pending": "Pending"
        },
        "viral": {
            "title": "Viral Opportunity",
            "content": "Your latest Instagram meme is gaining shares fast.",
            "tip": "Posting a follow-up image in the next 2 hours could boost reach by 25%.",
            "action": "Create Follow-up"
        },
        "trending": {
          "velocity": "Velocity",
          "trending_on": "Trending on",
          "act_now": "Act Now"
        },
        "creators": {
          "title": "Suggested Creators",
          "overlap": "Overlap",
          "follow": "Follow"
        },
        "status": {
          "ready": "Ready",
          "in_progress": "In Progress",
          "scheduled": "Scheduled",
          "published": "Published",
          "needs_review": "Needs Review",
          "completed": "Completed",
          "pending": "Pending"
        }
      },
      "create": {
        "header": {
          "title": "Create Hub",
          "subtitle": "AI-powered gaming content engine.",
          "plan": "What's the plan today?",
          "plan_subtitle": "Choose a tool to start building your gaming empire."
        },
        "tabs": {
          "clip": "Clip to Viral",
          "meme": "Meme Gen",
          "image": "AI Image",
          "carousel": "Carousel"
        },
        "tools": {
          "image_studio": {
            "title": "Image Studio",
            "description": "Generate high-quality gaming images and memes from text prompts."
          },
          "clip_editor": {
            "title": "Clip Studio",
            "description": "Upload your gameplay, trim highlights, and add AI-powered polish."
          },
          "meme_gen": {
            "title": "Meme Generator",
            "description": "Turn your gaming moments into viral memes with AI captions."
          },
          "creator_only": "Creator Only",
          "upgrade": "Upgrade to Creator",
          "get_started": "Get started",
          "locked": "Locked"
        },
        "recent": {
          "title": "Recent Creations",
          "view_all": "View All",
          "photo_by": "Photo by {{name}}"
        }
      },
      "common": {
        "start": "Start",
        "end": "End",
        "save": "Save",
        "cancel": "Cancel",
        "loading": "Loading...",
        "error": "An error occurred",
        "success": "Success",
        "delete": "Delete",
        "edit": "Edit",
        "view": "View",
        "actions": "Actions",
        "back": "Back",
        "next": "Next",
        "finish": "Finish",
        "showing_results": "Showing {{count}} results",
        "page_of": "Page {{current}} of {{total}}",
        "no_results": "No results found",
        "no_results_desc": "Try adjusting your filters or search term",
        "clear": "Clear",
        "all": "All",
        "search": "Search...",
        "months": {
          "january": "January",
          "february": "February",
          "march": "March",
          "april": "April",
          "may": "May",
          "june": "June",
          "july": "July",
          "august": "August",
          "september": "September",
          "october": "October",
          "november": "November",
          "december": "December"
        },
        "currency": "${{amount}}",
        "date_format": "{{month}} {{day}}, {{year}}",
        "days": {
          "mon": "Mon",
          "tue": "Tue",
          "wed": "Wed",
          "thu": "Thu",
          "fri": "Fri",
          "sat": "Sat",
          "sun": "Sun"
        },
        "skip": "Skip",
        "post_now": "Post Now",
        "try_now": "Try it now",
        "high": "High",
        "medium": "Medium",
        "critical": "Critical",
        "generate": "Generate",
        "regenerate": "Regenerate",
        "ai_assistant": "AI Assistant",
        "all_platforms": "All Platforms",
        "create_new": "Create New",
        "create_clip": "Create Clip",
        "create_meme": "Create Meme",
        "create_image": "Create Image",
        "schedule": "Schedule Existing",
        "filter": "Filter",
        "sort": "Sort",
        "platform": "Platform",
        "status": "Status",
        "trusted_by": "Trusted by creators from",
        "take_action": "Take Action",
        "no_data": "NO DATA",
        "via": "via",
        "time": {
          "just_now": "Just now",
          "hours_ago": "{{count}}h ago",
          "days_ago": "{{count}}d ago",
          "days_count": "{{count}}D",
          "tomorrow": "Tomorrow",
          "today": "Today"
        }
      },
      "footer": {
        "rights": "© 2026 nxclip.app. The Creator OS.",
        "product": "Product",
        "platform": "Platform",
        "legal": "Legal",
        "privacy": "Privacy",
        "terms": "Terms",
        "status": "Status",
        "description": "Architecting the next generation of creator media — across gaming, lifestyle, travel, food, cooking, and every niche in between. Powering elite creators through machine intelligence.",
        "how_it_works": "How It Works",
        "community": "Community",
        "newsletter_title": "Transmission",
        "newsletter_desc": "Get internal updates on our AI models and creator strategies.",
        "newsletter_placeholder": "commander@creator.hq",
        "newsletter_button": "Join"
      },
      "how_it_works": {
        "label": "Evolution Path",
        "title": "From raw footage to",
        "title_gradient": "viral dominance.",
        "description": "Our three-step AI pipeline is engineered for speed and scale. No more manual trimming or guesswork.",
        "steps": {
          "1": {
            "title": "Ingest & Analyze",
            "desc": "Upload your raw gameplay or stream. Our AI identifies high-engagement moments using neural gaze tracking and kill-feed detection."
          },
          "2": {
            "title": "AI Refinement",
            "desc": "Automated trimming, caption generation, and meme-masking. Transform a 4-hour stream into 20 viral-ready clips in minutes."
          },
          "3": {
            "title": "Strategized Deployment",
            "desc": "Schedule your growth. Use regional intelligence to post at peak times for maximum reach across all platforms."
          }
        }
      },
      "pricing": {
        "label": "Growth Tiers",
        "title": "Select your plan.",
        "subtitle": "Choose the engine that powers your creator journey. Scalable elite performance.",
        "monthly": "Monthly",
        "yearly": "Yearly",
        "popular": "Most Popular",
        "current": "Current Plan",
        "upgrade": "Upgrade Engine",
        "get_started": "Get Started",
        "compare": "Compare all features",
        "billing_annually": "Billed annually at",
        "infinite_potential": "Infinite Potential",
        "billed_monthly": "Billed monthly",
        "mo": "mo",
        "plans": {
          "starter": {
            "name": "Free",
            "who": "Free forever",
            "features": [
              "5 image/meme generations per day",
              "Clip uploads up to 500MB",
              "3 Creator Coach messages/mo",
              "Basic content creation workflow",
              "Basic analytics preview",
              "Standard quality exports"
            ]
          },
          "pro": {
            "name": "Pro Creator",
            "who": "Creator Standard",
            "features": [
              "Unlimited creations",
              "Clip uploads up to 5GB",
              "Unlimited Creator Coach",
              "Full analytics dashboard",
              "Engagement rate access",
              "Weekly AI coaching report"
            ]
          },
          "studio": {
            "name": "Studio",
            "who": "For teams and esports orgs",
            "features": [
              "Everything in Pro",
              "Team workflows",
              "Multi-account management",
              "Shared content library",
              "Advanced reporting",
              "Collaboration tools"
            ]
          }
        },
        "page": {
          "badge": "Transparent Pricing",
          "title": "Simple, creator-first pricing",
          "subtitle": "Start free, upgrade when you are ready to grow faster across TikTok, YouTube, and Instagram.",
          "discount": "Annual Billing: Save 17% on Pro & Studio",
          "capabilities_label": "Capabilities",
          "upload_limit": "Upload Limit",
          "generations": "Generations",
          "quality_cap": "Quality Cap",
          "breakdown_title": "Complete Breakdown",
          "breakdown_desc": "Compare every tool, limit, and architectural feature across our professional tiers.",
          "triggers_title": "When should you upgrade?",
          "triggers_desc": "Unlock NexaClip Pro when your content creation demands more power.",
          "faq_title": "Frequently Asked",
          "faq_desc": "Everything you need to know about NexaClip plans and billing.",
          "final_cta_title": "Try Pro free for 7 days.",
          "final_cta_desc": "Unlock unlimited creation, full analytics, and AI coaching when you are ready to grow faster. No credit card required.",
          "final_cta_pro": "Start Pro Free",
          "final_cta_free": "Start for Free"
        },
        "comparison": {
          "categories": {
            "content_creation": "Content Creation",
            "ai_coach": "AI Coach",
            "analytics": "Analytics",
            "publishing": "Publishing & Sharing",
            "library": "Library",
            "team": "Team Features",
            "support": "Support"
          },
          "features": {
            "gen": "Image/meme generations",
            "upload": "Video clip upload limit",
            "edit": "Clip editing workflow",
            "meme": "Meme generation",
            "image": "Image generation",
            "coach_msg": "Creator Coach messages",
            "ai_sugg": "AI content suggestions",
            "growth_plan": "Weekly growth plan guidance",
            "ai_report": "Weekly AI coaching report",
            "basic_analytics": "Basic analytics preview",
            "engagement_rate": "Engagement rate card",
            "full_dashboard": "Full analytics dashboard",
            "platform_comp": "Platform comparison",
            "performance_insights": "Content performance insights",
            "posting_time": "Best posting time / heatmap",
            "tiktok": "TikTok publishing/scheduling",
            "youtube": "YouTube Shorts publishing",
            "instagram": "Instagram Reels",
            "scheduled": "Scheduled posts",
            "cross_platform": "Cross-platform tracking",
            "content_library": "Content library",
            "saved_ideas": "Saved ideas/templates",
            "large_file": "Large file support",
            "draft_mgmt": "Draft management",
            "team_workflow": "Team workflows",
            "multi_account": "Multi-account management",
            "shared_library": "Shared content library",
            "collab_tools": "Collaboration tools",
            "community_support": "Community support",
            "priority_support": "Priority support",
            "custom_onboarding": "Custom onboarding"
          }
        },
        "triggers": [
          { "title": "You hit your daily limit", "desc": "You used all 5 free image/meme generations. Pro unlocks unlimited creation." },
          { "title": "Your clip is too large", "desc": "Free uploads support up to 500MB. Pro unlocks uploads up to 5GB." },
          { "title": "You need more coaching", "desc": "Free includes 3 Creator Coach messages per month. Pro gives you unlimited coaching." },
          { "title": "You want full analytics", "desc": "Unlock engagement rate, platform comparison, and full performance history." },
          { "title": "You want weekly AI reports", "desc": "Get your weekly coaching report with what worked, what to fix, and what to create next." },
          { "title": "Professional Quality", "desc": "You want watermark-free 4K Ultra-HD exports for all platforms." }
        ],
        "faqs": [
          { "q": "Can I start for free?", "a": "Yes! You can start with our Free forever plan to test the content creation workflow and basic analytics without any commitment." },
          { "q": "Do I need a credit card for the Pro trial?", "a": "No credit card is required to start your 7-day Pro Creator trial. You only pay when you decide to continue after the trial ends." },
          { "q": "Can I cancel anytime?", "a": "Absolutely. Our plans are flexible. You can cancel your subscription at any time from your settings with no hidden fees or contracts." },
          { "q": "What happens if I downgrade?", "a": "If you downgrade to Free, you will retain access to your Pro features until the end of your current billing period, after which your account will revert to the Free limits." },
          { "q": "What platforms are supported?", "a": "NexaClip is built for TikTok, YouTube Shorts, and Instagram Reels. We provide cross-platform analytics and publishing workflows for all three." }
        ],
        "recommendations": [
          { "name": "Free", "desc": "For new creators exploring content workflows. Perfect for starting your channel and testing ideas." },
          { "name": "Pro", "desc": "For serious creators posting across multiple platforms. Unlocks unlimited power and advanced growth analytics." },
          { "name": "Studio", "desc": "For esports teams and agencies managing multiple creator accounts with custom high-volume needs." }
        ],
        "values": {
          "unlimited": "Unlimited",
          "per_day": "per day",
          "per_mo": "per month",
          "up_to": "Up to",
          "limited": "Limited",
          "basic": "Basic",
          "advanced": "Advanced",
          "preview": "Preview",
          "standard": "Standard",
          "full": "Full",
          "shared": "Shared"
        }
      },
      "showcase": {
        "label": "The Creator Command Center",
        "title": "Everything in",
        "title_gradient": "one elite interface.",
        "description": "A unified professional ecosystem. Manage assets, track growth, and collaborate with AI in a seamless, high-performance environment.",
        "pulse": {
          "title": "Channel Pulse",
          "subtitle": "Live content intelligence"
        },
        "stats": {
          "impressions": "Viral Impressions",
          "gain": "Community Gain",
          "score": "Creator Score",
          "efficiency": "efficiency boost"
        },
        "charts": {
          "sentiment": "Audience Sentiment",
          "pipeline": "AI Content Pipeline",
          "analyzing": "Analyzing",
          "completed": "Completed"
        },
        "insights": {
          "discovery": "Discovery Insight",
          "suggestion": "Studio Suggestion",
          "nexa": "Nexa Intelligence",
          "auto": "Automated Polish",
          "peak": "Peak engagement detected at 04:12. AI has extracted 3 high-probability viral shorts from this segment.",
          "neon": "Your current audience profile responds best to high-contrast neon thumbnails. Studio presets have been updated."
        }
      },
      "spotlight": {
        "label": "Global Creator Network",
        "title": "The choice of elite",
        "title_gradient": "gaming professionals.",
        "description": "From competitive pros to variety streamers, nxclip.app is the architectural backbone of the world's most engaging gaming channels.",
        "verified": "Verified Elite",
        "counts": "+25k",
        "creators": {
          "aura": {
             "handle": "@ApexAura",
             "niche": "Battle Royale, FPS",
             "quote": "nxclip.app turned my 8-hour streams into viral gold. The AI knows exactly when the hype happens."
          },
          "sage": {
             "handle": "@StrategySage",
             "niche": "Grand Strategy, 4X",
             "quote": "Explaining complex mechanics is easier than ever. The AI captions are spot-on with technical terms."
          },
          "pixel": {
             "handle": "@PixelPioneer",
             "niche": "Indie Games, Retro",
             "quote": "The Image Studio helps me create thumbnails that actually stand out. My CTR has doubled since I started using it."
          },
          "knight": {
             "handle": "@CyberKnight",
             "niche": "RPG, Souls-like",
             "quote": "nxclip.app's Creator Coach is like having a pro producer in my ear. My community engagement is at an all-time high."
          }
        }
      },
      "testimonials": {
        "label": "Community Pulse",
        "title": "Validated by",
        "title_gradient": "the world's best.",
        "description": "Real feedback from creators who have transformed their channels using nxclip.app's intelligence.",
        "data": {
           "viper": {
              "name": "Alex 'Viper' Chen",
              "tag": "Valorant Pro",
              "quote": "nxclip.app's AI trimmer is a game-changer. I used to spend hours finding highlights, now it's done in seconds. My TikTok views are up 400%."
           },
           "luna": {
              "name": "Sarah 'Luna' Smith",
              "tag": "Variety Streamer",
              "quote": "The AI Creator Coach gave me insights I never would have found on my own. It's like having a full-time strategist for the price of a coffee."
           },
           "tank": {
              "name": "Marcus 'Tank' Jones",
              "tag": "RPG Specialist",
              "quote": "Generating custom memes for my community has never been easier. nxclip.app understands gaming culture perfectly. Best tool I've ever used."
           }
        }
      },
      "cta": {
        "label": "Final Frontier",
        "title": "Ready to dominate",
        "title_gradient": "the gaming feed.",
        "description": "Join 25,000+ top creators scaling their channels with nxclip.app. The future of gaming content is elite.",
        "button_start": "Start Your Evolution",
        "button_pricing": "Explore Pricing"
      }
    }
  },
  ar: {
    translation: {
      "app": {
        "name": "nxclip.app",
        "tagline": "نظام تشغيل الذكاء الاصطناعي لمنشئي الألعاب"
      },
      "nav": {
        "dashboard": "لوحة القيادة",
        "create": "إنشاء",
        "analytics": "التحليلات",
        "library": "المكتبة",
        "coach": "مدرب الذكاء الاصطناعي",
        "settings": "الإعدادات",
        "logout": "تسجيل الخروج",
        "home_feed": "موجز الصفحة الرئيسية",
        "create_hub": "مركز الإنشاء",
        "image_studio": "استوديو الصور",
        "clip_editor": "استوديو المقاطع",
        "content_library": "مكتبة المحتوى",
        "battles": "المعارك",
        "admin_panel": "إعدادات الإدارة",
        "upgrade_pro": "الترقية إلى برو",
        "upgrade_studio": "الترقية إلى ستوديو",
        "manage_studio": "خطة ستوديو",
        "tools": "الأدوات",
        "insights": "رؤى",
        "home": "الرئيسية",
        "features": "الميزات",
        "platform": "المنصة",
        "pricing": "الأسعار",
        "how_it_works": "كيف يعمل",
        "signin": "تسجيل الدخول",
        "signup": "ابدأ مجاناً",
        "signout": "تسجيل الخروج",
        "creator": "منشئ",
        "collapse": "طي",
        "expand": "توسيع",
        "soon": "قريباً",
        "home_tooltip": "الرئيسية nxclip.app",
        "growth_tip": {
          "title": "نصيحة للنمو",
          "description": "افتح عمليات إنشاء غير محدودة وتحليلات كاملة مع برو.",
          "cta": "الترقية الآن"
        },
        "language": {
          "en": "English",
          "ar": "العربية"
        }
      },
      "post": {
        "detail": "تفاصيل المنشور"
      },
      "user": {
        "profile": "ملف المنشئ"
      },
      "top_bar": {
        "dashboard": "لوحة التحكم",
        "search_placeholder": "البحث في الإجراءات...",
        "command_placeholder": "اكتب أمراً أو ابحث...",
        "no_results": "لم يتم العثور على نتائج.",
        "quick_actions": "إجراءات سريعة",
        "navigation": "التنقل",
        "settings": "الإعدادات",
        "theme": "المظهر",
        "actions": {
          "editor": "افتح استوديو المقاطع",
          "studio": "استوديو الصور",
          "coach": "جلسة مدرب جديدة",
          "dashboard": "لوحة التحكم",
          "analytics": "التحليلات",
          "ai_coach": "مدرب الذكاء الاصطناعي",
          "library": "مكتبة الوسائط",
          "profile": "الملف الشخصي",
          "settings": "الإعدادات",
          "toggle_theme": "تبديل المظهر"
        },
        "notifications": "الإشعارات",
        "new": "جديد",
        "unread": "غير مقروء",
        "view_all": "عرض جميع الإشعارات",
        "my_profile": "ملفي الشخصي",
        "sign_out": "تسجيل الخروج"
      },
      "dashboard": {
        "welcome": "مرحباً بعودتك، {{name}}",
        "overview": "نظرة عامة",
        "recent_activity": "النشاط الأخير",
        "geo_intel": "الذكاء الجغرافي",
        "soon": "قريباً",
        "header": {
          "title": "نظرة عامة على الأداء",
          "subtitle": "المحتوى الخاص بك في اتجاه تصاعدي عبر جميع المنصات.",
          "post_button": "إنشاء منشور جديد",
          "legacy_onboarding_note": "خطة قديمة — راجع التخصص والإجابات في مدرب المنشئين لفتح التفاصيل الكاملة.",
          "revise_cta": "راجع التخصص والإجابات",
          "niche_not_set": "لم يتم تعيين التخصص"
        },
        "performance": {
          "title": "لقطة سريعة للأداء",
          "subtitle": "اتجاه سرعة المشاهدات والوصول",
          "full_analytics": "التحليلات الكاملة",
          "views": "المشاهدات",
          "engagement": "التفاعل"
        },
        "content_matrix": {
          "title": "مصفوفة المحتوى",
          "subtitle": "التعمق حسب تنسيق المحتوى",
          "published": "المنشورات",
          "eng_rate": "معدل التفاعل",
          "top_post": "أفضل منشور",
          "clips": "مقاطع",
          "memes": "ميمز",
          "images": "صور",
          "insight": "رؤية",
          "last_30_days": "آخر 30 يومًا",
          "insights": {
            "shorten": "تقليل البداية بمقدار ثانيتين.",
            "follow_up": "إنشاء متابعة اليوم.",
            "tutorial": "استخدام صور تعليمية."
          }
        },
        "top_content": {
          "title": "أفضل محتوى هذا الأسبوع",
          "subtitle": "تنسيقات فائزة عبر المنصات",
          "view_details": "عرض التفاصيل",
          "reuse_strategy": "إعادة استخدام الاستراتيجية",
          "why_worked": "لماذا نجح؟",
          "posts": {
            "valorant": "فالورانت 1 ضد 4 كلتش انتشر بشكل فيروسي",
            "cs2": "ميم دخان مخفي في كاونتر سترايك 2",
            "minecraft": "دليل نصائح بناء ماينكرافت",
            "reasons": {
              "hook": "خطاف قوي في أول 3 ثوانٍ.",
              "humor": "فكاهة تكتيكية قابلة للمشاركة.",
              "visuals": "مرئيات بأسلوب تعليمي."
            }
          }
        },
        "days": {
          "mon": "إثنين",
          "tue": "ثلاثاء",
          "wed": "أربعاء",
          "thu": "خميس",
          "fri": "جمعة",
          "sat": "سبت",
          "sun": "أحد"
        },
        "kpis": {
          "growth": "النمو الأسبوعي",
          "published": "المنشورات",
          "top_platform": "أفضل منصة",
          "attention": "تحتاج للاهتمام",
          "opportunity": "أفضل فرصة",
          "healthy": "صحي",
          "target": "هدف",
          "viral": "انتشار",
          "action": "إجراء",
          "high": "عالٍ",
          "items": "عناصر",
          "active": "نشط",
          "engagement": "معدل التفاعل"
        },
        "command": {
          "title": "مركز قيادة الذكاء الاصطناعي",
          "insight": "منظومة الاكتشاف جاهزة: خطافات ذكية في أول 3 ثوانٍ، مقاطع مصقولة من الرفع أو I2V، ونشر Live من مسار واحد.",
          "next_best": "خطوات موصى بها",
          "cta": "افتح مركز الإنشاء",
          "actions": [
            "استوديو المقاطع: حرّك صورة ثابتة (Ken Burns أو I2V)، أنشئ خطافات، اعرض، ثم انشر.",
            "استوديو الصور: أنشئ ميمًا أو صورة لمجالك — حوّلها إلى مقطع عمودي مع تحسين فيروسي.",
            "Go Live: انشر في الموجز وادفع إلى TikTok أو Reels أو Shorts أو YouTube عبر حساباتك المتصلة."
          ]
        },
        "workflows": {
          "title": "ذكاء سير العمل",
          "subtitle": "يقيّم الذكاء الاصطناعي صورك ومقاطعك ويقترح الخطوة التالية الأفضل.",
          "empty": "ارفع أو أنشئ محتوى — سيقترح الذكاء I2V والخطافات وأفكار الميم هنا.",
          "loading": "جارٍ تقييم مكتبتك…",
          "refresh": "تحديث الاقتراحات",
          "evaluated": "تم تقييم {{count}} عنصرًا",
          "cached": "{{count}} من الذاكرة المؤقتة",
          "powered_by": "الذكاء · {{provider}}",
          "meme_idea": "فكرة",
          "minimize": "تصغير",
          "dock_ready": "{{count}} اقتراحات بانتظارك",
          "dock_online": "اقتراحات مباشرة · اضغط لتنفيذ الخطوة"
        },
        "progress": {
          "title": "التقدم الأسبوعي",
          "on_track": "على المسار",
          "goals": "تم إكمال الأهداف",
          "scheduled": "مجدول",
          "review": "مراجعة",
          "up_next": "التالي",
          "up_next_task": "حرّك صورة في استوديو المقاطع، أضف خطافًا فيروسيًا، ثم انشر Live",
          "open_feed": "افتح الموجز الرئيسي",
          "no_plan_badge": "لا توجد خطة",
          "intro_fallback": "خطة أسبوع مدرب المنشئين",
          "empty": "لا توجد خطة أسبوع بعد. أنشئ واحدة لمواضيع يومية لاستوديو الصور والمقاطع والنشر Live.",
          "create_plan": "إنشاء خطة أسبوع",
          "view_full": "عرض خطة الأسبوع كاملة",
          "plan_new": "خطة أسبوع جديدة",
          "days_badge": "{{count}} أيام"
        },
        "attention": {
          "title": "تحتاج للاهتمام",
          "impact": {
            "high": "تأثير عالٍ",
            "med": "تأثير متوسط",
            "medium": "متوسط",
            "low": "منخفض"
          },
          "items": {
            "a1": { "issue": "خطاف الافتتاح ضعيف", "action": "أنشئ خطافات في استوديو المقاطع (أول 1–3 ثوانٍ)", "cta": "افتح استوديو المقاطع", "impact": "خطر على الاحتفاظ" },
            "a2": { "issue": "مسودات بانتظارك في المسار", "action": "تابع في استوديو الصور أو المقاطع ثم انشر", "cta": "مركز الإنشاء", "impact": "تأخر النشر" },
            "a3": { "issue": "منشور الموجز لم يُنشر Live بعد", "action": "جدوِل Live إلى TikTok أو Reels أو Shorts أو YouTube", "cta": "Go Live", "impact": "وصول ضائع" },
            "a4": { "issue": "خطة الأسبوع غير مكتملة", "action": "أكمل أيام المدرب المتبقية أو جدد الخطة", "cta": "عرض الخطة", "impact": "فجوة في الإيقاع" }
          },
          "clear": "كل شيء على ما يرام — واصل الإنشاء والنشر."
        },
        "pulse": {
          "title": "نبض المنشئ",
          "subtitle": "حالة النشر لهذا الأسبوع — اضغط على صف للتنفيذ.",
          "published_week": "نُشر هذا الأسبوع",
          "published_hint": "افتح المكتبة للمراجعة",
          "published_empty": "انشر مرة واحدة لفتح النبض",
          "plan_progress": "تقدم الخطة",
          "no_plan": "لا توجد خطة",
          "plan_done": "تمت تغطية خطة الأسبوع",
          "plan_remaining": "يتبقى {{count}} أيام للتغطية",
          "plan_create_hint": "أنشئ خطة أسبوع مع المدرب",
          "ready_live": "جاهز للبث المباشر",
          "ready_live_hint": "على الخلاصة — جدوِل البث على الشبكات",
          "ready_live_empty": "لا شيء بانتظار البث",
          "drafts_waiting": "مسودات بانتظارك",
          "drafts_hint": "تابع في مركز الإنشاء",
          "drafts_empty": "لا توجد مسودات في القائمة"
        },
        "tip": {
          "title": "نصيحة استراتيجية سريعة",
          "content": "حرّك صورة ثابتة بـ I2V، أضف خطافًا في أول 1–3 ثوانٍ، ثم صدّر المقطع وانشره Live.",
          "loading": "جاري توليد نصيحة من مسار محتواك…",
          "refresh": "تحديث النصيحة",
          "powered_by": "فوري · {{provider}}"
        }
      },
      "hero": {
        "badge": "أداء ذكاء اصطناعي متميز لمنشئي المحتوى",
        "title_line1": "محتوى فيروسي",
        "title_line2": "أعاد تعريفها الذكاء الاصطناعي.",
        "subtitle": "نظام تشغيل الذكاء الاصطناعي المصمم لمنشئي المحتوى من الجيل القادم. حول أفضل لحظاتك إلى نمو ملحمي بذكاء متميز.",
        "cta_start": "ابدأ التطور",
        "cta_demo": "شاهد العرض",
        "image_editor": "محرر الصور",
        "clip_editor": "استوديو المقاطع",
        "analytics": "التحليلات",
        "feed": "الموجز",
        "imaging_detail": "استوديو إبداعي مدعوم بالذكاء الاصطناعي",
        "video_detail": "قص الفيديو بدقة",
        "growth_detail": "رؤى نمو فورية",
        "curated_detail": "أبرز لقطات منشئي المحتوى المنسقة",
        "prompts": [
          "إعداد ألعاب نيون سايبربانك مع شاشات مزدوجة",
          "أبرز لقطات فالورانت سينمائية واسعة الانتشار",
          "إعداد منشئ محتوى محترف مع إضاءة RGB"
        ]
      },
      "features": {
        "label": "نظام منشئي المحتوى البيئي",
        "title_line1": "صُمم لمنشئي المحتوى",
        "title_line2": "العصر الحديث ذوي الأداء العالي.",
        "description": "تخلص من معوقات إنشاء المحتوى. تم تصميم مجموعة أدوات الذكاء الاصطناعي لدينا لمساعدتك في التصميم والتحرير والتخطيط بمستويات متميزة.",
        "elite_tooling": "أدوات متميزة",
        "image_studio": {
          "title": "استوديو الصور والميمات بالذكاء الاصطناعي",
          "description": "قم بإنشاء صور ألعاب عالية الجودة وميمات فيروسية من مطالبات نصية بسيطة في ثوانٍ."
        },
        "clip_trimmer": {
          "title": "مشذب المقاطع وتلميع الذكاء الاصطناعي",
          "description": "تحديد وقص أفضل لحظات اللعب تلقائياً لـ TikTok و Reels و Shorts."
        },
        "creator_coach": {
          "title": "مدرب منشئ المحتوى (Gemini)",
          "description": "احصل على نصائح شخصية على مدار الساعة طوال أيام الأسبوع حول استراتيجية المحتوى والمشاركة ونمو القناة.",
          "badge": "مدعوم من Gemini AI"
        }
      },
      "analytics": {
        "title": "تحليلات منشئ المحتوى",
        "description": "تتبع أداء مقاطع الألعاب والميمات عبر TikTok و YouTube و Instagram.",
        "export": "تصدير",
        "spotlight": {
          "title": "أداء المنشور",
          "open_detail": "عرض تفاصيل المنشور",
          "missing": "لم يتم العثور على هذا المنشور في مكتبتك الأخيرة."
        },
        "tabs": {
          "overview": "نظرة عامة",
          "content": "المحتوى",
          "creative": "الإبداع",
          "platforms": "المنصات",
          "geo": "الذكاء الجغرافي",
          "audience": "الجمهور",
          "games": "الألعاب",
          "retention": "الاحتفاظ",
          "ai": "رؤى الذكاء الاصطناعي"
        },
        "metrics": {
          "views": "إجمالي المشاهدات",
          "engagement": "المشاركة",
          "watch_time": "متوسط وقت المشاهدة",
          "followers": "المتابعون",
          "shares": "المشاركات",
          "virality": "الانتشار",
          "virality_desc": "الوصول الحالي في ذروته",
          "avg_percent": "متوسط نسبة المشاهدة",
          "first_3s_hook": "خطاف أول 3 ثوانٍ",
          "rewatch_rate": "معدل إعادة المشاهدة",
          "avg_view": "متوسط المشاهدة %"
        },
        "charts": {
          "performance_pulse": "نبض الأداء",
          "performance_desc": "اتجاه المشاهدات مقابل المشاركة",
          "views": "المشاهدات",
          "engagement": "المشاركة",
          "meme_virality": "مقاييس انتشار الميمز",
          "meme_desc": "كيف تنتقل الصور عبر حلقات التواصل الاجتماعي.",
          "inter_platform": "مقارنة الوصول بين المنصات",
          "leaderboard": "لوحة صدارة الأداء",
          "leaderboard_desc": "المشاهدات حسب العنوان عبر جميع المنصات"
        },
        "overview": {
          "top_5_title": "معاينة أفضل 5 محتويات",
          "views_label": "{{count}} ألف مشاهدة",
          "followers_label": "+{{count}} ألف متابع",
          "shares_label": "{{count}} ألف مشاركة",
          "date_range": "01 يناير - 30 يناير 2024",
          "values": {
            "views": "482.5 ألف",
            "engagement": "12.8٪",
            "watch_time": "0:52 ثانية",
            "followers": "+1.2 ألف",
            "shares": "18.9 ألف",
            "virality": "82/100"
          }
        },
        "ai": {
          "title": "رؤية الذكاء الاصطناعي",
          "opportunity": "فرصة انتشار",
          "opportunity_desc": "مقاطع Apex الأقل من 15 ثانية تحقق انتشاراً أعلى بـ 3.4 مرة مساء الأحد. انشر مقاطعك المجمعة الليلة الساعة 8 مساءً.",
          "cta": "تطبيق استراتيجية المحتوى",
          "strategic_pivot": "محور استراتيجي",
          "pivot_desc": "محتوى Apex الخاص بك يحقق معدل تحويل أعلى بـ 2.4 مرة من منافسي أفلام الأكشن. خصص 60٪ من التركيز هنا.",
          "view_strategy": "عرض خطة الاستراتيجية",
          "language_ops": "عمليات اللغة الاستراتيجية",
          "language_desc": "جمهورك ثنائي اللغة بنسبة 38٪. إضافة ترجمة إسبانية قد يحسن معدل التحويل في أمريكا اللاتينية بنسبة +22٪.",
          "apply_subtitles": "تطبيق ترجمة الذكاء الاصطناعي",
          "weekly_report": "تقريرالاستراتيجية الأسبوعي",
          "growth_tactics": "تكتيكات نمو قابلة للتطوير",
          "analyze_next": "حلل منشوري القادم",
          "learn_strategy": "تعلم الاستراتيجية",
          "viral_expansion": "مرحلة التوسع الفيروسي",
          "reach_higher": "الوصول أعلى بنسبة {{percent}}%",
          "driven_by": "مدفوع بشكل أساسي بميمات {{game}}",
          "insights_list": [
            { "title": "تحسين الخطاف", "tag": "حاسم", "text": "ينخفض الاحتفاظ على TikTok بنسبة 40٪ بعد 8 ثوانٍ. انقل إعادة تسليط الضوء إلى أول 3 ثوانٍ." },
            { "title": "التلقيح المتبادل", "tag": "فرصة", "text": "85٪ من إضافات Instagram الخاصة بك تأتي من غير المتابعين. أضف دعوة لاتخاذ إجراء إلى سيرتك الذاتية في التعليقات." },
            { "title": "ذروة التعرض", "tag": "توقيت", "text": "التفاعل أعلى بـ 2.4 مرة يوم الأحد الساعة 8 مساءً. قم بجدولة مونتاج 'Weekly Clutch' لهذا الوقت." },
            { "title": "عمق المتخصص", "tag": "محتوى", "text": "ميمز Warzone تجذب المتابعين، لكن أدلة Valorant تجذب المشتركين. وازن بين مزيجك 60/40." },
            { "title": "مشاعر اللعبة", "tag": "ألعاب", "text": "مشاعر Apex Legends في أعلى مستوياتها على الإطلاق. هذا هو أفضل وقت لنشر منشور هدايا للمشاهدين." },
            { "title": "مسار تحقيق الربح", "tag": "إيرادات", "text": "جمهورك يميل شراء المنتجات بنسبة 72٪. فكر في إطلاق مجموعة 'Nexa Clip' محدودة." }
          ]
        },
        "table": {
          "item": "العنصر",
          "game": "اللعبة",
          "type": "النوع",
          "views": "المشاهدات",
          "engagement": "المشاركة",
          "retention": "الاحتفاظ",
          "viral": "فيروسي",
          "types": {
            "video": "فيديو",
            "meme": "ميمز"
          },
          "region_intel": "ذكاء المنطقة",
          "reach_index": "مؤشر الوصول",
          "top_game": "أفضل لعبة",
          "format_score": "درجة التنسيق",
          "virality_pulse": "نبض الانتشار",
          "game_title": "عنوان اللعبة",
          "status": "الحالة",
          "trend": "الاتجاه"
        },
        "platforms": {
          "deep_dive": "تعمق أكتر",
          "views": "المشاهدات",
          "eng_rate": "معدل التفاعل",
          "followers": "المتابعون",
          "shares": "المشاركات"
        },
        "creative": {
          "insights": "رؤى إبداعية",
          "caption_perf": "أداء التسمية التوضيحية",
          "save_density": "كثافة الحفظ",
          "share_multiplier": "مضاعف المشاركة",
          "format": "أفضل تنسيق: قالب",
          "format_desc": "قوالب الميمز القياسية تحقق مشاركات أكثر بنسبة 45٪ من لقطات الشاشة الأصلية.",
          "caption": "التسمية التوضيحية: مختصرة",
          "caption_desc": "التسميات التوضيحية القصيرة (أقل من 30 حرفاً) تؤدي إلى معدلات حفظ أعلى بـ 3 مرات لمنشورات Instagram Reels."
        },
        "games": {
          "live_data": "بيانات مباشرة",
          "top_performer": "أفضل أداء",
          "low_engagement": "تفاعل منخفض",
          "steady": "مستقر",
          "high_growth": "نمو مرتفع",
          "top_desc": "هذه اللعبة تحقق 40٪ من إجمالي إيراداتك. استمر في النشر يومياً.",
          "low_desc": "تم اكتشاف ظهور منخفض. فكر في تغيير الوسوم أو أسلوب المحتوى.",
          "roi": "تعظيم العائد المرتفع",
          "leaderboard_title": "لوحة المتصدرين للأداء",
          "leaderboard_desc": "المشاهدات حسب العنوان عبر جميع المنصات",
          "pivot_title": "تحول استراتيجي",
          "pivot_desc": "يحتوي محتوى {{game}} الخاص بك على معدل تحويل أعلى بمقدار 2.4 مرة من منافسي ألعاب التصويب. خصص 60٪ من التركيز هنا.",
          "strategy_btn": "عرض خطة الاستراتيجية",
          "table": {
            "title": "عنوان اللعبة",
            "views": "المشاهدات",
            "eng": "معدل التفاعل",
            "status": "الحالة",
            "trend": "الاتجاه"
          }
        },
        "audience": {
          "gender": "توزيع الجنس",
          "age": "توزيع العمر",
          "active_hours": "خريطة ساعات النشاط",
          "gender_types": {
            "male": "ذكر",
            "female": "أنثى",
            "other": "آخر"
          },
          "age_ranges": {
            "13_17": "13-17",
            "18_24": "18-24",
            "25_34": "25-34",
            "35_plus": "+35"
          },
          "days": {
            "mon": "إثنين",
            "tue": "ثلاثاء",
            "wed": "أربعاء",
            "thu": "خميس",
            "fri": "جمعة",
            "sat": "سبت",
            "sun": "أحد"
          },
          "heatmap": {
            "idle": "خامل",
            "active": "نشط",
            "peak": "ذروة",
            "tooltip": "{{day}} @ {{hour}}:00 - النشاط: {{value}}٪"
          },
          "metrics": {
            "ltv": "قيمة المتابع",
            "sentiment": "مشاعر الدردشة",
            "conversion": "معدل التحويل",
            "session": "متوسط الجلسة",
            "positive": "إيجابي"
          }
        },
        "performance_footer": {
          "title": "ذكاء أداء منشئ المحتوى",
          "ai_insight": "\"زادت نسبة التحويل من Shorts إلى الفيديوهات الطويلة بنسبة 22٪. حافظ على استراتيجية التشويق الحالية.\"",
          "live_tracking": "تتبع مباشر",
          "connected": "متصل",
          "view_model": "عرض النموذج التنبؤي"
        }
      },
      "geo": {
        "label": "الذكاء الجغرافي",
        "metric_reach": "الوصول الإقليمي",
        "metric_best": "المنطقة المستهدفة",
        "metric_retention": "متوسط الاحتفاظ",
        "metric_momentum": "زخم النمو",
        "metric_platform": "أفضل منصة",
        "metric_viral": "درجة الانتشار",
        "map_title": "خريطة ذكاء منشئي المحتوى العالمية",
        "map_subtitle": "تتبع بؤر الانتشار حسب {{layer}}",
        "opportunities": "الفرص الإقليمية",
        "top_games": "أفضل الألعاب حسب المنطقة",
        "format_index": "مؤشر انتشار التنسيق",
        "platform_strength": "قوة المنصة",
        "posting_intel": "ذكاء النشر",
        "virality_signals": "إشارات الانتشار الإقليمية",
        "language_intel": "ذكاء اللغة",
        "all_regions": "جميع المناطق",
        "data_layer": "طبقة البيانات",
        "syncing": "جاري مزامنة الذكاء الجغرافي...",
        "matching": "مطابقة بنسبة {{count}}٪",
        "take_action": "اتخذ إجراءً",
        "high_retention": "احتفاظ عالٍ",
        "strongest_in": "منصة {{platform}} هي الأقوى في {{region}}",
        "lang_ops": "عمليات اللغة الاستراتيجية",
        "multilingual_insight": "جمهورك <percent>38٪</percent> متعدد اللغات. يمكن أن تؤدي إضافة ترجمات {{lang}} إلى مقاطع {{game}} الخاصة بك إلى تحسين التحويل في {{region}} بنسبة تصل إلى <boost>+22٪</boost>.",
        "top_lang_duo": "أفضل ثنائي لغة",
        "subtitle_pref": "تفضيل الترجمة",
        "score": "النتيجة: {{count}}",
        "best_languages": "إنجليزي/إسباني",
        "focus": "تركيز",
        "top_percent": "أفضل {{count}}٪",
        "region": "المنطقة",
        "top_game": "أفضل لعبة",
        "index": "المؤشر",
        "avg_retention_score": "متوسط درجة الاحتفاظ",
        "virality_pulse_index": "مؤشر نبض الانتشار",
        "format": "التنسيق",
        "score_label": "الدرجة",
        "metric_watchtime": "وقت المشاهدة",
        "layer_names": {
          "views": "المشاهدات",
          "avgPercent": "الاحتفاظ",
          "watchTime": "وقت المشاهدة"
        },
        "peak_labels": {
          "us": "ذروة الجمهور في الولايات المتحدة",
          "brazil": "تفاعل عالٍ في البرازيل",
          "india": "ارتفاع كبير للجمهور في الهند",
          "weekends": "عطلات نهاية الأسبوع"
        },
        "signals": [
          "الميم الأخير الخاص بك رائج في البرازيل.",
          "مقاطع فورتنايت تكتسب زخماً في الفلبين.",
          "تم اكتشاف معدل حفظ مرتفع في ألمانيا لكتيبات الاستراتيجية.",
          "تم اكتشاف تسارع انتشار لـ Carousels في الهند."
        ],
        "formats": {
          "clutch": "مقاطع Clutch",
          "memes": "تعديلات الميمز",
          "ai_packs": "حزم صور الذكاء الاصطناعي",
          "highlights": "أبرز اللقطات الرائجة",
          "fails": "إخفاقات مضحكة",
          "guides": "كتيبات الاستراتيجية"
        },
        "regions": {
          "USA": "الولايات المتحدة",
          "IND": "الهند",
          "BRA": "البرازيل",
          "PHL": "الفلبين",
          "IDN": "إندونيسيا",
          "DEU": "ألمانيا",
          "SEA": "جنوب شرق آسيا",
          "LATAM": "أمريكا اللاتينية"
        },
        "insights": {
          "brazil_valorant": "تؤدي مقاطع Valorant بشكل أفضل بنسبة 42٪ في البرازيل.",
          "sea_memes": "تتم مشاركة محتوى الميم بشكل مكثف في جنوب شرق آسيا.",
          "usa_tutorial": "يحتفظ جمهور الولايات المتحدة لفترة أطول بمقاطع الشرح.",
          "germany_traction": "مقاطعك تكتسب زخماً في ألمانيا.",
          "india_shortform": "يتفاعل جمهور الهند بشكل أكبر مع التعديلات قصيرة المدى.",
          "latam_subtitles": "تعمل الترجمة الإسبانية على تحسين تفاعل أمريكا اللاتينية بنسبة 22٪."
        },
        "strategy_types": {
          "growth": "نمو",
          "viral": "انتشار",
          "retention": "احتفاظ",
          "momentum": "زخم",
          "engagement": "تفاعل",
          "language": "لغة"
        }
      },
      "settings": {
        "title": "الإعدادات",
        "sections": {
          "account": "إعدادات الحساب",
          "notifications": "الإشعارات",
          "billing": "الفواتير",
          "privacy": "الخصوصية",
          "danger": "منطقة الخطر"
        },
        "account": {
          "title": "ملف الحساب",
          "subtitle": "قم بتحديث معلوماتك الشخصية وعنوان بريدك الإلكتروني.",
          "display_name": "اسم العرض",
          "display_name_desc": "اسمك في مجتمع nxclip",
          "email": "عنوان البريد الإلكتروني",
          "email_desc": "يستخدم للإشعارات وتسجيل الدخول",
          "reset_onboarding": "إعادة تعيين التهيئة",
          "restart_guide": "إعادة تشغيل دليل المنشئ",
          "save_changes": "حفظ التغييرات",
          "saving": "جاري الحفظ...",
          "saved_success": "تم حفظ الإعدادات"
        },
        "billing": {
          "title": "الفواتير والاشتراك",
          "subtitle": "إدارة خطتك وعرض سجل الفواتير الخاص بك.",
          "plans": {
            "free": "مجاني للأبد",
            "pro": "منشئ محترف",
            "studio": "استوديو",
            "limited": "منشئ محتوى محدود",
            "professional": "مجموعة إبداعية احترافية",
            "limited_desc": "وصول أساسي إلى أدوات الإنشاء والتحليلات.",
            "professional_desc": "وصول كامل لعمليات إنشاء غير محدودة، مدرب الذكاء الاصطناعي، وتحليلات عميقة."
          },
          "pricing": {
            "free": "0.00$ / شهرياً",
            "pro": "12.00$ / شهرياً",
            "studio": "39.00$ / شهرياً"
          },
          "status": {
            "label": "الحالة",
            "active_basic": "نشط (أساسي)",
            "active_premium": "نشط (مميز)"
          },
          "next_billing": "الفاتورة القادمة",
          "next_renewal": "التجديد القادم",
          "access_until": "الوصول حتى",
          "renews_annually": "يتجدد سنوياً",
          "renews_monthly": "يتجدد شهرياً",
          "interval": {
            "annual": "سنوي",
            "monthly": "شهري"
          },
          "na": "غير متاح",
          "upgrade": "الترقية إلى برو",
          "cancel": "إلغاء الاشتراك",
          "payment_methods": "طرق الدفع",
          "history": "سجل الفواتير",
          "last_12_months": "آخر 12 شهراً",
          "empty_history": "لا يوجد سجل فواتير مدفوع بعد.",
          "invoice_label": "فاتورة #NX-00{{id}}",
          "download_pdf": "تحميل PDF"
        },
        "danger": {
          "title": "منطقة الخطر",
          "subtitle": "إجراءات لا يمكن الرجوع عنها تتعلق بحسابك.",
          "delete_title": "حذف الحساب",
          "delete_desc": "بمجرد حذف حسابك، لن تتمكن من التراجع. سيتم حذف جميع إبداعاتك وتحليلاتك وإعداداتك بشكل دائم من خوادمنا.",
          "delete_button": "حذف حسابي"
        }
      },
      "profile": {
        "title": "ملفي الشخصي",
        "edit_profile": "تعديل الملف الشخصي",
        "complete_your_profile": "أكمل ملفك الشخصي",
        "unlock_features": "افتح ميزات المنشئ الكاملة",
        "progress": "التقدم",
        "boost_visibility": "عزز ظهورك بإضافة:",
        "finish_setup": "إنهاء الإعداد",
        "takes_less_than": "يستغرق أقل من دقيقتين",
        "tabs": {
          "posts": "المنشورة",
          "published": "المنشورة",
          "live": "المنشورات المباشرة",
          "scheduled": "المجدول",
          "plan": "الاستراتيجية",
          "liked": "المعجب بها",
          "saved": "المحفوظة"
        },
        "stats": {
          "posts": "منشورات",
          "followers": "متابعون",
          "following": "متابعة",
          "engagement": "تفاعل",
          "pro_only": "للمحترفين فقط"
        },
        "no_bio": "لا يوجد نبذة شخصية بعد. أضف واحدة لتروي قصتك!",
        "no_niches": "لم يتم إضافة مجالات ألعاب بعد.",
        "niche_not_tagged": "لم يُوسَم التخصص على هذه الخطة — راجعه في مدرب المنشئين.",
        "strategy": {
          "title": "استراتيجية المحتوى لمدة 7 أيام",
          "growth_mode": "وضع النمو",
          "community_mode": "وضع المجتمع",
          "no_plan": "لم يتم العثور على خطة محتوى. أكمل التهيئة لتوليد واحدة!",
          "start_onboarding": "ابدأ التهيئة",
          "onboarding_title": "تفاصيل التهيئة",
          "onboarding_subtitle": "ما أخبرت به مدرب المنشئين — الفئة والتخصصات والإجابات.",
          "legacy_answers_note": "خطتك المحفوظة تتضمن الفئة والتخصصات فقط. راجع عبر مدرب المنشئين لتحديث تخصصك وإعادة الإجابة عن الجمهور والهدف والإيقاع ونقطة البداية — ثم احصل على خطة أسبوع جديدة.",
          "legacy_answers_cta": "راجع التخصص والإجابات",
          "revise_cta": "راجع التخصص والإجابات",
          "fields": {
            "category": "الفئة",
            "niches": "التخصصات",
            "audience": "الجمهور",
            "goal": "الهدف",
            "frequency": "إيقاع النشر",
            "start": "نقطة البداية"
          }
        },
        "actions": {
          "follow": "متابعة",
          "following": "متابع",
          "message": "رسالة",
          "back": "رجوع",
          "view_all": "عرض الكل",
          "recent_creations": "أحدث الإبداعات"
        },
        "missing_fields": {
          "display_name": "اسم العرض",
          "bio": "النبذة الشخصية",
          "games": "مجالات الألعاب",
          "avatar": "صورة الملف الشخصي",
          "socials": "روابط التواصل الاجتماعي",
          "onboarding": "التهيئة"
        },
        "edit": {
          "title": "إعدادات الملف الشخصي",
          "change_photo": "تغيير",
          "photo_label": "صورة الملف الشخصي",
          "error_title": "خطأ في الملف الشخصي",
          "success_title": "نجاح",
          "success_msg": "تم تحديث الملف الشخصي بنجاح! جاري التحويل...",
          "display_name_label": "اسم العرض",
          "display_name_desc": "هذا هو الاسم الذي ستظهر به للمنشئين الآخرين",
          "display_name_placeholder": "اسم العرض الخاص بك",
          "bio_label": "النبذة الشخصية",
          "bio_desc": "وصف قصير لنفسك ولمحتواك",
          "bio_placeholder": "أخبرنا عن رحلتك في الألعاب...",
          "social_links_label": "قنوات التواصل الاجتماعي",
          "social_links_desc": "اربط YouTube أو Instagram أو Facebook أو TikTok للنشر المباشر وسحب الإحصائيات. تسجيل الدخول عبر Google ليس ربطًا لـ YouTube.",
          "connect_btn": "ربط",
          "connected_btn": "متصل",
          "disconnect_btn": "قطع الاتصال",
          "disconnect_title": "قطع اتصال هذه القناة؟",
          "disconnect_confirm": "قطع اتصال {{platform}}؟ ستحتاج إلى ربطها مرة أخرى للنشر المباشر على هذه القناة.",
          "oauth_coming_soon": "OAuth قادم قريبًا",
          "twitch_placeholder": "اسم مستخدم Twitch",
          "youtube_placeholder": "قناة YouTube",
          "instagram_placeholder": "حساب Instagram",
          "twitter_placeholder": "حساب Twitter",
          "tiktok_placeholder": "حساب TikTok",
          "games_label": "تخصصات المحتوى",
          "games_desc": "اختر التخصصات التي تطابق فئات Creator Coach — الألعاب، نمط الحياة، السفر، الطعام، الطبخ، الفخامة الهادئة، المطبخ الراقي، الأزياء، التصميم الداخلي، والمستقبل الرقمي.",
          "no_niches": "لم يتم إضافة تخصصات بعد...",
          "custom_niche_placeholder": "أضف تخصصات مخصصة...",
          "popular_suggestions": "اقتراحات شائعة",
          "save_btn": "حفظ التغييرات",
          "saved_btn": "تم الحفظ!",
          "toast": {
            "success_title": "تم تحديث الملف الشخصي",
            "success_desc": "تم حفظ تغييراتك بنجاح.",
            "error_title": "فشل التحديث",
            "error_desc": "خطأ في الاتساق أثناء مزامنة الملف الشخصي. يرجى المحاولة مرة أخرى.",
            "generic_error": "فشل حفظ التغييرات. يرجى المحاولة مرة أخرى."
          }
        },
        "plans": {
          "pro": "منشئ محترف",
          "studio": "استوديو",
          "free": "مجاني"
        },
        "user_bio": "لاعب ومخطط CS2 محترف. أشارك أفضل لقطاتي وتحليلاتي التكتيكية يوميًا. 🔫🔥",
        "demo_stats": {
          "posts": "124",
          "followers": "8.2ألف",
          "following": "245"
        }
      },
      "admin": {
        "header": {
          "title": "مركز قيادة المشرف",
          "subtitle": "إدارة المستخدمين المسجلين وأذونات النظام",
          "stats_label": "صفوف النظام",
          "stats_unit": "عقد"
        },
        "table": {
          "search_placeholder": "البحث حسب البريد الإلكتروني...",
          "empty_title": "لم يتم العور على مستخدمين",
          "empty_desc": "حاول ضبط البحث أو الفلاتر",
          "columns": {
            "user": "المستخدم",
            "role": "الدور",
            "plan": "الخطة",
            "onboarding": "التهيئة",
            "joined": "تاريخ الانضمام",
            "actions": "الإجراءات"
          },
          "status": {
            "completed": "مكتمل",
            "pending": "قيد الانتظار",
            "unknown": "غير معروف"
          },
          "roles": {
            "admin": "مشرف",
            "creator": "منشئ",
            "user": "مستخدم"
          }
        },
        "status": {
          "anonymous": "مجهول"
        },
        "notifications": {
          "role_updated": "تم تحديث الدور",
          "role_updated_desc": "تم تحديث الدور بنجاح إلى {{role}}.",
          "plan_updated": "تم تحديث الخطة",
          "plan_updated_desc": "المستخدم الآن في خطة {{plan}}.",
          "user_deleted": "تم إنهاء المستخدم",
          "user_deleted_desc": "تمت إزالة الحساب بنجاح.",
          "update_failed": "فشل التحديث",
          "update_failed_desc": "تعذر تحديث دور المستخدم.",
          "plan_update_failed_desc": "تعذر تحديث خطة المستخدم.",
          "delete_failed": "فشلت العملية",
          "delete_failed_desc": "تعذر حذف حساب المستخدم."
        },
        "dialog": {
          "title": "إدخال الأمر: {{name}}",
          "desc": "ملف تعريف المستخدم الشامل وأدوات الإدارة لمشرفي NexaClip.",
          "tabs": {
            "overview": "نظرة عامة",
            "profile": "الملف الشخصي",
            "management": "الإدارة"
          },
          "overview": {
            "current_role": "الدور الحالي",
            "role_desc": "مستوى الأذونات على مستوى النظام",
            "active_plan": "الخطة النشطة",
            "plan_desc": "مستويات الاشتراك والحصص",
            "activity_title": "سجل النشاط"
          },
          "activity": {
            "gen_image": "توليد صورة بالذكاء الاصطناعي",
            "update_bio": "تحديث النبذة الشخصية",
            "login": "تسجيل الدخول"
          },
          "profile": {
            "bio_title": "بيانات المستخدم / النبذة",
            "no_bio": "لم يقدم المستخدم أي نبذة شخصية.",
            "niches_title": "التخصصات الرئيسية",
            "no_niches": "لم يتم تحديد تخصصات.",
            "games_title": "الألعاب الأساسية",
            "no_games": "لم يتم إدراج ألعاب."
          },
          "management": {
            "role_title": "تجاوز الأذونات",
            "plan_title": "تخصيص الخطة (المصفوفة)",
            "delete_title": "بروتوكول الأمان: الحذف",
            "delete_warning": "سيؤدي تنفيذ هذا الأمر إلى حذف جميع بيانات العقدة المرتبطة بـ {{name}} نهائياً.",
            "confirm_btn": "تأكيد المسح",
            "abort_btn": "إلغاء",
            "delete_btn": "إنهاء دفق البيانات (حذف)"
          },
          "exit_btn": "الخروج من الإدارة",
          "joined": "انضم في {{date}}",
          "onboarded": "تمت التهيئة",
          "pending_onboarding": "في انتظار التهيئة"
        }
      },
      "coach": {
        "title": "مدرب المنشئين",
        "badge": "مدعوم بالذكاء الاصطناعي",
        "untitled_chat": "دردشة بدون عنوان",
        "creator_dna": "حمض المنشئ النووي",
        "dna_desc": "قم بتهيئة هويتك وأهدافك",
        "identity": "الهوية",
        "creator_name": "اسم المنشئ / المقبض",
        "creator_name_placeholder": "مثلاً: Ninja, Pokimane...",
        "focus": "التركيز",
        "games_you_play": "الألعاب التي تلعبها",
        "games_placeholder": "مثلاً: Valorant, Minecraft",
        "games_hint": "افصل بين الألعاب بفواصل.",
        "audience_goals": "الجمهور والأهداف",
        "target_audience": "الجمهور المستهدف",
        "audience_placeholder": "من تستهدف؟",
        "audiences": {
          "competitive": "لاعبو الألعاب التنافسية المحترفون",
          "casual": "مشاهدو الألعاب العادية / المتنوعة",
          "gen_z": "الجيل Z / عشاق الفيديوهات القصيرة",
          "technical": "المحللون التقنيون",
          "funny": "عشاق اللحظات المضحكة / الفشل"
        },
        "main_goal": "هدفك الأساسي للمحتوى",
        "goal_placeholder": "ما هي أولويتك؟",
        "goals": {
          "viral": "نمو فيروسي خالص (الوصول)",
          "community": "بناء مجتمع مخلص",
          "brand": "تأمين صفقات العلامات التجارية/الرعاة",
          "skill": "عرض مهارات اللعب النخبوية",
          "full_time": "أن تصبح منشئ محتوى بدوام كامل"
        },
        "consistency": "الاستمرارية",
        "posting_frequency": "تكرار النشر",
        "frequency_placeholder": "كم مرة تنشر؟",
        "frequencies": {
          "daily": "رفع يومي / بث مباشر",
          "multi_weekly": "3-4 مرات في الأسبوع",
          "weekly": "استمرارية أسبوعية",
          "bi_weekly": "كل أسبوعين",
          "monthly": "إنتاج ضخم شهرياً"
        },
        "save_changes": "حفظ بيانات المنشئ",
        "questions_left": "متبقي {{count}} أسئلة اليوم",
        "unlimited": "أسئلة غير محدودة",
        "upgrade_promo": "قم بالترقية للحصول على تدريب غير محدود بالذكاء الاصطناعي",
        "upgrade_btn": "الترقية إلى برو",
        "input_placeholder": "اسأل مدربك شيئاً...",
        "send_aria": "إرسال الرسالة",
        "chat_welcome": "مرحباً! أنا مدرب المنشئين الخاص بك في nxclip.app. أنا مستعد لمساعدتك على النمو. ما الذي يدور في ذهنك؟",
        "error_connectivity": "مشكلة في الاتصال",
        "error_generic": "واجهت خطأ أثناء محاولة الاتصال بالشبكة العصبية.",
        "no_history": "لا يوجد سجل محادثات بعد.",
        "delete_confirm": "حذف الدردشة؟",
        "categories": {
          "viral": "انتشار",
          "growth": "نمو",
          "analytics": "تحليلات",
          "mastery": "إتقان"
        },
        "onboarding": {
          "incomplete": "بيانات المنشئ الخاصة بك غير مكتملة. قم بإعدادها للحصول على نصائح أفضل!",
          "setup_btn": "الإعداد الآن",
          "title": "هل أنت جاهز للتحسين؟",
          "desc": "قم بتحسين محرك الانتشار الخاص بك. اختر مجال تركيز أدناه للحصول على نصيحة تكتيكية من الخبراء حول تنمية قناتك.",
          "dna_required": "محاذاة الحمض النووي (DNA) مطلوبة",
          "dna_required_desc": "لتقديم تكتيكات نمو دقيقة، أحتاج إلى الحمض النووي الخاص بك كمنشئ. حدد مجالك لفتح التدريب الشخصي.",
          "initialize_btn": "بدء الحمض النووي",
          "shuffled_refresher": "تحديث الأفكار"
        },
        "history": {
          "new_chat_title": "محادثة جديدة",
          "welcome_msg": "مرحباً! أنا مدرب المنشئين الخاص بك في nxclip.app. أنا مستعد لمساعدتك على النمو. ما الذي يدور في ذهنك؟"
        },
        "errors": {
          "processing": "عذراً، أواجه مشكلة في معالجة طلبك حالياً. يرجى المحاولة مرة أخرى لاحقاً.",
          "connectivity": "واجهت خطأ أثناء محاولة الاتصال بالشبكة العصبية: {{error}}"
        },
        "sidebar": {
          "history": "السجل",
          "chat_history": "سجل المحادثات",
          "new_chat": "دردشة جديدة",
          "new_conversation": "محادثة جديدة",
          "loading_archive": "جاري تحميل الأرشيف",
          "no_conversations": "لم يتم العثور على محادثات",
          "untitled": "محادثة بدون عنوان",
          "archived": "مؤرشف",
          "queries_left": "بقي {{count}} استفسارات",
          "unlimited": "ذكاء اصطناعي غير محدود",
          "limit_reached": "تم الوصول للحد",
          "station": "محطة الوصول للمدرب"
        },
        "header": {
          "title": "مدرب المنشئين",
          "beta": "تجريبي",
          "neural_link": "الارتباط العصبي مستقر",
          "latency": "تأخير الاستجابة",
          "latency_value": "1.2 مللي ثانية",
          "snapshot_tooltip": "نسخة من المحادثة",
          "dna_tooltip": "ملف المنشئ (DNA)",
          "new_hub": "مركز جديد"
        },
        "chat": {
          "evaluated_tokens": "تم التقييم عند 1024 ألف توكن",
          "copy_intel": "نسخ المعلومات",
          "copied": "تم النسخ إلى الارتباط العصبي",
          "creator_access": "وصول المنشئ",
          "coach_response": "استجابة المدرب",
          "scroll_to_hub": "الرجوع للمركز"
        },
        "input": {
          "limit_title": "تم الوصول إلى حد إرسال المدرب",
          "limit_desc": "لقد استنفدت استفسارات التدريب المجانية. المنشئون المحترفون يستخدمون النسخة الاحترافية للحصول على معلومات نمو غير محدودة.",
          "upgrade_btn": "الترقية للوصول الاحترافي",
          "placeholder": "إرسال طلب تدريب...",
          "attach_tooltip": "إرفاق سياق",
          "llm": "النموذج: جمناي 3 فلاش",
          "context_window": "السياق: 1.2 مليون توكن",
          "shortcuts": "رابط عصبي • Shift+Enter لسطر جديد"
        },
        "dna": {
          "title": "حمض المنشئ (DNA)",
          "sections": {
            "identity": "الهوية",
            "focus": "التركيز",
            "audience_goals": "الجمهور والأهداف",
            "consistency": "الاستمرارية"
          },
          "labels": {
            "handle": "اسم/معرف المنشئ",
            "games": "الألعاب التي تلعبها",
            "audience": "الجمهور المستهدف",
            "goal": "هدف المحتوى الأساسي",
            "frequency": "وتيرة النشر"
          },
          "placeholders": {
            "handle": "مثلاً: Ninja أو اسمك في الألعاب",
            "games": "مثلاً: Valorant, Minecraft, GTA V",
            "audience": "من تستهدف؟",
            "goal": "ما هي أولويتك؟",
            "frequency": "كم مرة تنشر؟"
          },
          "help": {
            "games": "افصل بين الألعاب بفواصل.",
            "recalibrate": "هذا يعيد معايرة مدرب الذكاء الاصطناعي"
          },
          "save_btn": "حفظ حمض المنشئ (DNA)"
        },
        "options": {
          "audience": {
            "competitive": "لاعبو الألعاب التنافسية",
            "casual": "مشاهدو الألعاب المنوعة/العادية",
            "genz": "عشاق فيديوهات Gen Z والقصيرة",
            "technical": "المحللون التقنيون",
            "funny": "اللقطات المضحكة والفاشلة"
          },
          "goals": {
            "viral": "الانتشار الفيروسي الخالص (الوصول)",
            "community": "بناء مجتمع مخلص",
            "brand": "تأمين صفقات العلامات التجارية/الرعاة",
            "skill": "عرض مهارات اللعب النخبوية",
            "fulltime": "أن أصبح منشئ محتوى بدوام كامل"
          },
          "frequency": {
            "daily": "نشر/بث يومي",
            "multi_weekly": "3-4 مرات في الأسبوع",
            "weekly": "نشر أسبوعي ثابت",
            "bi_weekly": "كل أسبوعين",
            "monthly": "نشر شهري عالي الإنتاج"
          }
        },
        "prompts": {
          "viral": [
            "خطافات فيروسية لمقاطع ألعاب تيك توك؟",
            "كيف تظهر في تغذية فيديوهات YouTube Shorts؟",
            "ترندات ألعاب Instagram Reels لهذا الأسبوع؟",
            "كيف تصنع مقدمة يوتيوب سينمائية؟",
            "أفضل إعدادات الذكاء الاصطناعي للصور المصغرة للألعاب؟"
          ],
          "growth": [
            "كيف يمكن لـ Image Studio تحسين نسبة النقر إلى الظهور (CTR)؟",
            "استراتيجيات الاحتفاظ بالمشاهدين باستمرار؟",
            "بناء مجتمع ألعاب باستخدام nxclip؟",
            "كيفية تحويل مشاهدي الفيديوهات القصيرة إلى فيديوهات طويلة؟",
            "استخدام ميمات nxclip للنمو على إنستغرام؟"
          ],
          "analytics": [
            "تحليل نسبة النقر إلى الظهور (CTR) والاحتفاظ بالمشاهدين في قناتي؟",
            "ما هي معدلات الإكمال الجيدة في تيك توك؟",
            "رؤى إنستغرام: ما هي المقاييس المهمة؟",
            "كيفية استخدام بيانات nxclip لتحسين المشاهدات؟",
            "أفضل وقت لنشر محتوى الألعاب على إنستغرام؟"
          ],
          "mastery": [
            "كيفية تحسين سير عمل nxclip الخاص بي؟",
            "تلقين متقدم لصور الألعاب؟",
            "استخدام المقاطع بفعالية لعروض القناة التشويقية؟",
            "كيفية التحرير بشكل أسرع باستخدام أدوات nxclip؟",
            "أفضل إعدادات التصدير للفيديوهات الطولية عالية الجودة؟"
          ]
        }
      },
      "image_studio": {
        "seo_title": "استوديو الصور والميمات بالذكاء الاصطناعي | NexaClip.ai",
        "seo_description": "قم بإنشاء صور ألعاب مذهلة وميمات فيروسية باستخدام استوديو الصور المتقدم لدينا. مدعوم بذكاء Gemini للمنشئين المحترفين.",
        "tabs": {
          "generate": "توليد",
          "canvas": "اللوحة",
          "edit": "تعديل"
        },
        "config": {
          "title": "الإعدادات",
          "mode_label": "وضع الاستوديو",
          "mode_tooltip": "بدل بين توليد صور الذكاء الاصطناعي القياسية أو إنشاء الميمات المحسن مع تراكبات النص.",
          "model_label": "نموذج الذكاء الاصطناعي",
          "model_tooltip": "اختر المحرك الذي يدعم عملية التوليد. Flash أسرع، بينما Pro يوفر دقة إبداعية أعلى.",
          "model_placeholder": "اختر النموذج"
        },
        "title_input": {
          "label": "عنوان المقطع",
          "placeholder": "أعطِ إبداعك اسماً...",
          "ai_suggest": "اقتراح AI",
          "tooltip": "توليد عنوان جذاب بناءً على مطالبك."
        },
        "prompt": {
          "label": "المطالبة",
          "placeholder": "صف مشهد اللعب أو فكرة الميم الخاصة بك...",
          "clear": "مسح المطالبة",
          "refine": "تحسين المطالبة",
          "refine_desc": "ركز على تفاصيل رؤيتك.",
          "limit_reached": "لا توجد عمليات توليد متبقية اليوم. قم بترقية خطتك للمزيد!",
          "suggested": "مقترح لـ {{style}}",
          "apply": "تطبيق التغييرات"
        },
        "generations_left": {
          "label": "عمليات التوليد المتبقية",
          "upgrade": "ترقية لعمليات توليد غير محدودة"
        },
        "recent_prompts": {
          "label": "المطالبات الأخيرة",
          "tooltip": "مسح السجل"
        },
        "caption_studio": {
          "title": "استوديو التسميات",
          "description": "أضف تسميات توضيحية مولدة بالذكاء الاصطناعي لإبداعك",
          "ai_generate": "توليد AI",
          "placeholder": "تسمية وسائط اجتماعية...",
          "ai_suggestions_label": "اقتراحات AI",
          "tooltip": "يستخدم رؤية Gemini لتحليل صورتك وصياغة تسميات توضيحية محسنة للمشاركة على وسائل التواصل الاجتماعي."
        },
        "meme": {
          "top_text": "النص العلوي",
          "top_placeholder": "أدخل النص العلوي",
          "bottom_text": "النص السفلي",
          "bottom_placeholder": "أدخل النص السفلي",
          "style_label": "نمط التسمية",
          "style_tooltip": "اختر الخط لتسميات الميم الخاصة بك.",
          "styles": {
            "impact": "Impact",
            "modern": "Modern Sans",
            "classic": "Classic Serif"
          }
        },
        "aspect_ratio": {
          "title": "نسبة العرض إلى الارتفاع",
          "presets": {
            "square": "مربع",
            "widescreen": "شاشة عريضة",
            "social": "قصة اجتماعية",
            "portrait": "بورتريه",
            "classic": "كلاسيكي",
            "ultrawide_p": "شاشة عريضة جداً (طولي)",
            "ultrawide_l": "شاشة عريضة جداً (عرضي)"
          }
        },
        "style_presets": {
          "title": "الإعدادات المسبقة للنمط",
          "tooltip": "تطبيق نمط {{label}} لتوجيه الاتجاه الفني للذكاء الاصطناعي.",
          "realistic": "واقعي",
          "cinematic": "سينمائي",
          "cartoon": "كرتون",
          "thumbnail": "مصغرة",
          "meme": "نمط ميم"
        },
        "advanced": {
          "title": "إعدادات متقدمة",
          "creativity": "الإبداع",
          "creativity_tooltip": "القيم الأعلى تمنح الذكاء الاصطناعي حرية فنية أكبر. القيم الأقل تلتزم بمطالبك الحرفية.",
          "lighting": "الإضاءة / النغمة",
          "lighting_tooltip": "يطبق ملفات إضاءة سينمائية محددة على عملية التوليد.",
          "lighting_options": {
            "natural": "طبيعي",
            "neon": "نيون / سايبربانك",
            "golden": "ساعة ذهبية",
            "dramatic": "درامي نوير"
          },
          "negative": "المطالبة السلبية",
          "negative_tooltip": "قائمة العناصر التي تُريد تجنبها صراحة في الصورة (مثلاً: \"ضبابي، أيدي مشوهة، نص\").",
          "negative_placeholder": "تجنب: ضبابي، دقة منخفضة..."
        },
        "history": {
          "title": "عمليات التوليد الأخيرة",
          "subtitle": "إرثك الإبداعي",
          "items_count_one": "{{count}} عنصر",
          "items_count_other": "{{count}} عناصر",
          "saved_desc": "يتم حفظ آخر {{count}} عمليات توليد محلياً.",
          "clear_all": "مسح الكل",
          "no_generations": "لا توجد عمليات توليد بعد",
          "studio_history": "سجل الاستوديو",
          "start_creating": "ابدأ الإنشاء أعلاه لبناء سجلك.",
          "reuse": "إعادة استخدام المطالبة",
          "download": "تحميل",
          "untitled": "إبداع بدون عنوان",
          "clear_confirm_title": "مسح السجل؟",
          "clear_confirm_desc": "سيؤدي هذا إلى حذف سجل التوليد المحلي نهائياً. لا يمكن التراجع عن هذا الإجراء.",
          "clear_everything": "مسح كل شيء"
        },
        "canvas": {
          "quick_adjust": "تعديل سريع",
          "reset": "إعادة تعيين",
          "brightness": "السطوع",
          "contrast": "التباين",
          "saturation": "التشبع",
          "ready_to_create": "مستعد للإنشاء؟",
          "ready_desc": "أدخل مطالبة لتوليد صور ألعاب عالية الجودة، أو صور مصغرة، أو ميمات باستخدام محرك الذكاء الاصطناعي المتقدم لدينا.",
          "generating": "جاري التوليد...",
          "crafting": "يقوم الذكاء الاصطناعي بصياغة رؤيتك",
          "failed": "فشل التوليد",
          "try_again": "حاول مرة أخرى"
        },
        "edit": {
          "tabs": {
            "adjust": "ضبط",
            "text": "نص",
            "layers": "طبقات"
          },
          "adjustments": "التعديلات",
          "brightness_tooltip": "ضبط مستويات الإضاءة العامة للصورة.",
          "contrast_tooltip": "ضبط الفرق بين المناطق الفاتحة والمظلمة.",
          "saturation_tooltip": "ضبط كثافة وحيوية الألوان.",
          "quick_actions": "إجراءات سريعة",
          "upscale": "توسيع النطاق",
          "upscale_tooltip": "يستخدم الذكاء الاصطناعي لمضاعفة الدقة وتوضيح التفاصيل دون فقدان الجودة.",
          "bg_remove": "إزالة الخلفية",
          "bg_remove_tooltip": "تقسيم الموضوع فوراً وإزالة الخلفية لتصدير PNG.",
          "processing": "جاري المعالجة...",
          "removing": "جاري الإزالة...",
          "add_text": "إضافة طبقة نص",
          "text_layers": "طبقات النص",
          "font_placeholder": "أدخل النص...",
          "presets": "الإعدادات المسبقة",
          "preset_labels": {
            "gaming_meme": "محرر ميمات الألعاب",
            "stream_alert": "تنبيه البث",
            "thumbnail_title": "عنوان الصورة المصغرة"
          },
          "background_layer": "الخلفية",
          "ai_generation": "توليد AI",
          "empty_layer": "فارغ",
          "view_history": "عرض السجل"
        },
        "buttons": {
          "generate": "توليد",
          "generating": "جاري التوليد...",
          "regenerate": "إعادة توليد",
          "save_library": "حفظ في المكتبة"
        }
      },
      "content_library": {
        "title": "مكتبة المحتوى",
        "search_placeholder": "ابحث في المحتوى الخاص بك...",
        "columns": {
          "content": "المحتوى",
          "type": "النوع",
          "status": "الحالة",
          "stats": "الإحصائيات",
          "date": "التاريخ",
          "actions": "الإجراءات"
        },
        "types": {
          "clip": "مقطع",
          "image": "صورة",
          "clips": "مقاطع",
          "images": "صور"
        },
        "status": {
          "published": "تم النشر",
          "publishing": "جاري النشر",
          "processing": "جاري المعالجة",
          "draft": "مسودة",
          "moderation_rejected": "مرفوض من الإشراف",
          "rejected": "مرفوض",
          "generation_failed": "فشل التوليد",
          "failed": "فشل",
          "deleted": "محذوف"
        },
        "actions": {
          "view_details": "عرض التفاصيل",
          "download": "تحميل",
          "delete": "حذف"
        },
        "empty_state": {
          "title": "مكتبتك فارغة",
          "desc": "ابدأ رحلتك بإنشاء مقاطع ألعاب عالية الجودة أو صور مولدة بالذكاء الاصطناعي. ستظهر إبداعاتك هنا.",
          "cta": "أنشئ أول عمل لك"
        }
      },
      "buttons": {
        "generate": "توليد",
        "generating": "جاري التوليد...",
        "regenerate": "إعادة توليد",
        "save_library": "حفظ في المكتبة"
      },
      "clip_editor": {
        "header": {
          "subtitle": "قم بتحميل وتحرير المقاطع القصيرة."
        },
        "steps": {
          "upload": "رفع",
          "trim": "قص",
          "polish": "تحسين ونشر"
        },
        "player": {
          "live_preview": "معاينة مباشرة",
          "play": "تشغيل الفيديو",
          "pause": "إيقاف الفيديو مؤقتاً",
          "unmute": "إلغاء كتم الصوت",
          "mute": "كتم الصوت",
          "adjust_volume": "ضبط مستوى الصوت",
          "playback_time": "وقت التشغيل",
          "reset_trim": "إعادة تعيين القص",
          "fullscreen": "ملء الشاشة",
          "total": "الإجمالي"
        },
        "trim": {
          "calculating": "جاري حساب القص الذكي...",
          "scanning": "جاري المسح بالذكاء الاصطناعي...",
          "action_moments": "جاري إيجاد أقوى اللحظات للاحتفاظ بها",
          "analyzing_cues": "قراءة المقطع للافتتاح والذروة والخاتمة",
          "timeline_trimmer": "أداة قص الجدول الزمني",
          "ai_scan": "مسح الذكاء الاصطناعي",
          "ai_scan_tooltip": "يجد أقوى اللحظات في مقطعك (افتتاح، ذروة، خاتمة) ويعلّمها على الخط الزمني لتقص حولها.",
          "ai_scan_tooltip_niche": "يجد أقوى اللحظات في مقطع {{category}} ويعلّمها على الخط الزمني لتقص حولها.",
          "scan_found": "تم تعليم {{count}} لحظات على الخط الزمني",
          "scan_found_hint": "الافتتاح = البداية، الذروة = احتفظ بها، الخاتمة = النهاية. المقابض تلتصق بهذه العلامات.",
          "scan_fallback": "وُضعت علامات عامة على هذا المقطع لتتمكن من القص.",
          "scan_results": "لحظات بارزة",
          "scan_help": "هذه العلامات هي قصة المقطع: ابدأ من الافتتاح، احتفظ بالذروة، واقطع بعد الخاتمة. اضغط لحظة للانتقال إليها.",
          "scan_empty": "فحص الذكاء الاصطناعي يضع الافتتاح والذروة والخاتمة لتعرف ماذا تبقي — ولا يقص المقطع تلقائياً.",
          "trim_to_beats": "قص إلى هذه اللحظات",
          "trim_to_beats_done": "تم ضبط نطاق الاحتفاظ من الافتتاح إلى الخاتمة",
          "marker_roles": {
            "hook": "ابدأ هنا — أول لحظة توقف التمرير",
            "build": "احتفظ بهذا الصعود",
            "peak": "احمِ هذه الذروة",
            "close": "أنهِ هنا",
            "clutch": "احمِ هذه اللحظة الحاسمة",
            "win": "أنهِ على الفوز",
            "kill": "احمِ هذه الضربة",
            "victory": "أنهِ على الانتصار",
            "prep": "احتفظ بالتحضير",
            "plating": "احمِ لحظة التقديم",
            "taste": "أنهِ على رد الفعل",
            "arrival": "ابدأ بالوصول",
            "vista": "احمِ المنظر",
            "moment": "احتفظ بهذه اللحظة",
            "effort": "احتفظ بالعمل",
            "finish": "أنهِ على الختام",
            "point": "احتفظ بالنقطة الأساسية",
            "punchline": "احمِ خاتمة الكلام",
            "look": "احتفظ بالإطلالة",
            "detail": "احمِ التفصيل"
          },
          "ai_smart_trim": "قص ذكي بالذكاء الاصطناعي",
          "ai_smart_trim_tooltip": "يقترح تلقائياً نقاط البداية والنهاية المثالية بناءً على مقاييس التفاعل القصوى والإشارات البصرية.",
          "precision_trim": "قص دقيق",
          "zoom": "تكبير",
          "apply_continue": "تطبيق القص والمتابعة",
          "markers": {
            "action_start": "افتتاح",
            "kill": "ذروة",
            "clutch": "لحظة حاسمة",
            "victory": "خاتمة",
            "hook": "افتتاح",
            "build": "بناء",
            "peak": "ذروة",
            "close": "خاتمة",
            "win": "فوز",
            "prep": "تحضير",
            "plating": "تقديم",
            "taste": "تذوق",
            "arrival": "وصول",
            "vista": "منظر",
            "moment": "لحظة",
            "effort": "جهد",
            "finish": "ختام",
            "point": "نقطة",
            "punchline": "خاتمة الكلام",
            "look": "إطلالة",
            "detail": "تفصيل"
          },
          "ai_suggestion": "اقتراح الذكاء الاصطناعي",
          "apply_ai_trim": "تطبيق القص الذكي",
          "trim_help": "اسحب المقابض لاختيار الجزء الذي تريد الاحتفاظ به من المقطع.",
          "keep_from": "الاحتفاظ من",
          "keep_to": "الاحتفاظ إلى",
          "clip_length": "المدة"
        },
        "polish": {
          "editor": "المحرر",
          "polishing": "جاري التحسين",
          "ai_enhanced_preview": "معاينة محسنة بالذكاء الاصطناعي",
          "insane_clutch": "لقطة جنونية!",
          "tabs": {
            "details": "التفاصيل",
            "meme": "التعليقات",
            "captions": "التعليقات",
            "audio": "الصوت",
            "enhance": "تحسين"
          },
          "details": {
            "title": "تفاصيل المقطع",
            "duration": "المدة",
            "change": "تغيير",
            "context_label": "سياق الكتابة بالذكاء الاصطناعي",
            "context_placeholder": "مثال: لقطة 1 ضد 5 ملحمية في Valorant...",
            "context_help": "هذا يساعد الذكاء الاصطناعي على إنشاء عناوين وتعليقات توضيحية أفضل.",
            "clip_title": "عنوان المقطع",
            "ai_suggest": "اقتراح الذكاء الاصطناعي",
            "title_tooltip": "يستخدم ذكاء Gemini لإنشاء عناوين جذابة تزيد من نسبة النقر بناءً على المحتوى البصري وسياق المقطع.",
            "title_placeholder": "أدخل عنواناً جذاباً...",
            "caption": "التعليق",
            "ai_generate": "إنشاء بالذكاء الاصطناعي",
            "caption_tooltip": "يصيغ تعليقات متعددة جاهزة لمنصات التواصل الاجتماعي مع الوسوم المناسبة ودعوات اتخاذ إجراء.",
            "caption_placeholder": "أضف تعليقاً لمنشورك...",
            "ai_suggestions_label": "اقتراحات الذكاء الاصطناعي",
            "hashtags": "الوسوم",
            "hashtags_placeholder": "أضف #وسم واضغط Enter",
            "generate_hooks": "إنشاء خطافات",
            "viral_hooks": "خطافات فيروسية",
            "cut_silence": "قص الصمت (الهواء الميت)"
          },
          "meme": {
            "title": "التعليقات / الطبقات",
            "beta": "تجريبي",
            "top_text": "النص العلوي",
            "top_placeholder": "أدخل النص العلوي",
            "bottom_text": "النص السفلي",
            "bottom_placeholder": "أدخل النص السفلي",
            "drag_hint": "اسحب النص العلوي والسفلي على المعاينة لوضعهما. التحميل/التصدير يحرق نفس المواضع.",
            "caption_style": "نمط التعليق",
            "caption_font": "خط التعليق",
            "pro_tip": "نصيحة احترافية",
            "tip_content": "نصوص الميمات تعمل بشكل أفضل مع التعليقات القصيرة والقوية. استخدم 'Impact' للحصول على هذا المظهر الشائع الكلاسيكي!",
            "styles": {
              "kinetic": "حركي (هورموزي)",
              "clean": "ترجمة نظيفة",
              "impact_meme": "إمباكت ميم",
              "impact": "إمباكت (كلاسيكي)",
              "modern": "سانس حديث",
              "classic": "سيريف كلاسيكي",
              "neon": "وهج النيون"
            }
          },
          "audio": {
            "title": "مازج الصوت",
            "master_mix": "المزيج الرئيسي",
            "final_output": "المخرج النهائي",
            "original_clip": "المقطع الأصلي",
            "bg_music": "موسيقى خلفية",
            "sound_library": "مكتبة الأصوات",
            "previews": "معاينة 15 ثانية",
            "play_mix": "تشغيل المقطع ومزيج الموسيقى",
            "mix_hint": "اضغط تشغيل على المعاينة لسماع صوت المقطع الأصلي والموسيقى المختارة معاً. المزيج الرئيسي يضبط الاثنين.",
            "animate_no_source": "المقاطع المتحركة غالباً بلا صوت أصلي — ارفع الموسيقى أو أبقِ هذا منخفضاً."
          },
          "enhance": {
            "title": "تحسينات الذكاء الاصطناعي",
            "beta": "تجريبي",
            "preview_now": "معاينة مباشرة",
            "live_preview": "معاينة مباشرة",
            "preview_hint": "شاهد معاينة 9:16. شغّل المقطع، فعّل تقليل الضوضاء، اسحب اللون، ثم قارن مع الأصل.",
            "compare_original": "مقارنة مع الأصل",
            "comparing": "عرض الأصل",
            "color_pct": "لون {{pct}}٪",
            "noise_on": "تم تقليل الضوضاء",
            "audio_polish": "تحسين الصوت",
            "audio_polish_hint": "يقطع الهمهمة والصفير ويرفع الصوت. شغّل، بدّل هذا، ثم قارن مع الأصل.",
            "noise_reduction": "تقليل ضوضاء الخلفية",
            "voice_isolation": "عزل الصوت",
            "noise_reduction_desc": "يعزل الصوت تلقائياً ويزيل همهمة الخلفية ونقرات لوحة المفاتيح وضوضاء المروحة.",
            "noise_reduction_tooltip": "تمرير عالي وقطع صفير ورفع للصوت على مزيج المقطع. شغّل المعاينة لتسمعه.",
            "visual_polish": "تحسين بصري",
            "visual_polish_hint": "اسحب نحو حيوي — التشبع والتباين يتحدثان على معاينة 9:16 فوراً.",
            "auto_applied": "تم التطبيق تلقائياً",
            "auto_correct": "تصحيح تلقائي",
            "auto_correct_tooltip": "يوازن فوراً مستويات التعرض والتباين والتشبع وفقاً للمعايير الاحترافية باستخدام تحليل الذكاء الاصطناعي.",
            "smart_color": "تصحيح الألوان الذكي",
            "natural": "طبيعي",
            "vibrant": "حيوي",
            "transitions_title": "اقتراحات الانتقالات بالذكاء الاصطناعي",
            "transition": "انتقال",
            "analyze_clip": "تحليل المقطع",
            "transitions_tooltip": "يجد أفضل اللحظات للانتقالات السينمائية ويقترح المؤثرات البصرية والمؤثرات الصوتية المناسبة.",
            "no_transitions": "لا توجد اقتراحات انتقالات بعد. اسمح للذكاء الاصطناعي بتحليل مقطعك للحصول على أفضل تدفق.",
            "coach_title": "مدرب المنشئ",
            "coach_tip": "إضافة انتقال '{{type}}' عند {{time}} تؤكد اللحظة الأقوى في هذا المقطع الذي مدته {{duration}}.",
            "coach_tip_empty": "مدة هذا المقطع {{duration}}. اضغط تحليل المقطع لاقتراحات انتقال داخل هذه المدة.",
            "coach_tip_pick": "إضافة انتقال '{{type}}' عند {{time}} تؤكد اللحظة الأقوى في هذا المقطع الذي مدته {{duration}}.",
            "apply_btn": "تطبيق",
            "applied_btn": "إعادة",
            "transition_preview": "معاينة {{type}} عند {{time}}",
            "transition_preview_note": "المعاينة تظهر على مشغل 9:16. الحرق في التصدير قادم لاحقاً."
          },
          "publish_preview": {
            "title": "مراجعة المنشور",
            "subtitle": "هذا ما سيظهر على خلاصتك والشبكات المحددة.",
            "no_preview": "لا توجد معاينة",
            "hook": "خطاف",
            "feed_only": "خلاصة NxClip فقط — لم يتم اختيار حسابات اجتماعية.",
            "confirm": "انشر الآن",
            "publishing": "جاري النشر..."
          },
          "actions": {
            "publish": "نشر المقطع",
            "download": "تحميل HD (.mp4)",
            "publish_socials": "النشر على الخلاصة",
          }
        },
        "overlays": {
          "review_title": "مراجعة الاختيار",
          "review_desc": "تشغيل نطاق الاحتفاظ {{duration}} مرة واحدة، ثم نسخ الصوت وكتابة التعليقات فعلياً.",
          "cancel": "إلغاء",
          "skip_polish": "متابعة إلى تحسين الذكاء الاصطناعي",
          "polishing_title": "جاري تحسين مقطعك",
          "polishing_desc": "حفظ القص ثم تشغيل النسخ والتعليقات والمؤثرات على هذا المقطع.",
          "steps": {
            "transcribing": "جاري نسخ الصوت (Whisper)",
            "transcribing_sub": "إرسال المقطع إلى تحويل الكلام إلى نص…",
            "transcribing_queued": "تم وضع تحويل الكلام في قائمة الانتظار…",
            "transcribing_wait": "الاستماع للكلمات… {{attempt}}/{{attempts}}",
            "transcribing_done": "النص جاهز",
            "transcribing_empty": "لم يُكتشف كلام — المتابعة",
            "transcribing_slow": "لا يزال قيد المعالجة — يمكنك النسخ لاحقاً من التعليقات",
            "transcribing_fail": "تم تخطي النسخ",
            "generating_captions": "جاري إنشاء التعليقات",
            "generating_captions_sub": "كتابة تعليق المنشور والوسوم…",
            "captions_done": "تم إعداد التعليق والوسوم",
            "suggesting_effects": "اقتراح الخطافات والانتقالات",
            "suggesting_effects_sub": "البحث عن الخطافات ونقاط الانتقال…",
            "effects_done": "الخطافات ونقاط الانتقال جاهزة"
          },
          "overall_progress": "التقدم الإجمالي"
        }
      },
      "home": {
        "header": {
          "title": "الموجز الرئيسي",
          "subtitle": "مركز قيادة يومي لمقاطع الألعاب والميمات والنمو."
        },
        "tabs": {
          "posts": "منشوراتي",
          "plan": "الخطة الأسبوعية",
          "scheduled": "المجدول",
          "trending": "الرائج",
          "insights": "الرؤى"
        },
        "focus": {
          "title": "تركيز اليوم",
          "due": "يستحق في {{time}}",
          "task": "حول أحدث {{type}} لـ {{game}} إلى منشور واسع الانتشار وجدوله لـ {{platform}}.",
          "task_gen": "أنشئ {{type}} لـ {{game}} وجدوله لـ {{platform}}.",
          "goal": "الهدف: {{objective}}",
          "action_edit": "افتح المحرر",
          "action_gen": "أنشئ ميم",
          "est": "المقدر: {{time}} دقيقة"
        },
        "post": {
          "view_stats": "عرض الإحصائيات",
          "remix": "فكرة ريمكس",
          "schedule": "جدولة المتابعة",
          "step": "خطوة: {{step}}",
          "views": "مشاهدات",
          "reach": "وصول",
          "eng": "تفاعل",
          "retent": "احتفاظ",
          "saves": "حفظ",
          "shares": "مشاركات",
          "analytics": "التحليلات",
          "share": "مشاركة المنشور"
        },
        "insights": {
          "recent_posts": "المنشورات الأخيرة",
          "recent_subtitle": "أحدث المقاطع والميمات والصور التي تم إنشاؤها عبر nxclip.app.",
          "full_library": "عرض المكتبة الكاملة",
          "no_posts": "لا توجد منشورات بعد",
          "no_posts_subtitle": "أكمل مهمة خطتك الأسبوعية الأولى للبدء في تتبع الأداء والرؤى.",
          "start_task": "ابدأ مهمة اليوم",
          "open_create": "افتح مركز الإنشاء",
          "library_title": "مكتبة منشوراتي",
          "library_subtitle": "مجموعة كاملة من المحتوى الذي تم إنشاؤه ونشره.",
          "boost_title": "عزز تفاعلك",
          "boost_desc": "تتحسن مقاطع Valorant الخاصة بك بنسبة 40% على TikTok بين الساعة 6 مساءً و8 مساءً. جدول مقطعك القادم في هذا الوقت.",
          "boost_action": "جدولة الآن",
          "tutorial_title": "أنشئ ميم تعليمي",
          "tutorial_desc": "رائج: دروس ألعاب سريعة الوتيرة مع مقاطع رد فعل مضحكة. يحب جمهورك تعلم تشكيلات دخان CS2 الجديدة.",
          "tutorial_action": "إنشاء درس"
        },
        "metrics": {
          "today_tasks": "مهام اليوم",
          "ready_publish": "جاهز للنشر",
          "needs_attention": "يحتاج للاهتمام",
          "weekly_progress": "التقدم الأسبوعي",
          "streak": "+1 سلسلة",
          "goal_desc": "الهدف: انشر 3 مقاطع + 2 ميم هذا الأسبوع. لقد اقتربت!"
        },
        "pipeline": {
            "title": "خط أنابيب المنشئ",
            "edit": "تعديل",
            "gen": "إنشاء ميم",
            "schedule": "جدولة المنشور",
            "ready": "جاهز",
            "pending": "قيد الانتظار"
        },
        "viral": {
            "title": "فرصة انتشار",
            "content": "ميم Instagram الأخير يحقق مشاركات سريعة.",
            "tip": "نشر صورة متابعة في الساعتين القادمتين قد يعزز الوصول بنسبة 25%.",
            "action": "إنشاء متابعة"
        },
        "trending": {
          "velocity": "سرعة",
          "trending_on": "رائج على",
          "act_now": "ابدأ الآن"
        },
        "creators": {
          "title": "منشئون مقترحون",
          "overlap": "تداخل",
          "follow": "متابعة"
        },
        "status": {
          "ready": "جاهز",
          "in_progress": "قيد التنفيذ",
          "scheduled": "مجدول",
          "published": "تم النشر",
          "needs_review": "يحتاج مراجعة",
          "completed": "مكتمل",
          "pending": "قيد الانتظار"
        }
      },
      "create": {
        "header": {
          "title": "مركز الإنشاء",
          "subtitle": "محرك محتوى ألعاب مدعوم بالذكاء الاصطناعي.",
          "plan": "ما هي الخطة اليوم؟",
          "plan_subtitle": "اختر أداة للبدء في بناء إمبراطورية الألعاب الخاصة بك."
        },
        "tabs": {
          "clip": "من مقطع لانتشار",
          "meme": "إنشاء ميم",
          "image": "صورة AI",
          "carousel": "كاروسيل"
        },
        "tools": {
          "image_studio": {
            "title": "استوديو الصور",
            "description": "قم بإنشاء صور ألعاب عالية الجودة وميمات من مطالبات نصية."
          },
          "clip_editor": {
            "title": "استوديو المقاطع",
            "description": "قم بتحميل لعبك، وقص لقطات البارزة، وأضف لمسات الذكاء الاصطناعي."
          },
          "meme_gen": {
            "title": "مولد الميمات",
            "description": "حول لحظات لعبك إلى ميمات فيروسية مع تسميات توضيحية ذكية."
          },
          "creator_only": "للمنشئين فقط",
          "upgrade": "ترقية إلى منشئ",
          "get_started": "ابدأ الآن",
          "locked": "مقفل"
        },
        "recent": {
          "title": "الإبداعات الأخيرة",
          "view_all": "عرض الكل",
          "photo_by": "تصوير {{name}}"
        }
      },
      "common": {
        "start": "البداية",
        "end": "النهاية",
        "save": "حفظ",
        "cancel": "إلغاء",
        "loading": "جاري التحميل...",
        "error": "حدث خطأ ما",
        "success": "تم بنجاح",
        "delete": "حذف",
        "edit": "تعديل",
        "view": "عرض",
        "actions": "إجراءات",
        "back": "رجوع",
        "next": "التالي",
        "finish": "إنهاء",
        "showing_results": "عرض {{count}} نتيجة",
        "page_of": "صفحة {{current}} من {{total}}",
        "no_results": "لا توجد نتائج",
        "no_results_desc": "حاول ضبط الفلاتر أو مصطلح البحث",
        "clear": "مسح",
        "all": "الكل",
        "search": "بحث...",
        "months": {
          "january": "يناير",
          "february": "فبراير",
          "march": "مارس",
          "april": "أبريل",
          "may": "مايو",
          "june": "يونيو",
          "july": "يوليو",
          "august": "أغسطس",
          "september": "سبتمبر",
          "october": "أكتوبر",
          "november": "نوفمبر",
          "december": "ديسمبر"
        },
        "currency": "{{amount}}$",
        "date_format": "{{day}} {{month}} {{year}}",
        "skip": "تخطي",
        "post_now": "انشر الآن",
        "try_now": "جرب الآن",
        "high": "مرتفع",
        "medium": "متوسط",
        "critical": "حرج",
        "generate": "توليد",
        "regenerate": "إعادة توليد",
        "ai_assistant": "مساعد الذكاء الاصطناعي",
        "all_platforms": "كل المنصات",
        "create_new": "إنشاء جديد",
        "create_clip": "إنشاء مقطع",
        "create_meme": "إنشاء ميم",
        "create_image": "إنشاء صورة",
        "schedule": "جدولة موجود",
        "filter": "تصفية",
        "sort": "ترتيب",
        "platform": "منصة",
        "status": "حالة",
        "trusted_by": "موثوق من قبل منشئي كل من",
        "take_action": "اتخذ إجراء",
        "no_data": "لا يوجد بيانات",
        "via": "بواسطة",
        "time": {
          "just_now": "الآن",
          "hours_ago": "قبل {{count}} ساعة",
          "days_ago": "قبل {{count}} يوم",
          "tomorrow": "غداً",
          "today": "اليوم"
        }
      },
      "create_post": {
        "title": "nxclip.app مركز الإنشاء",
        "tabs": {
          "single": "منشور واحد",
          "plan": "خطة المحتوى"
        },
        "plan_tooltip": "استخدم الذكاء الاصطناعي لتوليد جدول محتوى لمدة 7 أيام.",
        "labels": {
          "caption": "التسمية التوضيحية",
          "tags": "الوسوم",
          "media": "الوسائط",
          "overlay_text": "نص متداخل",
          "trim_range": "نطاق القص",
          "target_games": "الألعاب المستهدفة",
          "target_audience": "الجمهور المستهدف",
          "content_style": "نمط المحتوى",
          "primary_goal": "الهدف الأساسي"
        },
        "placeholders": {
          "caption": "ماذا يحدث في عالم الألعاب الخاص بك؟",
          "tags": "gaming, valorant, clutch",
          "upload": "تحميل صورة أو فيديو",
          "upload_sub": "اسحب وأفلت أو انقر للتصفح",
          "overlay": "اكتب شيئاً ملحمياً...",
          "games": "مثال: فالورانت، أبيكس",
          "audience": "مثال: تنافسي",
          "style": "مثال: نصائح، مقاطع",
          "goal": "مثال: زيادة المتابعين"
        },
        "ai": {
          "generate": "توليد بالذكاء الاصطناعي",
          "regenerate": "إعادة توليد",
          "error_title": "خطأ في مساعد الذكاء الاصطناعي",
          "strategist": "خبير استراتيجية المحتوى",
          "strategist_sub": "توليد خارطة طريق لمدة 7 أيام",
          "gen_plan": "توليد خطة لمدة 7 أيام",
          "analyzing": "تحليل الاتجاهات...",
          "strategy_ready": "الاستراتيجية جاهزة",
          "personalized_strategy": "استراتيجيتك الشخصية",
          "empty_plan": "لم يتم توليد خطة بعد",
          "empty_plan_sub": "اضبط مدخلاتك واضغط على توليد."
        },
        "tools": {
          "filters": "الفلاتر",
          "text": "النص",
          "trim": "القص",
          "reset_range": "إعادة تعيين النطاق",
          "trim_hint": "سيتم نشر الجزء المحدد فقط.",
          "filters_list": {
            "none": "بدون",
            "grayscale": "تدرج الرمادي",
            "sepia": "سيبيا",
            "invert": "عكس الألوان",
            "high_contrast": "تباين عالٍ",
            "warm": "دافئ",
            "cool": "بارد"
          }
        },
        "preview": {
          "following": "متابعة",
          "for_you": "لك",
          "connect_media": "قم بتوصيل الوسائط للمعاينة",
          "polish_active": "تحسين الذكاء الاصطناعي نشط",
          "polish_sub": "المعاينة تعكس التحسينات في الوقت الفعلي"
        }
      },
      "onboarding": {
        "skip": "تخطي الآن",
        "start": "ابدأ",
        "continue": "متابعة",
        "back": "رجوع",
        "generate_plan": "توليد خطتي",
        "finish": "إنهاء الإعداد",
        "go_to_dashboard": "الذهاب إلى لوحة القيادة",
        "steps": {
          "niche": "مجال الألعاب",
          "audience": "الجمهور المستهدف",
          "style": "نمط المحتوى",
          "goal": "الهدف الأساسي",
          "frequency": "تكرار النشر",
          "strategy": "استراتيجية المحتوى",
          "tutorial": "دروس سريعة"
        },
        "coach": {
          "tag": "مدرب الذكاء الاصطناعي",
          "intro": "مرحباً! أنا مدرب nxclip.app الخاص بك.",
          "intro_subtitle": "سأساعدك في إعداد استوديو المنشئ الخاص بك وتحضير الأسبوع الأول من المحتوى في حوالي 90 ثانية.",
          "step_label": "خطوة {{step}}",
          "of": "من",
          "complete": "مكتمل",
          "final_step": "الخطوة النهائية",
          "how_it_works": "كيف يعمل nxclip.app",
          "how_it_works_subtitle": "كل ما تحتاجه للسيطرة على مشهد الألعاب.",
          "tip_0": "مرحباً! أنا هنا لمساعدتك في بناء إمبراطورية محتوى. لنبدأ بتحديد مجالك.",
          "tip_1": "التركيز على 1-3 ألعاب يساعد الذكاء الاصطناعي في فهم أسلوبك الخاص واهتمامات جمهورك.",
          "tip_2": "معرفة جمهورك تسمح لي باقتراح النبرة الصحيحة—سواء كانت نصائح احترافية أو ترفيهًا خالصًا.",
          "tip_3": "ما نوع المحتوى الذي تستمتع بإنشائه أكثر؟ هذا يساعدني في تخصيص مهامك اليومية.",
          "tip_4": "هدفك يحدد الاستراتيجية. النمو يحتاج إلى اتجاهات رائجة؛ المجتمع يحتاج إلى تفاعل.",
          "tip_5": "الاتساق هو المفتاح! حتى النشر مرة واحدة في الأسبوع أفضل من اندفاع يليه صمت.",
          "tip_6": "سواء كان لديك مقاطع أم لا، سأحرص على أن يكون لديك شيء مذهل لتنشره اليوم.",
          "tip_7": "أوشكنا على الانتهاء! لنلقِ نظرة سريعة على كيفية عمل nxclip.app."
        },
        "questions": {
          "games": {
            "title": "ما هي الألعاب التي تلعبها أكثر؟",
            "subtitle": "اختر حتى 3 ألعاب لتخصيص خطة المحتوى الخاصة بك.",
            "placeholder": "لعبة أخرى..."
          },
          "audience": {
            "title": "لمن تنشئ المحتوى؟",
            "options": {
              "casual": "اللاعبون العاديون",
              "competitive": "اللاعبون التنافسيون",
              "entertained": "المشاهدون المستمتعون",
              "mixed": "جمهور مختلط"
            }
          },
          "content_types": {
            "title": "ما نوع المحتوى الذي تقدمه؟",
            "subtitle": "اختر كل ما ينطبق.",
            "options": {
              "gameplay": { "label": "أسلوب اللعب", "desc": "لقطات مذهلة، إخفاقات، ولحظات مهارية عالية." },
              "tutorials": { "label": "دروس تعليمية", "desc": "نصائح، حيل، وأدلة تعليمية." },
              "reviews": { "label": "مراجعات", "desc": "تحليل الألعاب وآراء حول العتاد." },
              "memes": { "label": "ميمز", "desc": "تعديلات مضحكة وفكاهة مجتمعية." }
            }
          },
          "goal": {
            "title": "ما هو هدفك الرئيسي؟",
            "options": {
              "viral": { "label": "الانتشار الفيروسي", "desc": "تعظيم الوصول والمشاركة في الاتجاهات الرائجة." },
              "community": { "label": "بناء مجتمع", "desc": "تعزيز التفاعل العميق والولاء." },
              "monetize": { "label": "تحقيق الدخل", "desc": "الاستعداد للرعايات والإعلانات." }
            }
          },
          "frequency": {
            "title": "كم مرة يمكنك النشر واقعياً؟",
            "options": {
              "daily": "يومياً",
              "few_times": "بضع مرات في الأسبوع",
              "weekly": "أسبوعياً",
              "occasionally": "أحياناً"
            }
          },
          "start_point": {
            "title": "هل لديك مقاطع موجودة أم تبدأ من الصفر؟",
            "options": {
              "clips": { "label": "لدي مقاطع", "desc": "سأقوم بتحميل أفضل لحظات لعبي." },
              "fresh": { "label": "البدء من الصفر", "desc": "سأقوم بتوليد محتوى جديد من الصفر." }
            }
          }
        },
        "plan": {
          "title": "أسبوعك الأول جاهز",
          "viral_subtitle": "لقد رسمت استراتيجية لمساعدتك على النمو بسرعة.",
          "community_subtitle": "لقد رسمت استراتيجية لمساعدتك على بناء مجتمعك.",
          "day": "يوم",
          "ready": "جاهز",
          "types": {
            "clip": "مقطع فيروسي",
            "meme": "ميم",
            "insight": "رؤية"
          }
        },
        "tutorial": {
          "studio": { "title": "استوديو الذكاء الاصطناعي", "desc": "قم بتوليد صور ألعاب عالية الجودة وميمات باستخدام نماذج الذكاء الاصطناعي المتقدمة لدينا." },
          "editor": { "title": "استوديو المقاطع", "desc": "حول مقاطع لعبك إلى فيديوهات عمودية فيروسية لـ TikTok و Reels." },
          "feed": { "title": "موجز المحتوى", "desc": "احصل على الإلهام من منشئي الألعاب الآخرين وشاهد ما هو رائج في مجالك." }
        },
        "generating": {
          "title": "جاري إنشاء خطتك الشخصية لمدة 7 أيام...",
          "subtitle": "تحليل مجال الألعاب وأهدافك"
        },
        "errors": {
          "setup_failed": "فشل الإعداد",
          "plan_failed": "فشل توليد الخطة",
          "empty_plan": "تم استلام خطة محتوى فارغة من الذكاء الاصطناعي.",
          "session_expired": "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.",
          "no_email": "لم نتمكن من العثور على عنوان بريدك الإلكتروني. يرجى محاولة تسجيل الدخول مرة أخرى.",
          "timeout": "انتهت مهلة الاتصال (60 ثانية). قد يواجه Firestore صعوبات. يرجى المحاولة مرة أخرى.",
          "permission_denied": "تم رفض الوصول. يرجى التحقق من الإنترنت أو محاولة تسجيل الدخول مرة أخرى.",
          "generic": "فشل حفظ ملفك الشخصي."
        }
      },
      "footer": {
        "rights": "© 2026 nxclip.app. نظام تشغيل المنشئ.",
        "product": "المنتج",
        "platform": "المنصة",
        "legal": "قانوني",
        "privacy": "الخصوصية",
        "terms": "الشروط",
        "status": "الحالة",
        "description": "هندسة الجيل القادم من وسائط المنشئين — عبر الألعاب ونمط الحياة والسفر والطعام والطبخ وكل مجال بينهما. تمكين كبار منشئي المحتوى من خلال ذكاء الآلة.",
        "how_it_works": "كيف يعمل",
        "community": "المجتمع",
        "newsletter_title": "الإرسال",
        "newsletter_desc": "احصل على تحديثات داخلية حول نماذج الذكاء الاصطناعي واستراتيجيات المنشئين لدينا.",
        "newsletter_placeholder": "commander@creator.hq",
        "newsletter_button": "انضمام"
      },
      "how_it_works": {
        "label": "مسار التطور",
        "title": "من لقطات أولية إلى",
        "title_gradient": "هيمنة فيروسية.",
        "description": "تم تصميم خط أنابيب الذكاء الاصطناعي المكون من ثلاث خطوات للسرعة والحجم. لا مزيد من القص اليدوي أو التخمين.",
        "steps": {
          "1": {
            "title": "الاستيعاب والتحليل",
            "desc": "قم بتحميل لعبك الخام أو بثك. يحدد الذكاء الاصطناعي لدينا لحظات التفاعل العالي باستخدام تتبع النظرة العصبية واكتشاف تغذية القتل."
          },
          "2": {
            "title": "تحسين الذكاء الاصطناعي",
            "desc": "قص تلقائي، وإنشاء تسميات توضيحية، وإخفاء الميمات. حول بثاً مدته 4 ساعات إلى 20 مقطعاً جاهزاً للانتشار في دقائق."
          },
          "3": {
            "title": "النشر الاستراتيجي",
            "desc": "جدول نموك. استخدم الذكاء الإقليمي للنشر في أوقات الذروة لتحقيق أقصى قدر من الوصول عبر جميع المنصات."
          }
        }
      },
      "pricing": {
        "label": "مستويات النمو",
        "title": "اختر خطتك.",
        "subtitle": "اختر المحرك الذي يغذي رحلة منشئ المحتوى الخاصة بك. أداء متميز قابل للتطوير.",
        "monthly": "شهرياً",
        "yearly": "سنوياً",
        "popular": "الأكثر رواجاً",
        "current": "الخطة الحالية",
        "upgrade": "ترقية المحرك",
        "get_started": "ابدأ الآن",
        "compare": "قارن كل الميزات",
        "billing_annually": "تتم الفوترة سنوياً بـ",
        "infinite_potential": "إمكانات غير محدودة",
        "billed_monthly": "تتم الفوترة شهرياً",
        "mo": "شهر",
        "plans": {
          "starter": {
            "name": "مجاني",
            "who": "مجاني للأبد",
            "features": [
              "5 عمليات إنشاء صور/ميمات يومياً",
              "تحميل مقاطع تصل إلى 500 ميجابايت",
              "3 رسائل لمدرب المنشئ شهرياً",
              "سير عمل أساسي لإنشاء المحتوى",
              "معاينة التحليلات الأساسية",
              "تصدير بجودة قياسية"
            ]
          },
          "pro": {
            "name": "منشئ محترف",
            "who": "معيار منشئ المحتوى",
            "features": [
              "عمليات إنشاء غير محدودة",
              "تحميل مقاطع تصل إلى 5 جيجابايت",
              "مدرب منشئ غير محدود",
              "لوحة تحليلات كاملة",
              "الوصول إلى معدل المشاركة",
              "تقرير تدريب أسبوعي بالذكاء الاصطناعي"
            ]
          },
          "studio": {
            "name": "استوديو",
            "who": "للفرق ومنظمات الرياضات الإلكترونية",
            "features": [
              "كل شيء في برو",
              "سير عمل الفريق",
              "إدارة حسابات متعددة",
              "مكتبة محتوى مشتركة",
              "تقارير متقدمة",
              "أدوات التعاون"
            ]
          }
        },
        "page": {
          "badge": "تسعير شفاف",
          "title": "تسعير بسيط يركز على المنشئ",
          "subtitle": "ابدأ مجاناً، وقم بالترقية عندما تكون مستعداً للنمو بشكل أسرع عبر TikTok و YouTube و Instagram.",
          "discount": "الفوترة السنوية: وفر 17% على برو وستوديو",
          "capabilities_label": "القدرات",
          "upload_limit": "حد التحميل",
          "generations": "عمليات الإنشاء",
          "quality_cap": "أقصى جودة",
          "breakdown_title": "انهيار كامل",
          "breakdown_desc": "قارن بين كل أداة وحد وميزة معمارية عبر مستوياتنا الاحترافية.",
          "triggers_title": "متى يجب عليك الترقية؟",
          "triggers_desc": "افتح NexaClip Pro عندما تتطلب عملية إنشاء المحتوى الخاصة بك المزيد من القوة.",
          "faq_title": "الأسئلة الشائعة",
          "faq_desc": "كل ما تحتاج لمعرفته حول خطط وفواتير NexaClip.",
          "final_cta_title": "جرب برو مجاناً لمدة 7 أيام.",
          "final_cta_desc": "افتح عمليات إنشاء غير محدودة وتحليلات كاملة وتدريباً بالذكاء الاصطناعي عندما تكون مستعداً للنمو بشكل أسرع. لا يلزم وجود بطاقة ائتمان.",
          "final_cta_pro": "ابدأ برو مجاناً",
          "final_cta_free": "ابدأ مجاناً"
        },
        "comparison": {
          "categories": {
            "content_creation": "إنشاء المحتوى",
            "ai_coach": "مدرب الذكاء الاصطناعي",
            "analytics": "التحليلات",
            "publishing": "النشر والمشاركة",
            "library": "المكتبة",
            "team": "ميزات الفريق",
            "support": "الدعم"
          },
          "features": {
            "gen": "إنشاء الصور/الميمات",
            "upload": "حد تحميل مقاطع الفيديو",
            "edit": "سير عمل تحرير المقاطع",
            "meme": "إنشاء الميمات",
            "image": "إنشاء الصور",
            "coach_msg": "رسائل مدرب المنشئ",
            "ai_sugg": "اقتراحات محتوى الذكاء الاصطناعي",
            "growth_plan": "إرشادات خطة النمو الأسبوعية",
            "ai_report": "تقرير تدريب أسبوعي بالذكاء الاصطناعي",
            "basic_analytics": "معاينة التحليلات الأساسية",
            "engagement_rate": "بطاقة معدل المشاركة",
            "full_dashboard": "لوحة تحليلات كاملة",
            "platform_comp": "مقارنة المنصات",
            "performance_insights": "رؤى أداء المحتوى",
            "posting_time": "أفضل وقت للنشر / الخريطة الحرارية",
            "tiktok": "نشر/جدولة TikTok",
            "youtube": "نشر YouTube Shorts",
            "instagram": "Instagram Reels",
            "scheduled": "المنشورات المجدولة",
            "cross_platform": "تتبع المنصات المتقاطعة",
            "content_library": "مكتبة المحتوى",
            "saved_ideas": "الأفكار/القوالب المحفوظة",
            "large_file": "دعم الملفات الكبيرة",
            "draft_mgmt": "إدارة المسودات",
            "team_workflow": "سير عمل الفريق",
            "multi_account": "إدارة حسابات متعددة",
            "shared_library": "مكتبة محتوى مشتركة",
            "collab_tools": "أدوات التعاون",
            "community_support": "دعم المجتمع",
            "priority_support": "دعم ذو أولوية",
            "custom_onboarding": "توجيه مخصص"
          }
        },
        "triggers": [
          { "title": "لقد وصلت إلى حدك اليومي", "desc": "لقد استخدمت جميع عمليات إنشاء الصور/الميمات المجانية الخمسة. يفتح برو عمليات إنشاء غير محدودة." },
          { "title": "مقطعك كبير جداً", "desc": "تدعم التحميلات المجانية ما يصل إلى 500 ميجابايت. يفتح برو عمليات التحميل حتى 5 جيجابايت." },
          { "title": "تحتاج إلى مزيد من التدريب", "desc": "يتضمن المجاني 3 رسائل لمدرب المنشئ شهرياً. يمنحك برو تدريباً غير محدود." },
          { "title": "تريد تحليلات كاملة", "desc": "افتح معدل المشاركة، ومقارنة المنصات، وسجل الأداء الكامل." },
          { "title": "تريد تقارير أسبوعية بالذكاء الاصطناعي", "desc": "احصل على تقرير التدريب الأسبوعي الخاص بك مع ما نجح، وما يجب إصلاحه، وما يجب إنشاؤه تالياً." },
          { "title": "جودة احترافية", "desc": "تريد تصدير 4K Ultra-HD بدون علامة مائية لجميع المنصات." }
        ],
        "faqs": [
          { "q": "هل يمكنني البدء مجاناً؟", "a": "نعم! يمكنك البدء بخطتنا المجانية للأبد لاختبار سير عمل إنشاء المحتوى والتحليلات الأساسية دون أي التزام." },
          { "q": "هل أحتاج إلى بطاقة ائتمان لتجربة برو؟", "a": "لا يلزم وجود بطاقة ائتمان لبدء تجربة Pro Creator لمدة 7 أيام. أنت تدفع فقط عندما تقرر الاستمرار بعد انتهاء الفترة التجريبية." },
          { "q": "هل يمكنني الإلغاء في أي وقت؟", "a": "بالتأكيد. خططنا مرنة. يمكنك إلغاء اشتراكك في أي وقت من إعداداتك دون رسوم خفية أو عقود." },
          { "q": "ماذا يحدث إذا قمت بخفض الدرجة؟", "a": "إذا قمت بخفض الدرجة إلى المجانية، فستحتفظ بإمكانية الوصول إلى ميزات برو حتى نهاية فترة الفوترة الحالية، وبعد ذلك سيعود حسابك إلى الحدود المجانية." },
          { "q": "ما هي المنصات المدعومة؟", "a": "تم بناء NexaClip لـ TikTok و YouTube Shorts و Instagram Reels. نحن نقدم تحليلات عبر المنصات وسير عمل نشر لجميع الثلاثة." }
        ],
        "recommendations": [
          { "name": "مجاني", "desc": "للمنشئين الجدد الذين يستكشفون سير عمل المحتوى. مثالي لبدء قناتك واختبار الأفكار." },
          { "name": "برو", "desc": "للمنشئين الجادين الذين ينشرون عبر منصات متعددة. يفتح قوى غير محدودة وتحليلات نمو متقدمة." },
          { "name": "استوديو", "desc": "لفرق وكالات الرياضات الإلكترونية التي تدير حسابات منشئين متعددة لاحتياجات مخصصة عالية الحجم." }
        ],
        "values": {
          "unlimited": "غير محدود",
          "per_day": "يومياً",
          "per_mo": "شهرياً",
          "up_to": "حتى",
          "limited": "محدود",
          "basic": "أساسي",
          "advanced": "متقدم",
          "preview": "معاينة",
          "standard": "قياسي",
          "full": "كامل",
          "shared": "مشترك"
        }
      },
      "showcase": {
        "label": "مركز قيادة منشئي المحتوى",
        "title": "كل شيء في",
        "title_gradient": "واجهة متميزة واحدة.",
        "description": "نظام بيئي مهني موحد. قم بإدارة الأصول وتتبع النمو والتعاون مع الذكاء الاصطناعي في بيئة سلسة وعالية الأداء.",
        "pulse": {
          "title": "نبض القناة",
          "subtitle": "ذكاء المحتوى المباشر"
        },
        "stats": {
          "impressions": "انطباعات فيروسية",
          "gain": "مكاسب المجتمع",
          "score": "درجة المنشئ",
          "efficiency": "تعزيز الكفاءة"
        },
        "charts": {
          "sentiment": "مشاعر الجمهور",
          "pipeline": "خط أنابيب محتوى الذكاء الاصطناعي",
          "analyzing": "تحليل",
          "completed": "مكتمل"
        },
        "insights": {
          "discovery": "رؤية الاكتشاف",
          "suggestion": "اقتراح الاستوديو",
          "nexa": "ذكاء Nexa",
          "auto": "تلميع تلقائي",
          "peak": "تم اكتشاف ذروة المشاركة في 04:12. استخلص الذكاء الاصطناعي 3 مقاطع قصيرة عالية الاحتمالية للانتشار من هذا الجزء.",
          "neon": "يستجيب ملف تعريف جمهورك الحالي بشكل أفضل لصور الميمات ذات التباين العالي. تم تحديث الإعدادات المسبقة للاستوديو."
        }
      },
      "spotlight": {
        "label": "شبكة منشئي المحتوى العالمية",
        "title": "اختيار نخبة",
        "title_gradient": "محترفي الألعاب.",
        "description": "من المحترفين التنافسيين إلى المباشرين المتنوعين، يعد nxclip.app الأساس المعماري لقنوات الألعاب الأكثر جاذبية في العالم.",
        "verified": "نخبة معتمدة",
        "counts": "+25 ألف",
        "creators": {
          "aura": {
             "handle": "@ApexAura",
             "niche": "باتل رويال، تصويب",
             "quote": "حوّل nxclip.app بثي المباشر الذي دام 8 ساعات إلى ذهب فيروسي. يعرف الذكاء الاصطناعي تمامًا متى يحدث الحماس."
          },
          "sage": {
             "handle": "@StrategySage",
             "niche": "إستراتيجية كبرى، 4X",
             "quote": "أصبح شرح الميكانيكا المعقدة أسهل من أي وقت مضى. تسميات الذكاء الاصطناعي دقيقة للغاية مع المصطلحات التقنية."
          },
          "pixel": {
             "handle": "@PixelPioneer",
             "niche": "ألعاب مستقلة، ريترو",
             "quote": "يساعدني استوديو الصور في إنشاء صور مصغرة تبرز حقًا. تضاعف معدل النقر للظهور (CTR) منذ أن بدأت استخدامه."
          },
          "knight": {
             "handle": "@CyberKnight",
             "niche": "تقمص أدوار، سول لايك",
             "quote": "مدرب منشئي nxclip.app يشبه امتلاك منتج محترف في أذني. تفاعل مجتمعي في أعلى مستوياته على الإطلاق."
          }
        }
      },
      "testimonials": {
        "label": "نبض المجتمع",
        "title": "معتمد من قبل",
        "title_gradient": "الأفضل في العالم.",
        "description": "ردود فعل حقيقية من منشئي المحتوى الذين حولوا قنواتهم باستخدام ذكاء nxclip.app.",
        "data": {
           "viper": {
              "name": "أليكس 'فايبر' تشن",
              "tag": "محترف فالورانت",
              "quote": "أداة تقليم الذكاء الاصطناعي من nxclip.app غيرت قواعد اللعبة. كنت أقضي ساعات في البحث عن اللقطات البارزة، والآن يتم ذلك في ثوانٍ. زادت مشاهدات تيك توك بنسبة 400%."
           },
           "luna": {
              "name": "سارة 'لونا' سميث",
              "tag": "مباشرة متنوعة",
              "quote": "أعطاني مدرب منشئي الذكاء الاصطناعي رؤى لم أكن لأجدها بمفردي أبدًا. الأمر يشبه امتلاك خبير إستراتيجي متفرغ بسعر كوب من القهوة."
           },
           "tank": {
              "name": "ماركوس 'تانك' جونز",
              "tag": "متخصص في ألعاب تقمص الأدوار",
              "quote": "لم يكن إنشاء صور ميمات مخصصة لمجتمعي أسهل من أي وقت مضى. يفهم nxclip.app ثقافة الألعاب تمامًا. أفضل أداة استخدمتها على الإطلاق."
           }
        }
      },
      "cta": {
        "label": "الحد الأخير",
        "title": "مستعد للهيمنة على",
        "title_gradient": "تغذية الألعاب.",
        "description": "انضم إلى أكثر من 25000 من كبار منشئي المحتوى الذين يوسعون قنواتهم باستخدام nxclip.app. مستقبل محتوى الألعاب هو النخبة.",
        "button_start": "ابدأ تطورك",
        "button_pricing": "استكشف الأسعار"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
