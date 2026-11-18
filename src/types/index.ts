export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface Course {
  id: number;
  name: string;
  isActive: boolean;
  lecturerId?: number;
  lecturer?: {
    id: number;
    name: string;
    email?: string;
  };
  _count?: {
    enrolments: number;
    sessions: number;
  };
}

export interface Enrolment {
  id: number;
  createdAt: string;
  student: {
    id: number;
    name: string;
    email: string;
    isActive?: boolean;
  };
}

export interface AttendanceRecordItem {
  studentId: number;
  status: 'present' | 'absent';
}

export interface SessionRecord {
  id: number;
  status: 'PRESENT' | 'ABSENT';
  student: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ClassSession {
  id: number;
  sessionDate: string;
  createdAt: string;
  lecturerId?: number;
  course?: {
    id: number;
    name: string;
  };
  _count?: {
    records: number;
  };
  records?: SessionRecord[];
}

export interface StudentSummaryItem {
  studentId: number;
  name: string;
  present: number;
  total: number;
  percentage: number | null;
}

export interface CourseSummary {
  course: {
    id: number;
    name: string;
  };
  students: StudentSummaryItem[];
}

export interface StudentCourseAttendance {
  courseId: number;
  courseName: string;
  present: number;
  total: number;
  percentage: number | null;
  records: {
    sessionId: number;
    sessionDate: string;
    status: 'PRESENT' | 'ABSENT';
  }[];
}

export interface StudentAttendanceResponse {
  courses: StudentCourseAttendance[];
  overall: {
    present: number;
    total: number;
    percentage: number | null;
  };
}
