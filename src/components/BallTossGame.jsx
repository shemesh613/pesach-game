import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFaceThrow } from '../hooks/useFaceThrow';

// Hebrew speech announcer (non-blocking, cancels previous)
function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'he-IL';
    utter.rate = 1.2;
    utter.volume = 0.9;
    window.speechSynthesis.speak(utter);
  } catch (e) {}
}

const CANVAS_W = 800;
const CANVAS_H = 600;

// Fire position and scoring zones
const FIRE_X = 400;
const FIRE_Y = 320;
const FIRE_CENTER_R = 50;  // +100 (direct into flames!)
const FIRE_CLOSE_R = 90;   // +50
const FIRE_OUTER_R = 140;  // +25
const FIRE_EDGE_R = 200;   // +10

const TOTAL_THROWS = 5;
const FLY_DURATION_MS = 800;

// Generate a random chametz position (away from fire)
function randomChametzPos() {
  for (let i = 0; i < 50; i++) {
    const x = 80 + Math.random() * (CANVAS_W - 160);
    const y = 80 + Math.random() * (CANVAS_H - 180);
    const dist = Math.sqrt((x - FIRE_X) ** 2 + (y - FIRE_Y) ** 2);
    if (dist > 180) return { x, y }; // far enough from fire
  }
  // Fallback: corners
  return { x: 100, y: CANVAS_H - 100 };
}

