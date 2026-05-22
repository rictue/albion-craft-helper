import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function Terms() {
  usePageMeta({
    title: 'Terms of Use',
    description: 'AlbionCrafts terms of use — disclaimer of warranties, no Sandbox Interactive affiliation, fair use of community data, and rules for using the calculators and tools.',
  });

  return (
    <LegalLayout title="Terms of Use" lastUpdated="May 2026">
      <p>
        These terms govern your use of <strong>albioncrafts.com</strong> ("the site").
        By loading any page you accept them. They are intentionally short and plain.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">1. Not affiliated with Sandbox Interactive</h2>
      <p>
        Albion Online and every related name, logo, item, lore element and screenshot
        are trademarks or copyright of Sandbox Interactive GmbH. AlbionCrafts is an
        unofficial fan-made companion site. The author is not employed by Sandbox
        Interactive, has no commercial relationship with them, and the site has not
        been reviewed or endorsed by them.
      </p>
      <p>
        Where you see Albion items, item names or icons on this site, they are used
        for descriptive and informational purposes only, as a community resource for
        players of the game.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">2. No warranty — use at your own risk</h2>
      <p>
        The calculators on this site are provided "as is" with no warranty of
        accuracy, completeness or fitness for purpose. Market prices are crowd-sourced
        from the Albion Online Data Project and can be hours or days stale. Tax,
        return-rate and focus formulas are derived from community wiki notes and may
        lag behind balance patches.
      </p>
      <p>
        <strong>Always verify with the in-game market window before any large trade.</strong>{' '}
        If you lose silver because you trusted a number on this site that turned out
        to be wrong, that's on you, not the author.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">3. Acceptable use</h2>
      <p>
        You may use AlbionCrafts for personal Albion-related purposes — planning
        trades, planning crafts, tracking your own portfolio. You may not:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Scrape the site at high volume or in a way that imposes a cost on the host.</li>
        <li>Re-distribute the calculator code or the AODP-derived data as if it were your own original work.</li>
        <li>Use AlbionCrafts as part of a service that violates Albion Online's own Terms of Service (botting, RMT, account selling, etc).</li>
      </ul>
      <p>
        Linking to AlbionCrafts pages, embedding individual calculator outputs in
        guides, and discussing the site's numbers in Discord/forums is all fine and
        actively encouraged.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">4. Third-party content and data</h2>
      <p>
        Market prices appear courtesy of the Albion Online Data Project. News and
        patch-notes summaries on the dashboard come from Sandbox Interactive's
        official Steam Community Announcements via Valve's public ISteamNews API and
        always link back to the source. Item icons come from Albion's public render
        endpoint. The author claims no copyright over any of that content; the
        copyright remains with its respective owners.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">5. Local data is your responsibility</h2>
      <p>
        Anything you type into the site (custom prices, profit history, portfolio
        snapshots, trade journal) is stored in your browser's <code>localStorage</code>{' '}
        on your own device. The author has no copy of it and cannot recover it for
        you if your browser data is cleared. Use the export buttons in Settings to
        back up data you don't want to lose.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">6. Limitation of liability</h2>
      <p>
        To the extent permitted by applicable law, the author of AlbionCrafts is not
        liable for any direct, indirect, incidental or consequential loss — silver,
        time, gear, or otherwise — arising from your use of the site. Your sole
        remedy if you are unhappy with the site is to stop using it.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">7. Changes</h2>
      <p>
        These terms can change as the site evolves. The updated date at the top of
        this page reflects the latest revision. Continued use after a change means
        you accept the new version.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">8. Governing law</h2>
      <p>
        The site is operated from Turkey. Disputes that cannot be settled informally
        will be resolved under Turkish law, in the courts of Istanbul.
      </p>

      <p>
        Disagreement with anything above? Get in touch through{' '}
        <Link to="/contact" className="text-gold hover:underline">Contact</Link> before
        relying on a calculator number for a real trade.
      </p>
    </LegalLayout>
  );
}
