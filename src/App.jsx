import React, { useState, useCallback, useEffect } from 'react';
import Stars from './components/Stars';
import StartScreen from './components/StartScreen';
import QuestionPhase from './components/QuestionPhase';
import BallTossGame from './components/BallTossGame';
import ScoreBoard from './components/ScoreBoard';
import Confetti from './components/Confetti';
import { getRandomQuestions } from './data/questions';
import { useSounds } from './hooks/useSounds';

const TOTAL_QUESTIONS = 5;

function App() {
  const [gameState, setGameState] = useState('start'); // start, questions, toss, end
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const sounds = useSounds();

  const startGame = useCallback(() => {
    const q = getRandomQuestions(TOTAL_QUESTIONS);
    setQuestions(q);
    setCurrentQ(0);
    setScore(0);
    setCorrectCount(0);
    setGameState('questions');
  }, []);

  const skipToToss = useCallback(() => {
    setScore(0);
    setCorrectCount(0);
    setGameState('toss');
  }, []);

  const handleAnswer = useCallback((isCorrect) => {
    if (isCorrect) {
      setScore(prev => prev + 20);
      setCorrectCount(prev => prev + 1);
    }

    if (currentQ + 1 >= TOTAL_QUESTIONS) {
      // All questions done, move to toss game
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setGameState('toss');
      }, 2000);
    } else {
      setCurrentQ(prev => prev + 1);
    }
  }, [currentQ]);

  const handleGameEnd = useCallback((finalScore) => {
    setScore(finalScore);
    setGameState('start');
  }, []);

  // Keyboard fallback for question phase
  useEffect(() => {
    if (gameState !== 'questions') return;

    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        // Simulate "yes" (correct)
        handleAnswer(questions[currentQ]?.answer === true);
      } else if (e.key === 'ArrowRight') {
        // Simulate "no" (false)
        handleAnswer(questions[currentQ]?.answer === false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, currentQ, questions, handleAnswer]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c0024] via-[#1a0a3e] to-[#2d1566] relative">
      <Stars />
      <Confetti active={showConfetti} />

      <div className="relative z-10 flex flex-col items-center p-4">
        {/* Header - always visible except start screen */}
        {gameState !== 'start' && (
          <div className="w-full max-w-4xl mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🫓</span>
                <h1 className="text-2xl font-bold text-yellow-400">משחק הפסח</h1>
              </div>
              <ScoreBoard
                score={score}
                questionNum={currentQ}
                totalQuestions={TOTAL_QUESTIONS}
                throwsLeft={gameState === 'toss' ? undefined : undefined}
              />
            </div>
          </div>
        )}

        {/* Game content */}
        {gameState === 'start' && (
          <StartScreen onStart={startGame} onSkipToToss={skipToToss} />
        )}

        {gameState === 'questions' && questions[currentQ] && (
          <QuestionPhase
            question={questions[currentQ]}
            onAnswer={handleAnswer}
            sounds={sounds}
          />
        )}

        {gameState === 'toss' && (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-4 animate-bounce-in">
              <h2 className="text-2xl font-bold text-yellow-400">
                🔥 שלב שריפת החמץ! זרוק את החמץ לאש!
              </h2>
              <p className="text-purple-300">
                ענית נכון על {correctCount} מתוך {TOTAL_QUESTIONS} שאלות (+{correctCount * 20} נקודות)
              </p>
            </div>
            <BallTossGame
              onGameEnd={handleGameEnd}
              initialScore={score}
              sounds={sounds}
            />
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
