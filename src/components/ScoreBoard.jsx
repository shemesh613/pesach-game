import React from 'react';

export default function ScoreBoard({ score, questionNum, totalQuestions, throwsLeft }) {
  const progress = ((questionNum) / totalQuestions) * 100;

  return (
    <div className="flex items-center gap-6 bg-purple-900/60 backdrop-blur-md rounded-2xl px-6 py-3 border border-purple-400/20 shadow-lg">
      {/* Score */}
      <div className="text-center">
        <div className="text-sm text-purple-200 font-medium" style={{ fontFamily: 'Heebo, sans-serif' }}>ניקוד</div>
        <div className="text-4xl font-black text-yellow-400 glow-gold rounded-lg px-2"
             style={{ fontFamily: 'Rubik, sans-serif', textShadow: '0 2px 10px rgba(251,191,36,0.3)' }}>
          {score}
        </div>
      </div>

      {/* Progress */}
      <div className="flex-1 min-w-[200px]">
        <div className="text-sm text-purple-200 mb-1 text-center font-medium" style={{ fontFamily: 'Heebo, sans-serif' }}>
          שאלה {questionNum + 1} מתוך {totalQuestions}
        </div>
        <div className="w-full h-4 bg-purple-800/50 rounded-full overflow-hidden">
          <div
            className="progress-fill h-full rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Throws left (for mini-game) */}
      {throwsLeft !== undefined && (
        <div className="text-center">
          <div className="text-sm text-purple-200 font-medium" style={{ fontFamily: 'Heebo, sans-serif' }}>זריקות</div>
          <div className="flex gap-1">
            {Array.from({ length: throwsLeft }, (_, i) => (
              <span key={i} className="text-2xl">🫓</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
