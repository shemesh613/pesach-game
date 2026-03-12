import React from 'react';

export default function StartScreen({ onStart, onSkipToToss }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 animate-bounce-in px-4">
      {/* Title */}
      <div className="text-center">
        <div className="text-8xl mb-6 animate-float drop-shadow-lg">🫓</div>
        <h1 className="text-7xl font-black leading-tight tracking-tight"
            style={{ fontFamily: 'Rubik, Heebo, sans-serif', color: '#fbbf24', textShadow: '0 4px 20px rgba(251,191,36,0.4), 0 2px 4px rgba(0,0,0,0.5)' }}>
          משחק הפסח
        </h1>
        <p className="text-2xl text-purple-200 mt-3 font-medium" style={{ fontFamily: 'Heebo, sans-serif' }}>
          שאלות ואתגרים לחג!
        </p>
      </div>

      {/* Decorations */}
      <div className="flex gap-10 text-5xl my-2">
        <span className="animate-float drop-shadow-md" style={{ animationDelay: '0s' }}>🍷</span>
        <span className="animate-float drop-shadow-md" style={{ animationDelay: '0.5s' }}>🫓</span>
        <span className="animate-float drop-shadow-md" style={{ animationDelay: '1s' }}>🥬</span>
        <span className="animate-float drop-shadow-md" style={{ animationDelay: '1.5s' }}>🧱</span>
        <span className="animate-float drop-shadow-md" style={{ animationDelay: '2s' }}>🌊</span>
      </div>

      {/* How to play */}
      <div className="bg-gradient-to-br from-purple-900/70 to-indigo-900/70 backdrop-blur-md rounded-3xl p-8 max-w-lg border border-purple-400/20 shadow-2xl">
        <h2 className="text-3xl font-extrabold text-yellow-400 mb-5 text-center" style={{ fontFamily: 'Rubik, sans-serif' }}>
          איך משחקים?
        </h2>

        <div className="space-y-4 text-lg text-purple-100" style={{ fontFamily: 'Heebo, sans-serif' }}>
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5 flex-shrink-0">📹</span>
            <span className="leading-relaxed">המצלמה תזהה את תנועות הראש והידיים שלך</span>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5 flex-shrink-0">❓</span>
            <span className="leading-relaxed">ענה על שאלות על פסח — הנהן (נכון) או הנד (לא נכון)</span>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5 flex-shrink-0">🔥</span>
            <span className="leading-relaxed">עצום עיניים כדי לטעון כוח וזרוק חמץ לתוך המדורה!</span>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5 flex-shrink-0">🎯</span>
            <span className="leading-relaxed">שחרר בזמן הנכון — לא חלש מדי ולא חזק מדי!</span>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="flex gap-6 text-purple-300 text-base font-medium">
        <span>📸 נדרש: מצלמה פעילה</span>
        <span className="text-purple-500">|</span>
        <span>🔊 מומלץ: רמקולים דלוקים</span>
      </div>

      {/* Start buttons */}
      <button
        onClick={onStart}
        className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 text-white font-extrabold px-14 py-5 rounded-full text-3xl transition-all hover:scale-110 shadow-2xl animate-pulse-glow"
        style={{ fontFamily: 'Rubik, sans-serif', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
      >
        יאללה, מתחילים! 🎮
      </button>
      <button
        onClick={onSkipToToss}
        className="bg-purple-700/50 hover:bg-purple-600/60 text-purple-200 font-bold px-8 py-3 rounded-full text-lg transition-all hover:scale-105 border border-purple-400/30"
        style={{ fontFamily: 'Heebo, sans-serif' }}
      >
        דלג לשריפת חמץ 🔥
      </button>
    </div>
  );
}
