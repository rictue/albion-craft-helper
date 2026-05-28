/**
 * Marketplace tax & fee reference. Pulls the live constants from
 * marketFees.ts so the numbers always match what the calculators apply.
 */

import { TAX_PRESETS, PRIVATE_SALE_MULTIPLIER } from '../../utils/marketFees';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';
import { PageHeader } from '../ui';
import { IconScales } from '../shell/navIcons';

interface FeeRow {
  action: string;
  premium: string;
  nonPremium: string;
  note: string;
}

export default function MarketFeesRef() {
  usePageMeta({
    title: 'Market Tax & Fees Reference',
    description: 'Albion Online marketplace tax and setup fee reference. Premium pays 4% sales tax, non-premium 8%, plus a 2.5% setup fee when you post an order. Direct (private) trades pay nothing. See the exact net multipliers for every sell route.',
  });

  const prem = TAX_PRESETS.premium;
  const norm = TAX_PRESETS.normal;

  // Net multiplier helpers
  const instantSell = (tax: number) => (1 - tax / 100);
  const sellOrder = (tax: number, setup: number) => (1 - (tax + setup) / 100);

  const rows: FeeRow[] = [
    {
      action: 'Instant sell (into a buy order)',
      premium: `×${instantSell(prem.salesTaxPct).toFixed(3)} (−${prem.salesTaxPct}%)`,
      nonPremium: `×${instantSell(norm.salesTaxPct).toFixed(3)} (−${norm.salesTaxPct}%)`,
      note: 'Sales tax only — no setup fee',
    },
    {
      action: 'Sell order (post + wait)',
      premium: `×${sellOrder(prem.salesTaxPct, prem.setupFeePct).toFixed(3)} (−${prem.salesTaxPct + prem.setupFeePct}%)`,
      nonPremium: `×${sellOrder(norm.salesTaxPct, norm.setupFeePct).toFixed(3)} (−${norm.salesTaxPct + norm.setupFeePct}%)`,
      note: 'Sales tax + setup fee',
    },
    {
      action: 'Direct trade (private / Discord)',
      premium: `×${PRIVATE_SALE_MULTIPLIER.toFixed(3)} (no fee)`,
      nonPremium: `×${PRIVATE_SALE_MULTIPLIER.toFixed(3)} (no fee)`,
      note: 'Bypasses the marketplace entirely',
    },
  ];

  const buyRows: FeeRow[] = [
    {
      action: 'Instant buy (from a sell order)',
      premium: '×1.000 (no fee)',
      nonPremium: '×1.000 (no fee)',
      note: 'Pay the sticker price, nothing extra',
    },
    {
      action: 'Buy order (post + wait)',
      premium: `×${(1 + prem.setupFeePct / 100).toFixed(3)} (+${prem.setupFeePct}%)`,
      nonPremium: `×${(1 + norm.setupFeePct / 100).toFixed(3)} (+${norm.setupFeePct}%)`,
      note: 'Setup fee added on top of your bid',
    },
  ];

  const renderTable = (title: string, sub: string, rows: FeeRow[]) => (
    <section className="medieval-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gold-light">{title}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-2 font-bold">Action</th>
              <th className="text-right px-4 py-2 font-bold">Premium</th>
              <th className="text-right px-4 py-2 font-bold">Non-premium</th>
              <th className="text-left px-4 py-2 font-bold">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.action} className="border-t border-zinc-800">
                <td className="px-4 py-2 font-medium text-zinc-200">{r.action}</td>
                <td className="px-4 py-2 text-right tabular-nums text-emerald-300">{r.premium}</td>
                <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{r.nonPremium}</td>
                <td className="px-4 py-2 text-[11px] text-zinc-500">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <PageHeader
        eyebrow="Reference · Fees"
        title="Market Tax & Fees"
        description="Albion's marketplace charges a sales tax when you sell and a setup fee when you post an order. The exact cut depends on premium status and whether you trade instantly or post and wait. These are the same multipliers every calculator on this site applies."
        icon={IconScales}
      />

      {renderTable('Selling', 'Multiplier applied to the sell price to get net silver received.', rows)}
      {renderTable('Buying materials', 'Multiplier applied to the buy price to get total silver spent.', buyRows)}

      <ToolExplainer title="How marketplace fees work">
        <p>
          Albion's marketplace has two separate charges, and which ones you
          pay depends on how you trade:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Sales tax</strong> — taken from the sale price when a
            sell order resolves. Premium players pay {prem.salesTaxPct}%,
            non-premium pay {norm.salesTaxPct}%.
          </li>
          <li>
            <strong>Setup fee</strong> — an extra {prem.setupFeePct}% charged
            when you <em>post</em> an order (buy or sell) rather than matching
            an existing one instantly. Same rate for premium and non-premium.
          </li>
        </ul>
        <p>
          So the cheapest way to sell is to <strong>instant-sell into an
          existing buy order</strong> — you only pay sales tax, no setup fee.
          The most expensive is posting a sell order and waiting, which
          stacks both. The upside of the sell order is you usually capture a
          higher price than the top buy order, so it's a tradeoff between
          speed and price.
        </p>
        <p>
          <strong>Direct trades</strong> — handing items to another player
          for an agreed price in a private trade or via Discord — skip the
          marketplace completely. No sales tax, no setup fee. That's why the
          calculators treat the direct-trade route as the full sticker price
          with no deduction.
        </p>
        <p>
          On the buying side, the same logic applies in reverse: buy
          instantly from a sell order and you pay exactly the listed price;
          post a buy order and wait, and you pay your bid plus the
          {prem.setupFeePct}% setup fee. The Crafting and Refining
          calculators let you pick which side you're on for both the
          material (entry) and the output (exit), and apply these exact
          multipliers to your profit.
        </p>
      </ToolExplainer>
    </div>
  );
}
