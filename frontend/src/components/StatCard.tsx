import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  colorScheme?: 'emerald' | 'blue' | 'amber' | 'purple' | 'red';
}

const colorMap = {
  emerald: {
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    glow: 'group-hover:border-emerald-500/40',
  },
  blue: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    glow: 'group-hover:border-blue-500/40',
  },
  amber: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    glow: 'group-hover:border-amber-500/40',
  },
  purple: {
    border: 'border-purple-500/20',
    bg: 'bg-purple-500/5',
    iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    glow: 'group-hover:border-purple-500/40',
  },
  red: {
    border: 'border-red-500/20',
    bg: 'bg-red-500/5',
    iconBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
    glow: 'group-hover:border-red-500/40',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  delta,
  deltaType = 'positive',
  colorScheme = 'emerald',
}) => {
  const colors = colorMap[colorScheme] || colorMap.emerald;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-5 backdrop-blur-sm transition-all duration-200 hover:shadow-lg ${colors.glow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {delta && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          {deltaType === 'positive' && (
            <span className="flex items-center gap-0.5 font-semibold text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              {delta}
            </span>
          )}
          {deltaType === 'negative' && (
            <span className="flex items-center gap-0.5 font-semibold text-rose-400">
              <TrendingDown className="h-3.5 w-3.5" />
              {delta}
            </span>
          )}
          {deltaType === 'neutral' && <span className="text-slate-400">{delta}</span>}
          <span className="text-slate-500">vs target</span>
        </div>
      )}
    </div>
  );
};
