import React from 'react';
import { BoundingBox, RecognizeResult } from '../types';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface FaceOverlayProps {
  isScanning: boolean;
  result?: RecognizeResult | null;
  videoWidth: number;
  videoHeight: number;
}

export const FaceOverlay: React.FC<FaceOverlayProps> = ({
  isScanning,
  result,
  videoWidth,
  videoHeight,
}) => {
  const box: BoundingBox | undefined | null = result?.bounding_box;

  // Compute scale factors if needed (or normalized coordinates)
  let boxStyle: React.CSSProperties = {};
  if (box && videoWidth > 0 && videoHeight > 0) {
    boxStyle = {
      left: `${(box.x / videoWidth) * 100}%`,
      top: `${(box.y / videoHeight) * 100}%`,
      width: `${(box.width / videoWidth) * 100}%`,
      height: `${(box.height / videoHeight) * 100}%`,
    };
  }

  const isRecognized = result?.recognized;
  const isCooldown = result?.cooldown_active;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {/* Animated laser scanning line when scanning is active */}
      {isScanning && !result?.bounding_box && (
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-[scan_2.5s_ease-in-out_infinite]"></div>
      )}

      {/* Crosshair camera viewfinder corners */}
      <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-lg"></div>
      <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-lg"></div>
      <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-lg"></div>
      <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-emerald-500/60 rounded-br-lg"></div>

      {/* Dynamic Face Bounding Box */}
      {box && (
        <div
          style={boxStyle}
          className={`absolute rounded-xl transition-all duration-150 border-2 ${
            isRecognized
              ? isCooldown
                ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
          }`}
        >
          {/* Floating badge above the bounding box */}
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-lg bg-slate-950/90 px-3 py-1 shadow-xl border border-slate-700/80 backdrop-blur-md whitespace-nowrap">
            {isRecognized ? (
              isCooldown ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">
                    {result.user_name} (Cooldown: {result.cooldown_seconds_remaining}s)
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">
                    {result.user_name} ({Math.round((result.confidence || 0.9) * 100)}%)
                  </span>
                </>
              )
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-xs font-semibold text-rose-300">Unrecognized Person</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
