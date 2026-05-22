import { useMemo, useState } from 'react';
import {
  PageHeader,
  StatCard,
  ProfitBadge,
  WarningBox,
  NumberInput,
  Select,
  Button,
  SectionDivider,
} from '../ui';
import {
  LABORERS,
  DEFAULT_REWARD_QTY,
  HOUSE_UPGRADE_COST,
  calculateLaborer,
} from '../../data/laborers';
import type { LaborerType } from '../../data/laborers';
import { formatSilver } from '../../utils/formatters';
import { IconLaborer } from '../shell/navIcons';
import { usePageMeta } from '../../hooks/usePageMeta';
import ToolExplainer from '../common/ToolExplainer';

const TIERS = [3, 4, 5, 6, 7, 8] as const;

export default function LaborersCalculator() {
  usePageMeta({
    title: 'Laborer Calculator',
    description: 'Albion Online laborer ROI calculator: lumberjack, miner, fisherman, farmer and the rest. Factor in happiness, journal cost, upkeep, and premium bonus to find net silver per 24-hour cycle and house upgrade payback.',
  });

  const [laborerType, setLaborerType] = useState<LaborerType>('lumberjack');
  const [tier, setTier] = useState<number>(6);
  const [happinessPct, setHappinessPct] = useState<number>(100);
  const [premium, setPremium] = useState<boolean>(true);

  const [rewardQty, setRewardQty] = useState<number>(DEFAULT_REWARD_QTY[6]);
  const [rewardPrice, setRewardPrice] = useState<number>(1500);
  const [emptyJournalCost, setEmptyJournalCost] = useState<number>(8000);
  const [filledJournalPrice, setFilledJournalPrice] = useState<number>(20000);
  const [upkeep, setUpkeep] = useState<number>(2000);

  const [compareTo, setCompareTo] = useState<number>(7);

  // When tier changes, suggest default reward quantity (user can still override).
  const setTierAndDefaults = (t: number) => {
    setTier(t);
    setRewardQty(DEFAULT_REWARD_QTY[t] ?? rewardQty);
  };

  const result = useMemo(() => calculateLaborer({
    tier,
    rewardQty,
    rewardPrice,
    emptyJournalCost,
    filledJournalPrice,
    happinessPct,
    premium,
    upkeep,
    upgradeFromCost: HOUSE_UPGRADE_COST[tier],
    upgradeToCost: HOUSE_UPGRADE_COST[compareTo],
  }), [tier, rewardQty, rewardPrice, emptyJournalCost, filledJournalPrice, happinessPct, premium, upkeep, compareTo]);

  // Side-by-side compare at the same prices/happiness but at compareTo tier.
  const compareResult = useMemo(() => {
    const cmpQty = DEFAULT_REWARD_QTY[compareTo] ?? rewardQty;
    return calculateLaborer({
      tier: compareTo,
      rewardQty: cmpQty,
      rewardPrice,
      emptyJournalCost,
      filledJournalPrice,
      happinessPct,
      premium,
      upkeep,
    });
  }, [compareTo, rewardPrice, emptyJournalCost, filledJournalPrice, happinessPct, premium, upkeep, rewardQty]);

  const laborerInfo = LABORERS.find(l => l.id === laborerType)!;

  const resetToDefaults = () => {
    setRewardQty(DEFAULT_REWARD_QTY[tier]);
    setRewardPrice(1500);
    setEmptyJournalCost(8000);
    setFilledJournalPrice(20000);
    setUpkeep(2000);
    setHappinessPct(100);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Income · Daily Routine"
        title="Laborers"
        description="House laborers deliver resources and filled journals every 24h. Use this calculator to see your real per-cycle net and whether an upgrade pays for itself."
        icon={IconLaborer}
        actions={
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>Reset values</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
        {/* Config sidebar */}
        <div className="space-y-4">
          <div className="medieval-panel p-4 space-y-3">
            <div className="medieval-title-sm">1. Laborer</div>
            <Select
              value={laborerType}
              onChange={v => setLaborerType(v as LaborerType)}
              options={LABORERS.map(l => ({ value: l.id, label: l.name }))}
            />
            <div className="text-[11px] text-[#a89175]">
              Produces {laborerInfo.rewardLabel.toLowerCase()} per cycle.
            </div>
          </div>

          <div className="medieval-panel p-4 space-y-3">
            <div className="medieval-title-sm">2. Tier & Happiness</div>
            <div className="grid grid-cols-3 gap-1.5">
              {TIERS.map(t => (
                <button
                  key={t}
                  onClick={() => setTierAndDefaults(t)}
                  className={`py-2 rounded-md border text-[12px] font-bold transition-all ${
                    tier === t
                      ? 'bg-gold/15 border-gold/45 text-gold-light'
                      : 'border-[color:var(--color-border)] text-zinc-400 hover:border-gold/30 hover:text-gold'
                  }`}
                >
                  T{t}
                </button>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-gold/70">Happiness</span>
                <span className="text-[11px] font-bold tabular-nums text-zinc-200">{happinessPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={happinessPct}
                onChange={e => setHappinessPct(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-zinc-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={premium}
                onChange={e => setPremium(e.target.checked)}
                className="accent-[var(--color-gold)]"
              />
              Premium player (6.5% market tax)
            </label>
          </div>

          <div className="medieval-panel p-4 space-y-3">
            <div className="medieval-title-sm">3. Outputs per cycle</div>
            <NumberInput
              label={`${laborerInfo.rewardLabel} qty`}
              value={rewardQty}
              onChange={setRewardQty}
              min={0}
              hint={`Default ${DEFAULT_REWARD_QTY[tier] ?? '—'} at 100% happiness. Override with what your laborer actually returns.`}
            />
            <NumberInput
              label={`${laborerInfo.rewardLabel} sell price`}
              value={rewardPrice}
              onChange={setRewardPrice}
              min={0}
              suffix="silver"
            />
          </div>

          <div className="medieval-panel p-4 space-y-3">
            <div className="medieval-title-sm">4. Journal cycle</div>
            <NumberInput
              label="Empty journal cost"
              value={emptyJournalCost}
              onChange={setEmptyJournalCost}
              min={0}
              suffix="silver"
            />
            <NumberInput
              label="Filled journal price"
              value={filledJournalPrice}
              onChange={setFilledJournalPrice}
              min={0}
              suffix="silver"
            />
            <NumberInput
              label="Happiness upkeep / cycle"
              value={upkeep}
              onChange={setUpkeep}
              min={0}
              suffix="silver"
              hint="Food, fame books, etc. — silver burned to keep happiness up."
            />
          </div>

          <div className="medieval-panel p-4 space-y-3">
            <div className="medieval-title-sm">5. Upgrade compare</div>
            <Select
              value={String(compareTo)}
              onChange={v => setCompareTo(Number(v))}
              options={TIERS.map(t => ({ value: String(t), label: `Tier ${t} house` }))}
            />
            <div className="text-[11px] text-[#a89175]">
              Compare your current T{tier} setup against a T{compareTo} build.
            </div>
          </div>
        </div>

        {/* Main result */}
        <div className="space-y-5 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Per Cycle Net"
              value={
                <span className={result.netPerCycle >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
                  {result.netPerCycle >= 0 ? '+' : ''}{formatSilver(result.netPerCycle)}
                </span>
              }
              hint="Net silver per 24h. Sells rewards + filled journal, after market tax."
              tone={result.netPerCycle >= 0 ? 'profit' : 'loss'}
            />
            <StatCard
              label="Monthly (×30)"
              value={
                <span className={result.netPerCycle >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}>
                  {result.netPerCycle >= 0 ? '+' : ''}{formatSilver(result.netPerCycle * 30)}
                </span>
              }
              hint="Projection assuming you feed it every day."
            />
            <StatCard
              label="Tax Paid / Cycle"
              value={formatSilver(result.rewardsTax + result.journalsTax)}
              hint={`${premium ? '6.5%' : '10.5%'} on rewards + filled journal sells.`}
            />
            <StatCard
              label="Upgrade ROI"
              value={result.daysToPayoffUpgrade !== undefined
                ? `${result.daysToPayoffUpgrade.toFixed(1)}d`
                : '—'}
              hint={result.daysToPayoffUpgrade !== undefined
                ? `T${tier} → T${compareTo} pays back at this cycle rate.`
                : 'Compare two tiers above. Net must be > 0.'}
              tone="gold"
            />
          </div>

          {result.warnings.map((w, i) => (
            <WarningBox key={i} tone="warning">{w}</WarningBox>
          ))}

          {/* Breakdown */}
          <section className="space-y-3">
            <SectionDivider label="Cycle Breakdown" hint="Silver in vs. out per 24h cycle" />
            <div className="medieval-panel p-4">
              <BreakdownRow label={`${laborerInfo.rewardLabel} sell (after tax)`} value={result.rewardsRevenue} positive />
              <BreakdownRow label="Filled journal sell (after tax)" value={result.journalsRevenue} positive />
              <BreakdownRow label="Empty journal cost" value={-result.journalsCost} />
              <BreakdownRow label="Happiness upkeep" value={-result.upkeep} />
              <div className="border-t border-[color:var(--color-border)] mt-2 pt-3 flex items-center justify-between">
                <span className="medieval-title-sm">Net per cycle</span>
                <span className={`text-xl font-black tabular-nums ${result.netPerCycle >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}`}>
                  {result.netPerCycle >= 0 ? '+' : ''}{formatSilver(result.netPerCycle)}
                </span>
              </div>
            </div>
          </section>

          {/* Upgrade analysis */}
          <section className="space-y-3">
            <SectionDivider label={`T${tier} vs T${compareTo} Compare`} hint="Same prices, happiness, premium" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CompareCard
                title={`Current — T${tier}`}
                netPerCycle={result.netPerCycle}
                upgradeCost={HOUSE_UPGRADE_COST[tier]}
              />
              <CompareCard
                title={`Upgrade — T${compareTo}`}
                netPerCycle={compareResult.netPerCycle}
                upgradeCost={HOUSE_UPGRADE_COST[compareTo]}
              />
            </div>

            {compareResult.netPerCycle > result.netPerCycle && (
              <UpgradeVerdict
                deltaPerCycle={compareResult.netPerCycle - result.netPerCycle}
                upgradeCostDelta={(HOUSE_UPGRADE_COST[compareTo] ?? 0) - (HOUSE_UPGRADE_COST[tier] ?? 0)}
              />
            )}
            {compareResult.netPerCycle <= result.netPerCycle && (
              <WarningBox tone="info">
                T{compareTo} doesn't out-earn T{tier} at the current prices you entered. Re-check the reward quantity defaults — the upgrade pays off only if higher-tier rewards sell faster.
              </WarningBox>
            )}
          </section>
        </div>
      </div>

      <ToolExplainer title="About the Laborer Calculator">
        <p>
          Laborers are Albion's idle-income tier: pay them a wage, feed
          them a journal full of crafting or gathering fame, and they
          hand back resources every 24 hours whether you log in or not.
          The Laborer Calculator works out the net silver per cycle for
          each laborer type (lumberjack, miner, fisherman, farmer,
          stonemason, butcher, and the equipment-tier laborers) at the
          tier and happiness level you actually have.
        </p>
        <p>
          The two big variables are <strong>journal cost</strong> and{' '}
          <strong>happiness</strong>. Filled journals come from your own
          crafting fame, which is effectively "free" but only if you'd be
          crafting anyway — otherwise their marketplace cost is the real
          input. Happiness below 70% triggers a yield penalty, so if
          you're churning a lot of laborer output without keeping wages
          paid you're leaving silver on the table.
        </p>
        <p>
          Premium status doubles laborer yield, which means premium
          flips a marginally-profitable laborer into a clear winner
          instantly. The calculator's premium toggle reflects this so
          you can see the real return-on-house-upgrade math: upgrading a
          shack to a hall might pay back in a week with premium and
          three weeks without.
        </p>
        <p>
          Worth flagging: the reward quantities used here are
          conservative community estimates (60/80/110/140/180/220 from
          T3 to T8). Real laborer output varies with map zone and a few
          other factors, so override the qty cell with your actual
          observed return for a sharper number.
        </p>
      </ToolExplainer>
    </div>
  );
}

function BreakdownRow({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <span className="text-[#bba485]">{label}</span>
      <span className={`tabular-nums font-semibold ${
        positive
          ? 'text-[color:var(--color-profit)]'
          : value < 0
            ? 'text-[color:var(--color-loss)]'
            : 'text-zinc-300'
      }`}>
        {positive && value >= 0 ? '+' : ''}{formatSilver(value)}
      </span>
    </div>
  );
}

function CompareCard({ title, netPerCycle, upgradeCost }: { title: string; netPerCycle: number; upgradeCost?: number }) {
  return (
    <div className="medieval-panel p-4">
      <div className="medieval-title-sm">{title}</div>
      <div className={`mt-1 text-2xl font-black tabular-nums ${netPerCycle >= 0 ? 'text-[color:var(--color-profit)]' : 'text-[color:var(--color-loss)]'}`}>
        {netPerCycle >= 0 ? '+' : ''}{formatSilver(netPerCycle)}
        <span className="text-xs font-semibold text-[#8a7b62] ml-1">/cycle</span>
      </div>
      <div className="text-[11px] text-[#8a7b62] mt-1">
        Monthly: {netPerCycle >= 0 ? '+' : ''}{formatSilver(netPerCycle * 30)}
      </div>
      {upgradeCost !== undefined && (
        <div className="text-[11px] text-[#8a7b62] mt-2 pt-2 border-t border-[color:var(--color-border)]">
          Build cost ref: {formatSilver(upgradeCost)}
        </div>
      )}
    </div>
  );
}

function UpgradeVerdict({ deltaPerCycle, upgradeCostDelta }: { deltaPerCycle: number; upgradeCostDelta: number }) {
  const days = deltaPerCycle > 0 ? upgradeCostDelta / deltaPerCycle : Infinity;
  return (
    <div className="parchment-panel p-4 text-center">
      <div className="medieval-title-sm mb-1">Upgrade Verdict</div>
      <div className="text-zinc-200 text-sm">
        Extra <ProfitBadge amount={deltaPerCycle} signed /> per cycle.
        {Number.isFinite(days) && (
          <> Pays back in <span className="text-gold-light font-bold">{days.toFixed(1)} days</span>.</>
        )}
      </div>
    </div>
  );
}
