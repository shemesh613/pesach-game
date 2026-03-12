# Passover Kids Learning Game — Complete Build Prompt

## Overview
Build a web-based interactive learning game for kids (ages 5-12) using **computer vision** (face + hand detection). The game is Passover-themed for a **religious conservative (תורני שמרני)** audience. It runs entirely in the browser with no backend.

## Tech Stack
- **React 19** + **Vite 7** (SPA, no SSR)
- **Tailwind CSS 4** (utility-first styling)
- **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) — face landmarks + hand landmarks
- **Matter.js** — 2D physics engine for ball toss
- **Web Audio API** — synthesized sounds (no external audio files)
- No TypeScript — plain JSX

## Game Flow
```
StartScreen → QuestionPhase (5 questions) → Confetti → BallTossGame → ScoreBoard → replay
```

### Phase 1: True/False Questions (Face Detection)
1. Show a Hebrew Passover question (e.g., "האם אוכלים מצה בליל הסדר?")
2. Player answers by **head gesture**:
   - **Nod (up-down)** = Yes/True ✓
   - **Shake (left-right)** = No/False ✗
3. Visual feedback: green glow + happy sound (correct) or red glow + sad sound (wrong)
4. Show explanation for 2.5 seconds, then advance
5. After 5 questions → confetti celebration → transition to Phase 2

### Phase 2: Chametz Burning (Hand Detection + Physics)
1. Player sees an animated **bonfire** (NOT an archery target)
2. Player **throws chametz (bread 🍞)** into the fire using a **hand throw gesture**
3. Physics: Matter.js simulates gravity and trajectory
4. Scoring zones (concentric circles around bonfire):
   - **Center (35px radius)**: Direct hit into flames → **+100 points** 🔥
   - **Danger zone (70px)**: Too close to fire → **-50 points** ⚠️
   - **Outer ring (110px)**: Good throw → **+25 points**
   - **Edge ring (150px)**: Near miss → **+10 points**
5. **Bonus star** ⭐ orbits the bonfire — hit it for **+1 extra throw**
6. Player gets 3 throws total (+ bonus throws from stars)
7. After all throws → final score screen with rating

---

## CRITICAL: Religious Sensitivity Rules
> **For religious Jewish audiences, these rules are NON-NEGOTIABLE:**
> - 🫓 **Matza is SACRED** — never throw, kick, or disrespect matza in any way
> - 🍞 **Chametz is what you BURN** — the projectile is bread/chametz, thrown into a bonfire
> - 📖 **No sacred items as projectiles** — Torah scrolls, kiddush cups, matza, etc.
> - 🔥 **The bonfire represents שריפת חמץ** (chametz burning before Pesach) — a real tradition
> - **Wrong example**: "Throw matza at a target" ❌
> - **Correct example**: "Throw chametz into the bonfire" ✅

---

## Computer Vision: Face Detection (useFaceDetection hook)

### Setup
- Use `FaceLandmarker` from MediaPipe Tasks Vision
- Model: `face_landmarker/float16/1/face_landmarker.task` from Google Storage
- Running mode: `VIDEO`, GPU delegate, 1 face, `outputFacialTransformationMatrixes: true`
- Camera: 640×480, front-facing

### Head Pose Extraction
```js
const matrix = result.facialTransformationMatrixes[0].data;
const yaw = Math.atan2(matrix[8], matrix[10]) * (180 / Math.PI);   // left-right
const pitch = Math.asin(-matrix[9]) * (180 / Math.PI);             // up-down
```
Apply exponential smoothing (factor 0.3) to reduce noise.

### Gesture Detection Algorithm

**⚠️ CRITICAL: Dominant Axis Detection (DO NOT use if/else priority!)**

When kids nod their head, they also move slightly left-right. If you check yaw first with an if/else, the nod gesture gets swallowed by false left-right detections. Instead:

