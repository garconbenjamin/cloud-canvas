import React from 'react';
import { Viewport, UserProfile } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  sender: UserProfile;
  x: number; // canvas coordinates
  y: number; // canvas coordinates
  timestamp: number;
}

interface LiveReactionsProps {
  reactions: FloatingReaction[];
  viewport: Viewport;
}

export const LiveReactions: React.FC<LiveReactionsProps> = ({ reactions, viewport }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => {
          const screenX = r.x * viewport.zoom + viewport.x;
          const screenY = r.y * viewport.zoom + viewport.y;

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: screenY, x: screenX, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: screenY - 90,
                x: screenX + (Math.sin(r.timestamp) * 30),
                scale: [0.5, 1.4, 1.2, 0.8],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="absolute top-0 left-0 flex flex-col items-center pointer-events-none"
            >
              <span className="text-3xl drop-shadow-md">{r.emoji}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm mt-1">
                {r.sender.name}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
