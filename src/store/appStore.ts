import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemDefinition, Tier, Enchantment, CraftingSettings, PlannerEntry, MarketPrice } from '../types';

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

  // Planner
  plannerItems: PlannerEntry[];
  addToPlan: (entry: Omit<PlannerEntry, 'id'>) => void;
  removeFromPlan: (id: string) => void;
  updatePlanQuantity: (id: string, quantity: number) => void;
  clearPlan: () => void;

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
      },
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      plannerItems: [],
      addToPlan: (entry) =>
        set((state) => ({
          plannerItems: [
            ...state.plannerItems,
            { ...entry, id: Date.now().toString() + Math.random().toString(36).slice(2) },
          ],
        })),
      removeFromPlan: (id) =>
        set((state) => ({ plannerItems: state.plannerItems.filter((item) => item.id !== id) })),
      updatePlanQuantity: (id, quantity) =>
        set((state) => ({
          plannerItems: state.plannerItems.map((item) =>
            item.id === id ? { ...item, quantity } : item,
          ),
        })),
      clearPlan: () => set({ plannerItems: [] }),

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
      partialize: (state) => ({
        settings: state.settings,
        plannerItems: state.plannerItems,
        customPrices: state.customPrices,
        profitHistory: state.profitHistory,
        tier: state.tier,
        enchantment: state.enchantment,
      }),
    },
  ),
);
