import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

const defaultIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17 9 21l-1-4M14.25 17l.75 4 1-4M3 13.5h18M5 9.5l1.5-4.5h11L19 9.5M5 9.5h14v8H5z" />
  </svg>
);

export default function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-mark">{icon ?? defaultIcon}</div>
      <div className="medieval-title-sm">{title}</div>
      {description && <div className="text-xs max-w-md leading-relaxed">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
