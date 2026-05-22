import { Link } from 'react-router-dom';
import GuideLayout from './GuideLayout';
import { usePageMeta } from '../../hooks/usePageMeta';

export default function TransmutationChainStrategy() {
  usePageMeta({
    title: 'Transmutation Chain Strategy',
    description: 'Why chaining low-enchant transmutations beats direct one-step routes even when the pure silver math says otherwise. Open-world drop logic, buy-order fill speed, and how to use the chain scanner.',
  });

  return (
    <GuideLayout
      title="Transmutation chain strategy: when low-enchant inputs beat the obvious play"
      intro="The most common transmutation question on the trade Discord: should I buy T5.3 directly and one-step it to T6.3, or chain from T5.2 → T5.3 → T6.3 paying two transmute fees? The math says the direct path. The market says the chain. This guide is about why the market is right."
      readTime="7 min read"
      lastUpdated="May 2026"
    >
      <h2>Why transmutation matters at all</h2>
      <p>
        Albion has two ways to acquire a higher-tier-enchant resource: gather
        it (low yield, high time cost, dangerous at .3/.4 enchants) or
        transmute up from a lower variant. The transmutation system charges
        a fixed silver fee per step (the in-game station shows you the
        number), with no return rate involved. When the gap between input
        price and output price is wider than the fee, you print silver.
      </p>
      <p>
        Most players know this for one-step transmutes — same-tier enchant
        bumps like T6.2 → T6.3, or cross-tier moves like T5.3 → T6.3.
        Chaining multiple steps is less obvious but often the only
        realistic way to source volume at higher enchants.
      </p>

      <h2>The "obvious" path: why one-step looks cheaper</h2>
      <p>
        Consider a concrete example with current Lymhurst Hide prices:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>T5.2 Hide buy order: 2,408 silver/unit</li>
        <li>T5.3 Hide buy order: 11,717 silver/unit</li>
        <li>Step cost 5.2 → 5.3: 9,296 silver</li>
        <li>Step cost 5.3 → 6.3: 19,145 silver</li>
        <li>T6.3 Hide sell price: 35,987 silver/unit</li>
      </ul>
      <p>
        Two routes:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Chain T5.2 → T5.3 → T6.3</strong>: 2,408 + 9,296 + 19,145 = <strong>30,849 silver per unit cost.</strong></li>
        <li><strong>Direct T5.3 → T6.3</strong>: 11,717 + 19,145 = <strong>30,862 silver per unit cost.</strong></li>
      </ul>
      <p>
        The direct route is 13 silver cheaper per unit. The math says: buy T5.3
        directly, save 13 silver, and skip the extra transmute click.
      </p>

      <h2>Why the chain still wins in practice</h2>
      <p>
        Two reasons. The first is fill speed, and it's the bigger one.
      </p>
      <p>
        Albion's open-world resource drops are biased toward low enchants.
        A red-zone gathering session yields piles of .0, plenty of .1, fewer
        .2, rare .3, and almost no .4. When you place a buy order on T5.2
        Hide, it fills in minutes — the supply pipeline is huge. When you
        place a buy order on T5.3 Hide, it might sit for days because the
        sellers simply aren't there.
      </p>
      <p>
        If your strategy is "buy 100 units, transmute, sell 100 units, repeat
        weekly," fill speed dictates throughput. A chain that uses T5.2 input
        runs five cycles per week. A direct T5.3 strategy might run one. The
        13-silver-per-unit "saving" is irrelevant when you're moving 5× the
        volume on the chain route.
      </p>
      <p>
        The second reason is buy-order vs sell-order pricing. The numbers
        above use buy-order entry — your patient buy order at 2,408. If you
        had to instantly buy from sell orders (often the only realistic
        option for high-enchant materials in thin markets), the input price
        rises and the gap closes further or flips.
      </p>

      <h2>The chain transmute scanner</h2>
      <p>
        The{' '}
        <Link to="/transmute" className="text-gold hover:underline">Transmutation Scanner</Link>{' '}
        has a dedicated Chain Transmute panel that searches all multi-hop
        paths to every target tier-enchant. The pathfinder picks the
        cheapest step-cost combination per (source, target) pair, applies
        your entry/exit fee preset, and ranks rows by best exit profit.
      </p>
      <p>
        Two important toggles:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>End Goal filter</strong> — set this to e.g. T6.3 if you
          only want to see chains that end at T6.3. Cuts the noise from
          unrelated tiers.
        </li>
        <li>
          <strong>Show only chain wins</strong> — when on, the scanner
          hides chains that are technically more expensive than the
          direct one-step alternative. This is OFF by default because, as
          the section above explains, the fill-speed argument means some
          paper-loss chains are actually the right call. Power users who
          care only about silver-per-unit can flip it on.
        </li>
      </ul>

      <h2>How to use it as a daily routine</h2>
      <p>
        Daily flow:
      </p>
      <ol className="list-decimal pl-6 space-y-1">
        <li>Fetch live prices from your trading city.</li>
        <li>Set End Goal to whatever you actually want to produce — T6.3 Hide is a perennial seller because crafters need it for T6 leather.</li>
        <li>Sort by profit and skim the top 5 rows.</li>
        <li>Check the exit options inline — sell order, buy order, and direct trade — and pick whichever matches how you plan to liquidate.</li>
        <li>Place a buy order for the source tier (T5.2 in this example) and walk away. Come back when the order fills, transmute up, sell.</li>
      </ol>

      <h2>The fee-side caveat</h2>
      <p>
        Buy-order entry has a +2.5% setup fee built in (premium), so the
        chain math should always include that. The scanner does it
        automatically, but if you're doing back-of-the-envelope checks in a
        spreadsheet, remember to multiply your input price by 1.025.
      </p>
      <p>
        Direct trade exits (selling in-game at a negotiated price) bypass
        the marketplace entirely — no tax, no setup fee. If you have a
        regular buyer for high-tier transmuted materials, this is the
        cleanest exit. The scanner shows direct-trade alongside sell-order
        and buy-order exits in the chain card so you can compare apples to
        apples.
      </p>
    </GuideLayout>
  );
}
