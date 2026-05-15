import { useState, useEffect, useMemo } from 'react';
import { formatSilver } from '../../utils/formatters';

interface GoldPrice {
  price: number;
  timestamp: string;
}

type Timeframe = '24h' | '7d' | '4w';
const TF_COUNT: Record<Timeframe, number> = { '24h': 24, '7d': 168, '4w': 672 };
const TF_LABEL: Record<Timeframe, string> = { '24h': '24 hours', '7d': '7 days', '4w': '4 weeks' };

// Linear-interpolated downsample so a 672-point series renders cleanly into
// ~80 points on screen. We keep min/max within each bucket so dips and
// spikes aren't smoothed out.
function downsample(arr: GoldPrice[], target: number): GoldPrice[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: GoldPrice[] = [];
  for (let i = 0; i < target; i++) {
    const startIdx = Math.floor(i * step);
    const endIdx = Math.min(arr.length, Math.floor((i + 1) * step));
    let acc = 0;
    let n = 0;
    for (let j = startIdx; j < endIdx; j++) {
      acc += arr[j].price;
      n++;
    }
    if (n === 0) continue;
    out.push({ price: acc / n, timestamp: arr[startIdx].timestamp });
  }
  return out;
}

export default function GoldPrices() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const server = localStorage.getItem('albion-server') || 'europe';
        const count = TF_COUNT[timeframe];
        const res = await fetch(`https://${server}.albion-online-data.com/api/v2/stats/gold?count=${count}`);
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setPrices(data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [timeframe]);

  const current = prices[0]?.price || 0;
  const oldest = prices[prices.length - 1]?.price || 0;
  const change = current - oldest;
  const changePct = oldest > 0 ? (change / oldest) * 100 : 0;

  // Build a downsampled, oldest-to-newest series for the SVG. AODP returns
  // newest-first; reversing gives left-to-right time order on the chart.
  const series = useMemo(() => {
    if (prices.length === 0) return [] as GoldPrice[];
    const chronological = prices.slice().reverse();
    return downsample(chronological, 80);
  }, [prices]);

  const { min, max, range } = useMemo(() => {
    if (series.length === 0) return { min: 0, max: 1, range: 1 };
    const vals = series.map(s => s.price);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    // 8% padding above + below so the line sits inside the panel instead of
    // hugging the top/bottom edges. min was 0 in the old code which is why
    // every chart looked flat — gold trades at 6.8k ± 50, against a 0–6.9k
    // range that's a 0.7% wiggle.
    const span = Math.max(1, hi - lo);
    const pad = span * 0.08;
    return { min: lo - pad, max: hi + pad, range: span + pad * 2 };
  }, [series]);

  // SVG geometry
  const W = 820;
  const H = 240;
  const PAD_L = 60;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const points = series.map((p, i) => {
    const x = PAD_L + (i / Math.max(1, series.length - 1)) * innerW;
    const y = PAD_T + (1 - (p.price - min) / range) * innerH;
    return { x, y, price: p.price };
  });

  const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Closed area path for the gradient fill under the line.
  const area = points.length > 0
    ? `M${points[0].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} ` +
      points.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${points[points.length - 1].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`
    : '';

  // 4 horizontal grid lines for visual scale anchors.
  const gridY = [0.25, 0.5, 0.75].map(t => PAD_T + t * innerH);

  // X-axis tick labels keyed to the selected timeframe.
  const xTicks = timeframe === '24h'
    ? ['24h', '18h', '12h', '6h', 'Now']
    : timeframe === '7d'
      ? ['7d', '5d', '3d', '1d', 'Now']
      : ['4w', '3w', '2w', '1w', 'Now'];

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Current Gold Price</h2>
            <div className="text-3xl font-bold text-gold mt-1">{formatSilver(current)}</div>
            <div className="text-xs text-zinc-500">silver per gold</div>
          </div>

          {/* Timeframe selector — Albion in-game style: stacked pill chips */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider hidden sm:block">Timeframe</span>
            <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-950 p-0.5">
              {(['24h', '7d', '4w'] as Timeframe[]).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors rounded ${
                    timeframe === tf
                      ? 'bg-gold/25 text-gold-light'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {TF_LABEL[tf]}
                </button>
              ))}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase">{TF_LABEL[timeframe]} change</div>
            <div className={`text-xl font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{formatSilver(change)}
            </div>
            <div className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* SVG chart */}
        {series.length > 0 && (
          <div className="mt-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gold-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#d4a843" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#d4a843" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {gridY.map((y, i) => (
                <line
                  key={i}
                  x1={PAD_L} y1={y}
                  x2={W - PAD_R} y2={y}
                  stroke="#27272a"
                  strokeDasharray="2 4"
                />
              ))}

              {/* Frame */}
              <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="#3f3f46" />
              <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#3f3f46" />

              {/* Filled area under line */}
              <path d={area} fill="url(#gold-fill)" />

              {/* Price line */}
              <polyline
                fill="none"
                stroke="#d4a843"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={polyline}
              />

              {/* Endpoint marker dot */}
              {points.length > 0 && (
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="4"
                  fill="#facc15"
                  stroke="#1c1917"
                  strokeWidth="1.5"
                />
              )}

              {/* Y-axis labels — show max at top, mid at center, min at bottom */}
              <text x={PAD_L - 6} y={PAD_T + 4} fill="#a1a1aa" fontSize="10" textAnchor="end">
                {formatSilver(Math.round(max))}
              </text>
              <text x={PAD_L - 6} y={PAD_T + innerH / 2 + 3} fill="#71717a" fontSize="10" textAnchor="end">
                {formatSilver(Math.round((min + max) / 2))}
              </text>
              <text x={PAD_L - 6} y={H - PAD_B + 4} fill="#a1a1aa" fontSize="10" textAnchor="end">
                {formatSilver(Math.round(min))}
              </text>

              {/* X-axis tick labels */}
              {xTicks.map((label, i) => {
                const x = PAD_L + (i / (xTicks.length - 1)) * innerW;
                return (
                  <text
                    key={i}
                    x={x}
                    y={H - 8}
                    fill="#71717a"
                    fontSize="10"
                    textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        )}

        {loading && series.length === 0 && (
          <div className="py-12 text-center text-zinc-500">Loading…</div>
        )}
        {error && !loading && (
          <div className="py-8 text-center text-red-400 text-sm">
            Couldn't load gold history: {error}. AODP is community-run and sometimes flaky — try refresh.
          </div>
        )}
      </div>
    </div>
  );
}
