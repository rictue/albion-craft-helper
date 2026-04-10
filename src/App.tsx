import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import CraftingCalculator from './components/calculator/CraftingCalculator';
import CraftingPlanner from './components/planner/CraftingPlanner';
import CustomDatabase from './components/database/CustomDatabase';
import SuggestedCrafts from './components/suggester/SuggestedCrafts';
import IslandPlanner from './components/island/IslandPlanner';
import SimpleRefine from './components/refining/SimpleRefine';
import Profile from './components/profile/Profile';
import Players from './components/players/Players';
import Guilds from './components/guilds/Guilds';
import Killboard from './components/killboard/Killboard';
import GoldPrices from './components/gold/GoldPrices';
import PricesBrowser from './components/prices/PricesBrowser';
import Cooking from './components/cooking/Cooking';
import Butcher from './components/butcher/Butcher';
import TopKillFame from './components/killboard/TopKillFame';
import Arbitrage from './components/arbitrage/Arbitrage';
import FocusEfficiency from './components/focus/FocusEfficiency';
import PriceHistory from './components/history/PriceHistory';
import CraftingFame from './components/fame/CraftingFame';
import Transmutation from './components/transmute/Transmutation';
import Farming from './components/farming/Farming';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-bg">
        <Header />
        <Routes>
          <Route path="/" element={<CraftingCalculator />} />
          <Route path="/suggested" element={<SuggestedCrafts />} />
          <Route path="/blackmarket" element={<SuggestedCrafts blackMarketOnly />} />
          <Route path="/refining" element={<SimpleRefine />} />
          <Route path="/cooking" element={<Cooking />} />
          <Route path="/butcher" element={<Butcher />} />
          <Route path="/island" element={<IslandPlanner />} />
          <Route path="/planner" element={<CraftingPlanner />} />
          <Route path="/prices" element={<PricesBrowser />} />
          <Route path="/gold" element={<GoldPrices />} />
          <Route path="/players" element={<Players />} />
          <Route path="/guilds" element={<Guilds />} />
          <Route path="/killboard" element={<Killboard />} />
          <Route path="/top-fame" element={<TopKillFame />} />
          <Route path="/arbitrage" element={<Arbitrage />} />
          <Route path="/focus" element={<FocusEfficiency />} />
          <Route path="/history" element={<PriceHistory />} />
          <Route path="/fame" element={<CraftingFame />} />
          <Route path="/transmute" element={<Transmutation />} />
          <Route path="/farming" element={<Farming />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/database" element={<CustomDatabase />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
