import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  UserX,
  ScanLine,
  ShieldCheck,
  AlertCircle,
  Volume2,
  VolumeX,
  Activity,
  Calendar,
} from 'lucide-react';
import { WebcamCapture } from '../components/WebcamCapture';
import { faceApi, attendanceApi } from '../services/api';
import { RecognizeResult, AttendanceRecord } from '../types';

export const FaceAttendance: React.FC = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>([]);
  const [todaySummary, setTodaySummary] = useState({ present: 0, late: 0, total_users: 0 });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('Ready for face scan');
  const lastProcessedTimeRef = useRef<number>(0);

  // Load today's attendance on mount and periodically
  const fetchTodayRecords = async () => {
    try {
      const summary = await attendanceApi.getToday();
      setRecentScans(summary.records.slice(0, 10));
      setTodaySummary({
        present: summary.present,
        late: summary.late,
        total_users: summary.total_users,
      });
    } catch (err) {
      console.warn('Could not fetch today summary:', err);
    }
  };

  useEffect(() => {
    fetchTodayRecords();
    const interval = setInterval(fetchTodayRecords, 10000);
    return () => clearInterval(interval);
  }, []);

  // Beep sound generation using Web Audio API (zero external mp3 dependencies)
  const playBeep = (type: 'success' | 'cooldown' | 'unknown') => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'cooldown') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      // Audio might be blocked by browser policy until user interacts
    }
  };

  const handleFrameCaptured = async (base64Image: string) => {
    // Throttle API requests to at most once every 800ms
    const now = Date.now();
    if (now - lastProcessedTimeRef.current < 800) return;
    lastProcessedTimeRef.current = now;

    try {
      const res = await faceApi.recognize(base64Image);
      setResult(res);

      if (res.recognized) {
        if (res.attendance_marked) {
          playBeep('success');
          setScanStatusMessage(`Attendance Marked: ${res.user_name} (${res.attendance_status})`);
          fetchTodayRecords();
        } else if (res.cooldown_active) {
          setScanStatusMessage(`${res.user_name} is in cooldown (${res.cooldown_seconds_remaining}s left)`);
        }
      } else if (res.bounding_box) {
        setScanStatusMessage('Face detected, but unverified in directory.');
      } else {
        setScanStatusMessage('Position face in frame to mark attendance.');
      }
    } catch (err: any) {
      console.warn('Face recognition error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with status and audio controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Live Biometric Scanner Station
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Face Attendance Terminal</h1>
          <p className="text-xs text-slate-400">
            Real-time optical face detection, 128D feature embedding matching, and automated check-in
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              audioEnabled
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{audioEnabled ? 'Chime Enabled' : 'Muted'}</span>
          </button>

          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-lg ${
              isScanning
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>{isScanning ? 'Pause Scanner' : 'Resume Scanner'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Feed & Active Detection Card (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <WebcamCapture
            onCaptureFrame={handleFrameCaptured}
            isScanning={isScanning}
            recognitionResult={result}
            scanIntervalMs={900}
          />

          {/* Real-time Recognition Status HUD */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    result?.recognized
                      ? result.cooldown_active
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {result?.recognized ? (
                    result.cooldown_active ? (
                      <Clock className="h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )
                  ) : (
                    <ScanLine className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">Scanner Telemetry</p>
                  <p className="text-sm font-bold text-white">
                    {result?.recognized ? result.user_name : scanStatusMessage}
                  </p>
                </div>
              </div>

              {result?.recognized && (
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs text-slate-400">Match Confidence:</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {Math.round((result.confidence || 0.9) * 100)}%
                    </span>
                  </div>
                  <span
                    className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      result.attendance_marked
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : result.cooldown_active
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {result.attendance_marked
                      ? `Attendance Marked (${result.attendance_status})`
                      : result.cooldown_active
                      ? `Cooldown Active (${result.cooldown_seconds_remaining}s)`
                      : 'Recognized'}
                  </span>
                </div>
              )}
            </div>

            {/* Notification details */}
            {result?.recognized && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-center text-xs">
                <div className="rounded-xl bg-slate-950/60 p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Identifier</span>
                  <span className="font-semibold text-slate-200">{result.employee_id || '-'}</span>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Department</span>
                  <span className="font-semibold text-slate-200 truncate block">{result.department || '-'}</span>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Check-In Time</span>
                  <span className="font-semibold text-emerald-400">{result.check_in_time || 'Just Now'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Today's Log Ticker (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-center">
              <p className="text-[11px] font-semibold text-slate-400">Total Scans</p>
              <p className="mt-1 text-xl font-extrabold text-white">{todaySummary.present}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-center">
              <p className="text-[11px] font-semibold text-emerald-400">On Time</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-400">
                {Math.max(0, todaySummary.present - todaySummary.late)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-center">
              <p className="text-[11px] font-semibold text-amber-400">Late (After 9:30)</p>
              <p className="mt-1 text-xl font-extrabold text-amber-400">{todaySummary.late}</p>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Today's Recognition Feed</h3>
              </div>
              <span className="text-[10px] text-slate-500">Auto-refreshing</span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {recentScans.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <ScanLine className="mx-auto h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                  <span>No check-ins recorded yet today.</span>
                </div>
              ) : (
                recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                        {scan.user_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{scan.user_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {scan.department} • <span className="text-slate-300">{scan.check_in || '-'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          scan.status === 'Present'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {scan.status}
                      </span>
                      {scan.confidence && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {Math.round(scan.confidence * 100)}% match
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FaceAttendance;