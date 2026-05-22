import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function About() {
  usePageMeta({
    title: 'About',
    description: 'About AlbionCrafts — a free, ad-supported Albion Online companion site built by a single Albion player. Tools include crafting and refining calculators, market browser, transmutation scanner and more.',
  });

  return (
    <LegalLayout title="About AlbionCrafts" lastUpdated="May 2026">
      <p>
        <strong>AlbionCrafts</strong> is a free companion website for{' '}
        <em>Albion Online</em>, the player-driven sandbox MMORPG by Sandbox Interactive.
        It bundles the calculators and lookups I personally needed to play the economy
        side of the game — crafting profit math, refining return-rate planning,
        cross-city market browsing, transmutation chain hunting — into one dark, fast,
        offline-capable dashboard.
      </p>

      <p>
        It is a one-developer side project. There is no studio behind it, no investors,
        no analytics team. If something looks rough, the explanation is usually "the
        author hasn't gotten to it yet" rather than "this is the optimal design."
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">What you can do here</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <Link to="/calculator" className="text-gold hover:underline">Crafting Calculator</Link> — pick any item, tier and enchant, see net profit at the craft city of your choice with the full fee chain applied.
        </li>
        <li>
          <Link to="/refining" className="text-gold hover:underline">Refining Calculator</Link> — convert raw resources into refined materials with LPB return rate, focus cost, transport weight, and a reinvest loop simulation.
        </li>
        <li>
          <Link to="/cooking" className="text-gold hover:underline">Cooking Calculator</Link> — recipe-by-recipe meal profit, including the fish-sauce path.
        </li>
        <li>
          <Link to="/transmute" className="text-gold hover:underline">Transmutation Profit Scanner</Link> — paste live prices, see profit, ROI and break-even for every tier-and-enchant step, and discover multi-hop chain plays that beat the direct route.
        </li>
        <li>
          <Link to="/market" className="text-gold hover:underline">Market Browser</Link> — type an item, pick tier/enchant, see prices in every royal city + Black Market side by side. Like the in-game market window but cross-city.
        </li>
        <li>
          <Link to="/laborers" className="text-gold hover:underline">Laborer Calculator</Link> — net silver per 24-hour cycle, journal cost, happiness penalty, and house-upgrade ROI.
        </li>
        <li>
          <Link to="/gold" className="text-gold hover:underline">Gold Prices</Link> and{' '}
          <Link to="/portfolio" className="text-gold hover:underline">Portfolio Tracker</Link> for the longer-term money side.
        </li>
      </ul>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">Where the data comes from</h2>
      <p>
        Market prices are pulled from the{' '}
        <a href="https://www.albion-online-data.com/" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
          Albion Online Data Project
        </a>{' '}
        (AODP), a community-run service that aggregates anonymous price snapshots
        uploaded by players running the official data client. Because the data is
        crowd-sourced, niche items can be hours stale and a single bad upload can drag
        a market average sideways — AlbionCrafts applies a 2× median outlier filter to
        the worst offenders, but the underlying caveat stands: cross-check the in-game
        market window before any big trade.
      </p>

      <p>
        News and patch notes on the dashboard come from{' '}
        <strong>Sandbox Interactive's official Steam Community Announcements</strong>{' '}
        via Valve's public ISteamNews API. Every card links straight back to the
        original Steam post.
      </p>

      <p>
        Albion Online is a trademark of Sandbox Interactive GmbH. AlbionCrafts is
        unofficial fan-made software and has no business relationship with Sandbox
        Interactive. See the <Link to="/terms" className="text-gold hover:underline">Terms</Link>{' '}
        page for the full disclaimer.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">How the site stays online</h2>
      <p>
        AlbionCrafts is free to use and free of charge — no premium tiers, no paywalls,
        no Patreon. Hosting, domain renewal and the AODP server load it generates are
        covered by a small number of Google AdSense banners that appear on the layout
        edges. They are kept away from the calculator panels themselves so they never
        block your input or shift the page while you are typing prices.
      </p>

      <p>
        If you spot a calculation bug, a stale formula, or an item the calculator can't
        find, send a note through the <Link to="/contact" className="text-gold hover:underline">Contact</Link> page —
        every report gets read.
      </p>
    </LegalLayout>
  );
}
