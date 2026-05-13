import type { ReactNode } from 'react';

interface Props {
  /** Eyebrow text — short uppercase context label */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, actions, icon }: Props) {
  return (
    <div className="medieval-panel px-5 py-5 sm:px-7 sm:py-6 mb-5">
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div className="icon-frame h-12 w-12 rounded-md shrink-0 text-gold-light">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <div className="medieval-title-sm mb-1">{eyebrow}</div>
            )}
            <h1 className="medieval-title text-2xl sm:text-3xl leading-tight">{title}</h1>
            {description && (
              <p className="mt-1.5 text-sm text-[#bba485] leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
