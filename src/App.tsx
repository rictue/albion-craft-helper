import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/common/Header';
import ErrorBoundary from './components/common/ErrorBoundary';

// Keep the landing page (MoneyHub) eager so initial paint is instant.
// The hub is a simple 'pick a strategy' page that onboards new users
// without dumping them into a complex calculator they may not understand.
import MoneyHub from './components/hub/MoneyHub';

const CraftingCalculator = lazy(() => import('./components/calculator/CraftingCalculator'));

// Lazy-load every other route. Each becomes its own chunk so users who never
// open e.g. the killboard never download its code.
const CraftingPlanner  = lazy(() => import('./components/planner/CraftingPlanner'));
const CustomDatabase   = lazy(() => import('./components/database/CustomDatabase'));
const SuggestedCrafts  = lazy(() => import('./components/suggester/SuggestedCrafts'));
const IslandPlanner    = lazy(() => import('./components/island/IslandPlanner'));
const SimpleRefine     = lazy(() => import('./components/refining/SimpleRefine'));
const Profile          = lazy(() => import('./components/profile/Profile'));
const Players          = lazy(() => import('./components/players/Players'));
const Guilds           = lazy(() => import('./components/guilds/Guilds'));
const Killboard        = lazy(() => import('./components/killboard/Killboard'));
const GoldPrices       = lazy(() => import('./components/gold/GoldPrices'));
const PricesBrowser    = lazy(() => import('./components/prices/PricesBrowser'));
const Cooking          = lazy(() => import('./components/cooking/Cooking'));
const Butcher          = lazy(() => import('./components/butcher/Butcher'));
const TopKillFame      = lazy(() => import('./components/killboard/TopKillFame'));
const FocusEfficiency  = lazy(() => import('./components/focus/FocusEfficiency'));
const PriceHistory     = lazy(() => import('./components/history/PriceHistory'));
const CraftingFame     = lazy(() => import('./components/fame/CraftingFame'));
const Transmutation    = lazy(() => import('./components/transmute/Transmutation'));
const Farming          = lazy(() => import('./components/farming/Farming'));
const MarketFlipper    = lazy(() => import('./components/flipper/MarketFlipper'));
const BMRunner         = lazy(() => import('./components/bmrunner/BMRunner'));
const JournalsCalc     = lazy(() => import('./components/journals/JournalsCalculator'));
const FarmBreed        = lazy(() => import('./components/farmbreed/FarmBreed'));
const CompareMode      = lazy(() => import('./components/compare/CompareMode'));
const Portfolio        = lazy(() => import('./components/portfolio/Portfolio'));
const CraftHistory     = lazy(() => import('./components/history/CraftHistory'));
const MountBreeding    = lazy(() => import('./components/mounts/MountBreeding'));
const CapeConverter    = lazy(() => import('./components/capes/CapeConverter'));
const MetaItems        = lazy(() => import('./components/meta/MetaItems'));
const GrindCalculators = lazy(() => import('./components/grind/GrindCalculators'));

function RouteFallback() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-10">
      <div className="animate-pulse space-y-3">
        <div className="h-10 medieval-panel" />
        <div className="h-28 medieval-panel" />
        <div className="h-48 medieval-panel" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="app-shell bg-bg">
        <Header />
        <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<MoneyHub />} />
            <Route path="/calculator" element={<CraftingCalculator />} />
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
            <Route path="/arbitrage" element={<Navigate to="/flipper" replace />} />
            <Route path="/focus" element={<FocusEfficiency />} />
            <Route path="/history" element={<PriceHistory />} />
            <Route path="/fame" element={<CraftingFame />} />
            <Route path="/transmute" element={<Transmutation />} />
            <Route path="/farming" element={<Farming />} />
            <Route path="/flipper" element={<MarketFlipper />} />
            <Route path="/bm-runner" element={<BMRunner />} />
            <Route path="/journals" element={<JournalsCalc />} />
            <Route path="/farmbreed" element={<FarmBreed />} />
            <Route path="/compare" element={<CompareMode />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/craft-history" element={<CraftHistory />} />
            <Route path="/mounts" element={<MountBreeding />} />
            <Route path="/capes" element={<CapeConverter />} />
            <Route path="/meta" element={<MetaItems />} />
            <Route path="/grind" element={<GrindCalculators />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/database" element={<CustomDatabase />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>
    </HashRouter>
  );
}
