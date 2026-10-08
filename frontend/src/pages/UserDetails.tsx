import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserCheck,
  Calendar,
  Clock,
  UserX,
  ScanFace,
  Percent,
  CheckCircle2,
  XCircle,
  Mail,
  Building,
  Shield,
} from 'lucide-react';
import { usersApi } from '../services/api';
import { authService } from '../services/auth';
import { UserDetailsData } from '../types';
import { StatCard } from '../components/StatCard';


const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();

  if (!user) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-sm text-rose-300">
        Unable to load your profile. Please sign in again.
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">My Profile</h1>
          <p className="text-xs text-slate-400">
            View your student account and registered attendance information
          </p>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
        >
          <Shield className="h-4 w-4 text-emerald-400" />
          Account Security
        </button>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-2xl font-black text-white shadow-xl shadow-emerald-500/20">
            {initials || '?'}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-white">{user.name}</h2>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                Student
              </span>
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <Mail className="h-4 w-4 text-slate-500" />
              {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Personal & Academic Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProfileField label="Full Name" value={user.name} />
            <ProfileField label="Student ID" value={user.employee_id || 'Not available'} mono />
            <ProfileField label="Email Address" value={user.email} />
            <ProfileField label="Department" value={user.department || 'Not assigned'} />
            <ProfileField label="Account Role" value="Student" />
            <ProfileField
              label="Account Status"
              value="Active"
              valueClassName="text-emerald-400"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <ScanFace className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Attendance & Biometric Access</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-200">Face Recognition</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Registered biometric template
                </p>
              </div>
              {user.is_enrolled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Enrolled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                  <XCircle className="h-3.5 w-3.5" />
                  Not Enrolled
                </span>
              )}
            </div>

            <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4">
              <p className="text-xs font-semibold text-blue-300">Profile is read-only</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Your Student ID, department, role, and biometric enrollment status are managed by
                the organization. Contact an administrator if any information needs to be changed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Need to update your password?</h3>
            <p className="mt-1 text-xs text-slate-400">
              Use Account Security to change your password without changing your profile data.
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
          >
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileField: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  valueClassName?: string;
}> = ({ label, value, mono, valueClassName = 'text-slate-200' }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`mt-1 text-xs font-semibold ${mono ? 'font-mono' : ''} ${valueClassName}`}>
      {value}
    </p>
  </div>
);

const AdminUserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<UserDetailsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchUser = async () => {
      try {
        const res = await usersApi.get(parseInt(id));
        setData(res);
      } catch (err) {
        console.error('Failed to load user details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-sm text-rose-300">
        Attendee not found.
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="space-y-6">
      {/* Back button & top profile header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Attendee Dossier</h1>
          <p className="text-xs text-slate-400">Detailed historical attendance & biometric status</p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-2xl font-black text-white shadow-xl shadow-emerald-500/20">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{user.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span>{user.email}</span>
                <span className="text-slate-600">•</span>
                <Building className="h-3.5 w-3.5 text-slate-500" />
                <span>{user.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Identifier</span>
              <span className="font-mono text-sm font-bold text-slate-200">{user.employee_id}</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Biometric Template</span>
              {user.is_enrolled ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Enrolled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                  <XCircle className="h-3.5 w-3.5" />
                  Missing
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Attendance Rate"
          value={`${data.attendance_rate}%`}
          subtitle="Overall Lifetime"
          icon={Percent}
          colorScheme={data.attendance_rate >= 75 ? 'emerald' : 'red'}
        />
        <StatCard
          title="Total Recorded"
          value={data.total_days}
          subtitle="Working Days"
          icon={Calendar}
          colorScheme="blue"
        />
        <StatCard
          title="Days Present"
          value={data.total_present}
          subtitle="On Time"
          icon={UserCheck}
          colorScheme="emerald"
        />
        <StatCard
          title="Late Check-ins"
          value={data.total_late}
          subtitle="After 09:30 AM"
          icon={Clock}
          colorScheme="amber"
        />
        <StatCard
          title="Unexcused Absences"
          value={data.total_absent}
          subtitle="Recorded Absences"
          icon={UserX}
          colorScheme="red"
        />
      </div>

      {/* Recent Attendance Records Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Attendance Logs</h3>
            <p className="text-xs text-slate-400">Detailed biometric scan timestamps</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Check-In</th>
                <th className="px-4 py-2.5 font-semibold">Check-Out</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Confidence</th>
                <th className="px-4 py-2.5 font-semibold">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.recent_attendances.map((rec, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium text-white">{rec.date}</td>
                  <td className="px-4 py-3 font-mono">{rec.check_in || '-'}</td>
                  <td className="px-4 py-3 font-mono">{rec.check_out || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        rec.status === 'Present'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : rec.status === 'Late'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {rec.confidence ? `${Math.round(rec.confidence * 100)}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{rec.recognition_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <StudentProfile />;
  }

  return <AdminUserDetails />;
};

export default UserDetails;