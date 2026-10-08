import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import { authService } from '../services/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authApi.login({ email, password });
      authService.setAuth(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillStudentCredentials = () => {
    setEmail('student@faceattend.ai');
    setPassword('Student@123');
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.12),rgba(15,23,42,0)_60%)] pointer-events-none"></div>

      <div className="relative w-full max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-2xl">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-500/25">
            <ScanFace className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-white">FaceAttend AI</h2>
          <p className="mt-1 text-xs text-slate-400">
            Intelligent Facial Recognition Biometric Platform
          </p>
        </div>

        {/* Student Demo Quick Fill */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Quick Demo Credentials</span>
            <span className="text-[10px] text-emerald-400">Click to fill</span>
          </div>
          <button
            type="button"
            onClick={fillStudentCredentials}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors"
          >
            <UserCheck className="h-4 w-4 text-blue-400" />
            <span>Student Demo</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300">Password</label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
