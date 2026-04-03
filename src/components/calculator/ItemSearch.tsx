import { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { ITEM_CATEGORIES, ALL_ITEMS } from '../../data/items';
import { resolveItemId } from '../../utils/itemIdParser';
import ItemIcon from '../common/ItemIcon';
import type { ItemDefinition } from '../../types';

const SUB_DISPLAY: Record<string, string> = {
  knuckles: 'War Gloves', cursestaff: 'Cursed Staff', firestaff: 'Fire Staff',
  froststaff: 'Frost Staff', holystaff: 'Holy Staff', arcanestaff: 'Arcane Staff',
  naturestaff: 'Nature Staff', plate_helmet: 'Plate Helmet', plate_armor: 'Plate Armor',
  plate_shoes: 'Plate Boots', leather_helmet: 'Leather Hood', leather_armor: 'Leather Jacket',
  leather_shoes: 'Leather Shoes', cloth_helmet: 'Cloth Cowl', cloth_armor: 'Cloth Robe',
  cloth_shoes: 'Cloth Sandals', shieldtype: 'Shield', booktype: 'Tome', torchtype: 'Torch',
};

interface Props {
  onSelect: (item: ItemDefinition) => void;
  selectedItem: ItemDefinition | null;
}

export default function ItemSearch({ onSelect, selectedItem }: Props) {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () => new Fuse(ALL_ITEMS, { keys: ['name', 'baseId'], threshold: 0.3 }),
    [],
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return fuse.search(search).map((r) => r.item);
  }, [search, fuse]);

  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  return (
    <div className="bg-surface rounded-xl border border-surface-lighter">
      <div className="p-3 border-b border-surface-lighter">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            className="w-full bg-surface-light border border-surface-lighter rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold/50"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setShowSearch(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              x
            </button>
          )}
        </div>
      </div>

      {showSearch && searchResults.length > 0 ? (
        <div className="max-h-64 overflow-y-auto p-1">
          {searchResults.slice(0, 20).map((item) => (
            <button
              key={item.baseId}
              onClick={() => {
                onSelect(item);
                setSearch('');
                setShowSearch(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                selectedItem?.baseId === item.baseId
                  ? 'bg-gold/20 text-gold'
                  : 'text-zinc-300 hover:bg-surface-light'
              }`}
            >
              <ItemIcon itemId={resolveItemId(item.baseId, 4, 0)} size={28} className="shrink-0 bg-surface-lighter rounded" />
              <span>{item.name}</span>
              <span className="text-xs text-zinc-500 ml-auto">{SUB_DISPLAY[item.subcategory] || item.subcategory}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {ITEM_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <button
                onClick={() =>
                  setExpandedCategory(expandedCategory === cat.id ? null : cat.id)
                }
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-surface-light flex justify-between items-center"
              >
                <span>{cat.name}</span>
                <span className="text-xs text-zinc-500">
                  {expandedCategory === cat.id ? '-' : '+'}
                </span>
              </button>
              {expandedCategory === cat.id && (
                <div className="ml-2">
                  {cat.items.map((item) => (
                    <button
                      key={item.baseId}
                      onClick={() => {
                        onSelect(item);
                        setShowSearch(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        selectedItem?.baseId === item.baseId
                          ? 'bg-gold/20 text-gold'
                          : 'text-zinc-400 hover:bg-surface-light hover:text-zinc-200'
                      }`}
                    >
                      <ItemIcon itemId={resolveItemId(item.baseId, 4, 0)} size={28} className="shrink-0 bg-surface-lighter rounded" />
                      <span>{item.name}</span>
                      {item.artifactId && (
                        <span className="text-xs text-purple-400 ml-1">*</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
