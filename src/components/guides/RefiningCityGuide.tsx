import { Link } from 'react-router-dom';
import GuideLayout from './GuideLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function RefiningCityGuide() {
  usePageMeta({
    title: 'Refining City Guide',
    description: 'Complete guide to refining cities in Albion Online: which royal city specialises in which resource, how the +40 LPB bonus translates to return rate, and why focus + city stacking is the only refining loop worth running.',
  });

  return (
    <GuideLayout
      title="The complete Refining City guide"
      intro="Refining is where most of Albion's silver comes from, and the choice of refining city is the single biggest decision in the loop. This guide breaks down the resource-to-city mapping, the actual return-rate math behind the city bonus, and the only refining setup worth running if you care about silver per focus point."
      readTime="8 min read"
      lastUpdated="May 2026"
    >
      <h2>The city-to-resource mapping</h2>
      <p>
        Each of the five royal cities specialises in exactly one refining family.
        Putting your refining station at the right city stacks an extra 40 LPB
        (Local Production Bonus) on top of the base station's 18 LPB. That's a big
        deal — it nearly doubles your effective output per raw resource.
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Fort Sterling</strong> — Wood (planks)</li>
        <li><strong>Lymhurst</strong> — Fiber (cloth)</li>
        <li><strong>Bridgewatch</strong> — Stone (stone blocks)</li>
        <li><strong>Martlock</strong> — Hide (leather)</li>
        <li><strong>Thetford</strong> — Ore (metal bars)</li>
      </ul>
      <p>
        These are tier-locked: a single city specialises in the entire chain of
        one resource family, not "T6 wood here, T7 wood there." There is no
        Black Market or Caerleon refining bonus — those cities give nothing to
        refiners.
      </p>

      <h2>What "+40 LPB" actually means in silver</h2>
      <p>
        LPB stands for Local Production Bonus and it feeds into a single formula
        for return rate: <code>RR = LPB / (100 + LPB)</code>. Every Albion
        refining buff stacks into the same LPB pool, then the pool is converted
        to a return rate.
      </p>
      <p>
        Stack table (one resource family, the spec city, no daily bonus):
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Base station only: 18 LPB → <strong>15.25% RR</strong></li>
        <li>+ Spec city (40 LPB): 58 LPB → <strong>36.71% RR</strong></li>
        <li>+ Focus (59 LPB): 117 LPB → <strong>53.92% RR</strong></li>
        <li>+ City + Focus stacked: 117 LPB → <strong>53.92% RR</strong></li>
      </ul>
      <p>
        Now overlay daily production bonuses (often +5 to +20 LPB on a rotating
        city/category basis — the game shows the actual percent at the station)
        and you can push past 60% RR. That's not "60% of your materials come
        back as extras." With the reinvest loop on, those returns immediately go
        back into the next batch, and the long-run multiplier is closer to{' '}
        <code>1 / (1 − RR)</code>. At 53.92% RR you're producing roughly 2.17×
        the items you started with; at 60% RR you're producing 2.5×.
      </p>

      <h2>Refining anywhere else is a tax on your silver</h2>
      <p>
        If you refine wood in Lymhurst instead of Fort Sterling, you give up
        the entire 40 LPB city bonus. Your effective output drops from ~2.17×
        to about 1.36× per raw unit. To make that worthwhile, the silver
        price difference between Lymhurst and Fort Sterling would need to
        compensate for the lost output — and in 99% of cases it doesn't. The
        spread is usually a few percent; the lost yield is closer to 30%.
      </p>
      <p>
        The exception is when you can't physically reach the spec city
        (Lymhurst gets sieged, your stash is in Bridgewatch and you don't want
        to transport, etc). In that case, the{' '}
        <Link to="/refining" className="text-gold hover:underline">Refining Calculator</Link>{' '}
        will tell you whether the trade-off is silver-positive, but expect to
        be disappointed.
      </p>

      <h2>The premium and focus loop</h2>
      <p>
        Premium status doesn't add LPB directly, but it doubles laborer yield
        and reduces the marketplace tax — both of which feed back into your
        refining bottom line. More importantly, premium unlocks the full 30,000
        daily focus, and focus is where the big LPB jump comes from. Without
        premium you regenerate focus at a quarter the rate, which caps how many
        crafts you can fully focus-buff per day.
      </p>
      <p>
        Practical recipe for refining as your main silver income:
      </p>
      <ol className="list-decimal pl-6 space-y-1">
        <li>Pick one resource family and stick with it until your specs are 100.</li>
        <li>Always refine at that family's spec city.</li>
        <li>Always use focus. The silver-per-focus on T6/T7 refining is unmatched.</li>
        <li>Check the daily production bonus — refining the bonused tier first multiplies the city bonus.</li>
        <li>Transport the refined materials to wherever the crafter demand is highest. The Black Market often beats royal cities for refined bars at T7+ because the BM bots are reliable buyers.</li>
      </ol>

      <h2>The focus budget question</h2>
      <p>
        Daily focus runs out fast at high tier. T7 refining costs hundreds of
        focus per craft, T8 costs ~600+. With 30,000 daily focus you'll burn
        through it in 50–100 crafts at high tier. After that you either stop
        for the day, drop to non-focus refining (which loses the focus LPB and
        collapses your RR back to ~36%), or switch to a lower tier where focus
        cost-per-craft is smaller.
      </p>
      <p>
        The reinvest loop math in the calculator handles this for you: the
        focus-budget slider caps how many of your crafts get focus, and the
        rest run unfocused. Two-thirds focus / one-third no-focus is a common
        compromise when you want to clear inventory but don't want to babysit a
        second day's worth of focus.
      </p>

      <h2>Patch sensitivity</h2>
      <p>
        Sandbox Interactive occasionally rebalances LPB values and station fees
        (the 18 LPB base, the 40 LPB city bonus, and the 59 LPB focus bonus
        have all been adjusted at least once in the last few years). If the
        numbers in the Refining Calculator ever stop matching the in-game
        station, check the patch notes — usually a Dev Talk explains the
        change.
      </p>
    </GuideLayout>
  );
}
