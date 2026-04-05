import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import CraftingCalculator from './components/calculator/CraftingCalculator';
import CraftingPlanner from './components/planner/CraftingPlanner';
import CustomDatabase from './components/database/CustomDatabase';
import SuggestedCrafts from './components/suggester/SuggestedCrafts';
import IslandPlanner from './components/island/IslandPlanner';
import RefiningCalculator from './components/refining/RefiningCalculator';
import Profile from './components/profile/Profile';
import Players from './components/players/Players';
import Guilds from './components/guilds/Guilds';
import Killboard from './components/killboard/Killboard';
import GoldPrices from './components/gold/GoldPrices';
import PricesBrowser from './components/prices/PricesBrowser';
import Cooking from './components/cooking/Cooking';
import Butcher from './components/butcher/Butcher';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-bg">
        <Header />
        <Routes>
          <Route path="/" element={<CraftingCalculator />} />
          <Route path="/suggested" element={<SuggestedCrafts />} />
          <Route path="/blackmarket" element={<SuggestedCrafts blackMarketOnly />} />
          <Route path="/refining" element={<RefiningCalculator />} />
          <Route path="/cooking" element={<Cooking />} />
          <Route path="/butcher" element={<Butcher />} />
          <Route path="/island" element={<IslandPlanner />} />
          <Route path="/planner" element={<CraftingPlanner />} />
          <Route path="/prices" element={<PricesBrowser />} />
          <Route path="/gold" element={<GoldPrices />} />
          <Route path="/players" element={<Players />} />
          <Route path="/guilds" element={<Guilds />} />
          <Route path="/killboard" element={<Killboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/database" element={<CustomDatabase />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
