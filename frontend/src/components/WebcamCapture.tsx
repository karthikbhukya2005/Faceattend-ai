import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { FaceOverlay } from './FaceOverlay';
import { RecognizeResult } from '../types';

interface WebcamCaptureProps {
  onCaptureFrame?: (base64Image: string) => void;
  isScanning?: boolean;
  recognitionResult?: RecognizeResult | null;
  scanIntervalMs?: number;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onCaptureFrame,
  isScanning = false,
  recognitionResult,
  scanIntervalMs = 1000,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoDim, setVideoDim] = useState<{ width: number; height: number }>({ width: 640, height: 480 });

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setVideoDim({
            width: videoRef.current?.videoWidth || 640,
            height: videoRef.current?.videoHeight || 480,
          });
          setStreamActive(true);
        };
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setErrorMsg('Unable to access webcam. Please verify camera permissions in your browser.');
      setStreamActive(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  }, []);

  // Frame capture loop
  useEffect(() => {
    let timer: any = null;

    const captureCurrentFrame = () => {
      if (!streamActive || !videoRef.current || !canvasRef.current || !onCaptureFrame) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCaptureFrame(dataUrl);
      }
    };

    if (streamActive && isScanning) {
      timer = setInterval(captureCurrentFrame, scanIntervalMs);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [streamActive, isScanning, onCaptureFrame, scanIntervalMs]);

  // Clean up on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Video Container */}
      <div className="relative aspect-[4/3] w-full bg-slate-950 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            streamActive ? 'opacity-100 scale-x-[-1]' : 'opacity-0'
          }`}
        />

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Dynamic Computer Vision Bounding Box & HUD */}
        {streamActive && (
          <FaceOverlay
            isScanning={isScanning}
            result={recognitionResult}
            videoWidth={videoDim.width}
            videoHeight={videoDim.height}
          />
        )}

        {/* Stream inactive or Error Screen */}
        {!streamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            {errorMsg ? (
              <div className="max-w-sm space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Camera Unavailable</p>
                <p className="text-xs text-slate-400">{errorMsg}</p>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 animate-pulse">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-400">Initializing Optical Camera Feed...</p>
              </div>
            )}
          </div>
        )}

        {/* Top Control Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-300 border border-slate-700/60 backdrop-blur-md">
            <span
              className={`h-2 w-2 rounded-full ${
                streamActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            ></span>
            <span>{streamActive ? '640x480 @ 30fps' : 'Standby'}</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {streamActive ? (
              <button
                onClick={stopCamera}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 text-xs font-medium text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 transition-colors backdrop-blur-md"
                title="Stop Camera Feed"
              >
                <CameraOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pause</span>
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600/80 px-2.5 text-xs font-medium text-white hover:bg-emerald-500 border border-emerald-500/30 transition-colors backdrop-blur-md"
                title="Start Camera Feed"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Start</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
