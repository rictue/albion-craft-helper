import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ITEM_CATEGORIES } from '../../data/items';

const REFINE_RESOURCES = ['PLANKS', 'METALBAR', 'LEATHER', 'CLOTH', 'STONEBLOCK'];
const REFINE_LABELS: Record<string, string> = { PLANKS: 'Wood', METALBAR: 'Ore', LEATHER: 'Hide', CLOTH: 'Fiber', STONEBLOCK: 'Rock' };

const COOK_CATEGORIES = ['SOUP', 'SALAD', 'OMELETTE', 'SANDWICH', 'PIE', 'STEW', 'ROAST'];
const COOK_LABELS: Record<string, string> = {
  SOUP: 'Soup', SALAD: 'Salad', OMELETTE: 'Omelette', SANDWICH: 'Sandwich',
  PIE: 'Pie', STEW: 'Stew', ROAST: 'Roast',
};

const CAT_DISPLAY: Record<string, string> = {
  knuckles: 'War Gloves', cursestaff: 'Cursed Staffs', firestaff: 'Fire Staffs',
  froststaff: 'Frost Staffs', holystaff: 'Holy Staffs', arcanestaff: 'Arcane Staffs',
  naturestaff: 'Nature Staffs', plate_helmet: 'Plate Helmets', plate_armor: 'Plate Armor',
  plate_shoes: 'Plate Boots', leather_helmet: 'Leather Hoods', leather_armor: 'Leather Jackets',
  leather_shoes: 'Leather Shoes', cloth_helmet: 'Cloth Cowls', cloth_armor: 'Cloth Robes',
  cloth_shoes: 'Cloth Sandals', shieldtype: 'Shields', booktype: 'Tomes', torchtype: 'Torches',
};

interface SpecInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent?: 'gold' | 'cyan' | 'zinc';
}

function SpecInput({ label, value, onChange, accent = 'zinc' }: SpecInputProps) {
  const filled = value > 0;
  const accentRing = accent === 'gold' ? 'focus:ring-gold/50' : accent === 'cyan' ? 'focus:ring-cyan-500/50' : 'focus:ring-zinc-500/50';
  const filledText = accent === 'gold' ? 'text-gold' : accent === 'cyan' ? 'text-cyan-400' : 'text-zinc-200';
  return (
    <label className={`group flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${filled ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'}`}>
      <span className="text-[11px] text-zinc-400 truncate flex-1">{label}</span>
      <input
        type="number"
        min={0}
        max={120}
        value={value || ''}
        placeholder="0"
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`w-12 bg-zinc-950/80 border border-zinc-700/50 rounded px-1.5 py-0.5 text-xs text-center font-semibold focus:outline-none focus:ring-2 ${accentRing} ${filled ? filledText : 'text-zinc-500'}`}
      />
    </label>
  );
}

