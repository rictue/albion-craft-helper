import { useEffect, useState } from 'react';

export default function ServerTime() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utc = time.toUTCString().split(' ')[4]; // "HH:MM:SS"

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-zinc-500 uppercase tracking-wider">Server Time:</span>
      <span className="text-gold font-mono font-semibold">{utc} UTC</span>
    </div>
  );
}
