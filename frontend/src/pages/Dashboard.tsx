import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Percent,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  UserCircle,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowRight,
  LockKeyhole,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { StatCard } from '../components/StatCard';
import { analyticsApi, attendanceApi } from '../services/api';
import { authService } from '../services/auth';
import { AttendanceRecord } from '../types';
import { DashboardStats } from '../types';


const formatTime = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusClasses = (status: string) => {
  switch (status.toLowerCase()) {
    case 'present':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'late':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'absent':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'leave':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentAttendance = async () => {
      try {
        setLoading(true);
        setError('');

        const [attendanceResponse, todayResponse] = await Promise.all([
          attendanceApi.list({
            page: 1,
            limit: 100,
          }),
          attendanceApi.getToday(),
        ]);

        setRecords(attendanceResponse.records || []);
        setTodayRecord(todayResponse.records?.[0] || null);
      } catch (err) {
        console.error('Failed to fetch student dashboard:', err);
        setError('Unable to load your attendance information.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAttendance();
  }, []);

  const attendedCount = records.filter(
    (record) => record.status === 'Present' || record.status === 'Late'
  ).length;

  const presentCount = records.filter(
    (record) => record.status === 'Present'
  ).length;

  const lateCount = records.filter(
    (record) => record.status === 'Late'
  ).length;

  const absentCount = records.filter(
    (record) => record.status === 'Absent'
  ).length;

  const attendanceRate =
    records.length > 0
      ? ((attendedCount / records.length) * 100).toFixed(1)
      : '0.0';

  const todayStatus = todayRecord?.status || 'Not Marked';

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-xs font-medium text-slate-400">
            Loading Your Attendance...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                Student Portal
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="h-3 w-3" />
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Welcome back, {currentUser?.name || 'Student'} 👋
            </h1>

            <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Here is your personal attendance overview. You can view only
              your own attendance records and account information.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <UserCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Student ID
              </p>
              <p className="mt-0.5 font-mono text-xs font-bold text-white">
                {currentUser?.employee_id || '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Today's Status */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Today's Attendance</h2>
            <p className="mt-1 text-xs text-slate-400">
              Your attendance status for today
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
              todayRecord
                ? getStatusClasses(todayRecord.status)
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {todayRecord?.status === 'Present' && (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {todayRecord?.status === 'Late' && <Clock3 className="h-3.5 w-3.5" />}
            {!todayRecord && <XCircle className="h-3.5 w-3.5" />}
            {todayStatus}
          </span>
        </div>

        {todayRecord ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Check In
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {formatTime(todayRecord.check_in)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Check Out
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {formatTime(todayRecord.check_out)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Recognition
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {todayRecord.recognition_method || 'Manual'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/30 p-5 text-center">
            <p className="text-sm font-semibold text-slate-300">
              Attendance has not been marked today.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Your attendance will appear here after recognition.
            </p>
          </div>
        )}
      </div>

      {/* Personal KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle="Based on recorded attendance"
          icon={Percent}
          colorScheme="purple"
        />
        <StatCard
          title="Present"
          value={presentCount}
          subtitle="On-time attendance"
          icon={UserCheck}
          colorScheme="emerald"
        />
        <StatCard
          title="Late"
          value={lateCount}
          subtitle="Late arrivals"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="Absent"
          value={absentCount}
          subtitle="Recorded absences"
          icon={UserX}
          colorScheme="red"
        />
      </div>

      {/* Recent Attendance */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Recent Attendance</h2>
            <p className="mt-1 text-xs text-slate-400">
              Your latest attendance records
            </p>
          </div>

          <button
            onClick={() => navigate('/attendance')}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            View My Attendance
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {records.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-400">
              No attendance records yet
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Check In</th>
                  <th className="px-3 py-3 font-semibold">Check Out</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Method</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80">
                {records.slice(0, 7).map((record) => (
                  <tr
                    key={record.id}
                    className="transition-colors hover:bg-slate-800/30"
                  >
                    <td className="px-3 py-3.5 font-medium text-slate-300">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-3 py-3.5 text-slate-400">
                      {formatTime(record.check_in)}
                    </td>
                    <td className="px-3 py-3.5 text-slate-400">
                      {formatTime(record.check_out)}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500">
                      {record.recognition_method || 'Manual'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security shortcut */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <button
          onClick={() => navigate('/settings')}
          className="group flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <LockKeyhole className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Account Security</h3>
              <p className="mt-1 text-xs text-slate-500">
                Change your password and manage your session.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-slate-300" />
        </button>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getUser();

  if (currentUser && currentUser.role !== 'admin') {
    return <StudentDashboard />;
  }
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsApi.getDashboard();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-xs font-medium text-slate-400">Loading Real-Time Analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
        <p className="text-sm font-semibold text-rose-300">Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with greeting and quick AI assistant trigger */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Live Overview
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Institutional Attendance Analytics
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
              Real-time biometric recognition tracking and attendance intelligence powered by DeepFace & LangChain RAG.
            </p>
          </div>

          <button
            onClick={() => navigate('/face-attendance')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition-all shrink-0"
          >
            <span>Launch Face Scanner</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Members"
          value={stats.total_users}
          subtitle="Registered Active"
          icon={Users}
          colorScheme="blue"
        />
        <StatCard
          title="Present Today"
          value={stats.present_today}
          subtitle="Checked In"
          icon={UserCheck}
          colorScheme="emerald"
          delta="+4.2%"
        />
        <StatCard
          title="Late Arrivals"
          value={stats.late_today}
          subtitle="After 09:30 AM"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="Absent Today"
          value={stats.absent_today}
          subtitle="Unexcused"
          icon={UserX}
          colorScheme="red"
          delta="-2.1%"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.attendance_rate}%`}
          subtitle="Today's Ratio"
          icon={Percent}
          colorScheme="purple"
          delta="+1.8%"
        />
      </div>

      {/* Charts Section: 14-Day Attendance Trend & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Attendance Trend</h3>
              <p className="text-xs text-slate-400">14-Day rolling attendance trajectory</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400">Live Telemetry</span>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.daily_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fillOpacity={1} fill="url(#presentGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="late" name="Late Arrivals" stroke="#f59e0b" fillOpacity={1} fill="url(#lateGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart (1 Col) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="pb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Today's Distribution</h3>
            <p className="text-xs text-slate-400">Attendee classification today</p>
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.status_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.status_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {stats.status_distribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-400">{item.name}:</span>
                <span className="font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department-wise Attendance Bar Chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Department Attendance Comparison</h3>
            <p className="text-xs text-slate-400">Headcount vs Present ratio per division</p>
          </div>
        </div>

        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.department_stats} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="department" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="total_users" name="Total Members" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="present" name="Present Today" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row: Top Attendees vs Low Attendance (<75% Risk) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Attendees */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🌟 Top Attendees</span>
              </h3>
              <p className="text-xs text-slate-400">Highest punctuality & attendance records</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              Exemplary
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-800">
            {stats.top_attendees.map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{user.name}</p>
                    <p className="text-[10px] text-slate-400">{user.department} • {user.employee_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                    {user.attendance_rate}%
                  </span>
                  <p className="text-[10px] text-slate-500">{user.present_days}/{user.total_days} days</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Attendees (<75% Risk) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span>Attendance Below 75% Threshold</span>
              </h3>
              <p className="text-xs text-slate-400">Attendees requiring administrative review</p>
            </div>
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
              Compliance Risk
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-800">
            {stats.low_attendees.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-xs font-semibold text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.department} • {user.employee_id}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-lg bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/20">
                    {user.attendance_rate}%
                  </span>
                  <p className="text-[10px] text-slate-500">{user.absent_days} unexcused absences</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;