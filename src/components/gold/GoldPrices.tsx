import { useState, useEffect, useCallback } from 'react';
import { formatSilver } from '../../utils/formatters';

interface GoldPrice {
  price: number;
  timestamp: string;
}

export default function GoldPrices() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const server = localStorage.getItem('albion-server') || 'europe';
      const res = await fetch(`https://${server}.albion-online-data.com/api/v2/stats/gold?count=168`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = prices[0]?.price || 0;
  const oldest = prices[prices.length - 1]?.price || 0;
  const change = current - oldest;
  const changePct = oldest > 0 ? (change / oldest) * 100 : 0;

  const max = Math.max(...prices.map(p => p.price), 1);
  const min = Math.min(...prices.map(p => p.price), 0);
  const range = max - min || 1;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Current Gold Price</h2>
            <div className="text-3xl font-bold text-gold mt-1">{formatSilver(current)}</div>
            <div className="text-xs text-zinc-500">silver per gold</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase">7-day Change</div>
            <div className={`text-xl font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{formatSilver(change)}
            </div>
            <div className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Simple SVG chart */}
        {prices.length > 0 && (
          <div className="mt-6">
            <svg viewBox="0 0 800 200" className="w-full h-48">
              <polyline
                fill="none"
                stroke="#d4a843"
                strokeWidth="2"
                points={prices.slice().reverse().map((p, i) => {
                  const x = (i / (prices.length - 1)) * 800;
                  const y = 190 - ((p.price - min) / range) * 180;
                  return `${x},${y}`;
                }).join(' ')}
              />
              <text x="5" y="15" fill="#71717a" fontSize="10">{formatSilver(max)}</text>
              <text x="5" y="195" fill="#71717a" fontSize="10">{formatSilver(min)}</text>
            </svg>
            <div className="flex justify-between text-xs text-zinc-600 mt-2">
              <span>7 days ago</span>
              <span>Now</span>
            </div>
          </div>
        )}
      </div>

      {loading && prices.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center text-zinc-500">Loading...</div>
      )}
    </div>
  );
}
