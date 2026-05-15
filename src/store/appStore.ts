import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemDefinition, Tier, Enchantment, CraftingSettings, MarketPrice } from '../types';
import { DEFAULT_FEE_SETTINGS } from '../utils/marketFees';

export interface ProfitRecord {
  id: string;
  itemName: string;
  quantity: number;
  profit: number;
  date: string;
}

interface AppState {
  // Calculator
  selectedItem: ItemDefinition | null;
  tier: Tier;
  enchantment: Enchantment;
  setSelectedItem: (item: ItemDefinition | null) => void;
  setTier: (tier: Tier) => void;
  setEnchantment: (enchantment: Enchantment) => void;

  // Settings
  settings: CraftingSettings;
  updateSettings: (partial: Partial<CraftingSettings>) => void;

  // Profit history
  profitHistory: ProfitRecord[];
  addProfitRecord: (record: Omit<ProfitRecord, 'id' | 'date'>) => void;
  clearProfitHistory: () => void;

  // Prices (not persisted)
  prices: MarketPrice[];
  setPrices: (prices: MarketPrice[]) => void;
  pricesLoading: boolean;
  setPricesLoading: (loading: boolean) => void;

  // Custom prices
  customPrices: Record<string, number>;
  setCustomPrice: (key: string, price: number) => void;
  removeCustomPrice: (key: string) => void;
  clearCustomPrices: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedItem: null,
      tier: 4,
      enchantment: 0,
      setSelectedItem: (item) => set({ selectedItem: item }),
      setTier: (tier) => set({ tier }),
      setEnchantment: (enchantment) => set({ enchantment }),

      settings: {
        craftingCity: 'Martlock',
        sellingLocation: 'Black Market',
        hasPremium: true,
        useFocus: false,
        returnRateOverride: null,
        usageFeePerHundred: 0,
        quantity: 1,
        dailyStationBonusPct: 0,
        feeSettings: { ...DEFAULT_FEE_SETTINGS },
      },
      updateSettings: (partial) =>
        set((state) => {
          // Keep hasPremium and feeSettings in sync — if one is updated, the
          // other follows so we don't have to migrate every consumer at once.
          let next = { ...state.settings, ...partial };
          if (partial.feeSettings && !('hasPremium' in partial)) {
            next.hasPremium = partial.feeSettings.taxProfile === 'premium';
          } else if ('hasPremium' in partial && !partial.feeSettings) {
            next = {
              ...next,
              feeSettings: {
                ...next.feeSettings,
                taxProfile: partial.hasPremium ? 'premium' : 'normal',
              },
            };
          }
          return { settings: next };
        }),

      profitHistory: [],
      addProfitRecord: (record) =>
        set((state) => ({
          profitHistory: [
            { ...record, id: Date.now().toString(), date: new Date().toISOString() },
            ...state.profitHistory,
          ].slice(0, 500), // keep last 500
        })),
      clearProfitHistory: () => set({ profitHistory: [] }),

      prices: [],
      setPrices: (prices) => set({ prices }),
      pricesLoading: false,
      setPricesLoading: (loading) => set({ pricesLoading: loading }),

      customPrices: {},
      setCustomPrice: (key, price) =>
        set((state) => ({ customPrices: { ...state.customPrices, [key]: price } })),
      removeCustomPrice: (key) =>
        set((state) => {
          // Destructure the key out to drop it; rest gets the remaining entries.
          const rest = { ...state.customPrices };
          delete rest[key];
          return { customPrices: rest };
        }),
      clearCustomPrices: () => set({ customPrices: {} }),
    }),
    {
      name: 'albion-craft-helper',
      // Bump when CraftingSettings shape changes so migrate can run.
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        const state = persistedState as { settings?: Partial<CraftingSettings> };
        if (version < 2 && state.settings && !state.settings.feeSettings) {
          // Old persisted state lacked feeSettings — seed it from the legacy
          // hasPremium boolean so existing users land on the same tax mode.
          state.settings.feeSettings = {
            ...DEFAULT_FEE_SETTINGS,
            taxProfile: state.settings.hasPremium ? 'premium' : 'normal',
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        settings: state.settings,
        customPrices: state.customPrices,
        profitHistory: state.profitHistory,
        tier: state.tier,
        enchantment: state.enchantment,
      }),
    },
  ),
);
