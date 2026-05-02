import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: 'bg-gold/20 hover:bg-gold/30 text-gold-light border border-gold/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  secondary: 'bg-[color:var(--color-bg-overlay)] hover:bg-[color:var(--color-bg-elevated)] text-zinc-200 border border-[color:var(--color-border)]',
  ghost: 'hover:bg-[color:var(--color-bg-overlay)] text-zinc-400 hover:text-gold',
  danger: 'bg-red-950/30 hover:bg-red-950/45 text-red-300 border border-red-800/40',
};

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm font-semibold',
};

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }: Props) {
  return (
    <button
      className={`rounded-lg font-semibold transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
