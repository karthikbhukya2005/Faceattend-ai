import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, LogOut, ShieldCheck, UserCircle, Bell, Sparkles } from 'lucide-react';
import { authService } from '../services/auth';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const navigate = useNavigate();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.clearAuth();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 backdrop-blur-md">
      {/* Brand logo & system health */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-500/20">
          <ScanFace className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">FaceAttend</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              AI Core
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Biometric Scanner Engine Active
          </p>
        </div>
      </div>

      {/* User profile & actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/ai-assistant')}
          className="hidden md:flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          title="Open AI Attendance Assistant"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Ask AI Assistant</span>
        </button>

        {user && (
          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user.name}</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-slate-400">{user.department}</span>
                <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                  user.role === 'admin' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {user.role === 'admin' ? (
                <ShieldCheck className="h-5 w-5 text-amber-400" />
              ) : (
                <UserCircle className="h-5 w-5 text-blue-400" />
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
export default Navbar;