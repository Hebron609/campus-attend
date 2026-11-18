import { Course, CourseSummary, Enrolment, ClassSession, StudentAttendanceResponse, User, UserRole } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://assignment-attendance-system.vercel.app';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ait_attendance_token');
  },
  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ait_attendance_token', token);
  },
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('ait_attendance_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser: (user: User) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ait_attendance_user', JSON.stringify(user));
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('ait_attendance_token');
    localStorage.removeItem('ait_attendance_user');
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      // Clear token if invalid or expired
      if (typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
        authStorage.clear();
      }
    }
    const message = (typeof data === 'object' && data?.error) ? data.error : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
      const data = await request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
      return data;
    },
    me: async (): Promise<{ user: User }> => {
      return request<{ user: User }>('/api/auth/me');
    },
    logout: async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore network errors during logout
      } finally {
        authStorage.clear();
      }
    }
  },

  users: {
    list: async (role?: UserRole): Promise<{ users: User[] }> => {
      const query = role ? `?role=${role}` : '';
      return request<{ users: User[] }>(`/api/users${query}`);
    },
    create: async (data: { name: string; email: string; password: string; role: 'LECTURER' | 'STUDENT' }): Promise<{ user: User }> => {
      return request<{ user: User }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: number, data: { name?: string; email?: string; password?: string; isActive?: boolean }): Promise<{ user: User }> => {
      return request<{ user: User }>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  },

  courses: {
    list: async (): Promise<{ courses: Course[] }> => {
      return request<{ courses: Course[] }>('/api/courses');
    },
    get: async (id: number): Promise<{ course: Course }> => {
      return request<{ course: Course }>(`/api/courses/${id}`);
    },
    create: async (data: { name: string; lecturerId: number }): Promise<{ course: Course }> => {
      return request<{ course: Course }>('/api/courses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: number, data: { name?: string; lecturerId?: number; isActive?: boolean }): Promise<{ course: Course }> => {
      return request<{ course: Course }>(`/api/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    getSummary: async (courseId: number): Promise<CourseSummary> => {
      return request<CourseSummary>(`/api/courses/${courseId}/summary`);
    }
  },

  enrolments: {
    list: async (courseId: number): Promise<{ enrolments: Enrolment[] }> => {
      return request<{ enrolments: Enrolment[] }>(`/api/courses/${courseId}/enrolments`);
    },
    create: async (courseId: number, studentId: number): Promise<{ enrolment: Enrolment }> => {
      return request<{ enrolment: Enrolment }>(`/api/courses/${courseId}/enrolments`, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      });
    }
  },

  sessions: {
    list: async (courseId?: number): Promise<{ sessions: ClassSession[] }> => {
      const query = courseId ? `?courseId=${courseId}` : '';
      return request<{ sessions: ClassSession[] }>(`/api/sessions${query}`);
    },
    get: async (id: number): Promise<{ session: ClassSession }> => {
      return request<{ session: ClassSession }>(`/api/sessions/${id}`);
    },
    saveAttendance: async (data: {
      courseId: number;
      sessionDate: string;
      records: { studentId: number; status: 'present' | 'absent' }[];
    }): Promise<{ session: ClassSession; course: { id: number; name: string }; saved: number }> => {
      return request<{ session: ClassSession; course: { id: number; name: string }; saved: number }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  student: {
    getAttendance: async (): Promise<StudentAttendanceResponse> => {
      return request<StudentAttendanceResponse>('/api/me/attendance');
    }
  }
};
