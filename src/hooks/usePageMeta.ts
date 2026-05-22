import { useEffect } from 'react';

/**
 * Sets the document <title> and <meta name="description"> for the
 * current page. Restores the previous values on unmount so navigating
 * back to a route that doesn't call usePageMeta leaves a stale title.
 *
 * Per-page meta is critical for SEO + AdSense's content-quality bot —
 * with a single shared title across every SPA route, crawlers think the
 * whole site is one page of duplicate content.
 *
 * AdSense + Google's crawler do execute JS for indexing, so a
 * useEffect-based title swap is enough; no SSR / helmet needed.
 */
export function usePageMeta({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = title ? `${title} · AlbionCrafts` : 'AlbionCrafts';
    document.title = fullTitle;

    let metaEl: HTMLMetaElement | null = null;
    let prevDescription: string | null = null;
    if (description) {
      metaEl = document.querySelector('meta[name="description"]');
      if (!metaEl) {
        metaEl = document.createElement('meta');
        metaEl.name = 'description';
        document.head.appendChild(metaEl);
      } else {
        prevDescription = metaEl.content;
      }
      metaEl.content = description;
    }

    return () => {
      document.title = prevTitle;
      if (metaEl && prevDescription !== null) {
        metaEl.content = prevDescription;
      }
    };
  }, [title, description]);
}
