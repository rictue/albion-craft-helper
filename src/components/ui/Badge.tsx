import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue' | 'purple' | 'yellow' | 'cyan';
  className?: string;
}

const variantStyles = {
  default: 'bg-zinc-800 text-zinc-300',
  gold: 'bg-gold/15 text-gold',
  green: 'bg-green-900/30 text-green-400',
  red: 'bg-red-900/30 text-red-400',
  blue: 'bg-blue-900/30 text-blue-400',
  purple: 'bg-purple-900/30 text-purple-400',
  yellow: 'bg-yellow-900/30 text-yellow-400',
  cyan: 'bg-cyan-900/30 text-cyan-400',
};

export default function Badge({ children, variant = 'default', className = '' }: Props) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1 ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