```js
const NOD_THRESHOLD = 10;    // degrees
const SHAKE_THRESHOLD = 12;  // degrees
const DIRECTION_FRAMES = 3;  // minimum frames needed per direction
const COOLDOWN_MS = 800;

// Calculate relative angles (from calibration point)
const relYaw = smoothed.yaw - calibration.yaw;
const relPitch = smoothed.pitch - calibration.pitch;

// ✅ CORRECT: Compare NORMALIZED strengths, pick dominant axis
const yawStrength = Math.abs(relYaw) / SHAKE_THRESHOLD;
const pitchStrength = Math.abs(relPitch) / NOD_THRESHOLD;

if (pitchStrength > yawStrength && Math.abs(relPitch) > NOD_THRESHOLD) {
  direction = relPitch > 0 ? 'down' : 'up';
} else if (Math.abs(relYaw) > SHAKE_THRESHOLD) {
  direction = relYaw > 0 ? 'right' : 'left';
}

// ❌ WRONG: This kills nod detection!
// if (Math.abs(relYaw) > SHAKE_THRESHOLD) direction = ...
// else if (Math.abs(relPitch) > NOD_THRESHOLD) direction = ...
```

### Gesture Recognition (Buffer-based)
- Push direction into a circular buffer (max 20 entries)
- Check last 10 entries:
  - **Shake (no)**: `leftCount >= 3 AND rightCount >= 3`
  - **Nod (yes)**: `upCount >= 3 AND downCount >= 3`
- After recognition: clear buffer, apply cooldown (800ms)

### Calibration
- User looks straight at camera and clicks "כיול מצלמה" (calibrate camera)
- Save current smoothed yaw/pitch as zero point
- All subsequent measurements are relative to calibration

### React Hook Architecture
- **Use `useRef` for the gesture callback** — NOT direct function passing. This prevents stale closures in React hooks.
- **Reset gesture buffer when question changes** — call `resetGesture()` on question ID change via `useEffect`
- Pass `isActive` flag to disable detection when answer is being processed
- The `processFrame` callback must be recreated when `isActive` or `isCalibrated` changes

---

## Computer Vision: Hand Detection (useHandDetection hook)

### Setup
- Use `HandLandmarker` from MediaPipe Tasks Vision
- Model: `hand_landmarker/float16/1/hand_landmarker.task`
- Running mode: `VIDEO`, GPU delegate, 1 hand

### Throw Detection
- Track wrist position (landmark 0) across frames
- Store last 15 positions with timestamps
- Detect throw: 3+ consecutive frames of rapid upward wrist movement (>15 px/frame)
- Calculate throw power (capped at 1.0) and angle from velocity
- Cooldown: 2000ms between throws

### Throw Physics (Matter.js)
- Create chametz ball at bottom-center of canvas
- Apply force toward bonfire with calculated power/angle
- Gravity: 1.5x
- Check hit zones every 20ms while ball is in flight
- Remove ball after hit (it burned!) or after falling off screen

---

## Sound Design (Web Audio API)
Synthesize all sounds — no external audio files needed:
- **Correct answer**: Ascending C5→E5→G5 (happy chime)
- **Wrong answer**: Descending 400Hz→300Hz (sad tone, sawtooth)
- **Throw**: Frequency sweep 200Hz→800Hz (whoosh)
- **Big hit (+100)**: 4-note fanfare C5→E5→G5→C6
- **Normal hit**: Single 600Hz tone
- **Penalty (-50)**: Low 200Hz square wave
- **Bonus star**: 5-note ascending arpeggio
- **Calibrate**: Double 880Hz beep

---

## Visual Design
- **Theme**: Deep purple/indigo night sky with twinkling stars
- **Direction**: RTL (Hebrew)
- **Font**: 'Segoe UI', Arial, sans-serif
- **Animations**: bounce-in, slide-up, float, pulse-glow, confetti-fall
- **Webcam**: Mirrored (scaleX(-1)), rounded corners, green landmark dots
- **Color palette**: Purple (bg), Yellow/Gold (scores, titles), Green (correct), Red (wrong), Orange (fire)
- **Decorative emojis**: 🫓🍷🥬🧱🌊 (Passover symbols)
- **Bonfire**: Canvas-drawn animated fire with gradient flames, ember particles, wood logs at base, radial glow on ground

