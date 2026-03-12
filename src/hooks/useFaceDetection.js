import { useRef, useCallback, useState, useEffect } from 'react';

const SMOOTHING = 0.3;
const NOD_THRESHOLD = 10; // degrees - generous for kids
const SHAKE_THRESHOLD = 12; // degrees - generous for kids
const COOLDOWN_MS = 800; // reduced cooldown
const SAMPLE_INTERVAL = 100; // ms between buffer samples (10fps, not 60fps!)
const NOD_BOBS_NEEDED = 3; // nod transitions needed
const SHAKE_FRAMES_NEEDED = 3; // frames per direction for shake

export function useFaceDetection(onGestureRef, isActive) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const calibrationRef = useRef({ yaw: 0, pitch: 0 });
  const smoothedRef = useRef({ yaw: 0, pitch: 0 });
  const gestureBufferRef = useRef([]);
  const lastGestureTimeRef = useRef(0);
  const lastSampleTimeRef = useRef(0);
  const onGestureCallbackRef = useRef(onGestureRef);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPose, setCurrentPose] = useState({ yaw: 0, pitch: 0 });
  const [detectedGesture, setDetectedGesture] = useState(null);
  const [gestureProgress, setGestureProgress] = useState({ type: null, progress: 0 });

  // Always keep callback ref up to date (avoids stale closures)
  useEffect(() => {
    onGestureCallbackRef.current = onGestureRef;
  }, [onGestureRef]);

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
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true
      });

      faceLandmarkerRef.current = faceLandmarker;
      setIsLoading(false);
    } catch (err) {
      console.error('MediaPipe init error:', err);
      setIsLoading(false);
    }
  }, []);

  const calibrate = useCallback(() => {
    calibrationRef.current = { ...smoothedRef.current };
    setIsCalibrated(true);
    gestureBufferRef.current = [];
  }, []);

  // Reset buffer (call when question changes)
  const resetGesture = useCallback(() => {
    gestureBufferRef.current = [];
    lastGestureTimeRef.current = 0;
    lastSampleTimeRef.current = 0;
    setGestureProgress({ type: null, progress: 0 });
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

      if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0) {
        const matrix = result.facialTransformationMatrixes[0].data;

        const yaw = Math.atan2(matrix[8], matrix[10]) * (180 / Math.PI);
        const pitch = Math.asin(-matrix[9]) * (180 / Math.PI);

        smoothedRef.current.yaw += (yaw - smoothedRef.current.yaw) * SMOOTHING;
        smoothedRef.current.pitch += (pitch - smoothedRef.current.pitch) * SMOOTHING;

        setCurrentPose({
          yaw: smoothedRef.current.yaw,
          pitch: smoothedRef.current.pitch
        });

        // Only detect gestures when active and calibrated
        if (isCalibrated && isActive) {
          const now = Date.now();

          // Only sample at SAMPLE_INTERVAL (not every frame!)
          // This makes buffer time-based: 20 entries = 2 seconds
          if (now - lastSampleTimeRef.current < SAMPLE_INTERVAL) {
            animFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }
          lastSampleTimeRef.current = now;

          if (now - lastGestureTimeRef.current >= COOLDOWN_MS) {
            const relYaw = smoothedRef.current.yaw - calibrationRef.current.yaw;
            const relPitch = smoothedRef.current.pitch - calibrationRef.current.pitch;

            let direction = 'neutral';
            const absYaw = Math.abs(relYaw);
            const absPitch = Math.abs(relPitch);
            // Normalize by threshold so we pick the dominant axis
            const yawStrength = absYaw / SHAKE_THRESHOLD;
            const pitchStrength = absPitch / NOD_THRESHOLD;

            if (pitchStrength > yawStrength && absPitch > NOD_THRESHOLD) {
              direction = relPitch > 0 ? 'down' : 'up';
            } else if (absYaw > SHAKE_THRESHOLD) {
              direction = relYaw > 0 ? 'right' : 'left';
            }

            gestureBufferRef.current.push(direction);
            if (gestureBufferRef.current.length > 30) {
              gestureBufferRef.current = gestureBufferRef.current.slice(-30);
            }

            const recent = gestureBufferRef.current.slice(-15);

            // --- Head shake: need both left AND right in recent frames ---
            const leftCount = recent.filter(d => d === 'left').length;
            const rightCount = recent.filter(d => d === 'right').length;
            const shakeScore = Math.min(leftCount, rightCount);
            const shakeProgress = Math.min(shakeScore / SHAKE_FRAMES_NEEDED, 1);

            // --- Head nod: count "bobs" (neutral→vertical transitions) ---
            let nodBobs = 0;
            for (let i = 1; i < recent.length; i++) {
              if ((recent[i] === 'down' || recent[i] === 'up') &&
                  recent[i - 1] === 'neutral') {
                nodBobs++;
              }
            }
            const nodProgress = Math.min(nodBobs / NOD_BOBS_NEEDED, 1);

            // Update progress indicator (show whichever is higher)
            if (shakeProgress > nodProgress && shakeProgress > 0) {
              setGestureProgress({ type: 'no', progress: shakeProgress });
            } else if (nodProgress > 0) {
              setGestureProgress({ type: 'yes', progress: nodProgress });
            } else {
              setGestureProgress({ type: null, progress: 0 });
            }

            // Check shake recognition
            if (leftCount >= SHAKE_FRAMES_NEEDED && rightCount >= SHAKE_FRAMES_NEEDED) {
              setDetectedGesture('no');
              setGestureProgress({ type: 'no', progress: 1 });
              gestureBufferRef.current = [];
              lastGestureTimeRef.current = now;
              if (onGestureCallbackRef.current) onGestureCallbackRef.current('no');
              setTimeout(() => { setDetectedGesture(null); setGestureProgress({ type: null, progress: 0 }); }, 800);
            }
            // Check nod recognition
            else if (nodBobs >= NOD_BOBS_NEEDED) {
              setDetectedGesture('yes');
              setGestureProgress({ type: 'yes', progress: 1 });
              gestureBufferRef.current = [];
              lastGestureTimeRef.current = now;
              if (onGestureCallbackRef.current) onGestureCallbackRef.current('yes');
              setTimeout(() => { setDetectedGesture(null); setGestureProgress({ type: null, progress: 0 }); }, 800);
            }
          }
        }
      }

      // Draw landmarks
      if (canvasRef.current && result.faceLandmarks && result.faceLandmarks.length > 0) {
        const ctx = canvasRef.current.getContext('2d');
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        ctx.clearRect(0, 0, w, h);

        const keyPoints = [1, 33, 263, 61, 291, 199];
        ctx.fillStyle = '#22c55e';
        for (const idx of keyPoints) {
          if (result.faceLandmarks[0][idx]) {
            const pt = result.faceLandmarks[0][idx];
            ctx.beginPath();
            ctx.arc(pt.x * w, pt.y * h, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } catch (e) {
      // Silently handle
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [isActive, isCalibrated]);

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
    isCalibrated,
    isLoading,
    calibrate,
    currentPose,
    detectedGesture,
    gestureProgress,
    resetGesture
  };
}
