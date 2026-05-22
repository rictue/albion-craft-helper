import { Link } from 'react-router-dom';
import LegalLayout from './LegalLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function Privacy() {
  usePageMeta({
    title: 'Privacy Policy',
    description: 'AlbionCrafts privacy policy: what data is stored locally in your browser, what is sent to third parties (AODP, Steam, Google AdSense), how to clear everything, and which jurisdictions apply.',
  });

  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 2026">
      <p>
        AlbionCrafts is built local-first: every calculator state, every custom price,
        every saved trade and snapshot lives in your browser's <code>localStorage</code>{' '}
        on the device you are using. No account, no server-side profile, no shadow
        copy of your data sitting on someone else's hard drive. This policy explains
        exactly what is stored where, what leaves your device, and how to wipe
        everything.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">Data stored locally in your browser</h2>
      <p>
        The following are saved in your browser's <code>localStorage</code> and never
        leave your device unless you explicitly export them:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Calculator settings: server, default city, focus toggle, premium toggle, tax preset.</li>
        <li>Recently viewed items, last picked tier and enchant per tool.</li>
        <li>Manually entered (custom) market prices that override stale AODP data.</li>
        <li>Refining specialization figures and item-mastery numbers you typed in.</li>
        <li>Profit history entries you saved through the Crafting History tool.</li>
        <li>Portfolio snapshots: cash + items + snapshot timestamps.</li>
        <li>Transmute scanner price matrix and preset transmute costs.</li>
        <li>UI preferences: panel layout, dark/light theme toggle, expanded sections.</li>
      </ul>
      <p>
        Clearing your browser's site data for <code>albioncrafts.com</code> erases all
        of the above immediately and irreversibly. There is no server-side copy to
        recover.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">If you sign in with Discord</h2>
      <p>
        Signing in with Discord is optional and powered by{' '}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Supabase</a>{' '}
        Auth. If you choose to sign in, AlbionCrafts receives only the public profile
        fields Discord exposes via OAuth: your Discord ID, username, and avatar URL.
        This data is used so the site can show "Welcome, &lt;name&gt;" and optionally
        let future cloud-sync features attach to your account. No private Discord
        messages, friends list, server list, or email is ever requested or received.
      </p>
      <p>
        You can sign out at any time from the Profile menu; Supabase deletes the
        session token on your device. To remove the Discord OAuth grant entirely, go
        to{' '}
        <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
          Discord's Authorized Apps settings
        </a>{' '}
        and revoke AlbionCrafts.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">Third-party services contacted from your browser</h2>
      <p>
        Some pages fetch data from third-party servers. When that happens your IP
        address and request headers are visible to them, the same as on any other
        website:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Albion Online Data Project</strong> (<code>albion-online-data.com</code>) — live
          market prices for the items you're looking at. No personal data is sent;
          only the item IDs and city list AODP needs to answer the query.
        </li>
        <li>
          <strong>Steam Web API</strong> (<code>api.steampowered.com</code>) — the news/patch-notes
          feed for the dashboard. Read-only, no auth.
        </li>
        <li>
          <strong>Gameinfo proxy chain</strong> (<code>codetabs.com</code>, <code>allorigins.win</code>,{' '}
          <code>corsproxy.io</code>) — public CORS proxies used to reach Albion's
          gameinfo API for player/guild/killboard lookups. Each proxy logs requests
          per their own privacy terms.
        </li>
        <li>
          <strong>Google Fonts</strong> — the Cinzel and Inter font files.
        </li>
        <li>
          <strong>Render</strong> (<code>render.com</code>) — hosts the static site;
          standard access logs apply.
        </li>
      </ul>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">Advertising</h2>
      <p>
        AlbionCrafts displays Google AdSense banners to cover hosting costs. AdSense
        sets cookies and uses your browser identifiers to serve relevant ads. Google's
        practices are governed by Google's own privacy and ad policies:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Google Privacy Policy</a>
        </li>
        <li>
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">How Google uses cookies in advertising</a>
        </li>
        <li>
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Manage your ad personalization</a>
        </li>
      </ul>
      <p>
        AlbionCrafts itself does not run any other analytics or tracking — no Google
        Analytics, no Facebook Pixel, no Hotjar, no Mixpanel.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">Cookies</h2>
      <p>
        Apart from cookies set by the third parties listed above (chiefly Google
        AdSense and, if you use it, Supabase Auth), AlbionCrafts does not set any
        first-party cookies. Your preferences are kept in <code>localStorage</code>,
        which is separate from cookies and is never automatically sent with HTTP
        requests.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">Children</h2>
      <p>
        AlbionCrafts is intended for Albion Online players, who must be at least 13
        years old per Albion's own terms. The site is not designed for or directed at
        children under that age.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">Changes to this policy</h2>
      <p>
        If this policy changes the updated date at the top will be bumped, and any
        material change will be called out on the site for at least a week.
      </p>

      <p>
        Questions or requests about your data? Reach out via the{' '}
        <Link to="/contact" className="text-gold hover:underline">Contact</Link> page.
      </p>
    </LegalLayout>
  );
}