---

## Questions Database
15 Hebrew true/false questions about Passover, varying difficulty:
- Easy: matza eating, chametz prohibition, four cups, Moses, maror symbolism
- Medium: matzah timing (18 min), Elijah's cup, Passover duration, charoset meaning
- Hard: Red Sea timing, chametz checking date, zeroa symbolism
Each question has: `id`, `text` (Hebrew), `answer` (boolean), `explanation` (Hebrew with emoji), `difficulty`

Randomly select 5 per game from the pool.

---

## UI Components
1. **StartScreen**: Title, animated Passover symbols, how-to-play card, start button
2. **QuestionPhase**: Question card, gesture hints (👆👇=yes, 👈👉=no), webcam view, calibration button, feedback overlay
3. **BallTossGame**: Canvas (800×600) with bonfire, scoring zones, orbiting bonus star, hand position indicator, throw counter
4. **ScoreBoard**: Score display, progress bar, throws remaining
5. **WebcamView**: Mirrored video + landmark canvas overlay, recording indicator
6. **Stars**: 50 randomly placed twinkling stars (background)
7. **Confetti**: 40 colorful falling pieces (on phase completion)

---

## Keyboard Fallbacks (for testing without camera)
- **Questions**: ← = yes (correct), → = no (false)
- **Ball toss**: Space = throw with random power/angle

---

## Project Setup
```bash
npm create vite@latest pesach-kids-game -- --template react
cd pesach-kids-game
npm install @mediapipe/tasks-vision matter-js tailwindcss @tailwindcss/vite
```

### vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

### CSS Entry (index.css)
```css
@import "tailwindcss";
```
Plus custom animations for: twinkle, pulse-glow, bounce-in, slide-up, float, score-pop, confetti-fall, orbit, hand-pulse. Webcam mirror via `transform: scaleX(-1)`.

---

## File Structure
```
pesach-kids-game/
├── src/
│   ├── main.jsx              # Entry point
│   ├── index.css              # Tailwind + custom animations
│   ├── App.jsx                # Game state machine (start→questions→toss→end)
│   ├── data/
│   │   └── questions.js       # 15 Hebrew questions + random picker
│   ├── hooks/
│   │   ├── useFaceDetection.js  # MediaPipe face + gesture recognition
│   │   ├── useHandDetection.js  # MediaPipe hand + throw detection
│   │   └── useSounds.js         # Web Audio API sound effects
│   └── components/
│       ├── StartScreen.jsx      # Welcome + instructions
│       ├── QuestionPhase.jsx    # Questions + face detection UI
│       ├── BallTossGame.jsx     # Chametz burning mini-game
│       ├── WebcamView.jsx       # Mirrored webcam + landmarks
│       ├── ScoreBoard.jsx       # Score + progress display
│       ├── Stars.jsx            # Background stars
│       └── Confetti.jsx         # Celebration effect
├── package.json
└── vite.config.js
```

---

## Known Pitfalls & Lessons Learned

| # | Pitfall | Solution |
|---|---------|----------|
| 1 | Nod detection fails while shake works | Use **dominant axis** comparison (normalized by threshold), never if/else priority |
| 2 | Gesture detection stops after 2 questions | Use `useRef` for callbacks (avoid stale closures), reset buffer on question change |
| 3 | Kids trigger false gestures from fidgeting | Set generous thresholds (nod: 10°, shake: 12°), require 3 frames per direction |
| 4 | Throwing matza is disrespectful | Throw **chametz** (bread) into a **bonfire** — matza is sacred |
| 5 | No camera on some devices | Provide keyboard fallback (arrows for questions, space for throw) |
| 6 | Sounds don't play on first interaction | Web Audio API requires user gesture to start — triggered on game start button click |
