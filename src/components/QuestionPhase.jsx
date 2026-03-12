import React, { useState, useCallback, useEffect } from 'react';
import WebcamView from './WebcamView';
import { useFaceDetection } from '../hooks/useFaceDetection';

export default function QuestionPhase({ question, onAnswer, sounds }) {
  const [showFeedback, setShowFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);

  const handleGesture = useCallback((gesture) => {
    if (answered) return;

    const userAnswer = gesture === 'yes';
    const isCorrect = userAnswer === question.answer;

    setAnswered(true);
    setShowFeedback({ isCorrect, explanation: question.explanation });

    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    // Move to next after delay
    setTimeout(() => {
      onAnswer(isCorrect);
      setShowFeedback(null);
      setAnswered(false);
    }, 2500);
  }, [answered, question, onAnswer, sounds]);

  const {
    videoRef,
    canvasRef,
    isCalibrated,
    isLoading,
    calibrate,
    currentPose,
    detectedGesture,
    gestureProgress,
    resetGesture
  } = useFaceDetection(handleGesture, !answered);

  // Reset gesture buffer when question changes
  useEffect(() => {
    resetGesture();
  }, [question.id, resetGesture]);

  // Auto-calibrate hint
  const [showCalibHint, setShowCalibHint] = useState(true);
  useEffect(() => {
    if (isCalibrated) setShowCalibHint(false);
  }, [isCalibrated]);

  return (
    <div className="flex flex-col items-center gap-6 animate-slide-up">
      {/* Question Card */}
      <div className="relative bg-gradient-to-br from-purple-800/80 to-indigo-900/80 backdrop-blur-sm rounded-3xl p-8 max-w-2xl w-full border-2 border-purple-400/40 shadow-2xl">
        {/* Decorative corners */}
        <div className="absolute top-3 right-3 text-3xl">🫓</div>
        <div className="absolute top-3 left-3 text-3xl">🍷</div>

        <h2 className="text-3xl font-bold text-white text-center leading-relaxed mt-6">
          {question.text}
        </h2>

        {/* Gesture hint */}
        <div className="flex justify-center gap-12 mt-6">
          <div className={`flex flex-col items-center transition-all ${detectedGesture === 'yes' ? 'scale-125' : ''}`}>
            <div className={`text-5xl ${detectedGesture === 'yes' ? 'animate-bounce' : ''}`}>👆👇</div>
            <span className="text-green-400 font-bold text-lg mt-2">נכון ✓</span>
            <span className="text-purple-300 text-sm">הנהן בראש</span>
          </div>
          <div className={`flex flex-col items-center transition-all ${detectedGesture === 'no' ? 'scale-125' : ''}`}>
            <div className={`text-5xl ${detectedGesture === 'no' ? 'animate-bounce' : ''}`}>👈👉</div>
            <span className="text-red-400 font-bold text-lg mt-2">לא נכון ✗</span>
            <span className="text-purple-300 text-sm">הנד בראש לצדדים</span>
          </div>
        </div>
      </div>

      {/* Webcam + Pose Indicator */}
      <div className="flex items-center gap-6">
        <WebcamView videoRef={videoRef} canvasRef={canvasRef} />

        {/* Pose indicator */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 bg-purple-700/60 rounded-full border-2 border-purple-400 flex items-center justify-center transition-transform"
            style={{
              transform: `rotateY(${(currentPose.yaw - (isCalibrated ? 0 : 0)) * 2}deg) rotateX(${-(currentPose.pitch) * 2}deg)`
            }}
          >
            <span className="text-3xl">😊</span>
          </div>

          {!isCalibrated && (
            <button
              onClick={() => { calibrate(); sounds.playCalibrate(); }}
              className="bg-yellow-500 hover:bg-yellow-400 text-purple-900 font-bold px-6 py-3 rounded-full text-lg transition-all hover:scale-105 animate-pulse-glow"
            >
              🎯 כיול מצלמה
            </button>
          )}

          {isCalibrated && (
            <div className="text-green-400 text-sm font-bold">✅ מכויל</div>
          )}
        </div>
      </div>

      {/* Gesture progress indicator */}
      {isCalibrated && !answered && gestureProgress.progress > 0 && (
        <div className="w-80 bg-purple-900/60 backdrop-blur-sm rounded-2xl px-5 py-3 border border-purple-400/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-purple-200">
              {gestureProgress.type === 'yes' ? '👆 מזהה הנהון...' : '👈 מזהה הנדה...'}
            </span>
            <span className="text-sm text-yellow-400 font-bold">
              {Math.round(gestureProgress.progress * 100)}%
            </span>
          </div>
          <div className="w-full h-4 bg-purple-800/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${gestureProgress.progress * 100}%`,
                background: gestureProgress.type === 'yes'
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #ef4444, #f87171)'
              }}
            />
          </div>
        </div>
      )}

      {/* Calibration hint */}
      {showCalibHint && !isLoading && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl px-6 py-3 text-yellow-300 text-center animate-bounce-in">
          💡 הסתכל ישר למצלמה ולחץ על "כיול מצלמה" כדי להתחיל!
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-purple-300 text-lg animate-pulse">
          ⏳ טוען זיהוי פנים...
        </div>
      )}

      {/* Feedback overlay */}
      {showFeedback && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-bounce-in`}>
          <div className={`rounded-3xl p-10 max-w-md mx-4 text-center ${
            showFeedback.isCorrect
              ? 'bg-gradient-to-br from-green-600 to-emerald-700 glow-green'
              : 'bg-gradient-to-br from-red-600 to-rose-700 glow-red'
          }`}>
            <div className="text-7xl mb-4">
              {showFeedback.isCorrect ? '🎉' : '😅'}
            </div>
            <div className="text-3xl font-bold text-white mb-3">
              {showFeedback.isCorrect ? 'כל הכבוד!' : 'אוי, לא נכון!'}
            </div>
            <div className="text-xl text-white/90 leading-relaxed">
              {showFeedback.explanation}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard fallback for testing */}
      <div className="text-purple-400/50 text-xs mt-2">
        💻 לבדיקה: לחץ ← (נכון) או → (לא נכון)
      </div>
    </div>
  );
}
