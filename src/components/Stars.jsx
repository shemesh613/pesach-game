import React, { useMemo } from 'react';

export default function Stars() {
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      size: 1 + Math.random() * 3
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`
          }}
        />
      ))}
    </div>
  );
}
