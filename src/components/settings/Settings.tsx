import { useMemo, useState } from 'react';
import {
  PageHeader,
  StatCard,
  WarningBox,
  NumberInput,
  Select,
  Button,
  SectionDivider,
} from '../ui';
import { useAppStore } from '../../store/appStore';
import { ROYAL_CITIES, TAX_PREMIUM, TAX_NON_PREMIUM } from '../../data/constants';
import { getServer, setServer, clearPriceCache } from '../../services/api';
import type { AlbionServer } from '../../services/api';
import { IconCog } from '../shell/navIcons';

const SERVER_OPTIONS: { value: AlbionServer; label: string }[] = [
  { value: 'europe', label: 'Europe' },
  { value: 'west',   label: 'Americas' },
  { value: 'east',   label: 'Asia' },
];

const SELL_LOCATIONS = [
  ...ROYAL_CITIES,
  'Caerleon',
  'Black Market',
];

export default function Settings() {
  const settings = useAppStore(s => s.settings);
  const updateSettings = useAppStore(s => s.updateSettings);
  const customPrices = useAppStore(s => s.customPrices);
  const clearCustomPrices = useAppStore(s => s.clearCustomPrices);
  const clearProfitHistory = useAppStore(s => s.clearProfitHistory);
  const profitHistory = useAppStore(s => s.profitHistory);
  const plannerItems = useAppStore(s => s.plannerItems);
  const clearPlan = useAppStore(s => s.clearPlan);

  const [server, setLocalServer] = useState<AlbionServer>(getServer());
  const [saved, setSaved] = useState(false);

  const handleServer = (v: string) => {
    const s = v as AlbionServer;
    setServer(s);
    setLocalServer(s);
    flash();
  };

  const flash = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  // Auto-save: any store mutation persists via Zustand's persist middleware.
  // Show a brief saved indicator for user feedback.
  const set = <K extends keyof typeof settings>(k: K, v: typeof settings[K]) => {
    updateSettings({ [k]: v } as Partial<typeof settings>);
    flash();
  };

  const taxLabel = `${(settings.hasPremium ? TAX_PREMIUM : TAX_NON_PREMIUM) * 100}%`;

  // localStorage usage estimate — recomputes whenever the persisted shapes
  // change so the user sees the size adjust as they add/remove records.
  // We bake the collection sizes into the dep array so React invalidates the
  // memo when content changes; the body itself just sums every LS key.
  const customPriceCount = Object.keys(customPrices).length;
  const profitHistoryCount = profitHistory.length;
  const plannerCount = plannerItems.length;

  const lsBytes = useMemo(() => {
    // Touch counts so lint sees the dependency relationship.
    void customPriceCount; void profitHistoryCount; void plannerCount;
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const v = localStorage.getItem(key);
        if (v) total += key.length + v.length;
      }
      return total;
    } catch {
      return 0;
    }
  }, [customPriceCount, profitHistoryCount, plannerCount]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account · Defaults"
        title="Settings"
        description="Personal defaults that ripple through every calculator. Changes save instantly to your browser."
        icon={IconCog}
        actions={
          saved && (
            <span className="chip text-emerald-300 bg-emerald-500/10 border-emerald-500/30 animate-fade-in">
              Saved
            </span>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Server" value={SERVER_OPTIONS.find(s => s.value === server)?.label ?? '—'} tone="gold" />
        <StatCard label="Default City" value={settings.craftingCity} />
        <StatCard label="Market Tax" value={taxLabel} hint={settings.hasPremium ? 'Premium (lowest available)' : 'Non-premium'} />
        <StatCard
          label="Local Storage"
          value={`${(lsBytes / 1024).toFixed(0)} KB`}
          hint={`${profitHistory.length} sessions, ${Object.keys(customPrices).length} prices, ${plannerItems.length} planner items`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="medieval-panel p-5 space-y-4">
          <SectionDivider label="Server & Market" />

          <Select
            label="Server"
            value={server}
            onChange={handleServer}
            options={SERVER_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
          />

          <Select
            label="Default Crafting City"
            value={settings.craftingCity}
            onChange={v => set('craftingCity', v)}
            options={ROYAL_CITIES.map(c => ({ value: c, label: c }))}
          />

          <Select
            label="Default Sell Location"
            value={settings.sellingLocation}
            onChange={v => set('sellingLocation', v)}
            options={SELL_LOCATIONS.map(c => ({ value: c, label: c }))}
          />

          <div className="text-[11px] text-[#a89175] mt-1 leading-relaxed">
            Changing the server clears the local price cache so every calculator pulls fresh data from the new region.
          </div>
        </section>

        <section className="medieval-panel p-5 space-y-4">
          <SectionDivider label="Account & Tax" />

          <ToggleRow
            label="Premium player"
            description={`Applies 6.5% tax (vs ${TAX_NON_PREMIUM * 100}% for non-premium) on every market sale.`}
            checked={settings.hasPremium}
            onChange={v => set('hasPremium', v)}
          />

          <ToggleRow
            label="Use focus by default"
            description="Adds +59 LPB to return rate; calculators still display the without-focus alternative for comparison."
            checked={settings.useFocus}
            onChange={v => set('useFocus', v)}
          />

          <NumberInput
            label="Usage fee per 100 IP"
            value={settings.usageFeePerHundred}
            onChange={v => set('usageFeePerHundred', v)}
            min={0}
            suffix="silver"
            hint="Station fee shown at the crafting station (per 100 nutrition)."
          />

          <NumberInput
            label="Daily station bonus"
            value={settings.dailyStationBonusPct}
            onChange={v => set('dailyStationBonusPct', v)}
            min={0}
            max={50}
            suffix="%"
            hint="Some cities cycle a bonus daily. Adds flat % to final RR."
          />
        </section>

        <section className="medieval-panel p-5 space-y-4">
          <SectionDivider label="Calculator Defaults" />

          <NumberInput
            label="Default quantity"
            value={settings.quantity}
            onChange={v => set('quantity', v)}
            min={1}
            hint="How many crafts to assume in the Calculator's preview number."
          />

          <NumberInput
            label="Return rate override"
            value={settings.returnRateOverride ?? ''}
            onChange={v => set('returnRateOverride', v === 0 ? null : v)}
            min={0}
            max={100}
            suffix="%"
            hint="Bypass automatic RR calculation. Leave 0 to use city/focus math."
          />

          <WarningBox tone="info">
            These defaults seed the Calculator and Refining inputs but can still be overridden inline on each page.
          </WarningBox>
        </section>

        <section className="medieval-panel p-5 space-y-4">
          <SectionDivider label="Local Data" />

          <div className="text-[12px] text-[#bba485] leading-relaxed">
            All saved state lives in this browser — server, defaults, watchlist, sessions, custom prices. Nothing is uploaded.
          </div>

          <div className="space-y-2">
            <DataRow
              label="Custom prices"
              value={`${Object.keys(customPrices).length} entries`}
              actionLabel="Clear all"
              danger
              onAction={() => {
                if (window.confirm('Remove every custom price override?')) clearCustomPrices();
              }}
              disabled={Object.keys(customPrices).length === 0}
            />
            <DataRow
              label="Profit history"
              value={`${profitHistory.length} records`}
              actionLabel="Clear all"
              danger
              onAction={() => {
                if (window.confirm('Erase saved profit history?')) clearProfitHistory();
              }}
              disabled={profitHistory.length === 0}
            />
            <DataRow
              label="Planner queue"
              value={`${plannerItems.length} items`}
              actionLabel="Clear"
              danger
              onAction={() => {
                if (window.confirm('Clear the planner queue?')) clearPlan();
              }}
              disabled={plannerItems.length === 0}
            />
            <DataRow
              label="Live price cache"
              value="Browser-cached AODP responses"
              actionLabel="Flush"
              onAction={() => {
                clearPriceCache();
                flash();
              }}
            />
          </div>
        </section>
      </div>

      <div className="text-center text-[10px] text-zinc-600 pt-2 leading-relaxed">
        Albioncrafts uses your browser's localStorage. Clearing site data in your browser will reset everything above.
      </div>
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-zinc-100">{label}</div>
        <div className="text-[11px] text-[#a89175] mt-0.5 leading-relaxed">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked
            ? 'bg-gold/25 border-gold/55'
            : 'bg-[color:var(--color-bg-raised)] border-[color:var(--color-border)]'
        }`}
        aria-pressed={checked}
      >
        <span className={`inline-block h-5 w-5 rounded-full transition-transform ${
          checked
            ? 'translate-x-5 bg-gold-light shadow-[0_0_8px_rgba(242,208,138,0.4)]'
            : 'translate-x-0.5 translate-y-0 bg-zinc-500 mt-0.5'
        }`} />
      </button>
    </label>
  );
}

function DataRow({
  label, value, actionLabel, onAction, danger, disabled,
}: { label: string; value: string; actionLabel: string; onAction: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[color:var(--color-border)] last:border-b-0">
      <div className="min-w-0">
        <div className="text-[12px] text-zinc-200 font-semibold truncate">{label}</div>
        <div className="text-[10px] text-[#8a7b62]">{value}</div>
      </div>
      <Button
        size="sm"
        variant={danger ? 'danger' : 'secondary'}
        onClick={onAction}
        disabled={disabled}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
