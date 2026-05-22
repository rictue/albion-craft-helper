import LegalLayout from './LegalLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function Contact() {
  usePageMeta({
    title: 'Contact',
    description: 'Get in touch about AlbionCrafts — report a calculator bug, suggest a feature, ask about the data sources, or send a thank-you. Email and GitHub issue tracker links.',
  });

  return (
    <LegalLayout title="Contact" lastUpdated="May 2026">
      <p>
        AlbionCrafts is built by a single Albion Online player working in spare time.
        There is no support desk, no team inbox, no ticket SLA — but every message
        gets read and most get a reply within a couple of days.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">The best ways to reach out</h2>

      <div className="space-y-3 mt-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-base font-bold text-gold mb-1">GitHub issues</h3>
          <p className="text-sm text-zinc-400">
            For bugs, feature requests, calculation errors, missing items, or anything
            else that has a clear technical answer. Public so other players can pile
            on if they see the same problem.
          </p>
          <a
            href="https://github.com/rictue/albion-craft-helper/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-gold hover:underline font-medium"
          >
            github.com/rictue/albion-craft-helper/issues →
          </a>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-base font-bold text-gold mb-1">Email</h3>
          <p className="text-sm text-zinc-400">
            For privacy questions, takedown requests, ad / sponsorship enquiries, or
            anything you don't want in a public issue tracker.
          </p>
          <a
            href="mailto:hello@albioncrafts.com"
            className="inline-block mt-2 text-sm text-gold hover:underline font-medium"
          >
            hello@albioncrafts.com →
          </a>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-base font-bold text-gold mb-1">In-game</h3>
          <p className="text-sm text-zinc-400">
            On the Europe server. Mail or whisper:
          </p>
          <p className="mt-2 text-sm text-gold font-bold">Rictue</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">When you write</h2>
      <p>
        If it's a bug, the absolute fastest fix is when you include:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li>Which tool you were on (Crafting / Refining / Transmute / …)</li>
        <li>Item, tier, enchant if relevant</li>
        <li>The number the site showed vs. the number you expected</li>
        <li>What city + which fee preset you had selected</li>
        <li>Server (Europe / Americas / Asia)</li>
      </ul>
      <p className="mt-3">
        Screenshots help — both for showing the wrong number and for showing the
        in-game value you cross-checked against.
      </p>

      <h2 className="text-xl font-bold text-zinc-100 mt-8 mb-3">What I can't help with</h2>
      <p>
        I can't get you unbanned, recover a lost account, refund silver, change market
        prices, or comment on Sandbox Interactive's roadmap. For any of those, the
        right place is{' '}
        <a href="https://albiononline.com/support" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
          Albion Online's official support
        </a>.
      </p>

      <p className="mt-6 text-sm text-zinc-500">
        Thanks for using AlbionCrafts — it stays alive because players use it and tell
        the author what's broken.
      </p>
    </LegalLayout>
  );
}