export default function Profile() {
  const { user, signInWithDiscord, signOut } = useAuth();
  const [characterName, setCharacterName] = useState('');
  const [specs, setSpecs] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const data = localStorage.getItem('albion-specs');
      if (data) setSpecs(JSON.parse(data));
      const name = localStorage.getItem('albion-character-name');
      if (name) setCharacterName(name);
    } catch {}
  }, []);

  const updateSpec = (key: string, value: number) => {
    const next = { ...specs, [key]: Math.max(0, Math.min(120, value)) };
    setSpecs(next);
    localStorage.setItem('albion-specs', JSON.stringify(next));
  };

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('albion-specs', JSON.stringify(specs));
    localStorage.setItem('albion-character-name', characterName);
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        character_name: characterName,
        specs,
        updated_at: new Date().toISOString(),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        if (data.character_name) setCharacterName(data.character_name);
        if (data.specs) {
          setSpecs(data.specs);
          localStorage.setItem('albion-specs', JSON.stringify(data.specs));
        }
      }
    });
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 mb-6">
          <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Character Profile</h2>
        <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">Login with Discord to save your crafting and refining specializations to the cloud. They'll sync across all your devices.</p>
        <button
          onClick={signInWithDiscord}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors shadow-lg shadow-[#5865F2]/20"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Login with Discord
        </button>
        <p className="text-xs text-zinc-600 mt-6">You can still use all tools without logging in. Specs are saved locally.</p>
      </div>
    );
  }

  const discordName = user.user_metadata?.full_name || user.email || 'User';
  const avatarUrl = user.user_metadata?.avatar_url;

  const totalSpecsSet = Object.values(specs).filter(v => v > 0).length;
  const totalSpecPoints = Object.values(specs).reduce((s, v) => s + v, 0);

  const filteredCategories = search
    ? ITEM_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())),
      })).filter(cat => cat.items.length > 0 || (CAT_DISPLAY[cat.id] || cat.name).toLowerCase().includes(search.toLowerCase()))
    : ITEM_CATEGORIES;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent border-b border-zinc-800" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-end gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-20 h-20 rounded-2xl border-4 border-zinc-900 shadow-xl" />
              ) : (
                <div className="w-20 h-20 rounded-2xl border-4 border-zinc-900 bg-zinc-800 flex items-center justify-center text-2xl font-bold text-gold">
                  {discordName[0]?.toUpperCase()}
                </div>
              )}
              <div className="pb-1">
                <div className="text-xl font-bold text-zinc-100">{discordName}</div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Discord connected · Cloud sync enabled
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="In-game character name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="bg-zinc-800/80 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40 min-w-[200px]"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${saved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'} disabled:opacity-50`}
              >
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save All'}
              </button>
              <button onClick={signOut} className="px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors">Logout</button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-800 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Specs Set</div>
              <div className="text-xl font-bold text-gold mt-0.5">{totalSpecsSet}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-800 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Total Points</div>
              <div className="text-xl font-bold text-cyan-400 mt-0.5">{totalSpecPoints.toLocaleString()}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-800 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Categories</div>
              <div className="text-xl font-bold text-zinc-200 mt-0.5">{ITEM_CATEGORIES.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex items-center gap-3">
        <svg className="w-4 h-4 text-zinc-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search specializations (e.g. 'battleaxe', 'plate')..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-zinc-500 hover:text-zinc-300 px-2">Clear</button>
        )}
      </div>

      {/* Crafting Specs - grid of category cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Crafting Specializations</h2>
          <span className="text-[10px] text-zinc-600">{ITEM_CATEGORIES.reduce((s, c) => s + c.items.length, 0)} items across {ITEM_CATEGORIES.length} categories</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCategories.map(cat => {
            const masteryKey = `mastery:${cat.id}`;
            const masteryVal = specs[masteryKey] || 0;
            return (
              <div key={cat.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">
                {/* Category header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/30 border-b border-zinc-800">
                  <div>
                    <div className="text-sm font-bold text-gold">{CAT_DISPLAY[cat.id] || cat.name}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{cat.items.length} items</div>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-700 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] uppercase text-zinc-500 font-semibold">Mastery</span>
                    <input
                      type="number" min={0} max={120}
                      value={masteryVal || ''}
                      placeholder="0"
                      onChange={(e) => updateSpec(masteryKey, parseInt(e.target.value) || 0)}
                      className={`w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-gold/50 ${masteryVal > 0 ? 'text-gold' : 'text-zinc-500'}`}
                    />
                  </div>
                </div>
                {/* Items grid */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  {cat.items.map(item => (
                    <SpecInput
                      key={item.baseId}
                      label={item.name}
                      value={specs[`spec:${item.baseId}`] || 0}
                      onChange={(v) => updateSpec(`spec:${item.baseId}`, v)}
                      accent="gold"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Refining Specs */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Refining Specializations</h2>
          <span className="text-[10px] text-zinc-600">Per tier · Affects focus cost</span>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
          {REFINE_RESOURCES.map(res => (
            <div key={res} className="flex items-center gap-3">
              <div className="w-20 shrink-0">
                <div className="text-sm font-bold text-cyan-400">{REFINE_LABELS[res]}</div>
              </div>
              <div className="flex-1 grid grid-cols-5 gap-2">
                {[4, 5, 6, 7, 8].map(tier => (
                  <SpecInput
                    key={tier}
                    label={`T${tier}`}
                    value={specs[`refine:${res}:${tier}`] || 0}
                    onChange={(v) => updateSpec(`refine:${res}:${tier}`, v)}
                    accent="cyan"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cooking Specs */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Cooking Specializations</h2>
          <span className="text-[10px] text-zinc-600">Per meal category × tier</span>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
          {COOK_CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center gap-3">
              <div className="w-20 shrink-0">
                <div className="text-sm font-bold text-orange-400">{COOK_LABELS[cat]}</div>
              </div>
              <div className="flex-1 grid grid-cols-5 gap-2">
                {[4, 5, 6, 7, 8].map(tier => (
                  <SpecInput
                    key={tier}
                    label={`T${tier}`}
                    value={specs[`cook:${cat}:${tier}`] || 0}
                    onChange={(v) => updateSpec(`cook:${cat}:${tier}`, v)}
                    accent="gold"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
