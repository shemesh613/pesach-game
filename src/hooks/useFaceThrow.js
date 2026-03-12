import { useRef, useCallback, useState, useEffect } from 'react';

const BLINK_THRESHOLD = 0.4;
const MOUTH_THRESHOLD = 0.3;
const CHARGE_RATE = 0.007; // slower charge (~2.5s to full at 60fps)
const MOUTH_BOOST = 1.8;
const MIN_POWER_TO_THROW = 0.15;
const BLINK_DEBOUNCE_MS = 500; // ignore blinks shorter than this

export function useFaceThrow(onThrow, isActive) {
  const faceLandmarkerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const chargingRef = useRef(false);
  const powerRef = useRef(0);
  const directionRef = useRef('center');
  const mouthOpenRef = useRef(false);
  const cooldownRef = useRef(false);
  const onThrowCallbackRef = useRef(onThrow);
  const eyeClosedSinceRef = useRef(null); // timestamp when eyes first closed
  const blinkDebouncePassedRef = useRef(false); // true once 500ms passed

  const [isLoading, setIsLoading] = useState(true);
  const [power, setPower] = useState(0);
  const [direction, setDirection] = useState('center');
  const [isCharging, setIsCharging] = useState(false);
  const [isWaitingDebounce, setIsWaitingDebounce] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyeState, setEyeState] = useState({ left: 0, right: 0 });

  useEffect(() => {
    onThrowCallbackRef.current = onThrow;
  }, [onThrow]);

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  }, []);

  const initMediaPipe = useCallback(async () => {
    try {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false
      });

      faceLandmarkerRef.current = faceLandmarker;
      setIsLoading(false);
    } catch (err) {
      console.error('FaceThrow MediaPipe init error:', err);
      setIsLoading(false);
    }
  }, []);

  const processFrame = useCallback(() => {
    if (!faceLandmarkerRef.current || !videoRef.current) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      const result = faceLandmarkerRef.current.detectForVideo(video, performance.now());

      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        setFaceDetected(true);
        const shapes = result.faceBlendshapes[0].categories;

        const getShape = (name) => {
          const s = shapes.find(s => s.categoryName === name);
          return s ? s.score : 0;
        };

        const leftBlink = getShape('eyeBlinkLeft');
        const rightBlink = getShape('eyeBlinkRight');
        const jawOpen = getShape('jawOpen');

        setEyeState({ left: leftBlink, right: rightBlink });

        const leftClosed = leftBlink > BLINK_THRESHOLD;
        const rightClosed = rightBlink > BLINK_THRESHOLD;
        const isMouthOpen = jawOpen > MOUTH_THRESHOLD;
        setMouthOpen(isMouthOpen);

        const anyEyeClosed = leftClosed || rightClosed;

        if (isActive && !cooldownRef.current) {
          if (anyEyeClosed) {
            const now = Date.now();

            // Start tracking when eyes first closed
            if (eyeClosedSinceRef.current === null) {
              eyeClosedSinceRef.current = now;
              setIsWaitingDebounce(true);
            }

            // Check if debounce period passed (not a blink)
            if (!blinkDebouncePassedRef.current) {
              if (now - eyeClosedSinceRef.current >= BLINK_DEBOUNCE_MS) {
                blinkDebouncePassedRef.current = true;
                setIsWaitingDebounce(false);
                chargingRef.current = true;
                powerRef.current = 0;
              }
              // Still waiting for debounce - don't charge yet
            }

            if (blinkDebouncePassedRef.current) {
              // Determine direction
              if (leftClosed && !rightClosed) {
                directionRef.current = 'left';
              } else if (rightClosed && !leftClosed) {
                directionRef.current = 'right';
              } else {
                directionRef.current = 'center';
              }

              // Charge power
              const rate = isMouthOpen ? CHARGE_RATE * MOUTH_BOOST : CHARGE_RATE;
              powerRef.current = Math.min(powerRef.current + rate, 1);

              setPower(powerRef.current);
              setDirection(directionRef.current);
              setIsCharging(true);
            }

          } else {
            // Eyes opened
            if (blinkDebouncePassedRef.current && chargingRef.current) {
              // Real charge was happening — RELEASE throw!
              chargingRef.current = false;
              setIsCharging(false);
              setIsWaitingDebounce(false);

              if (powerRef.current >= MIN_POWER_TO_THROW) {
                let angleOffset = 0;
                if (directionRef.current === 'left') angleOffset = -0.4;
                else if (directionRef.current === 'right') angleOffset = 0.4;

                const spread = mouthOpenRef.current ? 0.05 : 0.2;
                const randomSpread = (Math.random() - 0.5) * spread;

                cooldownRef.current = true;
                setTimeout(() => { cooldownRef.current = false; }, 1200);

                if (onThrowCallbackRef.current) {
                  onThrowCallbackRef.current({
                    power: powerRef.current,
                    angle: angleOffset + randomSpread,
                    mouthBoost: mouthOpenRef.current
                  });
                }
              }

              powerRef.current = 0;
              setPower(0);
              setDirection('center');
            } else {
              // Blink detected (debounce didn't pass) — ignore
              setIsWaitingDebounce(false);
              setIsCharging(false);
            }

            // Reset debounce tracking
            eyeClosedSinceRef.current = null;
            blinkDebouncePassedRef.current = false;

            mouthOpenRef.current = isMouthOpen;
          }

          mouthOpenRef.current = isMouthOpen;
        }
      } else {
        setFaceDetected(false);
      }

      // Draw landmarks on canvas
      if (canvasRef.current && result.faceLandmarks && result.faceLandmarks.length > 0) {
        const ctx = canvasRef.current.getContext('2d');
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        ctx.clearRect(0, 0, w, h);

        const landmarks = result.faceLandmarks[0];
        const drawEye = (indices, color) => {
          ctx.beginPath();
          for (let i = 0; i < indices.length; i++) {
            const pt = landmarks[indices[i]];
            if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
            else ctx.lineTo(pt.x * w, pt.y * h);
          }
          ctx.closePath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        };

        const leftColor = eyeState.left > BLINK_THRESHOLD ? '#ef4444' : '#22c55e';
        const rightColor = eyeState.right > BLINK_THRESHOLD ? '#ef4444' : '#22c55e';
        drawEye([33, 160, 158, 133, 153, 144], leftColor);
        drawEye([362, 385, 387, 263, 373, 380], rightColor);

        if (mouthOpen) {
          ctx.beginPath();
          const mouthPt = landmarks[13];
          ctx.arc(mouthPt.x * w, mouthPt.y * h + 10, 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.fill();
        }
      }
    } catch (e) {
      // Silently handle
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive]);

  useEffect(() => {
    initCamera();
    initMediaPipe();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [initCamera, initMediaPipe]);

  useEffect(() => {
    if (!isLoading) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLoading, processFrame]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    faceDetected,
    power,
    direction,
    isCharging,
    isWaitingDebounce,
    mouthOpen,
    eyeState
  };
}
