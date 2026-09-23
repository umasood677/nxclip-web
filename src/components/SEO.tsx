import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({ 
  title, 
  description, 
  keywords, 
  image = "https://picsum.photos/seed/nxclip/1200/630", // Placeholder until og-image.png is provided
  url = "https://nxclip.app",
  type = "website" 
}: SEOProps) {
  const siteTitle = "nxclip.app | Creator OS";
  const fullTitle = title ? `${title} | nxclip.app` : siteTitle;
  const siteDescription = description || "Plan, create images and clips, go Live on YouTube, Instagram, TikTok, and Facebook, then measure the next move — in one Creator OS.";
  const siteKeywords = keywords || "creator os, ai image generator, clip editor, social publishing, analytics, creator coach, content library";

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content={siteKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={image} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
