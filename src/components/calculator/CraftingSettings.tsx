import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';

export default function CraftingSettings() {
  const { settings, updateSettings } = useAppStore();

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter p-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Settings</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Crafting City</label>
          <select
            value={settings.craftingCity}
            onChange={(e) => updateSettings({ craftingCity: e.target.value })}
            className="w-full bg-surface-light border border-surface-lighter rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
          >
            {CITIES.filter(c => c.id !== 'Black Market').map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Selling At</label>
          <select
            value={settings.sellingLocation}
            onChange={(e) => updateSettings({ sellingLocation: e.target.value })}
            className="w-full bg-surface-light border border-surface-lighter rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
          >
            {CITIES.map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.hasPremium}
              onChange={(e) => updateSettings({ hasPremium: e.target.checked })}
              className="accent-gold"
            />
            <span className="text-sm text-slate-300">Premium</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useFocus}
              onChange={(e) => updateSettings({ useFocus: e.target.checked })}
              className="accent-gold"
            />
            <span className="text-sm text-slate-300">Focus</span>
          </label>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            max={999}
            value={settings.quantity}
            onChange={(e) => updateSettings({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full bg-surface-light border border-surface-lighter rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
        </div>
      </div>
    </div>
  );
}
