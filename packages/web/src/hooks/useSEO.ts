import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

/**
 * Lightweight SEO hook that updates document title and meta tags.
 * For SPAs with a small number of public pages, this avoids
 * adding a full helmet dependency.
 */
export function useSEO({ title, description, canonical, noindex }: SEOProps) {
  useEffect(() => {
    // Title
    const fullTitle = title.includes("InmoCapt")
      ? title
      : `${title} | InmoCapt`;
    document.title = fullTitle;

    // Description
    if (description) {
      let meta = document.querySelector(
        'meta[name="description"]',
      ) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;

      // Also update OG description
      let ogDesc = document.querySelector(
        'meta[property="og:description"]',
      ) as HTMLMetaElement | null;
      if (ogDesc) ogDesc.content = description;

      let twDesc = document.querySelector(
        'meta[name="twitter:description"]',
      ) as HTMLMetaElement | null;
      if (twDesc) twDesc.content = description;
    }

    // OG title
    let ogTitle = document.querySelector(
      'meta[property="og:title"]',
    ) as HTMLMetaElement | null;
    if (ogTitle) ogTitle.content = fullTitle;

    let twTitle = document.querySelector(
      'meta[name="twitter:title"]',
    ) as HTMLMetaElement | null;
    if (twTitle) twTitle.content = fullTitle;

    // Canonical
    if (canonical) {
      let link = document.querySelector(
        'link[rel="canonical"]',
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // Robots noindex
    if (noindex) {
      let robots = document.querySelector(
        'meta[name="robots"]',
      ) as HTMLMetaElement | null;
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex, nofollow";
    }

    // Cleanup: restore defaults on unmount
    return () => {
      document.title =
        "InmoCapt — Captación de particulares para agentes inmobiliarios";
      const meta = document.querySelector(
        'meta[name="description"]',
      ) as HTMLMetaElement | null;
      if (meta) {
        meta.content =
          "Accede a listados actualizados de propietarios que venden sin intermediarios. Datos de contacto directo, gestión de captaciones y notificaciones por zona. Herramienta profesional para agentes inmobiliarios.";
      }
      const link = document.querySelector(
        'link[rel="canonical"]',
      ) as HTMLLinkElement | null;
      if (link) link.href = "https://inmocapt.com/";

      const robots = document.querySelector(
        'meta[name="robots"]',
      ) as HTMLMetaElement | null;
      if (robots) robots.content = "index, follow";
    };
  }, [title, description, canonical, noindex]);
}
