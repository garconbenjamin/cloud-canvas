import React from 'react';

import { Viewport } from '../types.ts';

export function useScreenToWorld(
  containerRef: React.RefObject<HTMLElement | null>,
  viewport: Viewport,
) {
  return React.useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      return {
        x: (screenX - rect.left - viewport.x) / viewport.zoom,
        y: (screenY - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [containerRef, viewport],
  );
}
