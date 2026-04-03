import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';
import { Card } from '../ui';

export default function CraftingSettings() {
  const { settings, updateSettings } = useAppStore();

  const cityOptions = CITIES.filter(c => c.id !== 'Black Market').map(c => ({ value: c.id, label: c.name }));
  const allCityOptions = CITIES.map(c => ({ value: c.id, label: c.name }));

  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 font-medium">Craft:</label>
          <select
            value={settings.craftingCity}
            onChange={(e) => updateSettings({ craftingCity: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            {cityOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 font-medium">Sell:</label>
          <select
            value={settings.sellingLocation}
            onChange={(e) => updateSettings({ sellingLocation: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            {allCityOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.hasPremium}
              onChange={(e) => updateSettings({ hasPremium: e.target.checked })}
              className="accent-gold w-3.5 h-3.5"
            />
            <span className="text-sm text-zinc-300">Premium</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useFocus}
              onChange={(e) => updateSettings({ useFocus: e.target.checked })}
              className="accent-blue-500 w-3.5 h-3.5"
            />
            <span className="text-sm text-zinc-300">Focus</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 font-medium">Qty:</label>
          <input
            type="number"
            min={1}
            max={999}
            value={settings.quantity}
            onChange={(e) => updateSettings({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200 text-center focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
      </div>
    </Card>
  );
}
