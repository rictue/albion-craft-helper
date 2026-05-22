import { Link } from 'react-router-dom';
import GuideLayout from './GuideLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function PremiumVsNonPremium() {
  usePageMeta({
    title: 'Premium vs non-premium — is it worth the silver?',
    description: 'Detailed comparison of Albion Online premium status: laborer yield, marketplace tax, learning point regen, focus pool. When premium pays for itself within a day and when it doesn\'t.',
  });

  return (
    <GuideLayout
      title="Premium vs non-premium: is it worth the silver?"
      intro="Premium is Albion's monthly subscription, payable in real cash or with in-game gold. It touches almost every silver-generating activity in the game, but the actual return varies wildly by play style. This guide breaks down the math and tells you when premium pays for itself within a day, and when you're better off staying free."
      readTime="6 min read"
      lastUpdated="May 2026"
    >
      <h2>What premium actually does</h2>
      <p>
        Five concrete in-game effects:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>2× laborer yield</strong> — every laborer gives you double the resources per 24-hour cycle.</li>
        <li><strong>Marketplace sales tax dropped from 8% to 4%</strong> — half the cost on every sell.</li>
        <li><strong>4× learning point regen</strong> — applies to your fame catch-up bonus, indirectly speeding up your mastery levels.</li>
        <li><strong>4× focus regen</strong> — non-premium players regenerate focus at a fraction of the rate, capping how many focus-buffed crafts they can pull per day.</li>
        <li><strong>50% bonus on island plot rewards</strong> — farms and pastures produce more.</li>
      </ul>

      <h2>The "what does premium cost in silver" number</h2>
      <p>
        You can buy premium with gold from the in-game exchange. The current
        gold-to-silver rate is shown live on the{' '}
        <Link to="/gold" className="text-gold hover:underline">Gold Prices</Link>{' '}
        page. As of writing, gold trades around 6,800–7,000 silver per unit,
        and a 30-day premium pass costs 1,950 gold — call it 14M silver per
        month, or roughly <strong>465k silver per day</strong>.
      </p>
      <p>
        That's the break-even bar. If your premium-driven silver gains exceed
        465k per day, premium pays for itself.
      </p>

      <h2>The fast-pay-back case: a refining main</h2>
      <p>
        A refiner running T6/T7 with focus, in the spec city, on a full daily
        focus pool, easily nets 1–3M silver per day before premium effects.
        Premium adds:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>+4% on every refined-material sale</strong> from the lower tax. On 2M of daily sells, that's +80k.</li>
        <li><strong>Full 30k focus daily</strong> instead of ~7.5k. The extra 22.5k of focus is worth roughly 500–800k of additional refining margin per day at T6, more at higher tiers.</li>
        <li><strong>Double laborer yield</strong>. If you run 12 lumberjacks, you go from ~600k/day in laborer silver to ~1.2M/day.</li>
      </ul>
      <p>
        Premium adds roughly 1.5–2M silver per day to a refiner. The 465k/day
        cost is paid back in the first six hours. <strong>Premium is a no-brainer
        for refiners.</strong>
      </p>

      <h2>The mixed case: a PvP/PvE player who also crafts a bit</h2>
      <p>
        A combat-focused player who crafts occasionally gets less out of
        premium. The focus pool only matters if you actually burn it — many
        casual crafters use a tenth of their daily focus. Laborers help but
        require house slots that compete with crafting stations.
      </p>
      <p>
        Where premium still wins: every fame-yielding kill or dungeon hands
        back more learning points, accelerating mastery progression. If you're
        chasing a specific weapon mastery (the Bow tree at 100, for example),
        premium can shave weeks off the grind. The silver value is harder to
        pin down, but it's substantial if you're early in the mastery climb.
      </p>
      <p>
        <strong>Premium is worth it if you're actively pushing mastery or running
        laborers daily, marginal otherwise.</strong>
      </p>

      <h2>The free case: a brand-new player or a casual</h2>
      <p>
        New players who log in a few hours per week don't burn focus fast
        enough for the regen difference to matter, don't have multiple
        laborers, and aren't pushing fame hard enough for the LP regen to
        shave anything off. Premium at 465k/day is a real cost without a
        clear return.
      </p>
      <p>
        Stay free until one of the following is true: you're running at least
        4–6 laborers daily, you're refining or crafting through all 30k focus
        most days, or you're chasing a specific mastery above 50 you want to
        accelerate.
      </p>

      <h2>The hidden tax: focus regen on non-premium</h2>
      <p>
        The single biggest non-premium pain point is the slow focus regen.
        Non-premium accumulates focus at roughly a quarter of the premium
        rate, capped lower. In practice this means a non-premium player
        rarely benefits from focus at all — the daily pool isn't big enough
        to make a meaningful dent in higher-tier refining or crafting, so
        most non-premium players just turn focus off and accept a 50%
        return-rate hit on every craft.
      </p>
      <p>
        Use the focus toggle in the{' '}
        <Link to="/calculator" className="text-gold hover:underline">Crafting Calculator</Link> and{' '}
        <Link to="/refining" className="text-gold hover:underline">Refining Calculator</Link>{' '}
        to see exactly what your focus pool buys per day. If the answer is
        less than 465k/day premium pays for itself, you're not getting your
        money's worth out of premium yet.
      </p>

      <h2>The cash vs gold question</h2>
      <p>
        If your time-to-silver is high (i.e. you make money fast in-game),
        buying premium with silver-converted-to-gold is the better deal. If
        your time is more limited, paying real cash is fine — Sandbox isn't
        gouging on the cash price.
      </p>
      <p>
        Either way, the gold price chart on the{' '}
        <Link to="/gold" className="text-gold hover:underline">Gold Prices</Link>{' '}
        page is your friend for timing. Gold spikes after new content drops
        and dips a week or two later; if you can plan a renewal you save 5–10%
        per cycle by waiting for the dip.
      </p>
    </GuideLayout>
  );
}
