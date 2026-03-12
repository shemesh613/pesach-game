import React from 'react';

export default function WebcamView({ videoRef, canvasRef, isSmall = false }) {
  const size = isSmall ? 'w-48 h-36' : 'w-80 h-60';

  return (
    <div className={`relative ${size} rounded-2xl overflow-hidden border-4 border-purple-400/50 shadow-lg`}>
      <video
        ref={videoRef}
        className="webcam-mirror w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="webcam-mirror absolute inset-0 w-full h-full"
      />
      {/* Camera frame decoration */}
      <div className="absolute inset-0 border-4 border-white/20 rounded-2xl pointer-events-none" />
      <div className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
    </div>
  );
}
