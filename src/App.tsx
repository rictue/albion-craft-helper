import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppShell from './components/shell/AppShell';
import ErrorBoundary from './components/common/ErrorBoundary';

// Dashboard is the new landing page — keep it eager so the first paint is
// instant and the user gets an immediate at-a-glance view.
import Dashboard from './components/dashboard/Dashboard';

const CraftingCalculator = lazy(() => import('./components/calculator/CraftingCalculator'));
const MarketBrowser      = lazy(() => import('./components/market/MarketBrowser'));
const SimpleRefine       = lazy(() => import('./components/refining/SimpleRefine'));
const Profile            = lazy(() => import('./components/profile/Profile'));
const Players            = lazy(() => import('./components/players/Players'));
const Guilds             = lazy(() => import('./components/guilds/Guilds'));
const Killboard          = lazy(() => import('./components/killboard/Killboard'));
const GoldPrices         = lazy(() => import('./components/gold/GoldPrices'));
const Cooking            = lazy(() => import('./components/cooking/Cooking'));
const TopKillFame        = lazy(() => import('./components/killboard/TopKillFame'));
const Transmutation      = lazy(() => import('./components/transmute/Transmutation'));
const Portfolio          = lazy(() => import('./components/portfolio/Portfolio'));
const CraftHistory       = lazy(() => import('./components/history/CraftHistory'));
const About              = lazy(() => import('./components/legal/About'));
const Privacy            = lazy(() => import('./components/legal/Privacy'));
const Terms              = lazy(() => import('./components/legal/Terms'));
const Contact            = lazy(() => import('./components/legal/Contact'));
const GuidesIndex        = lazy(() => import('./components/guides/GuidesIndex'));
const RefiningCityGuide  = lazy(() => import('./components/guides/RefiningCityGuide'));
const PremiumVsNonPremium = lazy(() => import('./components/guides/PremiumVsNonPremium'));
const FocusEfficiencyGuide = lazy(() => import('./components/guides/FocusEfficiencyGuide'));
const TransmutationChainStrategy = lazy(() => import('./components/guides/TransmutationChainStrategy'));
const MetaItems          = lazy(() => import('./components/meta/MetaItems'));
const Laborers           = lazy(() => import('./components/laborers/LaborersCalculator'));
const Settings           = lazy(() => import('./components/settings/Settings'));
const ReferenceIndex     = lazy(() => import('./components/reference/ReferenceIndex'));
const CityBonuses        = lazy(() => import('./components/reference/CityBonuses'));
const ReturnRates        = lazy(() => import('./components/reference/ReturnRates'));
const ItemValues         = lazy(() => import('./components/reference/ItemValues'));
const MarketFeesRef      = lazy(() => import('./components/reference/MarketFeesRef'));

function RouteFallback() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 medieval-panel" />
      <div className="h-28 medieval-panel" />
      <div className="h-48 medieval-panel" />
    </div>
  );
}

const REDIRECTS = [
  '/butcher', '/compare', '/mounts', '/farmbreed', '/island', '/farming',
  '/journals', '/fame', '/focus',
  '/flipper', '/bm-runner', '/suggested', '/blackmarket', '/grind',
  '/arbitrage',
  '/planner', '/capes', '/history', '/database',
];

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calculator" element={<CraftingCalculator />} />
              <Route path="/refining" element={<SimpleRefine />} />
              <Route path="/cooking" element={<Cooking />} />
              <Route path="/laborers" element={<Laborers />} />
              <Route path="/transmute" element={<Transmutation />} />
              <Route path="/market" element={<MarketBrowser />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/craft-history" element={<CraftHistory />} />
              <Route path="/gold" element={<GoldPrices />} />
              <Route path="/players" element={<Players />} />
              <Route path="/guilds" element={<Guilds />} />
              <Route path="/killboard" element={<Killboard />} />
              <Route path="/top-fame" element={<TopKillFame />} />
              <Route path="/meta" element={<MetaItems />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/guides" element={<GuidesIndex />} />
              <Route path="/guides/refining-city-guide" element={<RefiningCityGuide />} />
              <Route path="/guides/premium-vs-non-premium" element={<PremiumVsNonPremium />} />
              <Route path="/guides/focus-efficiency-guide" element={<FocusEfficiencyGuide />} />
              <Route path="/guides/transmutation-chain-strategy" element={<TransmutationChainStrategy />} />

              {/* Reference / data tables */}
              <Route path="/reference" element={<ReferenceIndex />} />
              <Route path="/reference/city-bonuses" element={<CityBonuses />} />
              <Route path="/reference/return-rates" element={<ReturnRates />} />
              <Route path="/reference/item-values" element={<ItemValues />} />
              <Route path="/reference/market-fees" element={<MarketFeesRef />} />

              {/* Old market browser bookmark → new market page */}
              <Route path="/prices" element={<Navigate to="/market" replace />} />

              {/* Removed routes — preserve bookmarks by sending to Dashboard */}
              {REDIRECTS.map(r => (
                <Route key={r} path={r} element={<Navigate to="/" replace />} />
              ))}

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </BrowserRouter>
  );
}
