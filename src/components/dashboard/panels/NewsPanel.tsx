/**
 * Garmoth-style news panel for the dashboard.
 *
 * Pulls Steam Community Announcements for Albion Online (appid 761890)
 * via the news service. Each card shows: thumbnail, kind badge, title,
 * date, short excerpt, and a "Read on Steam" link. Layout is a
 * responsive 1-col / 2-col grid so the feed feels like a magazine
 * landing page rather than a sidebar list.
 */

import { useEffect, useState } from 'react';
import { SectionDivider } from '../../ui';
import { fetchAlbionNews } from '../../../services/news';
import type { NewsItem } from '../../../services/news';
import { formatAge } from '../../../utils/dataAge';

const KIND_LABELS: Record<NewsItem['kind'], string> = {
  patch: 'Patch Notes',
  dev:   'Dev Talk',
  event: 'Event',
  sale:  'Store',
  other: 'News',
};

const KIND_STYLES: Record<NewsItem['kind'], string> = {
  patch: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  dev:   'bg-sky-500/20 text-sky-300 border-sky-500/40',
  event: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  sale:  'bg-rose-500/20 text-rose-300 border-rose-500/40',
  other: 'bg-zinc-700/30 text-zinc-400 border-zinc-700/60',
};

function ageHours(dateMs: number): number {
  return (Date.now() - dateMs) / 3_600_000;
}

function fmtDate(dateMs: number): string {
  // Locale-stable short date for older items, "Xh ago" for fresh ones.
  const h = ageHours(dateMs);
  if (h < 48) return formatAge(h) + ' ago';
  return new Date(dateMs).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NewsPanel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAlbionNews()
      .then(({ items, fetchedAt, stale }) => {
        if (cancelled) return;
        setItems(items);
        setFetchedAt(fetchedAt);
        setStale(stale);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const refresh = () => {
    setLoading(true);
    fetchAlbionNews(true)
      .then(({ items, fetchedAt, stale }) => {
        setItems(items);
        setFetchedAt(fetchedAt);
        setStale(stale);
      })
      .finally(() => setLoading(false));
  };

  if (loading && items.length === 0) {
    return (
      <section className="space-y-3">
        <SectionDivider label="Latest from Sandbox Interactive" hint="via Steam Community Announcements" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="medieval-panel overflow-hidden animate-pulse">
              <div className="h-40 bg-zinc-800/60" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                <div className="h-3 bg-zinc-800/60 rounded" />
                <div className="h-3 w-5/6 bg-zinc-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <SectionDivider label="Latest from Sandbox Interactive" hint="via Steam Community Announcements" />
        <div className="medieval-panel p-6 text-center text-sm text-zinc-500">
          Couldn't load the latest news. Steam's API or one of the CORS proxies might be temporarily unreachable.
          <div className="mt-3">
            <button
              onClick={refresh}
              className="px-3 py-1.5 rounded bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 text-xs font-bold uppercase tracking-wider"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SectionDivider
          label="Latest from Sandbox Interactive"
          hint={stale
            ? 'Showing cached items — refresh failed'
            : fetchedAt
              ? `Fetched ${formatAge(ageHours(fetchedAt))} ago · auto-updates hourly`
              : 'via Steam Community Announcements'}
        />
        <div className="flex items-center gap-2">
          <a
            href="https://steamcommunity.com/app/761890/announcements/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-gold-light font-bold"
          >
            All on Steam →
          </a>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.slice(0, 6).map(item => (
          <NewsCard key={item.gid} item={item} />
        ))}
      </div>

      <div className="text-[10px] text-zinc-600 leading-relaxed px-1">
        Source: Sandbox Interactive announcements via Steam Web API · Albioncrafts is an unofficial companion and is not affiliated with Sandbox Interactive.
      </div>
    </section>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group medieval-panel overflow-hidden flex flex-col transition-colors hover:border-gold/40"
    >
      {item.thumbnail ? (
        <div className="relative h-40 overflow-hidden bg-zinc-900">
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Hide the broken image; the card still works without thumbnail.
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${KIND_STYLES[item.kind]}`}>
              {KIND_LABELS[item.kind]}
            </span>
          </div>
        </div>
      ) : (
        <div className="h-2 bg-gradient-to-r from-gold/30 via-gold/10 to-transparent" />
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        {!item.thumbnail && (
          <span className={`self-start px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${KIND_STYLES[item.kind]}`}>
            {KIND_LABELS[item.kind]}
          </span>
        )}
        <h3 className="text-sm font-bold text-zinc-100 group-hover:text-gold-light leading-snug">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>{fmtDate(item.dateMs)}</span>
          <span className="text-zinc-700">·</span>
          <span>{item.author}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed flex-1">
          {item.excerpt}
        </p>
        <div className="text-[10px] text-gold/70 group-hover:text-gold-light font-bold uppercase tracking-wider">
          Read on Steam →
        </div>
      </div>
    </a>
  );
}
