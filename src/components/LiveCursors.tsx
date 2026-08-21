import { MousePointer } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import { UserPresence, Viewport } from '../types.ts';

interface LiveCursorsProps {
  presences: UserPresence[];
  currentUserId: string;
  viewport: Viewport;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ presences, currentUserId, viewport }) => {
  // Filter out current user and users without active cursor
  const activeRemoteUsers = presences.filter(
    (u) => u.id !== currentUserId && u.cursor !== null && Date.now() - u.lastActive < 30000,
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {activeRemoteUsers.map((user, idx) => {
          if (!user.cursor) return null;

          // Convert canvas coordinate space to screen coordinate space
          const screenX = user.cursor.x * viewport.zoom + viewport.x;
          const screenY = user.cursor.y * viewport.zoom + viewport.y;

          return (
            <motion.div
              key={user.connectionId || `${user.id}_${idx}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: screenX,
                y: screenY,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                type: 'spring',
                damping: 28,
                stiffness: 350,
                mass: 0.2,
              }}
              className="absolute top-0 left-0 flex flex-col items-start select-none pointer-events-none"
              style={{ willChange: 'transform' }}
            >
              {/* Custom Colored Cursor Vector */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              >
                <path
                  d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                  fill={user.color || '#6366f1'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </svg>

              {/* User Label Tag */}
              <div
                className="mt-1 ml-3 px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-lg flex items-center gap-1.5 whitespace-nowrap border border-white/20"
                style={{ backgroundColor: user.color || '#6366f1' }}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-3.5 h-3.5 rounded-full object-cover border border-white/40"
                  />
                ) : null}
                <span>{user.name}</span>
                {user.isDragging && (
                  <span className="text-[10px] bg-black/20 px-1 rounded">移動中</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
