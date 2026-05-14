/**
 * Reusable marketplace-fee control block. Drop this into any calculator's
 * settings sidebar to replace the old "premium boolean + maybe Discord
 * toggle" pattern with the full Premium / Normal / Custom + buy-order /
 * sell-order entry & exit model.
 *
 * The component is fully controlled: parent owns the MarketFeeSettings
 * state and passes onChange. The component does NOT persist anything to
 * localStorage — leave that to the caller so each calc keeps its own
 * preference if it wants to.
 */

import { Percent, Store, HandCoins, ArrowRightLeft } from 'lucide-react';
import type { MarketFeeSettings, TaxProfile, SaleMode, PriceSource } from '../../utils/marketFees';
import { getSaleMultiplier, TAX_PRESETS } from '../../utils/marketFees';

interface Props {
  value: MarketFeeSettings;
  onChange: (next: MarketFeeSettings) => void;
  /** Optional compact variant for tight sidebars. */
  compact?: boolean;
}

export default function MarketFeeControls({ value, onChange, compact }: Props) {
  const saleMult = getSaleMultiplier(value);

  const setProfile = (profile: TaxProfile) => {
    const preset = profile === 'custom' ? null : TAX_PRESETS[profile];
    onChange({
      ...value,
      taxProfile: profile,
      saleMode: 'marketplace',
      customSalesTaxPct: profile === 'custom'
        ? (value.customSalesTaxPct ?? value.customSalesTaxPct ?? 4)
        : preset!.salesTaxPct,
      customSetupFeePct: profile === 'custom'
        ? (value.customSetupFeePct ?? 2.5)
        : preset!.setupFeePct,
    });
  };

  const setMode = (mode: SaleMode) => onChange({ ...value, saleMode: mode });
  const setEntry = (src: PriceSource) => onChange({ ...value, entrySource: src });
  const setExit  = (src: PriceSource) => onChange({ ...value, exitSource: src });

  const rates = value.taxProfile === 'custom'
    ? { salesTaxPct: value.customSalesTaxPct ?? 0, setupFeePct: value.customSetupFeePct ?? 0 }
    : TAX_PRESETS[value.taxProfile];

  return (
    <div className={`space-y-2.5 ${compact ? '' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-gold/70">
          Market Fees
        </div>
        <div className="rounded border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] font-black tabular-nums text-gold-light">
          ×{saleMult.toFixed(3)}
        </div>
      </div>

      {/* Sale mode (marketplace / private) */}
      <div className="grid grid-cols-2 gap-1.5">
        <ModeButton
          active={value.saleMode === 'marketplace'}
          label="Marketplace"
          hint={`${rates.salesTaxPct}% tax`}
          icon={<Store size={13} />}
          onClick={() => setMode('marketplace')}
        />
        <ModeButton
          active={value.saleMode === 'private'}
          label="Private (Discord)"
          hint="−5%, no tax"
          icon={<HandCoins size={13} />}
          onClick={() => setMode('private')}
        />
      </div>

      {/* Tax profile presets — only meaningful when marketplace */}
      {value.saleMode === 'marketplace' && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <ProfileButton
              active={value.taxProfile === 'premium'}
              label="Premium"
              hint="4% + 2.5%"
              onClick={() => setProfile('premium')}
            />
            <ProfileButton
              active={value.taxProfile === 'normal'}
              label="No prem"
              hint="8% + 2.5%"
              onClick={() => setProfile('normal')}
            />
            <ProfileButton
              active={value.taxProfile === 'custom'}
              label="Custom"
              hint="Set your own"
              onClick={() => setProfile('custom')}
            />
          </div>

          {value.taxProfile === 'custom' && (
            <div className="grid grid-cols-2 gap-1.5">
              <PctInput
                label="Sales tax"
                value={value.customSalesTaxPct ?? 0}
                onChange={(n) => onChange({ ...value, customSalesTaxPct: n })}
              />
              <PctInput
                label="Setup fee"
                value={value.customSetupFeePct ?? 0}
                onChange={(n) => onChange({ ...value, customSetupFeePct: n })}
              />
            </div>
          )}

          {/* Entry / Exit price source */}
          <div className="grid grid-cols-2 gap-1.5">
            <SourceSelect
              label="Entry"
              value={value.entrySource}
              options={[
                { value: 'sellOrder', label: 'Instant buy' },
                { value: 'buyOrder',  label: 'Buy order' },
              ]}
              onChange={setEntry}
            />
            <SourceSelect
              label="Exit"
              value={value.exitSource}
              options={[
                { value: 'buyOrder',  label: 'Instant sell' },
                { value: 'sellOrder', label: 'Sell order' },
              ]}
              onChange={setExit}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({ active, label, hint, icon, onClick }: { active: boolean; label: string; hint: string; icon?: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-left transition ${
        active
          ? 'border-gold/55 bg-gold/15 text-gold-light shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-raised)] text-zinc-400 hover:border-[color:var(--color-border-light)] hover:text-zinc-200'
      }`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold">
        {icon}
        {label}
      </span>
      <span className="text-[10px] tabular-nums opacity-65">{hint}</span>
    </button>
  );
}

function ProfileButton({ active, label, hint, onClick }: { active: boolean; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1.5 text-left transition ${
        active
          ? 'border-gold/55 bg-gold/15 text-gold-light'
          : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-raised)] text-zinc-400 hover:text-zinc-200'
      }`}
    >
      <span className="block text-[11px] font-bold">{label}</span>
      <span className="block text-[9.5px] tabular-nums opacity-60">{hint}</span>
    </button>
  );
}

function PctInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-raised)] px-2 py-1.5">
      <span className="mb-0.5 flex items-center gap-1 text-[9.5px] uppercase tracking-[0.14em] font-bold text-zinc-500">
        <Percent size={11} />
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-transparent text-[13px] font-bold tabular-nums text-zinc-100 focus:outline-none"
      />
    </label>
  );
}

function SourceSelect({ label, value, options, onChange }: {
  label: string;
  value: PriceSource;
  options: { value: PriceSource; label: string }[];
  onChange: (v: PriceSource) => void;
}) {
  return (
    <label className="block rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-raised)] px-2 py-1.5">
      <span className="mb-0.5 flex items-center gap-1 text-[9.5px] uppercase tracking-[0.14em] font-bold text-zinc-500">
        <ArrowRightLeft size={11} />
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PriceSource)}
        className="w-full bg-transparent text-[12px] font-bold text-zinc-100 focus:outline-none"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
