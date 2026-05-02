import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'profit' | 'loss' | 'highlight';
  padding?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'medieval-panel',
  profit: 'bg-green-950/20 border-green-700/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  loss: 'bg-red-950/25 border-red-800/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  highlight: 'bg-gold/10 border-gold/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
};

const paddingStyles = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({ children, className = '', variant = 'default', padding = 'md' }: Props) {
  return (
    <div className={`rounded-lg border ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-xs text-gold uppercase tracking-wider font-semibold mb-3 ${className}`}>
      {children}
    </div>
  );
}
