import React from "react";
import { Link } from "react-router-dom";
import { Clapperboard } from "lucide-react";
import { Button } from "../../components/ui/button";
import { SEO } from "../../components/SEO";

/**
 * Shown when Animated Ad Studio is feature-gated off (Phase 4B-R1.5).
 * Does not call animated APIs.
 */
export default function AnimatedAdStudioUnavailable() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
      <SEO title="Animated Ad Studio unavailable | NxClip" />
      <Clapperboard className="text-muted-foreground" size={32} aria-hidden />
      <h1 className="text-xl font-semibold tracking-tight">Animated Ad Studio unavailable</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Motion editing is turned off in this environment (
        <code className="text-xs">VITE_AD_STUDIO_ANIMATED</code> is not enabled). Static Ad Studio
        continues to work normally.
      </p>
      <Button type="button" asChild>
        <Link to="/create/ad">Back to Static Ad Studio</Link>
      </Button>
    </div>
  );
}
