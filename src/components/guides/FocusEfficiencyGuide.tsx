import { Link } from 'react-router-dom';
import GuideLayout from './GuideLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function FocusEfficiencyGuide() {
  usePageMeta({
    title: 'Focus Efficiency Guide',
    description: 'Where to spend your 30,000 daily focus in Albion Online to maximise silver per focus point. Detailed comparison of refining, crafting, cooking, and laborer journal options across the typical tier range.',
  });

  return (
    <GuideLayout
      title="Where your 30k daily focus earns the most silver"
      intro="Focus is the limiting reagent of every Albion crafting career. You only get 30,000 per day with premium, and the choice of where to spend it changes your daily income by a factor of three. This guide walks through the silver-per-focus math for every realistic activity, with concrete numbers from the current market."
      readTime="10 min read"
      lastUpdated="May 2026"
    >
      <h2>What "silver per focus" actually measures</h2>
      <p>
        Every focus-eligible craft has two numbers: the focus cost (depends on
        tier, enchant, spec) and the silver profit per craft (depends on
        material prices, sell price, return rate, taxes). Divide profit by
        focus and you get silver-per-focus — the single number that ranks
        every focus option against every other.
      </p>
      <p>
        Your daily budget is 30,000 focus. If activity A gives 80 silver per
        focus and activity B gives 30, A nets you 2.4M/day vs B's 900k. Same
        time investment, same effort, three times the silver.
      </p>

      <h2>Refining: the safest high-value sink</h2>
      <p>
        At spec city + spec 100 + focus, refining return rate sits around
        55–60%. The focus cost per refine is moderate — T6 wood costs 201 focus
        per refine, T7 costs 402. Combined with the reinvest loop multiplier,
        the silver-per-focus on refining is consistently 50–100 silver across
        tiers when market prices are normal.
      </p>
      <p>
        Tier matters. T4 refining is too cheap — the silver profit per craft
        is small even with the focus discount. T5/T6 is the sweet spot for most
        servers because raw materials are plentiful and refined materials have
        consistent buyer demand. T7 swings: when crafters are stockpiling for
        a content release T7 refining can hit 150 silver/focus, when the
        market is saturated it drops below 30.
      </p>
      <p>
        T8 is high variance. The raw materials (Yew logs, Adamantium ore) are
        expensive and the refined materials sell to a smaller pool of crafters
        — usually the artifact-weapon makers. Best done when you can confirm
        the refined-tier sell price in the{' '}
        <Link to="/market" className="text-gold hover:underline">Market Browser</Link> before
        committing focus.
      </p>

      <h2>Crafting equipment: variable and patch-sensitive</h2>
      <p>
        Equipment crafting (swords, armor, capes, bags) has higher focus cost
        per craft than refining at the same tier, partly compensated by higher
        sell prices on the finished item. Silver per focus ranges from 20 to
        200 depending on what's in demand.
      </p>
      <p>
        Patch-driven swings are huge here. When the meta shifts and a new
        weapon becomes flavor-of-the-month, crafters of that weapon can pull
        300 silver/focus for a week or two before everyone piles in and the
        margin collapses. Watching patch notes (the news feed on the{' '}
        <Link to="/" className="text-gold hover:underline">dashboard</Link> surfaces them
        as they drop) is the single best edge you have.
      </p>
      <p>
        For consistent income, T6 armor and T6 weapons are the workhorses.
        Demand is steady because of mid-tier ZvZ content, and the focus cost
        per craft is manageable. T8 equipment is for whales — high silver but
        high variance.
      </p>

      <h2>Cooking: low ceiling but very efficient</h2>
      <p>
        Cooked food is the most focus-efficient activity in the game when you
        look at silver per focus point in isolation. Focus cost per meal is
        tiny compared to refining or crafting, and meal demand is constant
        because every guild fight burns through food.
      </p>
      <p>
        The catch: the absolute silver per craft is small. Even at 100
        silver/focus, you'd need to grind through hundreds of cooking cycles
        to clear 30k focus, and that takes time at the cooking station that
        could be spent doing something else. Cooking is best used as a focus
        cleanup at the end of the day when you've drained your refining/craft
        budget but still have focus left over.
      </p>
      <p>
        Fish sauce is the secret high-tier unlock — enchanted meals normally
        need a matching enchanted fish, which is rare, but fish sauce
        substitutes for it. The{' '}
        <Link to="/cooking" className="text-gold hover:underline">Cooking Calculator</Link>{' '}
        compares the fish-sauce path against the direct-fish path so you can
        pick the cheaper option per recipe.
      </p>

      <h2>Laborer journals: lazy but real</h2>
      <p>
        Filled crafting journals can be sold to the marketplace or used to
        feed laborers. The fame from your daily focus-buffed crafts fills the
        journal for "free", so the silver from selling the filled journal is
        effectively bonus focus income.
      </p>
      <p>
        Realistic numbers: a T6 filled crafting journal sells for 80k-120k
        silver. If you crafted 50 T6 items today and filled 3 journals, that's
        ~300k extra silver on top of your direct craft profits. It's not life-
        changing per day, but stacked over a month it's an extra 8-10M.
      </p>
      <p>
        Don't intentionally craft just to fill journals — the silver per focus
        on filling a journal alone (i.e. ignoring the silver from the craft
        itself) is mediocre. The point is that journal income is downstream of
        crafts you'd do anyway.
      </p>

      <h2>The schedule that maximises 30k focus</h2>
      <p>
        A common high-output day:
      </p>
      <ol className="list-decimal pl-6 space-y-1">
        <li>Morning: refine 5,000–10,000 raw materials at your spec city. Burns 10–15k focus, nets 1–2M silver, fills crafting journals.</li>
        <li>Midday: craft equipment with the refined materials, mostly T6. Burns another 5–10k focus, nets 0.5–1.5M silver, fills more journals.</li>
        <li>Evening: cook meals to clear any remaining focus. Burns the last 5–10k, nets 200–500k.</li>
        <li>Sell filled journals on the marketplace at the weekly demand peak (usually weekends).</li>
      </ol>
      <p>
        Total daily income from this loop: 2–4M silver, plus journal income
        you cash in when convenient. Premium pays for itself many times over.
      </p>

      <h2>The "is this focus worth it?" rule of thumb</h2>
      <p>
        If you're not getting at least 40 silver per focus on whatever you're
        doing, you're underperforming. Common reasons:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Crafting in a non-spec city → 30% loss on every craft.</li>
        <li>Refining at low spec → focus cost is high relative to output.</li>
        <li>Crafting items the market doesn't want → low sell price.</li>
        <li>Not using the AODP outlier filter → buying materials at a 70k joke listing.</li>
      </ul>
      <p>
        The{' '}
        <Link to="/calculator" className="text-gold hover:underline">Crafting Calculator</Link>{' '}
        and{' '}
        <Link to="/refining" className="text-gold hover:underline">Refining Calculator</Link>{' '}
        both surface a silver-per-focus number in the result panel. Anything
        below 40 should make you reconsider — there's almost certainly a
        better focus sink right now.
      </p>
    </GuideLayout>
  );
}
