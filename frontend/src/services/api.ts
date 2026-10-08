import axios from 'axios';
import {
  User,
  UserListResponse,
  UserDetailsData,
  AttendanceListResponse,
  TodayAttendanceSummary,
  AttendanceRecord,
  RecognizeResult,
  DashboardStats,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to inject Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('faceattend_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses for auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('faceattend_token');
      localStorage.removeItem('faceattend_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  changePassword: async (data: { old_password: string; new_password: string }) => {
    const res = await api.post('/auth/change-password', data);
    return res.data;
  },
};

export const usersApi = {
  list: async (params?: {
    search?: string;
    department?: string;
    role?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<UserListResponse> => {
    const res = await api.get('/users', { params });
    return res.data;
  },
  get: async (id: number): Promise<UserDetailsData> => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },
  create: async (data: Partial<User> & { password?: string }): Promise<User> => {
    const res = await api.post('/users', data);
    return res.data;
  },
  update: async (id: number, data: Partial<User> & { password?: string }): Promise<User> => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};

export const faceApi = {
  enroll: async (userId: number, imageBase64: string) => {
    const res = await api.post('/face/enroll', {
      user_id: userId,
      image_base64: imageBase64,
    });
    return res.data;
  },
  recognize: async (imageBase64: string): Promise<RecognizeResult> => {
    const res = await api.post('/face/recognize', {
      image_base64: imageBase64,
    });
    return res.data;
  },
  getStatus: async (userId: number) => {
    const res = await api.get(`/face/status/${userId}`);
    return res.data;
  },
};

export const attendanceApi = {
  list: async (params?: {
    search?: string;
    department?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    user_id?: number;
    page?: number;
    limit?: number;
  }): Promise<AttendanceListResponse> => {
    const res = await api.get('/attendance', { params });
    return res.data;
  },
  getToday: async (): Promise<TodayAttendanceSummary> => {
    const res = await api.get('/attendance/today');
    return res.data;
  },
  create: async (data: {
    user_id: number;
    date: string;
    check_in?: string;
    check_out?: string;
    status: string;
    recognition_method?: string;
  }): Promise<AttendanceRecord> => {
    const res = await api.post('/attendance', data);
    return res.data;
  },
  update: async (
    id: number,
    data: {
      check_in?: string;
      check_out?: string;
      status?: string;
      recognition_method?: string;
    }
  ): Promise<AttendanceRecord> => {
    const res = await api.put(`/attendance/${id}`, data);
    return res.data;
  },
  exportCsvUrl: (params?: { department?: string; status?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.department) query.append('department', params.department);
    if (params?.status) query.append('status', params.status);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    return `/api/attendance/export?${query.toString()}`;
  },
};

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const res = await api.get('/analytics/dashboard');
    return res.data;
  },
  getDepartments: async () => {
    const res = await api.get('/analytics/departments');
    return res.data;
  },
};

export const aiApi = {
  chat: async (query: string, conversationHistory: any[] = []) => {
    const res = await api.post('/ai/chat', {
      query,
      conversation_history: conversationHistory,
    });
    return res.data;
  },
  triggerIndex: async () => {
    const res = await api.post('/ai/index');
    return res.data;
  },
};

export default api;
