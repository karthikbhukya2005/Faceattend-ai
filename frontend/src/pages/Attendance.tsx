import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit2,
  X,
} from 'lucide-react';
import { attendanceApi } from '../services/api';
import { AttendanceRecord } from '../types';
import { authService } from '../services/auth';

export const Attendance: React.FC = () => {
  const isAdmin = authService.isAdmin();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    check_in: '',
    check_out: '',
    status: 'Present',
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.list({
        // The backend already enforces self-only access for non-admin users.
        // Admin-only filters are intentionally not sent from the student UI.
        search: isAdmin ? (search || undefined) : undefined,
        department: isAdmin ? (department || undefined) : undefined,
        status: status || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        limit: 20,
      });
      setRecords(res.records);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to fetch attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, department, status, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await attendanceApi.update(editingRecord.id, {
        check_in: editForm.check_in || undefined,
        check_out: editForm.check_out || undefined,
        status: editForm.status,
        recognition_method: 'Manual',
      });
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      console.error('Error updating attendance record:', err);
    }
  };

  const handleExportCsv = () => {
    if (!isAdmin) return;

    const url = attendanceApi.exportCsvUrl({
      department: department || undefined,
      status: status || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {isAdmin ? 'Attendance Records' : 'My Attendance'}
          </h1>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? 'Historical attendance logs, manual administrative adjustments, and export'
              : 'View your attendance history, check-in and check-out times, status, and recognition method'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all shadow-lg"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Export CSV Report</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className={`grid grid-cols-1 gap-3 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-3'}`}>
        {isAdmin && (
          <>
            <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
              <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search attendee or identifier..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </form>

            <div>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500"
              >
                <option value="">All Departments</option>
                <option value="Computer Science & Engineering">Computer Science</option>
                <option value="Information Technology">Information Tech</option>
                <option value="Electronics & Communication">Electronics & Comm</option>
                <option value="Mechanical Engineering">Mechanical Eng</option>
                <option value="HR & Administration">HR & Admin</option>
                <option value="Business Operations">Business Operations</option>
              </select>
            </div>
          </>
        )}

        <div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="Present">Present (On Time)</option>
            <option value="Late">Late (After 9:30 AM)</option>
            <option value="Absent">Absent</option>
            <option value="Leave">Approved Leave</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500"
            title="Start Date"
          />
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500"
            title="End Date"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">{isAdmin ? 'Attendee' : 'Record'}</th>
                {isAdmin && <th className="px-4 py-3 font-semibold">Department</th>}
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Check-In</th>
                <th className="px-4 py-3 font-semibold">Check-Out</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Confidence</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                {isAdmin && <th className="px-5 py-3 text-right font-semibold">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="py-12 text-center text-slate-400">
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="py-12 text-center text-slate-500">
                    No matching attendance records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-white">{isAdmin ? r.user_name : 'Attendance Record'}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {isAdmin ? r.employee_id : r.date}
                        </p>
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="px-4 py-3.5 text-slate-300">{r.department}</td>
                    )}
                    <td className="px-4 py-3.5 font-medium text-slate-200">{r.date}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-200">{r.check_in || '-'}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">{r.check_out || '-'}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          r.status === 'Present'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'Late'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-400">
                      {r.confidence ? `${Math.round(r.confidence * 100)}%` : '-'}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          r.recognition_method === 'Face Recognition'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.recognition_method}
                      </span>
                    </td>

                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setEditForm({
                              check_in: r.check_in || '',
                              check_out: r.check_out || '',
                              status: r.status,
                            });
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white transition-colors"
                          title="Edit / Manual Override"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-5 py-3 text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{records.length}</strong> of{' '}
            <strong className="text-white">{total}</strong> records
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Manual Attendance Correction</h3>
                <p className="text-xs text-slate-400">
                  Attendee: <span className="text-emerald-400">{editingRecord.user_name}</span> ({editingRecord.date})
                </p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Check-In Time</label>
                <input
                  type="time"
                  step="1"
                  value={editForm.check_in}
                  onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Check-Out Time</label>
                <input
                  type="time"
                  step="1"
                  value={editForm.check_out}
                  onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="w-1/2 rounded-xl border border-slate-700 py-2.5 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Attendance;
