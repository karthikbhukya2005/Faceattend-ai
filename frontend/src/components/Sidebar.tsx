import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  ClipboardList,
  Users,
  BarChart3,
  BotMessageSquare,
  Settings,
  ShieldAlert,
  UserCircle,
} from 'lucide-react';
import { authService } from '../services/auth';

export const Sidebar: React.FC = () => {
  const isAdmin = authService.isAdmin();

  const navItems = isAdmin
    ? [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/face-attendance', label: 'Face Attendance', icon: Camera, badge: 'Live' },
        { to: '/attendance', label: 'Attendance Records', icon: ClipboardList },
        { to: '/users', label: 'Users Directory', icon: Users },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/ai-assistant', label: 'AI Assistant', icon: BotMessageSquare, highlight: true },
        { to: '/settings', label: 'Settings', icon: Settings },
      ]
    : [
        { to: '/', label: 'Student Dashboard', icon: LayoutDashboard },
        { to: '/attendance', label: 'My Attendance', icon: ClipboardList },
        { to: '/profile', label: 'My Profile', icon: UserCircle },
        { to: '/ai-assistant', label: 'AI Assistant', icon: BotMessageSquare, highlight: true },
        { to: '/settings', label: 'Settings', icon: Settings },
      ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div>
        <div className="px-3 pb-4 pt-1">
          <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Main Navigation
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? item.highlight
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          isActive
                            ? item.highlight
                              ? 'text-indigo-400'
                              : 'text-emerald-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 animate-pulse">
                        {item.badge}
                      </span>
                    )}

                    {item.highlight && !isActive && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                        RAG
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Security & status card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <ShieldAlert className="h-4 w-4 text-emerald-400" />
          <span>Biometric Privacy</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
          Zero raw face images persisted. All credentials encrypted & 128D embeddings protected.
        </p>
      </div>
    </aside>
  );
};
