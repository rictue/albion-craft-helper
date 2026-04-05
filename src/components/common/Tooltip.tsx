import { useState } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg shadow-xl text-[11px] text-zinc-300 whitespace-nowrap z-50 pointer-events-none max-w-xs">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-zinc-950 border-r border-b border-zinc-700 rotate-45" />
        </span>
      )}
    </span>
  );
}

export function InfoIcon() {
  return (
    <svg className="w-3 h-3 text-zinc-600 hover:text-zinc-400 cursor-help inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
