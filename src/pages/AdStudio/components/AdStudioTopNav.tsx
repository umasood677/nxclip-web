import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "../../../lib/utils";

export type AdStudioNavId =
  | "home"
  | "templates"
  | "briefs"
  | "library"
  | "canvas"
  | "concepts"
  | "catalog";

const LINKS: { id: AdStudioNavId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "templates", label: "Template Gallery" },
  { id: "briefs", label: "Example Briefs" },
  { id: "library", label: "Creative Library" },
  { id: "canvas", label: "Editor Canvas" },
  { id: "concepts", label: "Concept Gallery" },
  { id: "catalog", label: "10 Templates" },
];

type Props = {
  brand?: string;
  catalogLabel?: string;
  /** Hide the NxClip · Ad Studio brand label (Editor Canvas). */
  hideBrand?: boolean;
  active: AdStudioNavId;
  /** Scroll to home-page section ids when already on /create/ad home. */
  onSectionNav?: (id: AdStudioNavId) => void;
  /** Optional creative id for Editor Canvas deep-link. */
  recentCreativeId?: string | null;
  /** Header actions: Brand Kit chip + Create project, etc. */
  trailing?: React.ReactNode;
  onCreateProject?: () => void;
  className?: string;
};

export function AdStudioTopNav({
  brand = "NxClip · Ad Studio",
  catalogLabel,
  hideBrand = false,
  active,
  onSectionNav,
  recentCreativeId,
  trailing,
  onCreateProject,
  className,
}: Props) {
  const navigate = useNavigate();

  const go = (id: AdStudioNavId) => {
    if (id === "canvas") {
      if (recentCreativeId) {
        navigate(`/create/ad/${recentCreativeId}`);
      } else {
        navigate("/create/ad");
        onSectionNav?.("library");
      }
      return;
    }
    if (id === "concepts") {
      // Prefer in-app compose transition; avoid remounting /create/ad (resets view→home).
      if (onSectionNav) {
        onSectionNav(id);
        return;
      }
      navigate("/create/ad");
      return;
    }
    if (onSectionNav) {
      onSectionNav(id);
      return;
    }
    navigate("/create/ad");
    // Defer scroll until home mounts
    window.setTimeout(() => {
      const el = document.getElementById(sectionDomId(id));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  return (
    <div className={cn("w0a-topnav", hideBrand && "w0a-topnav--no-brand", className)}>
      {hideBrand ? null : <div className="w0a-brand">{brand}</div>}
      <div className="w0a-topnav__end">
        <nav className="w0a-navlinks" aria-label="Ad Studio">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className={cn(active === link.id && "active")}
              onClick={() => go(link.id)}
            >
              {link.id === "catalog" && catalogLabel ? catalogLabel : link.label}
            </button>
          ))}
        </nav>
        {import.meta.env?.DEV && <Link to="/create/ad/uat" className="w0a-link" style={{fontSize:11,whiteSpace:"nowrap"}}>UAT checklist</Link>}
        {(trailing || onCreateProject) ? (
          <div className="w0a-topnav__actions">
            {trailing}
            {onCreateProject ? (
              <button
                type="button"
                className="w0a-create-project"
                onClick={onCreateProject}
              >
                <span className="w0a-create-project__glow" aria-hidden />
                <Plus size={15} strokeWidth={2.5} aria-hidden />
                Create project
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function sectionDomId(id: AdStudioNavId): string {
  switch (id) {
    case "home":
      return "ad-studio-home";
    case "templates":
    case "catalog":
      return "ad-studio-templates";
    case "briefs":
      return "ad-studio-briefs";
    case "library":
      return "ad-studio-library";
    case "concepts":
      return "ad-studio-concepts";
    case "canvas":
      return "ad-studio-canvas";
    default:
      return "ad-studio-home";
  }
}

export function scrollAdStudioSection(id: AdStudioNavId) {
  const el = document.getElementById(sectionDomId(id));
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}
