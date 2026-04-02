import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import CraftingCalculator from './components/calculator/CraftingCalculator';
import CraftingPlanner from './components/planner/CraftingPlanner';
import CustomDatabase from './components/database/CustomDatabase';
import SuggestedCrafts from './components/suggester/SuggestedCrafts';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg">
        <Header />
        <Routes>
          <Route path="/" element={<CraftingCalculator />} />
          <Route path="/suggested" element={<SuggestedCrafts />} />
          <Route path="/blackmarket" element={<SuggestedCrafts blackMarketOnly />} />
          <Route path="/planner" element={<CraftingPlanner />} />
          <Route path="/database" element={<CustomDatabase />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
