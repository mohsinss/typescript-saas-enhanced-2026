import { Metadata } from "next";
import config from "@/config";

/**
 * SEO utilities for Next.js metadata
 */

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
}

/**
 * Generate metadata for a page
 */
export function getSEOTags({
  title,
  description,
  canonical,
  image,
  noindex = false,
}: SEOProps = {}): Metadata {
  const siteTitle = title
    ? `${title} | ${config.appName}`
    : `${config.appName} - ${config.appDescription}`;
  
  const siteDescription = description || config.appDescription;
  const siteUrl = `https://${config.domainName}`;
  const siteImage = image || `${siteUrl}/opengraph-image.png`;
  
  return {
    title: siteTitle,
    description: siteDescription,
    applicationName: config.appName,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: canonical || siteUrl,
      siteName: config.appName,
      images: [
        {
          url: siteImage,
          width: 1200,
          height: 630,
          alt: config.appName,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [siteImage],
      creator: "@shipfast",
    },
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
      },
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-icon.png",
    },
    ...(canonical && {
      alternates: {
        canonical,
      },
    }),
  };
}

/**
 * Generate JSON-LD structured data
 */
export function renderSchemaTags(): string {
  const schema = {
    "@context": "http://schema.org",
    "@type": "SoftwareApplication",
    name: config.appName,
    description: config.appDescription,
    applicationCategory: "BusinessApplication",
    url: `https://${config.domainName}`,
    offers: {
      "@type": "Offer",
      price: config.stripe.plans[0]?.price || 0,
      priceCurrency: "USD",
    },
  };

  return JSON.stringify(schema);
}
