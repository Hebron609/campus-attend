'use client';

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import { Course, CourseSummary, Enrolment, User, UserRole } from '@/types';
import { formatStudentId } from '@/lib/studentId';
import {
  Users,
  BookOpen,
  UserPlus,
  BookPlus,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Search,
  Eye,
  RefreshCw,
  Percent,
  Check,
  Plus
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'courses' | 'enrolments'>('overview');
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState<{
    name: string;
    studentId: string;
    email: string;
    password: string;
    role: 'LECTURER' | 'STUDENT';
  }>({
    name: '',
    studentId: '',
    email: '',
    password: 'password123',
    role: 'STUDENT',
  });

  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourseData, setNewCourseData] = useState<{
    name: string;
    lecturerId: number | '';
  }>({
    name: '',
    lecturerId: '',
  });

  // Course enrolments view/modal
  const [selectedCourseForEnrol, setSelectedCourseForEnrol] = useState<Course | null>(null);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loadingEnrolments, setLoadingEnrolments] = useState(false);
  const [showEnrolStudentModal, setShowEnrolStudentModal] = useState(false);
  const [selectedStudentToEnrol, setSelectedStudentToEnrol] = useState<number | ''>('');

  // Course summary modal
  const [summaryCourse, setSummaryCourse] = useState<Course | null>(null);
  const [courseSummary, setCourseSummary] = useState<CourseSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [usersRes, coursesRes] = await Promise.all([
        api.users.list(),
        api.courses.list(),
      ]);
      setUsers(usersRes.users);
      setCourses(coursesRes.courses);
    } catch (err: any) {
      setError(err?.message || 'Failed to load administrative data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalEmail =
      newUserData.email.trim() ||
      (newUserData.studentId ? `${newUserData.studentId.trim().toLowerCase()}@attendance.local` : '');

    if (!newUserData.name || !finalEmail || !newUserData.password) {
      setError('Please provide user name, Student ID or email, and password');
      return;
    }

    try {
      await api.users.create({
        name: newUserData.name.trim(),
        email: finalEmail.toLowerCase(),
        password: newUserData.password,
        role: newUserData.role,
      });
      setShowCreateUserModal(false);
      setNewUserData({ name: '', studentId: '', email: '', password: 'password123', role: 'STUDENT' });
      showNotification(`Successfully created account for ${newUserData.name}`);
      fetchData();
    } catch (err: any) {
      setError(err?.data?.error || err.message || 'Failed to create user');
    }
  };

  // Toggle User Active Status
  const handleToggleUserStatus = async (user: User) => {
    if (user.id === currentUser.id) {
      setError('You cannot deactivate your own administrator account');
      return;
    }
    const newStatus = !user.isActive;
    try {
      await api.users.update(user.id, { isActive: newStatus });
      showNotification(`Account ${user.name} is now ${newStatus ? 'Activated' : 'Deactivated'}`);
      fetchData();
    } catch (err: any) {
      setError(err?.data?.error || err.message || 'Failed to update account status');
    }
  };

  // Create Course Handler
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseData.name || !newCourseData.lecturerId) return;
    try {
      await api.courses.create({
        name: newCourseData.name.trim(),
        lecturerId: Number(newCourseData.lecturerId),
      });
      setShowCreateCourseModal(false);
      setNewCourseData({ name: '', lecturerId: '' });
      showNotification(`Course "${newCourseData.name}" created successfully`);
      fetchData();
    } catch (err: any) {
      setError(err?.data?.error || err.message || 'Failed to create course');
    }
  };

  // Toggle Course Active Status
  const handleToggleCourseStatus = async (course: Course) => {
    const newStatus = !course.isActive;
    try {
      await api.courses.update(course.id, { isActive: newStatus });
      showNotification(`Course "${course.name}" is now ${newStatus ? 'Active' : 'Deactivated'}`);
      fetchData();
    } catch (err: any) {
      setError(err?.data?.error || err.message || 'Failed to update course status');
    }
  };

  // Open Course Enrolment View
  const handleOpenCourseEnrolments = async (course: Course) => {
    setSelectedCourseForEnrol(course);
    setLoadingEnrolments(true);
    try {
      const res = await api.enrolments.list(course.id);
      setEnrolments(res.enrolments);
    } catch (err: any) {
      setError(err?.message || 'Failed to load course enrolments');
    } finally {
      setLoadingEnrolments(false);
    }
  };

  // Enrol Student Handler
  const handleEnrolStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForEnrol || !selectedStudentToEnrol) return;
    try {
      await api.enrolments.create(selectedCourseForEnrol.id, Number(selectedStudentToEnrol));
      setShowEnrolStudentModal(false);
      setSelectedStudentToEnrol('');
      showNotification('Student successfully enrolled in course');
      handleOpenCourseEnrolments(selectedCourseForEnrol);
      fetchData();
    } catch (err: any) {
      setError(err?.data?.error || err.message || 'Failed to enrol student');
    }
  };

  // Open Course Summary Modal
  const handleViewCourseSummary = async (course: Course) => {
    setSummaryCourse(course);
    setLoadingSummary(true);
    try {
      const data = await api.courses.getSummary(course.id);
      setCourseSummary(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch course attendance summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const lecturers = users.filter((u) => u.role === 'LECTURER');
  const students = users.filter((u) => u.role === 'STUDENT');

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-semibold text-sm">Loading administrator records...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-[#007791] to-cyan-700 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl shadow-cyan-950/15 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4 text-cyan-300" />
            <span>Administrative Control Center</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">
            Welcome, {currentUser.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-cyan-100 max-w-xl">
            Manage institutional users, course assignments, student enrolments, and attendance analytics across all academic faculties.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer backdrop-blur-xs w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs sm:text-sm font-bold flex-shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'courses'
              ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('enrolments')}
          className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'enrolments'
              ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Enrolment Roster</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-cyan-50 text-[#007791] border border-cyan-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Courses</p>
                <p className="text-2xl font-black text-slate-900">{courses.length}</p>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {courses.filter((c) => c.isActive).length} active
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Lecturers</p>
                <p className="text-2xl font-black text-slate-900">{lecturers.length}</p>
                <span className="text-[11px] text-slate-500 font-medium">Assigned to courses</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</p>
                <p className="text-2xl font-black text-slate-900">{students.length}</p>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {students.filter((s) => s.isActive).length} active accounts
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class Sessions</p>
                <p className="text-2xl font-black text-slate-900">
                  {courses.reduce((sum, c) => sum + (c._count?.sessions || 0), 0)}
                </p>
                <span className="text-[11px] text-slate-500 font-medium">Recorded across courses</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Courses Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Academic Courses Overview</h3>
                  <p className="text-xs text-slate-500">Live roster counts and assigned faculty</p>
                </div>
                <button
                  onClick={() => setShowCreateCourseModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 text-[#007791] font-bold text-xs hover:bg-cyan-100 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Course</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <div key={course.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#007791] flex items-center justify-center font-black text-xs">
                        #{course.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{course.name}</p>
                          {!course.isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              Deactivated
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Lecturer: <span className="font-semibold text-slate-700">{course.lecturer?.name || 'Unassigned'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {course._count?.enrolments || 0} students
                      </span>
                      <button
                        onClick={() => handleViewCourseSummary(course)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#007791] hover:bg-cyan-50 transition-all cursor-pointer"
                        title="View Attendance Summary"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">Administrative Actions</h3>
                <p className="text-xs text-slate-500 mb-5">Quick triggers for common academic operations</p>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-cyan-50 text-[#007791] group-hover:bg-[#007791] group-hover:text-white transition-all">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Add User Account</p>
                      <p className="text-[11px] text-slate-500">Create new lecturer or student login</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowCreateCourseModal(true)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 group-hover:bg-sky-700 group-hover:text-white transition-all">
                      <BookPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Create New Course</p>
                      <p className="text-[11px] text-slate-500">Assign course name and faculty lecturer</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('enrolments')}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Manage Enrolments</p>
                      <p className="text-[11px] text-slate-500">Register students into courses</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                Student Attendance System • Role-Based Policy Enforced (NFR-01)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNTS (FR-02) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">User Accounts Management</h2>
              <p className="text-xs text-slate-500">
                Manage accounts for lecturers and students. Admins cannot deactivate their own accounts.
              </p>
            </div>
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-bold text-xs shadow-md shadow-cyan-900/20 transition-all cursor-pointer w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New Account</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'LECTURER', 'STUDENT', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    userRoleFilter === r
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 -mx-1 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-all">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 leading-tight">{user.name}</p>
                      {user.role === 'STUDENT' && (
                        <span className="inline-block px-1.5 py-0.2 rounded bg-cyan-50 border border-cyan-100 text-[#007791] font-mono font-bold text-[10px] mt-0.5">
                          {formatStudentId(user)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">{user.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold ${
                          user.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-800'
                            : user.role === 'LECTURER'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {user.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {user.id !== currentUser.id && user.role !== 'ADMIN' ? (
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            user.isActive !== false
                              ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                              : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {user.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COURSES (FR-03) */}
      {activeTab === 'courses' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Academic Courses</h2>
              <p className="text-xs text-slate-500">
                Setup new courses and assign faculty lecturers. Deactivated courses cannot record new sessions.
              </p>
            </div>
            <button
              onClick={() => setShowCreateCourseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-bold text-xs shadow-md shadow-cyan-900/20 transition-all cursor-pointer"
            >
              <BookPlus className="w-4 h-4" />
              <span>Create New Course</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-cyan-300 transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      ID #{course.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        course.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {course.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 mb-1">{course.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Assigned Lecturer:{' '}
                    <span className="font-bold text-slate-800">{course.lecturer?.name || 'Unassigned'}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 text-center mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Enrolled</p>
                      <p className="text-sm font-extrabold text-slate-800">{course._count?.enrolments || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Sessions</p>
                      <p className="text-sm font-extrabold text-slate-800">{course._count?.sessions || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      handleOpenCourseEnrolments(course);
                      setActiveTab('enrolments');
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-[#007791] font-bold text-xs transition-all cursor-pointer text-center"
                  >
                    Roster
                  </button>
                  <button
                    onClick={() => handleViewCourseSummary(course)}
                    className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                    title="Attendance Summary"
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => handleToggleCourseStatus(course)}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      course.isActive
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {course.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ENROLMENTS (FR-04) */}
      {activeTab === 'enrolments' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Student Course Enrolment (FR-04)</h2>
              <p className="text-xs text-slate-500">
                Select a course to view its enrolled roster and register new students.
              </p>
            </div>
            {selectedCourseForEnrol && (
              <button
                onClick={() => setShowEnrolStudentModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-bold text-xs shadow-md shadow-cyan-900/20 transition-all cursor-pointer w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enrol Student in Course</span>
              </button>
            )}
          </div>

          {/* Select Course Dropdown */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Choose Course:</span>
            <select
              value={selectedCourseForEnrol?.id || ''}
              onChange={(e) => {
                const course = courses.find((c) => c.id === Number(e.target.value));
                if (course) handleOpenCourseEnrolments(course);
              }}
              className="w-full sm:w-80 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
            >
              <option value="">-- Select a Course to View Roster --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c._count?.enrolments || 0} students)
                </option>
              ))}
            </select>
          </div>

          {selectedCourseForEnrol ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Enrolled Roster for: <span className="text-[#007791]">{selectedCourseForEnrol.name}</span>
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  Total Enrolled: {enrolments.length}
                </span>
              </div>

              {loadingEnrolments ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading course roster...</div>
              ) : enrolments.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No students enrolled yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Enrol Student in Course" above to add students.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 -mx-1 sm:mx-0">
                  <table className="w-full text-left text-xs min-w-[580px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4">Enrolment Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enrolments.map((enr) => (
                        <tr key={enr.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-100 text-[#007791] font-mono font-bold text-xs">
                              {formatStudentId(enr.student)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">#{enr.student.id}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{enr.student.name}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{enr.student.email}</td>
                          <td className="py-3 px-4">
                            {enr.student.isActive !== false ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                Active
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(enr.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Please choose a course above to inspect the roster or enrol students.
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-slate-900 mb-1">Create User Account</h3>
            <p className="text-xs text-slate-500 mb-5">
              Register a new lecturer or student. Passwords must be at least 8 characters.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assigned Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                >
                  <option value="STUDENT">Student</option>
                  <option value="LECTURER">Lecturer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder={newUserData.role === 'STUDENT' ? 'e.g. Ibrahim Alhassan' : 'e.g. Dr. Kwame Mensah'}
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                />
              </div>

              {newUserData.role === 'STUDENT' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Student ID / University Index No.
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Used for login & verification</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ADS23B00133Y or STU0005"
                    value={newUserData.studentId}
                    onChange={(e) => {
                      const idVal = e.target.value;
                      setNewUserData({
                        ...newUserData,
                        studentId: idVal,
                        email: idVal ? `${idVal.trim().toLowerCase()}@attendance.local` : '',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#007791] focus:outline-hidden uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    The student will log in directly using this Student ID and their password.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Faculty Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. kmensah@attendance.local"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                <input
                  type="text"
                  required
                  placeholder="Min 8 characters (default: password123)"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-bold text-xs cursor-pointer shadow-md shadow-cyan-900/20"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE COURSE */}
      {showCreateCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-slate-900 mb-1">Create Academic Course</h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter the course name and assign a responsible lecturer.
            </p>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS403 Software Engineering"
                  value={newCourseData.name}
                  onChange={(e) => setNewCourseData({ ...newCourseData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Lecturer</label>
                <select
                  required
                  value={newCourseData.lecturerId}
                  onChange={(e) => setNewCourseData({ ...newCourseData, lecturerId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                >
                  <option value="">-- Select Faculty Lecturer --</option>
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCourseModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-bold text-xs cursor-pointer shadow-md shadow-cyan-900/20"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENROL STUDENT */}
      {showEnrolStudentModal && selectedCourseForEnrol && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto my-auto">
            <h3 className="text-lg font-black text-slate-900 mb-1">Enrol Student</h3>
            <p className="text-xs text-slate-500 mb-5">
              Enrolling into: <strong className="text-[#007791]">{selectedCourseForEnrol.name}</strong>
            </p>

            <form onSubmit={handleEnrolStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Student</label>
                <select
                  required
                  value={selectedStudentToEnrol}
                  onChange={(e) => setSelectedStudentToEnrol(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => {
                    const alreadyEnrolled = enrolments.some((e) => e.student.id === st.id);
                    return (
                      <option key={st.id} value={st.id} disabled={alreadyEnrolled}>
                        {st.name} ({st.email}) {alreadyEnrolled ? '— [Already Enrolled]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEnrolStudentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-bold text-xs cursor-pointer shadow-md shadow-cyan-900/20"
                >
                  Confirm Enrolment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COURSE SUMMARY */}
      {summaryCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Attendance Summary</h3>
                <p className="text-xs text-slate-500">
                  Course: <strong className="text-[#007791]">{summaryCourse.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSummaryCourse(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {loadingSummary ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading attendance summary...</div>
            ) : !courseSummary || courseSummary.students.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No attendance sessions recorded yet for this course.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  {courseSummary.students.map((st) => (
                    <div key={st.studentId} className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{st.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Attended {st.present} of {st.total} sessions
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                            st.percentage === null
                              ? 'bg-slate-100 text-slate-500'
                              : st.percentage >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.percentage >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {st.percentage !== null ? `${st.percentage.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
