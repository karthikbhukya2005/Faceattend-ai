export interface User {
  id: number;
  name: string;
  email: string;
  employee_id: string;
  department: string;
  role: 'admin' | 'employee' | 'student';
  is_active: boolean;
  is_enrolled: boolean;
  profile_image_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  employee_id: string;
  department: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: 'Present' | 'Late' | 'Absent' | 'Leave';
  confidence?: number | null;
  recognition_method: 'Face Recognition' | 'Manual';
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceListResponse {
  records: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TodayAttendanceSummary {
  date: string;
  total_users: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
  records: AttendanceRecord[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RecognizeResult {
  success: boolean;
  message: string;
  recognized: boolean;
  user_id?: number | null;
  user_name?: string | null;
  employee_id?: string | null;
  department?: string | null;
  confidence?: number | null;
  bounding_box?: BoundingBox | null;
  attendance_marked: boolean;
  attendance_status?: 'Present' | 'Late' | 'Leave' | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  cooldown_active: boolean;
  cooldown_seconds_remaining?: number;
}

export interface DailyTrendPoint {
  date: string;
  full_date?: string;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

export interface DepartmentStat {
  department: string;
  total_users: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
}

export interface StatusSlice {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface TopAttendee {
  id: number;
  name: string;
  employee_id: string;
  department: string;
  present_days: number;
  total_days: number;
  attendance_rate: number;
}

export interface LowAttendee {
  id: number;
  name: string;
  employee_id: string;
  department: string;
  absent_days: number;
  total_days: number;
  attendance_rate: number;
}

export interface DashboardStats {
  total_users: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  attendance_rate: number;
  daily_trend: DailyTrendPoint[];
  department_stats: DepartmentStat[];
  status_distribution: StatusSlice[];
  top_attendees: TopAttendee[];
  low_attendees: LowAttendee[];
}

export interface UserDetailsData {
  user: User;
  attendance_rate: number;
  total_days: number;
  total_present: number;
  total_late: number;
  total_absent: number;
  total_leave: number;
  recent_attendances: {
    date: string;
    check_in?: string;
    check_out?: string;
    status: string;
    recognition_method: string;
    confidence?: number;
  }[];
  monthly_trend: {
    month: string;
    rate: number;
    present: number;
    absent: number;
    late: number;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: string[];
  intent?: string;
}
