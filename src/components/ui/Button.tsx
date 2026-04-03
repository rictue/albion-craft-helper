import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
  ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200',
  danger: 'bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/30',
};

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm font-semibold',
};

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }: Props) {
  return (
    <button
      className={`rounded-lg font-medium transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
