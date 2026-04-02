import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { CITIES } from '../../data/cities';
import { formatSilver } from '../../utils/formatters';

export default function CustomDatabase() {
  const { customPrices, setCustomPrice, removeCustomPrice, clearCustomPrices, settings, updateSettings } = useAppStore();

  const [newItemId, setNewItemId] = useState('');
  const [newCity, setNewCity] = useState('Caerleon');
  const [newPrice, setNewPrice] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const customEntries = Object.entries(customPrices).map(([key, price]) => {
    const [itemId, city] = key.split(':');
    return { key, itemId, city: city || 'Any', price };
  });

  const filteredEntries = searchFilter
    ? customEntries.filter(e => e.itemId.toLowerCase().includes(searchFilter.toLowerCase()))
    : customEntries;

  const handleAddPrice = () => {
    if (!newItemId || !newPrice) return;
    const key = `${newItemId}:${newCity}`;
    setCustomPrice(key, parseFloat(newPrice));
    setNewItemId('');
    setNewPrice('');
  };

  const handleExport = () => {
    const data = JSON.stringify({ customPrices, settings }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'albion-craft-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.customPrices) {
          Object.entries(data.customPrices).forEach(([key, price]) => {
            setCustomPrice(key, price as number);
          });
        }
        if (data.settings) {
          updateSettings(data.settings);
        }
      } catch {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gold">Custom Database</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="text-xs text-slate-400 hover:text-gold px-3 py-1.5 rounded-lg bg-surface border border-surface-lighter transition-colors"
          >
            Export
          </button>
          <label className="text-xs text-slate-400 hover:text-gold px-3 py-1.5 rounded-lg bg-surface border border-surface-lighter transition-colors cursor-pointer">
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {customEntries.length > 0 && (
            <button
              onClick={clearCustomPrices}
              className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-surface border border-surface-lighter transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Add custom price */}
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Add Custom Price</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-slate-500 block mb-1">Item ID</label>
            <input
              type="text"
              placeholder="e.g. T4_METALBAR"
              value={newItemId}
              onChange={(e) => setNewItemId(e.target.value)}
              className="w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">City</label>
            <select
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              className="bg-surface-light border border-surface-lighter rounded-lg px-2 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
            >
              {CITIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Price</label>
            <input
              type="number"
              placeholder="Silver"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-28 bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold/50"
            />
          </div>
          <button
            onClick={handleAddPrice}
            className="bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Saved prices list */}
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider">
            Saved Prices ({customEntries.length})
          </h3>
          {customEntries.length > 0 && (
            <input
              type="text"
              placeholder="Filter..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-surface-light border border-surface-lighter rounded-lg px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold/50"
            />
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No custom prices saved yet. Custom prices override API prices in calculations.
          </p>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm text-slate-200 font-mono">{entry.itemId}</span>
                  <span className="text-xs text-slate-500 ml-2">{entry.city}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gold font-medium">{formatSilver(entry.price)}</span>
                  <button
                    onClick={() => removeCustomPrice(entry.key)}
                    className="text-slate-500 hover:text-red-400 transition-colors text-xs"
                  >
                    &#10005;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-surface rounded-xl border border-surface-lighter p-4">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Default Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Default Crafting City</label>
            <select
              value={settings.craftingCity}
              onChange={(e) => updateSettings({ craftingCity: e.target.value })}
              className="w-full bg-surface-light border border-surface-lighter rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
            >
              {CITIES.filter(c => c.id !== 'Black Market').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Default Selling Location</label>
            <select
              value={settings.sellingLocation}
              onChange={(e) => updateSettings({ sellingLocation: e.target.value })}
              className="w-full bg-surface-light border border-surface-lighter rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
            >
              {CITIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Usage Fee / 100 Nutrition</label>
            <input
              type="number"
              min={0}
              value={settings.usageFeePerHundred}
              onChange={(e) => updateSettings({ usageFeePerHundred: parseFloat(e.target.value) || 0 })}
              className="w-full bg-surface-light border border-surface-lighter rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-gold/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
