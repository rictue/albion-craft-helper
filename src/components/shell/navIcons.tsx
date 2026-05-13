/**
 * Inline SVG icons for the sidebar nav and dashboard chrome. Hand-drawn
 * medieval / crafting motifs — no external icon library required.
 */

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'w-[18px] h-[18px]',
};

export const IconDashboard = (
  <svg {...baseProps}>
    <path d="M3 13a9 9 0 0 1 18 0" />
    <path d="M12 13l4-5" />
    <circle cx="12" cy="13" r="1.4" fill="currentColor" />
    <path d="M3 19h18" />
  </svg>
);

export const IconHammer = (
  <svg {...baseProps}>
    <path d="M14 4l6 6-2.5 2.5L11 6z" />
    <path d="M10.5 7.5 4 14l3 3 6.5-6.5" />
    <path d="M5 18l-1.5 1.5" />
  </svg>
);

export const IconAnvil = (
  <svg {...baseProps}>
    <path d="M4 9h13a4 4 0 0 1-4 4H8z" />
    <path d="M8 13v4" />
    <path d="M5 19h12" />
    <path d="M9 9V6h4v3" />
  </svg>
);

export const IconFurnace = (
  <svg {...baseProps}>
    <path d="M5 21V8l7-4 7 4v13" />
    <path d="M9 21v-6h6v6" />
    <path d="M9 11h6" />
  </svg>
);

export const IconHoof = (
  <svg {...baseProps}>
    <path d="M7 4c-1.5 2-2 4-2 6 0 4 2 8 6 8 1.5 0 3-1 3-2.5 0-2-2-2-2-4 0-3 1-5 1-7 0-1-1-2-3-2s-3 .5-3 1.5z" />
    <path d="M17 6l3 2-2 3" />
  </svg>
);

export const IconIsland = (
  <svg {...baseProps}>
    <path d="M3 17h18" />
    <path d="M5 17c2-2 5-2 7 0s5 0 7 0" />
    <path d="M12 13V5" />
    <path d="M9 8l3-3 3 3" />
    <path d="M12 5l-3 8h6z" />
  </svg>
);

export const IconLaborer = (
  <svg {...baseProps}>
    <circle cx="12" cy="7" r="3" />
    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <path d="M9 11l3 3 3-3" />
  </svg>
);

export const IconScales = (
  <svg {...baseProps}>
    <path d="M12 3v18" />
    <path d="M4 7h16" />
    <path d="M7 7l-3 6a3 3 0 0 0 6 0z" />
    <path d="M17 7l-3 6a3 3 0 0 0 6 0z" />
    <path d="M9 21h6" />
  </svg>
);

export const IconLedger = (
  <svg {...baseProps}>
    <path d="M6 3h11l3 3v15H6z" />
    <path d="M9 8h8M9 12h8M9 16h5" />
  </svg>
);

export const IconCog = (
  <svg {...baseProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
);

export const IconPouch = (
  <svg {...baseProps}>
    <path d="M7 9c0-2 2-4 5-4s5 2 5 4" />
    <path d="M4 21l3-12h10l3 12z" />
    <path d="M9 6h6" />
  </svg>
);

export const IconParchment = (
  <svg {...baseProps}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M15 3v4h4" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);

export const IconShield = (
  <svg {...baseProps}>
    <path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
    <path d="M12 8v6" />
  </svg>
);

export const IconFlame = (
  <svg {...baseProps}>
    <path d="M12 3c2 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-2-1-5 1-8z" />
  </svg>
);

export const IconCrown = (
  <svg {...baseProps}>
    <path d="M3 8l3 9h12l3-9-5 3-4-6-4 6z" />
    <path d="M6 20h12" />
  </svg>
);

export const IconBook = (
  <svg {...baseProps}>
    <path d="M5 4h6c1.5 0 3 1 3 2v14c0-1-1.5-2-3-2H5z" />
    <path d="M19 4h-6c-1.5 0-3 1-3 2v14c0-1 1.5-2 3-2h6z" />
  </svg>
);

export const IconCrate = (
  <svg {...baseProps}>
    <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
    <path d="M4 8l8 4 8-4" />
    <path d="M12 12v8" />
  </svg>
);

export const IconSearch = (
  <svg {...baseProps}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-3-3" />
  </svg>
);

export const IconChevron = (
  <svg {...baseProps}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconMenu = (
  <svg {...baseProps}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const IconClose = (
  <svg {...baseProps}>
    <path d="M6 6l12 12M18 6l-12 12" />
  </svg>
);

export const IconDiscord = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);
