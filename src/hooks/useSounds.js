import { useRef, useCallback } from 'react';

// Simple sound synthesis using Web Audio API (no external files needed)
export function useSounds() {
  const audioCtxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((frequency, duration, type = 'sine', volume = 0.3) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }, [getCtx]);

  const playCorrect = useCallback(() => {
    // Happy ascending notes
    playTone(523, 0.15, 'sine', 0.3); // C5
    setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 150); // E5
    setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 300); // G5
  }, [playTone]);

  const playWrong = useCallback(() => {
    // Sad descending
    playTone(400, 0.2, 'sawtooth', 0.15);
    setTimeout(() => playTone(300, 0.3, 'sawtooth', 0.15), 200);
  }, [playTone]);

  const playThrow = useCallback(() => {
    // Whoosh sound
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 200;
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }, [getCtx]);

  const playHit = useCallback((points) => {
    if (points > 50) {
      // Big hit - fanfare
      playTone(523, 0.1, 'sine', 0.3);
      setTimeout(() => playTone(659, 0.1, 'sine', 0.3), 100);
      setTimeout(() => playTone(784, 0.1, 'sine', 0.3), 200);
      setTimeout(() => playTone(1047, 0.4, 'sine', 0.3), 300);
    } else if (points > 0) {
      // Normal hit
      playTone(600, 0.2, 'sine', 0.3);
    } else {
      // Penalty
      playTone(200, 0.3, 'square', 0.1);
    }
  }, [playTone]);

  const playBonus = useCallback(() => {
    // Magical bonus sound
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, 'sine', 0.25), i * 80);
    });
  }, [playTone]);

  const playCalibrate = useCallback(() => {
    playTone(880, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(880, 0.1, 'sine', 0.2), 150);
  }, [playTone]);

  return { playCorrect, playWrong, playThrow, playHit, playBonus, playCalibrate };
}
