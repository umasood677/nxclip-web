import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ReactLenis } from "lenis/react";
import { SEO } from "../../components/SEO";
import Navbar from "../../components/Navbar";
import Pricing from "../../components/Pricing";
import Footer from "../../components/Footer";
import CreatorSpotlight from "../Home/components/CreatorSpotlight";
import Testimonials from "../Home/components/Testimonials";
import FinalCTA from "../Home/components/FinalCTA";
import TrustMetrics from "../Home/components/TrustMetrics";
import HeroV2 from "./components/HeroV2";
import CapabilitiesV2 from "./components/CapabilitiesV2";
import PipelineV2 from "./components/PipelineV2";
import UmbrellaStrip from "./components/UmbrellaStrip";

export default function HomeV2() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;
    const t = window.setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    return () => window.clearTimeout(t);
  }, [hash]);

  return (
    <ReactLenis root>
        <div className="min-h-screen ui-bg-landing home-v2">
        <SEO
          title="nxclip.app — Viral content redefined by AI"
          description="The AI operating system built for next-gen creators. Transform your best moments into epic growth with elite-grade intelligence."
        />

        <Navbar />
        <main>
          <HeroV2 />
          <CapabilitiesV2 />
          <PipelineV2 />
          <UmbrellaStrip />
          <TrustMetrics />
          <CreatorSpotlight />
          <Pricing />
          <Testimonials />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </ReactLenis>
  );
}
