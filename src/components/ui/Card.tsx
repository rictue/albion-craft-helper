import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'profit' | 'loss' | 'highlight';
  padding?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-bg-raised border-border',
  profit: 'bg-green-950/20 border-green-900/30',
  loss: 'bg-red-950/20 border-red-900/30',
  highlight: 'bg-gold/5 border-gold/20',
};

const paddingStyles = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({ children, className = '', variant = 'default', padding = 'md' }: Props) {
  return (
    <div className={`rounded-xl border ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3 ${className}`}>
      {children}
    </div>
  );
}
