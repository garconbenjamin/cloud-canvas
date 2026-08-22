import type { FC, ReactNode } from 'react';

interface PanelToggleButtonProps {
  id: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
  side?: 'left' | 'right';
}

export const PanelToggleButton: FC<PanelToggleButtonProps> = ({
  id,
  label,
  onClick,
  children,
  side = 'left',
}) => (
  <button
    id={id}
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`fixed top-16 ${side === 'right' ? 'right-4' : 'left-4'} z-30 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white shadow-xl backdrop-blur-xl hover:bg-neutral-800 transition-all`}
  >
    {children}
  </button>
);
