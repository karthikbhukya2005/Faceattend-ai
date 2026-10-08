import { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { attendanceApi } from '../services/api';

interface AttendanceRecord {
  id?: number | string;
  date?: string;
  attendance_date?: string;
  status?: string;
  check_in_time?: string;
  time?: string;
}

const StudentDashboard = () => {
  const user = authService.getUser();

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const response: any = await attendanceApi.list();

        /*
         * Backend returns:
         * {
         *   records: [...],
         *   total: number,
         *   page: number,
         *   limit: number,
         *   total_pages: number
         * }
         *
         * Handle both:
         * 1. response.records
         * 2. response.data.records
         * 3. direct array response
         */

        let records: AttendanceRecord[] = [];

        if (Array.isArray(response)) {
          records = response;
        } else if (Array.isArray(response?.records)) {
          records = response.records;
        } else if (Array.isArray(response?.data?.records)) {
          records = response.data.records;
        }

        setAttendance(records);
      } catch (error) {
        console.error('Failed to load attendance:', error);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);

  /*
   * Attendance calculations
   */

  const totalDays = attendance.length;

  const presentDays = attendance.filter(
    (item) =>
      item.status?.toLowerCase() === 'present'
  ).length;

  const attendancePercentage =
    totalDays > 0
      ? Math.round((presentDays / totalDays) * 100)
      : 0;

  const absentDays = attendance.filter(
    (item) =>
      item.status?.toLowerCase() === 'absent'
  ).length;

  const lateDays = attendance.filter(
    (item) =>
      item.status?.toLowerCase() === 'late'
  ).length;

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Student Dashboard
        </h1>

        <p className="mt-1 text-slate-500">
          Welcome back, {user?.full_name || 'Student'}
        </p>
      </div>


      {/* ================= SUMMARY CARDS ================= */}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* Total Attendance */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Total Attendance
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? '...' : totalDays}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Attendance records
          </p>

        </div>


        {/* Present Days */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Present Days
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {loading ? '...' : presentDays}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Days marked present
          </p>

        </div>


        {/* Attendance Percentage */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Attendance %
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {loading
              ? '...'
              : `${attendancePercentage}%`}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Overall attendance rate
          </p>

        </div>

      </div>


      {/* ================= ADDITIONAL STATS ================= */}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* Absent */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Absent Days
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {loading ? '...' : absentDays}
          </p>

        </div>


        {/* Late */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <p className="text-sm text-slate-500">
            Late Days
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-600">
            {loading ? '...' : lateDays}
          </p>

        </div>

      </div>


      {/* ================= ATTENDANCE TABLE ================= */}

      <div className="rounded-xl border bg-white shadow-sm">

        {/* Table Header */}

        <div className="border-b p-6">

          <h2 className="text-lg font-semibold text-slate-900">
            My Attendance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your attendance records
          </p>

        </div>


        {/* Loading */}

        {loading && (
          <div className="flex items-center justify-center p-10">

            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

          </div>
        )}


        {/* Empty State */}

        {!loading && attendance.length === 0 && (
          <div className="p-10 text-center">

            <p className="text-sm font-medium text-slate-600">
              No attendance records found.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Your attendance records will appear here.
            </p>

          </div>
        )}


        {/* Attendance Table */}

        {!loading && attendance.length > 0 && (
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b bg-slate-50 text-left">

                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>

                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Time
                  </th>

                </tr>

              </thead>


              <tbody>

                {attendance.map((record, index) => (

                  <tr
                    key={record.id ?? index}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >

                    {/* Date */}

                    <td className="p-4 text-sm text-slate-700">

                      {record.date ||
                        record.attendance_date ||
                        '-'}

                    </td>


                    {/* Status */}

                    <td className="p-4">

                      <span
                        className={`
                          inline-flex rounded-full px-3 py-1
                          text-xs font-semibold
                          ${
                            record.status?.toLowerCase() === 'present'
                              ? 'bg-green-100 text-green-700'
                              : record.status?.toLowerCase() === 'late'
                              ? 'bg-amber-100 text-amber-700'
                              : record.status?.toLowerCase() === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }
                        `}
                      >
                        {record.status || '-'}
                      </span>

                    </td>


                    {/* Time */}

                    <td className="p-4 text-sm text-slate-700">

                      {record.check_in_time ||
                        record.time ||
                        '-'}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
};
export { StudentDashboard };
export default StudentDashboard;