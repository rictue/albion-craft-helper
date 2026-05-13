import type { ReactNode } from 'react';

type Tone = 'warning' | 'danger' | 'info';

interface Props {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}

const icons: Record<Tone, ReactNode> = {
  warning: (
    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
    </svg>
  ),
  danger: (
    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path strokeLinecap="round" d="M12 16v-4m0-4h.01"/>
    </svg>
  ),
};

const toneClass: Record<Tone, string> = {
  warning: '',
  danger: 'is-danger',
  info: 'is-info',
};

export default function WarningBox({ tone = 'warning', title, children }: Props) {
  return (
    <div className={`warn-box ${toneClass[tone]}`}>
      {icons[tone]}
      <div className="flex-1">
        {title && <div className="font-bold mb-0.5">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
