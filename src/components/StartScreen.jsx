import React from 'react';

export default function StartScreen({ onStart, onSkipToToss }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 animate-bounce-in">
      {/* Title */}
      <div className="text-center">
        <div className="text-7xl mb-4 animate-float">🫓</div>
        <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
          משחק הפסח
        </h1>
        <p className="text-2xl text-purple-300 mt-4">שאלות ואתגרים לחג!</p>
      </div>

      {/* Decorations */}
      <div className="flex gap-8 text-5xl">
        <span className="animate-float" style={{ animationDelay: '0s' }}>🍷</span>
        <span className="animate-float" style={{ animationDelay: '0.5s' }}>🫓</span>
        <span className="animate-float" style={{ animationDelay: '1s' }}>🥬</span>
        <span className="animate-float" style={{ animationDelay: '1.5s' }}>🧱</span>
        <span className="animate-float" style={{ animationDelay: '2s' }}>🌊</span>
      </div>

      {/* How to play */}
      <div className="bg-purple-900/60 backdrop-blur-sm rounded-3xl p-8 max-w-lg border border-purple-400/30">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4 text-center">?איך משחקים</h2>

        <div className="space-y-4 text-lg text-purple-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📹</span>
            <span>המצלמה תזהה את תנועות הראש והידיים שלך</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">❓</span>
            <span>ענה על שאלות על פסח - הנהן (נכון) או הנד (לא נכון)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <span>זרוק חמץ לתוך המדורה וצבור נקודות!</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <span>היזהר מאזור הסכנה ליד האש!</span>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="text-purple-400 text-sm text-center">
        📸 נדרש: מצלמה פעילה | 🔊 מומלץ: רמקולים דלוקים
      </div>

      {/* Start buttons */}
      <button
        onClick={onStart}
        className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 text-white font-bold px-12 py-5 rounded-full text-3xl transition-all hover:scale-110 shadow-2xl animate-pulse-glow"
      >
        🎮 !יאללה, מתחילים
      </button>
      <button
        onClick={onSkipToToss}
        className="bg-purple-700/60 hover:bg-purple-600/60 text-purple-200 font-bold px-8 py-3 rounded-full text-lg transition-all hover:scale-105 border border-purple-400/30"
      >
        🔥 דלג לשריפת חמץ
      </button>
    </div>
  );
}
