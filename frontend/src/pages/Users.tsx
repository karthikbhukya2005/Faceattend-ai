import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  Search,
  Filter,
  Plus,
  Camera,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { usersApi, faceApi } from '../services/api';
import { User } from '../types';

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  // Add User Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    employee_id: '',
    department: 'Computer Science & Engineering',
    role: 'student' as 'admin' | 'employee' | 'student',
    password: '',
    confirmPassword: '',
  });

  // Created credentials dialog state
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    employee_id: string;
    password: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Enroll Face Modal state
  const [enrollModalUser, setEnrollModalUser] = useState<User | null>(null);
  const [enrollImageBase64, setEnrollImageBase64] = useState<string | null>(null);
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'capturing' | 'enrolling' | 'success' | 'error'>('idle');
  const [enrollMessage, setEnrollMessage] = useState<string>('');
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({
        search: search || undefined,
        department: department || undefined,
        role: role || undefined,
        page,
        limit: 15,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, department, role]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (newUser.password.length < 8) {
      setAddError('Password must be at least 8 characters long.');
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      setAddError('Passwords do not match.');
      return;
    }

    try {
      const createdUser = await usersApi.create({
        name: newUser.name,
        email: newUser.email,
        employee_id: newUser.employee_id,
        department: newUser.department,
        role: newUser.role,
        password: newUser.password,
      });

      // Keep the password only in local UI state so the admin can securely
      // share the one-time credentials. It is never expected from the API.
      setCreatedCredentials({
        name: createdUser.name || newUser.name,
        email: createdUser.email || newUser.email,
        employee_id: createdUser.employee_id || newUser.employee_id,
        password: newUser.password,
      });
      setCopiedCredentials(false);
      setShowAddModal(false);
      setNewUser({
        name: '',
        email: '',
        employee_id: '',
        department: 'Computer Science & Engineering',
        role: 'student',
        password: '',
        confirmPassword: '',
      });
      fetchUsers();
    } catch (err: any) {
      setAddError(err.response?.data?.detail || 'Failed to create user.');
    }
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;

    const loginUrl = `${window.location.origin}/login`;
    const text = [
      'FaceAttend AI Login Credentials',
      '',
      `Name: ${createdCredentials.name}`,
      `Email: ${createdCredentials.email}`,
      `Student / Employee ID: ${createdCredentials.employee_id}`,
      `Password: ${createdCredentials.password}`,
      `Login URL: ${loginUrl}`,
      '',
      'Please change your password after your first login.',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 2000);
    } catch {
      setCopiedCredentials(false);
    }
  };

  // Webcam handling for Face Enrollment
  const startEnrollCamera = async () => {
    setEnrollStatus('capturing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setEnrollStatus('error');
      setEnrollMessage('Unable to access webcam. Please allow camera permissions.');
    }
  };

  const captureEnrollSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setEnrollImageBase64(dataUrl);

        // Stop stream
        const stream = video.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach((t) => t.stop());
      }
    }
  };

  const submitEnrollment = async () => {
    if (!enrollModalUser || !enrollImageBase64) return;
    setEnrollStatus('enrolling');
    try {
      const res = await faceApi.enroll(enrollModalUser.id, enrollImageBase64);
      setEnrollStatus('success');
      setEnrollMessage(res.message);
      fetchUsers();
    } catch (err: any) {
      setEnrollStatus('error');
      setEnrollMessage(err.response?.data?.detail || 'Face enrollment failed. Please ensure exactly one face is visible.');
    }
  };

  const closeEnrollModal = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    setEnrollModalUser(null);
    setEnrollImageBase64(null);
    setEnrollStatus('idle');
    setEnrollMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Users & Attendees Directory</h1>
          <p className="text-xs text-slate-400">
            Manage organization members, departments, roles, and biometric face enrollments
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Member</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or employee ID..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </form>

        <div className="flex gap-2">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science</option>
            <option value="Information Technology">Information Tech</option>
            <option value="Electronics & Communication">Electronics & Comm</option>
            <option value="Mechanical Engineering">Mechanical Eng</option>
            <option value="HR & Administration">HR & Admin</option>
            <option value="Business Operations">Business Operations</option>
          </select>

          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Attendee</th>
                <th className="px-4 py-3 font-semibold">Identifier</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Biometric Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading users directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 font-bold text-slate-200 border border-slate-700">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => navigate(`/users/${u.id}`)}
                            className="font-semibold text-white hover:text-emerald-400 transition-colors text-left block"
                          >
                            {u.name}
                          </button>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px] text-slate-300 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/60">
                        {u.employee_id}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">{u.department}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                            : u.role === 'employee'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {u.is_enrolled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-400 border border-slate-700">
                          <XCircle className="h-3.5 w-3.5 text-slate-500" />
                          Not Enrolled
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEnrollModalUser(u);
                          startEnrollCamera();
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                        title="Enroll Facial Template"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>{u.is_enrolled ? 'Re-enroll' : 'Enroll Face'}</span>
                      </button>

                      <button
                        onClick={() => navigate(`/users/${u.id}`)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-5 py-3 text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{users.length}</strong> of{' '}
            <strong className="text-white">{total}</strong> members
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Add New Organization Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Maya Lin"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="name@faceattend.ai"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Employee / Student ID</label>
                <input
                  type="text"
                  required
                  value={newUser.employee_id}
                  onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })}
                  placeholder="STU-201 or EMP-055"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Department</label>
                <select
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="HR & Administration">HR & Administration</option>
                  <option value="Business Operations">Business Operations</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="student">Student</option>
                  <option value="employee">Employee</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 pr-10 text-slate-100 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Confirm Password</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 pr-10 text-slate-100 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3 text-[11px] text-slate-400">
                The password is used to create the member account. After creation, you will receive the login credentials once. Ask the member to change the password after their first login.
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 rounded-xl border border-slate-700 py-2.5 font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/20 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Member Created Successfully</h3>
                <p className="mt-1 text-xs text-slate-400">Share these login credentials with the member.</p>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Close credentials dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Name</span>
                <span className="text-right font-semibold text-slate-200">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Email</span>
                <span className="text-right font-semibold text-slate-200 break-all">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Student / Employee ID</span>
                <span className="font-mono font-semibold text-slate-200">{createdCredentials.employee_id}</span>
              </div>
              <div className="flex justify-between gap-4 items-center">
                <span className="text-slate-500">Temporary Password</span>
                <span className="font-mono font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">{createdCredentials.password}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Login URL</span>
                <span className="text-right font-mono text-[11px] text-slate-300 break-all">{window.location.origin}/login</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-200">
              <strong>Important:</strong> This password is shown only in this dialog. Copy or securely share it now, and ask the member to change it after their first login.
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex w-1/2 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
              >
                {copiedCredentials ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedCredentials ? 'Copied!' : 'Copy Credentials'}
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-1/2 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Face Modal */}
      {enrollModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Biometric Face Enrollment</h3>
                <p className="text-xs text-slate-400">
                  Target attendee: <span className="text-emerald-400 font-semibold">{enrollModalUser.name}</span> ({enrollModalUser.employee_id})
                </p>
              </div>
              <button onClick={closeEnrollModal} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status alerts */}
            {enrollStatus === 'success' && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{enrollMessage}</span>
              </div>
            )}
            {enrollStatus === 'error' && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{enrollMessage}</span>
              </div>
            )}

            {/* Video preview / Snapshot view */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center">
              {enrollImageBase64 ? (
                <img src={enrollImageBase64} alt="Captured Face" className="h-full w-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
              )}
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder crosshairs */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-emerald-500"></div>
                <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-emerald-500"></div>
                <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-emerald-500"></div>
                <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-emerald-500"></div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Please position exactly one face centered inside the viewfinder with good ambient lighting.
            </p>

            <div className="flex gap-3 pt-2">
              {!enrollImageBase64 ? (
                <button
                  type="button"
                  onClick={captureEnrollSnapshot}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capture Snapshot</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollImageBase64(null);
                      startEnrollCamera();
                    }}
                    className="w-1/2 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Retake Photo
                  </button>
                  <button
                    type="button"
                    disabled={enrollStatus === 'enrolling' || enrollStatus === 'success'}
                    onClick={submitEnrollment}
                    className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    {enrollStatus === 'enrolling' ? 'Extracting 128D Embedding...' : 'Verify & Enroll'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Users;