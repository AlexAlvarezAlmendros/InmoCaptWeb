import { useEffect } from "react";
import { track } from "@/lib/analytics";

const MILESTONES = [25, 50, 75, 100] as const;

/**
 * Emite `scroll_depth` al alcanzar el 25/50/75/100 % de la página, como mucho
 * una vez por hito. Pensado para las páginas públicas largas (landing, precios),
 * donde saber hasta dónde llega la gente indica qué secciones se ven de verdad.
 */
export function useScrollDepth(page: string): void {
  useEffect(() => {
    const reached = new Set<number>();
    let ticking = false;

    const measure = () => {
      ticking = false;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const percent = Math.min(
        100,
        Math.round((window.scrollY / scrollable) * 100),
      );

      for (const milestone of MILESTONES) {
        if (percent >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          track("scroll_depth", { page, depth: milestone });
        }
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [page]);
}
