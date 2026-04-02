import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import CraftingCalculator from './components/calculator/CraftingCalculator';
import CraftingPlanner from './components/planner/CraftingPlanner';
import CustomDatabase from './components/database/CustomDatabase';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg">
        <Header />
        <Routes>
          <Route path="/" element={<CraftingCalculator />} />
          <Route path="/planner" element={<CraftingPlanner />} />
          <Route path="/database" element={<CustomDatabase />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
