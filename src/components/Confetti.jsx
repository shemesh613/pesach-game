import React, { useMemo } from 'react';

const COLORS = ['#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export default function Confetti({ active }) {
  const pieces = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 2,
      size: 5 + Math.random() * 10,
      rotation: Math.random() * 360
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece absolute"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
}
