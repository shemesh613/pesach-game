import { useRef, useCallback, useState, useEffect } from 'react';

const THROW_SPEED_THRESHOLD = 5; // pixels/frame - lowered for real-world hand speed
const THROW_FRAMES = 3; // consecutive frames of upward motion needed
const COOLDOWN_MS = 1500;

export function useHandDetection(onThrow, isActive) {
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const prevPositionsRef = useRef([]);
  const lastThrowTimeRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [handPosition, setHandPosition] = useState(null);
  const [throwDetected, setThrowDetected] = useState(false);
  const [throwProgress, setThrowProgress] = useState(0); // 0-1 progress toward throw

  const initMediaPipe = useCallback(async () => {
    try {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      });

      handLandmarkerRef.current = handLandmarker;
      setIsLoading(false);
    } catch (err) {
      console.error('Hand detection init error:', err);
      setIsLoading(false);
    }
  }, []);

  const detectThrow = useCallback((videoEl) => {
    if (!handLandmarkerRef.current || !videoEl || videoEl.readyState < 2) return;
    if (!isActive) {
      setThrowProgress(0);
      return;
    }

    try {
      const result = handLandmarkerRef.current.detectForVideo(videoEl, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        // Use wrist position (landmark 0)
        const wrist = result.landmarks[0][0];
        const pos = { x: wrist.x * 640, y: wrist.y * 480, time: Date.now() };

        setHandPosition({ x: wrist.x, y: wrist.y });

        prevPositionsRef.current.push(pos);
        if (prevPositionsRef.current.length > 15) {
          prevPositionsRef.current = prevPositionsRef.current.slice(-15);
        }

        // Check for throw gesture (hand moving upward rapidly)
        const positions = prevPositionsRef.current;
        if (positions.length >= THROW_FRAMES + 1) {
          const now = Date.now();
          if (now - lastThrowTimeRef.current < COOLDOWN_MS) {
            setThrowProgress(0);
            return;
          }

          let upwardFrames = 0;
          let totalVelocityX = 0;
          let totalVelocityY = 0;

          for (let i = positions.length - THROW_FRAMES; i < positions.length; i++) {
            const dy = positions[i - 1].y - positions[i].y; // Positive = moving up
            const dx = positions[i].x - positions[i - 1].x;

            if (dy > THROW_SPEED_THRESHOLD) {
              upwardFrames++;
              totalVelocityX += dx;
              totalVelocityY += dy;
            }
          }

          // Update progress indicator
          const progress = Math.min(upwardFrames / (THROW_FRAMES - 1), 1);
          setThrowProgress(progress);

          if (upwardFrames >= THROW_FRAMES - 1) {
            const avgVx = totalVelocityX / THROW_FRAMES;
            const avgVy = totalVelocityY / THROW_FRAMES;

            // Calculate throw angle and power
            const power = Math.min(Math.sqrt(avgVx * avgVx + avgVy * avgVy) / 20, 1);
            const angle = Math.atan2(-avgVy, avgVx); // Angle of throw

            setThrowDetected(true);
            setThrowProgress(1);
            lastThrowTimeRef.current = now;
            prevPositionsRef.current = [];

            if (onThrow) {
              onThrow({ power: Math.max(0.3, power), angle });
            }

            setTimeout(() => { setThrowDetected(false); setThrowProgress(0); }, 500);
          }
        } else {
          setThrowProgress(0);
        }
      } else {
        setHandPosition(null);
        setThrowProgress(0);
      }
    } catch (e) {
      // Silently handle
    }
  }, [isActive, onThrow]);

  useEffect(() => {
    initMediaPipe();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [initMediaPipe]);

  return {
    handLandmarkerRef,
    isLoading,
    handPosition,
    throwDetected,
    throwProgress,
    detectThrow
  };
}
