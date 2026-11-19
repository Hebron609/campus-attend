'use client';

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import { Course, CourseSummary, Enrolment, ClassSession, User } from '@/types';
import { QRProjectorModal } from './QRProjectorModal';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Check,
  X,
  History,
  TrendingUp,
  Percent,
  RefreshCw,
  Eye,
  FileCheck,
  UserCheck,
  ChevronRight,
  Info,
  QrCode,
  Sparkles,
  Users,
  Play
} from 'lucide-react';

interface LecturerDashboardProps {
  currentUser: User;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ currentUser }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active view tab: defaults to 'courses' (My Courses Overview)
  const [activeTab, setActiveTab] = useState<'courses' | 'record' | 'history' | 'summary'>('courses');

  // Selected course for attendance recording
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sessionDate, setSessionDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [roster, setRoster] = useState<Enrolment[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, 'present' | 'absent'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Live QR Projector Modal State
  const [showQRModal, setShowQRModal] = useState(false);

  // Session history state
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<ClassSession | null>(null);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false);

  // Course summary state
  const [courseSummary, setCourseSummary] = useState<CourseSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchCourses = async () => {
    try {
      setError(null);
      const res = await api.courses.list();
      setCourses(res.courses);
      if (res.courses.length > 0 && !selectedCourse) {
        setSelectedCourse(res.courses[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch assigned courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // When selectedCourse changes, load its roster, sessions and summary
  useEffect(() => {
    if (selectedCourse) {
      loadRoster(selectedCourse.id);
      loadSessions(selectedCourse.id);
      loadSummary(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadRoster = async (courseId: number) => {
    setLoadingRoster(true);
    try {
      const res = await api.enrolments.list(courseId);
      setRoster(res.enrolments);
      // Do not pre-fill as 'present'; start as unmarked/pending
      setAttendanceMap({});
    } catch (err: any) {
      setError(err?.message || 'Failed to load course roster');
    } finally {
      setLoadingRoster(false);
    }
  };

  const loadSessions = async (courseId: number) => {
    setLoadingSessions(true);
    try {
      const res = await api.sessions.list(courseId);
      setSessions(res.sessions);
    } catch (err: any) {
      setError(err?.message || 'Failed to load past sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSummary = async (courseId: number) => {
    setLoadingSummary(true);
    try {
      const data = await api.courses.getSummary(courseId);
      setCourseSummary(data);
    } catch (err: any) {
      // Summary might be empty if no sessions yet
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    const updated: Record<number, 'present' | 'absent'> = {};
    roster.forEach((e) => {
      updated[e.student.id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleToggleStudent = (studentId: number, status: 'present' | 'absent') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Submit attendance record (FR-05 & FR-06)
  const handleSubmitAttendance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCourse) return;

    if (roster.length === 0) {
      setError('Cannot save session: this course has no enrolled students.');
      return;
    }

    // Activity Diagram check: Roster Complete? Every enrolled student must be explicitly marked
    const unmarkedStudents = roster.filter((enr) => !attendanceMap[enr.student.id]);
    if (unmarkedStudents.length > 0) {
      setError(
        `Roster Incomplete: ${unmarkedStudents.length} student(s) still unmarked (${unmarkedStudents
          .map((s) => s.student.name)
          .join(', ')}). Please mark each student or click "Mark All Present" / "Mark All Absent" before saving.`
      );
      return;
    }

    const records = roster.map((enr) => ({
      studentId: enr.student.id,
      status: attendanceMap[enr.student.id] as 'present' | 'absent',
    }));

    setSavingAttendance(true);
    setError(null);

    try {
      const res = await api.sessions.saveAttendance({
        courseId: selectedCourse.id,
        sessionDate,
        records,
      });

      setSuccessMsg(`Attendance saved successfully for ${res.saved} students on ${sessionDate}!`);
      setTimeout(() => setSuccessMsg(null), 5000);

      setShowQRModal(false);
      loadSessions(selectedCourse.id);
      loadSummary(selectedCourse.id);
      fetchCourses();
      setActiveTab('history');
    } catch (err: any) {
      if (err?.status === 422) {
        const missing = err?.data?.missingStudentIds || [];
        setError(`Roster incomplete: Attendance must cover all enrolled students exactly. Missing ID(s): ${missing.join(', ')}`);
      } else {
        setError(err?.data?.error || err.message || 'Failed to save attendance session');
      }
    } finally {
      setSavingAttendance(false);
    }
  };

  // Open past session details (FR-07 acceptance test)
  const handleOpenSessionDetail = async (sessionId: number) => {
    setLoadingSessionDetail(true);
    try {
      const res = await api.sessions.get(sessionId);
      setSelectedSessionDetail(res.session);
    } catch (err: any) {
      setError(err?.message || 'Failed to reopen session record');
    } finally {
      setLoadingSessionDetail(false);
    }
  };

  // Calculations for Overview cards
  const totalEnrolments = courses.reduce((sum, c) => sum + (c._count?.enrolments || 0), 0);
  const totalSessions = courses.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-semibold text-sm">Loading assigned courses...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-8">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-[#007791] to-cyan-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-cyan-950/15 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4 text-cyan-300" />
            <span>Faculty Attendance Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, {currentUser.name}
          </h1>
          <p className="mt-1 text-sm text-cyan-100 max-w-xl">
            Record dated class sessions, project dynamic attendance QR codes with facial verification, and audit student percentages.
          </p>
        </div>

        {selectedCourse && (
          <div className="relative z-10 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-cyan-200 uppercase font-bold tracking-wider">Active Course</p>
              <p className="text-sm font-extrabold text-white">{selectedCourse.name}</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-sm font-bold">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Course Selector & Tab Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <span className="text-xs font-bold text-slate-700 uppercase whitespace-nowrap">Selected Course:</span>
          <select
            value={selectedCourse?.id || ''}
            onChange={(e) => {
              const c = courses.find((course) => course.id === Number(e.target.value));
              if (c) setSelectedCourse(c);
            }}
            className="w-full sm:w-80 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name} ({course._count?.enrolments || 0} students)
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>My Courses Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'record'
                ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Take Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Sessions</span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'summary'
                ? 'bg-[#007791] text-white shadow-md shadow-cyan-900/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Percentages</span>
          </button>
        </div>
      </div>

      {/* VIEW: MY COURSES OVERVIEW (Default Landing View) */}
      {activeTab === 'courses' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-cyan-50 text-[#007791] border border-cyan-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Courses</p>
                <p className="text-2xl font-black text-slate-900">{courses.length}</p>
                <span className="text-[11px] text-emerald-600 font-semibold">Active Teaching Portfolio</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</p>
                <p className="text-2xl font-black text-slate-900">{totalEnrolments}</p>
                <span className="text-[11px] text-slate-500 font-medium">Across all your classes</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recorded Sessions</p>
                <p className="text-2xl font-black text-slate-900">{totalSessions}</p>
                <span className="text-[11px] text-slate-500 font-medium">Saved class sessions</span>
              </div>
            </div>
          </div>

          {/* Assigned Courses Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Your Assigned Courses</h2>
                <p className="text-xs text-slate-500">
                  Select an action below to take attendance, launch the live QR projector, or inspect student records.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => {
                const isSelected = selectedCourse?.id === course.id;
                return (
                  <div
                    key={course.id}
                    className={`bg-white rounded-3xl p-6 sm:p-7 border transition-all shadow-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-[#007791]/10 shadow-md'
                        : 'border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-cyan-50 text-[#007791] font-mono">
                          COURSE ID #{course.id}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {course.isActive ? 'Active Course' : 'Deactivated'}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 mb-2">{course.name}</h3>
                      <p className="text-xs text-slate-500 mb-5">
                        Faculty Lecturer: <strong className="text-slate-800">{currentUser.name}</strong>
                      </p>

                      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mb-6 text-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled</p>
                          <p className="text-lg font-black text-slate-800">{course._count?.enrolments || 0} students</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Sessions Conducted</p>
                          <p className="text-lg font-black text-slate-800">{course._count?.sessions || 0} sessions</p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on each card */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setActiveTab('record');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Take Attendance</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowQRModal(true);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-700 to-[#007791] hover:from-sky-800 hover:to-cyan-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-cyan-200" />
                          <span>Launch QR</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setActiveTab('history');
                          }}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Past Sessions</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setActiveTab('summary');
                          }}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Percent className="w-3.5 h-3.5" />
                          <span>Percentages</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TAKE ATTENDANCE (FR-05 & FR-06) */}
      {activeTab === 'record' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Record Class Session Attendance
              </h2>
              <p className="text-xs text-slate-500">
                Use the new automated QR Projector mode or manually toggle statuses below.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Input */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase">Class Date:</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
                />
              </div>

              {/* LAUNCH LIVE QR PROJECTOR BUTTON */}
              {selectedCourse && (
                <button
                  type="button"
                  onClick={() => setShowQRModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-700 to-[#007791] hover:from-sky-800 hover:to-cyan-800 text-white font-extrabold text-xs shadow-md shadow-cyan-900/20 cursor-pointer transition-all active:scale-95"
                >
                  <QrCode className="w-4 h-4 text-cyan-200" />
                  <span>Launch Live QR Projector</span>
                </button>
              )}
            </div>
          </div>

          {loadingRoster ? (
            <div className="py-16 text-center text-slate-400 text-xs">Loading course roster...</div>
          ) : roster.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No students enrolled in this course</p>
              <p className="text-xs text-slate-400 mt-1">
                Please ask the Administrator to enrol students before taking attendance.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitAttendance} className="space-y-6">
              {/* Batch Actions & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cyan-50/60 p-4 rounded-2xl border border-cyan-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                  <span>Enrolled: <strong>{roster.length} students</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>
                    Present:{' '}
                    <strong className="text-emerald-700">
                      {Object.values(attendanceMap).filter((s) => s === 'present').length}
                    </strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>
                    Absent:{' '}
                    <strong className="text-rose-700">
                      {Object.values(attendanceMap).filter((s) => s === 'absent').length}
                    </strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>
                    Unmarked:{' '}
                    <strong className="text-amber-700">
                      {roster.filter((e) => !attendanceMap[e.student.id]).length}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkAll('present')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAll('absent')}
                    className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Mark All Absent
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceMap({})}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Clear Marks
                  </button>
                </div>
              </div>

              {/* Roster Attendance Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-4">#</th>
                      <th className="py-3.5 px-4">Student Name</th>
                      <th className="py-3.5 px-4">Student Email</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Attendance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map((enr, idx) => {
                      const currentStatus = attendanceMap[enr.student.id];
                      const isPresent = currentStatus === 'present';
                      const isAbsent = currentStatus === 'absent';
                      const isUnmarked = !currentStatus;

                      return (
                        <tr key={enr.id} className="hover:bg-slate-50/70 transition-all">
                          <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700">
                              {enr.student.name.charAt(0)}
                            </div>
                            <span>{enr.student.name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {enr.student.email}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isPresent && (
                              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200">
                                PRESENT
                              </span>
                            )}
                            {isAbsent && (
                              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wide bg-rose-100 text-rose-800 border border-rose-200">
                                ABSENT
                              </span>
                            )}
                            {isUnmarked && (
                              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-slate-100 text-slate-500 border border-slate-200">
                                UNMARKED
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100">
                              <button
                                type="button"
                                onClick={() => handleToggleStudent(enr.student.id, 'present')}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Present</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStudent(enr.student.id, 'absent')}
                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-rose-700 hover:bg-white'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Absent</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Submit Save Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Saving will record attendance for session date <strong>{sessionDate}</strong>.
                </p>
                <button
                  type="submit"
                  disabled={savingAttendance}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#007791] to-cyan-600 hover:from-cyan-800 hover:to-[#007791] text-white font-extrabold text-sm shadow-md shadow-cyan-900/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingAttendance ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileCheck className="w-4 h-4" />
                  )}
                  <span>Save Session Attendance</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* VIEW: SESSION HISTORY (FR-07) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Past Recorded Class Sessions
              </h2>
              <p className="text-xs text-slate-500">
                Saved sessions are immutable records. Click any session to inspect recorded attendance statuses.
              </p>
            </div>
            <button
              onClick={() => selectedCourse && loadSessions(selectedCourse.id)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              title="Refresh sessions"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingSessions ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading recorded sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No sessions recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Take attendance from the "Take Attendance" tab to create your first session record.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-cyan-400 bg-white transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-[#007791]">
                        Session #{session.id}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(session.sessionDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm mb-1">
                      {session.course?.name || selectedCourse?.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Recorded Records:{' '}
                      <strong className="text-slate-800">{session._count?.records || 0} students</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenSessionDetail(session.id)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-[#007791] font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Saved Records</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: COURSE ATTENDANCE PERCENTAGES (FR-08 & FR-09) */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Attendance Percentage Summary (FR-08/FR-09)
              </h2>
              <p className="text-xs text-slate-500">
                Calculated as: <em>attended sessions ÷ all recorded sessions × 100</em>. Highlights students below 75%.
              </p>
            </div>
            <button
              onClick={() => selectedCourse && loadSummary(selectedCourse.id)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              title="Refresh percentages"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingSummary ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading course summary...</div>
          ) : !courseSummary || courseSummary.students.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
              <Percent className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No attendance data to calculate</p>
              <p className="text-xs text-slate-400 mt-1">
                Record class sessions first to see student percentage metrics.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Attended Sessions</th>
                      <th className="py-3.5 px-4">Total Recorded</th>
                      <th className="py-3.5 px-4">Attendance Progress</th>
                      <th className="py-3.5 px-4 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courseSummary.students.map((st) => {
                      const pct = st.percentage;
                      const isLow = pct !== null && pct < 75;
                      return (
                        <tr key={st.studentId} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{st.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">ID #{st.studentId}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">{st.present}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">{st.total}</td>
                          <td className="py-3.5 px-4 w-48">
                            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  pct === null
                                    ? 'bg-slate-300 w-0'
                                    : pct >= 75
                                    ? 'bg-emerald-500'
                                    : pct >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: pct !== null ? `${pct}%` : '0%' }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                                pct === null
                                  ? 'bg-slate-100 text-slate-500'
                                  : pct >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pct >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                            </span>
                            {isLow && (
                              <p className="text-[10px] font-bold text-rose-600 mt-1">Warning: Below 75%</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: VIEW PAST SESSION DETAIL */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-[#007791]">
                  Session #{selectedSessionDetail.id}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Saved Attendance Roster
                </h3>
                <p className="text-xs text-slate-500">
                  Date: <strong>{selectedSessionDetail.sessionDate?.slice(0, 10)}</strong> • Course: {selectedSessionDetail.course?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {selectedSessionDetail.records?.map((rec) => (
                  <div key={rec.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{rec.student.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{rec.student.email}</p>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        rec.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIVE DYNAMIC QR CODE PROJECTOR SCREEN */}
      {showQRModal && selectedCourse && (
        <QRProjectorModal
          course={selectedCourse}
          sessionDate={sessionDate}
          roster={roster}
          attendanceMap={attendanceMap}
          onUpdateAttendance={handleToggleStudent}
          onFinalizeSave={() => handleSubmitAttendance()}
          onClose={() => setShowQRModal(false)}
          saving={savingAttendance}
        />
      )}
    </div>
  );
};