// Interpolation
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Draw the big bonfire
function drawFire(ctx, x, y, time) {
  // Ambient glow
  const ambientGlow = ctx.createRadialGradient(x, y - 20, 0, x, y - 20, 180);
  ambientGlow.addColorStop(0, 'rgba(255, 150, 0, 0.12)');
  ambientGlow.addColorStop(0.5, 'rgba(255, 80, 0, 0.06)');
  ambientGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
  ctx.fillStyle = ambientGlow;
  ctx.beginPath();
  ctx.arc(x, y - 20, 180, 0, Math.PI * 2);
  ctx.fill();

  const flames = 20;
  for (let i = 0; i < flames; i++) {
    const angle = (i / flames) * Math.PI * 2 + time * 0.02;
    const flicker = Math.sin(time * 0.1 + i * 2) * 12;
    const height = 80 + Math.sin(time * 0.05 + i) * 25;
    const spread = 35;

    ctx.save();
    ctx.translate(x + Math.cos(angle) * spread + flicker, y);
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.quadraticCurveTo(-8 + flicker * 0.3, -height * 0.6, 0, -height);
    ctx.quadraticCurveTo(8 - flicker * 0.3, -height * 0.6, 15, 0);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, -height);
    grad.addColorStop(0, 'rgba(255, 80, 0, 0.8)');
    grad.addColorStop(0.3, 'rgba(255, 180, 0, 0.6)');
    grad.addColorStop(0.6, 'rgba(255, 220, 50, 0.4)');
    grad.addColorStop(0.85, 'rgba(255, 255, 150, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // Bright inner core
  ctx.beginPath();
  ctx.arc(x, y - 25, 50, 0, Math.PI * 2);
  const coreGrad = ctx.createRadialGradient(x, y - 25, 0, x, y - 25, 50);
  coreGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
  coreGrad.addColorStop(0.4, 'rgba(255, 220, 80, 0.7)');
  coreGrad.addColorStop(0.7, 'rgba(255, 150, 0, 0.3)');
  coreGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Sparks
  for (let i = 0; i < 10; i++) {
    const sparkX = x + Math.sin(time * 0.03 + i * 3) * 40;
    const sparkY = y - 60 - (time * 0.5 + i * 20) % 100;
    const sparkAlpha = 1 - ((time * 0.5 + i * 20) % 100) / 100;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 0, ${sparkAlpha * 0.8})`;
    ctx.fill();
  }

  // Big wood logs at base
  ctx.fillStyle = '#5c3317';
  ctx.fillRect(x - 65, y + 8, 130, 16);
  ctx.fillRect(x - 50, y + 4, 100, 10);
  ctx.save();
  ctx.translate(x, y + 14);
  ctx.rotate(-0.3);
  ctx.fillRect(-55, 0, 110, 14);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y + 14);
  ctx.rotate(0.3);
  ctx.fillRect(-55, 0, 110, 14);
  ctx.restore();
}

// Draw chametz bread
function drawChametz(ctx, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const breadGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
  breadGrad.addColorStop(0, '#f0d4a0');
  breadGrad.addColorStop(0.5, '#c8943c');
  breadGrad.addColorStop(1, '#8b5e14');

  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = breadGrad;
  ctx.fill();
  ctx.strokeStyle = '#6b4410';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Scoring marks
  ctx.strokeStyle = '#a0722a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.1);
  ctx.lineTo(r * 0.4, -r * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.2);
  ctx.lineTo(r * 0.3, r * 0.2);
  ctx.stroke();

  ctx.fillStyle = '#4a2c0a';
  ctx.font = `bold ${r * 0.7}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍞', 0, 0);

  ctx.restore();
}

// Draw score zones (subtle rings)
function drawScoreZones(ctx) {
  const zones = [
    { r: FIRE_EDGE_R, color: 'rgba(100, 150, 255, 0.12)', label: '+10', labelColor: 'rgba(100, 150, 255, 0.4)' },
    { r: FIRE_OUTER_R, color: 'rgba(100, 200, 100, 0.15)', label: '+25', labelColor: 'rgba(100, 200, 100, 0.5)' },
    { r: FIRE_CLOSE_R, color: 'rgba(255, 200, 50, 0.18)', label: '+50', labelColor: 'rgba(255, 200, 50, 0.6)' },
  ];

  for (const zone of zones) {
    ctx.beginPath();
    ctx.arc(FIRE_X, FIRE_Y, zone.r, 0, Math.PI * 2);
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = zone.labelColor;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(zone.label, FIRE_X + zone.r - 18, FIRE_Y - 8);
  }
}

export default function BallTossGame({ onGameEnd, initialScore, sounds }) {
  const canvasRef = useRef(null);
  const renderRef = useRef(null);
  const frameCountRef = useRef(0);
  const flyAnimRef = useRef(null); // animation state in ref for draw loop

  const [throwsLeft, setThrowsLeft] = useState(TOTAL_THROWS);
  const [score, setScore] = useState(initialScore || 0);
  const [chametzPos, setChametzPos] = useState(() => randomChametzPos());
  const [lastHit, setLastHit] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [ballFlying, setBallFlying] = useState(false);

  const handleThrowRef = useRef(null);
  const stableHandleThrow = useCallback((params) => {
    if (handleThrowRef.current) handleThrowRef.current(params);
  }, []);

  const {
    videoRef: faceVideoRef,
    canvasRef: faceCanvasRef,
    isLoading: faceLoading,
    faceDetected,
    power: throwPower,
    isCharging,
    isWaitingDebounce,
    eyeState
  } = useFaceThrow(stableHandleThrow, !ballFlying && throwsLeft > 0);

  // Speech announcements
  const prevChargingRef = useRef(false);
  const spokenPowerRef = useRef(0);

  useEffect(() => {
    if (isCharging && !prevChargingRef.current) {
      speak('טוען כוח!');
      spokenPowerRef.current = 0;
    }
    prevChargingRef.current = isCharging;
  }, [isCharging]);

  // Announce power milestones + warn about overshoot
  useEffect(() => {
    if (!isCharging) return;
    if (throwPower >= 0.4 && spokenPowerRef.current < 0.4) {
      speak('חלש');
      spokenPowerRef.current = 0.4;
    } else if (throwPower >= 0.6 && spokenPowerRef.current < 0.6) {
      speak('טוב!');
      spokenPowerRef.current = 0.6;
    } else if (throwPower >= 0.8 && spokenPowerRef.current < 0.8) {
      speak('מצוין!');
      spokenPowerRef.current = 0.8;
    } else if (throwPower >= 0.92 && spokenPowerRef.current < 0.92) {
      speak('זהירות! יותר מדי!');
      spokenPowerRef.current = 0.92;
    }
  }, [throwPower, isCharging]);

  // Calculate landing: power controls distance along the line to fire
  // Sweet spot ~60-80%. Under = short, over = overshoot past fire
  const calcLandingPos = useCallback((fromX, fromY, power) => {
    const dist = Math.sqrt((fromX - FIRE_X) ** 2 + (fromY - FIRE_Y) ** 2);
    const dirAngle = Math.atan2(FIRE_Y - fromY, FIRE_X - fromX);

    // Power mapping: 0.7 power = lands exactly at fire center
    // Below 0.7 = falls short, above 0.7 = overshoots past fire
    const sweetSpot = 0.7;
    const travelDist = (power / sweetSpot) * dist;

    let landX = fromX + Math.cos(dirAngle) * travelDist;
    let landY = fromY + Math.sin(dirAngle) * travelDist;

    // Small random scatter
    const scatter = 20;
    landX += (Math.random() - 0.5) * scatter;
    landY += (Math.random() - 0.5) * scatter;

    return { x: landX, y: landY };
  }, []);

  // Check score based on landing position
  const checkScore = useCallback((landX, landY) => {
    const dist = Math.sqrt((landX - FIRE_X) ** 2 + (landY - FIRE_Y) ** 2);

    let points = 0;
    let label = '';
    if (dist < FIRE_CENTER_R) {
      points = 100;
      label = '🔥 ישירות לאש!';
    } else if (dist < FIRE_CLOSE_R) {
      points = 50;
      label = '🎯 קרוב מאוד!';
    } else if (dist < FIRE_OUTER_R) {
      points = 25;
      label = '👍 יפה!';
    } else if (dist < FIRE_EDGE_R) {
      points = 10;
      label = '💨 כמעט!';
    } else {
      points = 0;
      label = '😅 החטאת!';
    }

    return { points, label, dist };
  }, []);

  // Handle throw
  const handleThrow = useCallback(({ power }) => {
    if (ballFlying || throwsLeft <= 0 || !chametzPos) return;

    sounds.playThrow();
    speak('זורק!');
    setBallFlying(true);

    const landing = calcLandingPos(chametzPos.x, chametzPos.y, power);
    const arcHeight = Math.sqrt((chametzPos.x - landing.x) ** 2 + (chametzPos.y - landing.y) ** 2) * 0.4;

    // Start fly animation
    const startTime = performance.now();
    flyAnimRef.current = {
      startX: chametzPos.x,
      startY: chametzPos.y,
      endX: landing.x,
      endY: landing.y,
      arcHeight: Math.max(arcHeight, 50),
      startTime,
      duration: FLY_DURATION_MS,
      progress: 0
    };

    // After animation completes, score and spawn next
    setTimeout(() => {
      flyAnimRef.current = null;
      const { points, label } = checkScore(landing.x, landing.y);

      sounds.playHit(points);
      // Announce result
      if (points >= 100) speak('מושלם! ישירות לאש!');
      else if (points >= 50) speak('יפה מאוד!');
      else if (points >= 25) speak('לא רע!');
      else if (points >= 10) speak('כמעט!');
      else speak('החטאת!');

      setScore(prev => prev + points);
      setLastHit({ x: landing.x, y: landing.y, points, label, time: Date.now() });

      setThrowsLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => { speak('המשחק נגמר! כל הכבוד!'); setShowResult(true); }, 1500);
        } else {
          // Spawn new chametz at different position
          setChametzPos(randomChametzPos());
        }
        return next;
      });

      setBallFlying(false);
    }, FLY_DURATION_MS + 200);
  }, [ballFlying, throwsLeft, chametzPos, sounds, calcLandingPos, checkScore]);

  // Keep handleThrowRef in sync
  useEffect(() => {
    handleThrowRef.current = handleThrow;
  }, [handleThrow]);

  // Keyboard fallback
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' && !ballFlying && throwsLeft > 0) {
        handleThrow({ power: 0.5 + Math.random() * 0.5 });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleThrow, ballFlying, throwsLeft]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      frameCountRef.current++;
      const t = frameCountRef.current;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Night sky background
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#0a001a');
      grad.addColorStop(0.4, '#1a0a2e');
      grad.addColorStop(0.7, '#2a1a10');
      grad.addColorStop(1, '#1a1208');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Ground
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(0, FIRE_Y + 40, CANVAS_W, CANVAS_H - FIRE_Y - 40);
      ctx.fillStyle = '#2a200a';
      ctx.fillRect(0, FIRE_Y + 38, CANVAS_W, 6);

      // Fire glow on ground
      const groundGlow = ctx.createRadialGradient(FIRE_X, FIRE_Y + 40, 0, FIRE_X, FIRE_Y + 40, 280);
      groundGlow.addColorStop(0, 'rgba(255, 100, 0, 0.2)');
      groundGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
      ctx.fillStyle = groundGlow;
      ctx.fillRect(0, FIRE_Y, CANVAS_W, CANVAS_H - FIRE_Y);

      // Score zones
      drawScoreZones(ctx);

      // Big bonfire!
      drawFire(ctx, FIRE_X, FIRE_Y, t);

      // Fire center label
      ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🔥 +100', FIRE_X, FIRE_Y + 65);

      // Chametz at random position (idle bounce animation)
      const anim = flyAnimRef.current;
      if (!anim && chametzPos) {
        const bounce = Math.sin(t * 0.08) * 6;
        drawChametz(ctx, chametzPos.x, chametzPos.y + bounce, 22, t * 0.015);

        // "Throw me!" indicator
        ctx.fillStyle = 'rgba(255, 220, 100, 0.85)';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🍞 זרוק אותי!', chametzPos.x, chametzPos.y - 35);

        // Draw aiming line — straight to fire, length = power
        if (isCharging && throwPower > 0) {
          const dirAngle = Math.atan2(FIRE_Y - chametzPos.y, FIRE_X - chametzPos.x);
          const dist = Math.sqrt((chametzPos.x - FIRE_X) ** 2 + (chametzPos.y - FIRE_Y) ** 2);
          // Show where it would land: power/0.7 * dist (matching calcLandingPos)
          const previewDist = Math.min((throwPower / 0.7) * dist, dist * 1.5);
          const lineLen = Math.min(previewDist, 300);

          ctx.beginPath();
          ctx.moveTo(chametzPos.x, chametzPos.y);
          ctx.lineTo(
            chametzPos.x + Math.cos(dirAngle) * lineLen,
            chametzPos.y + Math.sin(dirAngle) * lineLen
          );
          // Green in sweet spot (0.55-0.85), yellow outside, red if overshoot
          const inSweet = throwPower >= 0.55 && throwPower <= 0.85;
          const isOver = throwPower > 0.85;
          const arrowColor = inSweet
            ? `rgba(34, 197, 94, ${0.5 + throwPower * 0.5})`
            : isOver
            ? `rgba(239, 68, 68, ${0.5 + throwPower * 0.5})`
            : `rgba(251, 191, 36, ${0.4 + throwPower * 0.5})`;
          ctx.strokeStyle = arrowColor;
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Landing preview dot
          const tipX = chametzPos.x + Math.cos(dirAngle) * lineLen;
          const tipY = chametzPos.y + Math.sin(dirAngle) * lineLen;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 6 + throwPower * 8, 0, Math.PI * 2);
          ctx.fillStyle = arrowColor;
          ctx.fill();

          // Power label at tip
          ctx.font = 'bold 13px Arial';
          ctx.textAlign = 'center';
          ctx.fillStyle = arrowColor;
          const label = isOver ? '⚠️ חזק מדי!' : inSweet ? '✅ מושלם!' : '💪 עוד קצת...';
          ctx.fillText(label, tipX, tipY - 18);
        }
      }

      // Flying chametz animation
      if (anim) {
        const now = performance.now();
        const progress = Math.min((now - anim.startTime) / anim.duration, 1);
        anim.progress = progress;

        // Ease out curve
        const eased = 1 - Math.pow(1 - progress, 2);
        const cx = lerp(anim.startX, anim.endX, eased);
        const cy = lerp(anim.startY, anim.endY, eased) - Math.sin(eased * Math.PI) * anim.arcHeight;

        drawChametz(ctx, cx, cy, 22, progress * Math.PI * 6); // spinning

        // Trail effect
        for (let trail = 1; trail <= 3; trail++) {
          const tp = Math.max(0, eased - trail * 0.08);
          const tx = lerp(anim.startX, anim.endX, tp);
          const ty = lerp(anim.startY, anim.endY, tp) - Math.sin(tp * Math.PI) * anim.arcHeight;
          ctx.beginPath();
          ctx.arc(tx, ty, 6 - trail, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 150, 50, ${0.3 - trail * 0.08})`;
          ctx.fill();
        }

        // Impact flash at end
        if (progress >= 0.95) {
          const flashSize = (progress - 0.95) / 0.05 * 30;
          ctx.beginPath();
          ctx.arc(anim.endX, anim.endY, flashSize, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
          ctx.fill();
        }
      }

      // Score popup
      if (lastHit && Date.now() - lastHit.time < 2000) {
        const age = (Date.now() - lastHit.time) / 2000;
        ctx.save();
        ctx.globalAlpha = 1 - age;
        ctx.font = `bold ${32 + age * 20}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = lastHit.points > 0 ? '#22c55e' : '#ef4444';
        ctx.fillText(
          lastHit.points > 0 ? `+${lastHit.points}` : '0',
          lastHit.x,
          lastHit.y - age * 80
        );
        ctx.font = 'bold 16px Arial';
        ctx.fillText(lastHit.label, lastHit.x, lastHit.y - age * 80 + 30);

        if (lastHit.points >= 100) {
          ctx.fillStyle = `rgba(255, 200, 0, ${(1 - age) * 0.5})`;
          ctx.beginPath();
          ctx.arc(FIRE_X, FIRE_Y - 20, 70 + age * 50, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Instruction when idle
      if (!anim && throwsLeft > 0 && !ballFlying) {
        ctx.fillStyle = 'rgba(255, 220, 150, 0.7)';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👁️ עצום עיניים לטעון כוח → פקח לזרוק!', CANVAS_W / 2, CANVAS_H - 25);
      }

      renderRef.current = requestAnimationFrame(draw);
    };

    renderRef.current = requestAnimationFrame(draw);
    return () => {
      if (renderRef.current) cancelAnimationFrame(renderRef.current);
    };
  }, [chametzPos, lastHit, ballFlying, throwsLeft, isCharging, throwPower]);

  // End screen
  if (showResult) {
    return (
      <div className="flex flex-col items-center gap-6 animate-bounce-in">
        <div className="bg-gradient-to-br from-purple-800/80 to-indigo-900/80 backdrop-blur-sm rounded-3xl p-10 border-2 border-yellow-400/50 shadow-2xl text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-4xl font-bold text-yellow-400 mb-4">!המשחק נגמר</h2>
          <div className="text-6xl font-bold text-white mb-2">{score}</div>
          <div className="text-xl text-purple-300 mb-6">נקודות</div>

          {score >= 300 && <div className="text-2xl mb-4 text-white">🌟 מדהים! אלוף שריפת החמץ!</div>}
          {score >= 150 && score < 300 && <div className="text-2xl mb-4 text-white">🔥 יפה מאוד! שרפת הרבה חמץ!</div>}
          {score < 150 && <div className="text-2xl mb-4 text-white">💪 כל הכבוד! נסה שוב!</div>}

          <button
            onClick={() => onGameEnd(score)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-purple-900 font-bold px-8 py-4 rounded-full text-xl transition-all hover:scale-105"
          >
            🔄 שחק שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 animate-slide-up">
      {/* Score + Throws */}
      <div className="flex items-center gap-6 bg-purple-900/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-purple-400/30">
        <div className="text-center">
          <div className="text-xs text-purple-300">ניקוד</div>
          <div className="text-3xl font-bold text-yellow-400">{score}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-purple-300">זריקות נותרו</div>
          <div className="flex gap-1">
            {Array.from({ length: Math.max(0, throwsLeft) }, (_, i) => (
              <span key={i} className="text-2xl">🍞</span>
            ))}
            {throwsLeft <= 0 && <span className="text-red-400">0</span>}
          </div>
        </div>
      </div>

      {/* Game canvas + webcam side by side */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-2xl border-2 border-orange-400/30 shadow-2xl"
          />

          {faceLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
              <div className="text-white text-xl animate-pulse">⏳ טוען זיהוי פנים...</div>
            </div>
          )}
        </div>

        {/* Webcam + controls panel */}
        <div className="flex flex-col items-center gap-3 min-w-[220px]">
          {/* Live webcam feed */}
          <div className="relative w-52 h-40 rounded-2xl overflow-hidden border-4 border-orange-400/50 shadow-lg">
            <video
              ref={faceVideoRef}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={faceCanvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>

          {/* Face detection status */}
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
            faceDetected
              ? 'bg-green-600/30 border border-green-400/50 text-green-300'
              : 'bg-yellow-600/20 border border-yellow-400/40 text-yellow-300 animate-pulse'
          }`}>
            {faceLoading ? '⏳ טוען זיהוי...' :
             faceDetected ? '✅ פנים מזוהות!' :
             '👤 הסתכל למצלמה'}
          </div>

          {/* Eye state */}
          <div className={`px-4 py-2 rounded-xl text-sm font-bold text-center ${
            eyeState.left > 0.4 || eyeState.right > 0.4
              ? 'bg-red-500/30 border border-red-400/50 text-red-300'
              : 'bg-purple-800/40 text-purple-300'
          }`}>
            {eyeState.left > 0.4 || eyeState.right > 0.4 ? '😑 עיניים עצומות' : '👀 עיניים פתוחות'}
          </div>

          {/* Power meter — with sweet spot indicator */}
          <div className="w-full bg-purple-900/60 rounded-xl px-4 py-3 border border-orange-400/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-orange-200">
                {isWaitingDebounce ? '⏳ ממתין...' :
                 isCharging ? '🔥 טוען כוח!' : '👁️ עצום עיניים!'}
              </span>
              <span className="text-sm text-yellow-400 font-bold">{Math.round(throwPower * 100)}%</span>
            </div>
            {/* Power bar with sweet spot zone marked */}
            <div className="relative w-full h-6 bg-purple-800/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${throwPower * 100}%`,
                  background: throwPower < 0.55
                    ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'  // blue = too weak
                    : throwPower <= 0.85
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'  // green = sweet spot!
                    : 'linear-gradient(90deg, #ef4444, #f97316)'  // red = too strong!
                }}
              />
              {/* Sweet spot zone markers */}
              <div className="absolute top-0 h-full border-l-2 border-green-400/60" style={{ left: '55%' }} />
              <div className="absolute top-0 h-full border-l-2 border-green-400/60" style={{ left: '85%' }} />
              <div className="absolute top-0 h-full flex items-center justify-center text-[9px] text-green-300/80 font-bold pointer-events-none" style={{ left: '55%', width: '30%' }}>
                🎯
              </div>
            </div>
            {isCharging && (
              <div className={`text-xs text-center mt-1 font-bold ${
                throwPower < 0.55 ? 'text-blue-300' :
                throwPower <= 0.85 ? 'text-green-300' :
                'text-red-300 animate-pulse'
              }`}>
                {throwPower < 0.55 ? '💪 עוד קצת...' :
                 throwPower <= 0.85 ? '✅ מושלם! פקח עיניים!' :
                 '⚠️ חזק מדי! שחרר מהר!'}
              </div>
            )}
            {isWaitingDebounce && (
              <div className="text-xs text-center mt-1 text-yellow-300 animate-pulse">
                החזק עיניים עצומות...
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-purple-900/60 backdrop-blur-sm rounded-xl p-3 border border-purple-400/30 text-center">
            <div className="text-base font-bold text-yellow-400 mb-2">?איך זורקים</div>
            <div className="space-y-1.5 text-xs text-purple-200">
              <div>😑 עצום עיניים חצי שנייה = <span className="text-yellow-300">טעינת כוח</span></div>
              <div>🟢 ירוק = כוח מושלם (55-85%)</div>
              <div>🔴 אדום = חזק מדי! יעוף מעבר לאש</div>
              <div className="text-yellow-300 font-bold mt-1">👀 פקח עיניים = שחרר זריקה!</div>
            </div>
          </div>

          <div className="text-purple-400/50 text-xs text-center">
            💻 לבדיקה: רווח לזריקה
          </div>
        </div>
      </div>
    </div>
  );
}
