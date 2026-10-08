import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { analyticsApi, attendanceApi } from '../services/api';
import { DashboardStats } from '../types';

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await analyticsApi.getDashboard();
        setStats(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Institutional Attendance Analytics</h1>
          <p className="text-xs text-slate-400">
            Advanced behavioral trends, punctuality patterns, and departmental performance
          </p>
        </div>

        <button
          onClick={() => window.open(attendanceApi.exportCsvUrl(), '_blank')}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <Download className="h-4 w-4 text-emerald-400" />
          <span>Export Analytics Raw Data</span>
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Institutional Efficiency
            </span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-black text-white">{stats.attendance_rate}%</p>
          <p className="mt-1 text-xs text-slate-400">Daily average member attendance rate</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Punctuality Index
            </span>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-3 text-3xl font-black text-white">{stats.late_today}</p>
          <p className="mt-1 text-xs text-slate-400">Arrivals logged past the 09:30 AM threshold</p>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Absence Ratio
            </span>
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
          <p className="mt-3 text-3xl font-black text-white">{stats.absent_today}</p>
          <p className="mt-1 text-xs text-slate-400">Unexcused absentees currently registered today</p>
        </div>
      </div>

      {/* Department Breakdown Bar Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-bold text-white mb-1">Departmental Punctuality & Attendance</h3>
        <p className="text-xs text-slate-400 mb-4">Total registered vs present attendees across faculties</p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.department_stats} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="department" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="total_users" name="Total Members" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="present" name="Present Today" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="Late Arrivals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Trajectory Area Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-bold text-white mb-1">Longitudinal Attendance Trajectory</h3>
        <p className="text-xs text-slate-400 mb-4">Attendance counts plotted across past two weeks</p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.daily_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default Analytics;