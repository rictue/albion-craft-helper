import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ITEM_CATEGORIES } from '../../data/items';
import { Card, CardHeader, Button } from '../ui';

const REFINE_RESOURCES = ['PLANKS', 'METALBAR', 'LEATHER', 'CLOTH', 'STONEBLOCK'];
const REFINE_LABELS: Record<string, string> = { PLANKS: 'Wood', METALBAR: 'Ore', LEATHER: 'Hide', CLOTH: 'Fiber', STONEBLOCK: 'Rock' };

const CAT_DISPLAY: Record<string, string> = {
  knuckles: 'War Gloves', cursestaff: 'Cursed Staffs', firestaff: 'Fire Staffs',
  froststaff: 'Frost Staffs', holystaff: 'Holy Staffs', arcanestaff: 'Arcane Staffs',
  naturestaff: 'Nature Staffs', plate_helmet: 'Plate Helmets', plate_armor: 'Plate Armor',
  plate_shoes: 'Plate Boots', leather_helmet: 'Leather Hoods', leather_armor: 'Leather Jackets',
  leather_shoes: 'Leather Shoes', cloth_helmet: 'Cloth Cowls', cloth_armor: 'Cloth Robes',
  cloth_shoes: 'Cloth Sandals', shieldtype: 'Shields', booktype: 'Tomes', torchtype: 'Torches',
};

export default function Profile() {
  const { user, signInWithDiscord, signOut } = useAuth();
  const [characterName, setCharacterName] = useState('');
  const [specs, setSpecs] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load specs from localStorage (works for both logged in and anonymous)
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

    // If logged in, also save to Supabase
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

  // Load from Supabase on login
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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-4 opacity-20">&#128100;</div>
        <h2 className="text-xl text-zinc-300 mb-2">Character Profile</h2>
        <p className="text-sm text-zinc-500 mb-6">Login with Discord to save your character specs to the cloud. They'll sync across devices.</p>
        <button
          onClick={signInWithDiscord}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Login with Discord
        </button>
        <p className="text-xs text-zinc-600 mt-4">You can still use all tools without logging in. Specs are saved locally.</p>
      </div>
    );
  }

  const discordName = user.user_metadata?.full_name || user.email || 'User';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* User info */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {avatarUrl && <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full" />}
            <div>
              <div className="text-sm font-medium text-zinc-200">{discordName}</div>
              <div className="text-xs text-zinc-500">Discord connected</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Character name"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            <Button onClick={handleSave} disabled={saving}>
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save All'}
            </Button>
            <button onClick={signOut} className="text-xs text-zinc-500 hover:text-red-400">Logout</button>
          </div>
        </div>
      </Card>

      {/* Crafting Specs - auto-generated from all 221 items */}
      <Card>
        <CardHeader>Crafting Specializations ({ITEM_CATEGORIES.length} categories, {ITEM_CATEGORIES.reduce((s, c) => s + c.items.length, 0)} items)</CardHeader>
        <div className="space-y-4">
          {ITEM_CATEGORIES.map(cat => (
            <div key={cat.id} className="border-b border-zinc-800 pb-3 last:border-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-gold w-36">{CAT_DISPLAY[cat.id] || cat.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">Mastery:</span>
                  <input
                    type="number" min={0} max={120}
                    value={specs[`mastery:${cat.id}`] || 0}
                    onChange={(e) => updateSpec(`mastery:${cat.id}`, parseInt(e.target.value) || 0)}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 text-center"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-36">
                {cat.items.map(item => (
                  <div key={item.baseId} className="flex items-center gap-1.5 bg-zinc-800/50 rounded-lg px-2 py-1">
                    <span className="text-xs text-zinc-400">{item.name}:</span>
                    <input
                      type="number" min={0} max={120}
                      value={specs[`spec:${item.baseId}`] || 0}
                      onChange={(e) => updateSpec(`spec:${item.baseId}`, parseInt(e.target.value) || 0)}
                      className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-200 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Refining Specs */}
      <Card>
        <CardHeader>Refining Specializations</CardHeader>
        <div className="space-y-3">
          {REFINE_RESOURCES.map(res => (
            <div key={res} className="flex items-center gap-3">
              <span className="text-sm font-medium text-cyan-400 w-20">{REFINE_LABELS[res]}</span>
              <div className="flex gap-2">
                {[4, 5, 6, 7, 8].map(tier => (
                  <div key={tier} className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500">T{tier}:</span>
                    <input
                      type="number" min={0} max={120}
                      value={specs[`refine:${res}:${tier}`] || 0}
                      onChange={(e) => updateSpec(`refine:${res}:${tier}`, parseInt(e.target.value) || 0)}
                      className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-200 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
