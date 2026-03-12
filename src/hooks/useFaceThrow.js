import { useRef, useCallback, useState, useEffect } from 'react';

const BLINK_THRESHOLD = 0.4; // eye closed threshold
const CHARGE_RATE = 0.012; // ~1.4s to full at 60fps — fast enough for kids
const MIN_POWER_TO_THROW = 0.1;
const BLINK_DEBOUNCE_MS = 400; // ignore blinks shorter than this
const EYE_SMOOTHING = 0.3;

export function useFaceThrow(onThrow, isActive) {
  const faceLandmarkerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const chargingRef = useRef(false);
  const powerRef = useRef(0);
  const cooldownRef = useRef(false);
  const onThrowCallbackRef = useRef(onThrow);
  const eyeClosedSinceRef = useRef(null);
  const blinkDebouncePassedRef = useRef(false);
  const smoothLeftRef = useRef(0);
  const smoothRightRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [isWaitingDebounce, setIsWaitingDebounce] = useState(false);
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

        const rawLeft = getShape('eyeBlinkLeft');
        const rawRight = getShape('eyeBlinkRight');

        // Smooth
        const alpha = 1 - EYE_SMOOTHING;
        smoothLeftRef.current += (rawLeft - smoothLeftRef.current) * alpha;
        smoothRightRef.current += (rawRight - smoothRightRef.current) * alpha;

        const leftBlink = smoothLeftRef.current;
        const rightBlink = smoothRightRef.current;

        setEyeState({ left: leftBlink, right: rightBlink });

        // Either eye closed = charging (simple!)
        const anyEyeClosed = leftBlink > BLINK_THRESHOLD || rightBlink > BLINK_THRESHOLD;

        if (isActive && !cooldownRef.current) {
          if (anyEyeClosed) {
            const now = Date.now();

            if (eyeClosedSinceRef.current === null) {
              eyeClosedSinceRef.current = now;
              setIsWaitingDebounce(true);
            }

            if (!blinkDebouncePassedRef.current) {
              if (now - eyeClosedSinceRef.current >= BLINK_DEBOUNCE_MS) {
                blinkDebouncePassedRef.current = true;
                setIsWaitingDebounce(false);
                chargingRef.current = true;
                powerRef.current = 0;
              }
            }

            if (blinkDebouncePassedRef.current) {
              powerRef.current = Math.min(powerRef.current + CHARGE_RATE, 1);
              setPower(powerRef.current);
              setIsCharging(true);
            }

          } else {
            // Eyes opened — release!
            if (blinkDebouncePassedRef.current && chargingRef.current) {
              chargingRef.current = false;
              setIsCharging(false);
              setIsWaitingDebounce(false);

              if (powerRef.current >= MIN_POWER_TO_THROW) {
                cooldownRef.current = true;
                setTimeout(() => { cooldownRef.current = false; }, 1200);

                if (onThrowCallbackRef.current) {
                  onThrowCallbackRef.current({
                    power: powerRef.current
                  });
                }
              }

              powerRef.current = 0;
              setPower(0);
            } else {
              setIsWaitingDebounce(false);
              setIsCharging(false);
            }

            eyeClosedSinceRef.current = null;
            blinkDebouncePassedRef.current = false;
          }
        }
      } else {
        setFaceDetected(false);
      }

      // Draw eye highlights on canvas
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

        const leftColor = smoothLeftRef.current > BLINK_THRESHOLD ? '#ef4444' : '#22c55e';
        const rightColor = smoothRightRef.current > BLINK_THRESHOLD ? '#ef4444' : '#22c55e';
        drawEye([33, 160, 158, 133, 153, 144], leftColor);
        drawEye([362, 385, 387, 263, 373, 380], rightColor);
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
    isCharging,
    isWaitingDebounce,
    eyeState
  };
}
