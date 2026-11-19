'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StudentAttendanceResponse, User } from '@/types';
import { formatStudentId } from '@/lib/studentId';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Percent,
  BookOpen,
  RefreshCw,
  Award,
  ShieldCheck,
  AlertTriangle,
  QrCode
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser }) => {
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<number | 'ALL'>('ALL');

  const fetchAttendance = async () => {
    try {
      setError(null);
      const res = await api.student.getAttendance();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-semibold text-sm">Loading your attendance records...</p>
      </div>
    );
  }

  const overallPct = data?.overall?.percentage ?? null;

  const getStandingStatus = (pct: number | null) => {
    if (pct === null) {
      return {
        label: 'No Data Yet',
        description: 'No sessions have been recorded yet for your enrolled courses.',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <Clock className="w-5 h-5 text-slate-500" />,
      };
    }
    if (pct >= 75) {
      return {
        label: 'Good Academic Standing',
        description: 'Your attendance is above the university threshold (75%). Keep it up!',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      };
    }
    if (pct >= 50) {
      return {
        label: 'Attendance Warning',
        description: 'Your attendance is between 50% and 75%. You are at risk of exam restrictions.',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      };
    }
    return {
      label: 'Critical / At Risk',
      description: 'Your attendance is below 50%. Please see your course lecturer or academic advisor.',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
    };
  };

  const standing = getStandingStatus(overallPct);

  // Flatten all session records across courses with course name attached
  const allRecords =
    data?.courses.flatMap((c) =>
      c.records.map((r) => ({
        ...r,
        courseId: c.courseId,
        courseName: c.courseName,
      }))
    ) || [];

  // Sort newest first
  allRecords.sort(
    (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
  );

  const filteredRecords =
    selectedCourseFilter === 'ALL'
      ? allRecords
      : allRecords.filter((r) => r.courseId === selectedCourseFilter);

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-[#007791] to-cyan-700 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl shadow-cyan-950/15 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="w-4 h-4 text-cyan-300" />
            <span>Student Academic Portal</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">
            Hello, {currentUser.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 mb-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-white font-mono font-bold text-xs border border-white/30 tracking-wider">
              STUDENT ID: {formatStudentId(currentUser)}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-cyan-100 max-w-xl">
            Track your personal attendance records, review course percentages, and ensure you meet academic exam eligibility criteria.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <Link
            href="/checkin"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-cyan-50 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <QrCode className="w-4 h-4 text-[#007791]" />
            <span>Check In to Class (QR & Face)</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer backdrop-blur-xs w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>
      </div>

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

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Percentage Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Overall Attendance
              </span>
              <span className="p-2 rounded-xl bg-cyan-50 text-[#007791]">
                <Percent className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-slate-900">
                {overallPct !== null ? `${overallPct.toFixed(1)}%` : '—'}
              </span>
              {overallPct !== null && (
                <span className="text-xs font-bold text-slate-500">
                  ({data?.overall?.present} / {data?.overall?.total} sessions)
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mt-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  overallPct === null
                    ? 'w-0 bg-slate-300'
                    : overallPct >= 75
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : overallPct >= 50
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-rose-500 to-red-400'
                }`}
                style={{ width: overallPct !== null ? `${overallPct}%` : '0%' }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4">
            Aggregated across all registered semester courses
          </p>
        </div>

        {/* Academic Standing Status */}
        <div className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between ${standing.badgeBg}`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-white shadow-2xs">
                {standing.icon}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                  Academic Evaluation
                </span>
                <h3 className="text-base font-black leading-tight">{standing.label}</h3>
              </div>
            </div>
            <p className="text-xs opacity-90 leading-relaxed font-medium">
              {standing.description}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-current/15 text-[11px] font-bold opacity-80">
            Academic Policy: Minimum 75% attendance required for examination entry.
          </div>
        </div>

        {/* Total Enrolled Courses */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Enrolled Courses
              </span>
              <span className="p-2 rounded-xl bg-sky-50 text-sky-700">
                <BookOpen className="w-4 h-4" />
              </span>
            </div>
            <p className="text-4xl font-black text-slate-900">{data?.courses.length || 0}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Active courses enrolled for the current semester
            </p>
          </div>
          <p className="text-[11px] text-slate-400 mt-4">
            Role-protected: Access restricted to your own records (NFR-01)
          </p>
        </div>
      </div>

      {/* Course Breakdown Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">Enrolled Courses Attendance Breakdown</h2>

        {!data?.courses || data.courses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No courses currently enrolled</p>
            <p className="text-xs text-slate-400 mt-1">
              Please contact the Administrator to be enrolled into your semester courses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.courses.map((course) => {
              const pct = course.percentage;
              return (
                <div
                  key={course.courseId}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-cyan-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          Course #{course.courseId}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1">
                          {course.courseName}
                        </h3>
                      </div>
                      <span
                        className={`text-sm font-black px-3 py-1 rounded-xl ${
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
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Attended: {course.present} of {course.total} recorded sessions</span>
                        <span>{pct !== null ? `${pct.toFixed(1)}%` : 'Pending'}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            pct === null
                              ? 'w-0 bg-slate-300'
                              : pct >= 75
                              ? 'bg-emerald-500'
                              : pct >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: pct !== null ? `${pct}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{course.records.length} saved attendance logs</span>
                    <button
                      onClick={() => setSelectedCourseFilter(course.courseId)}
                      className="font-bold text-[#007791] hover:underline cursor-pointer"
                    >
                      Filter History →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance History Timeline (FR-10) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Personal Attendance History (FR-10)</h2>
            <p className="text-xs text-slate-500">
              Detailed chronological record of every class session and your attendance status.
            </p>
          </div>

          {/* Filter by course */}
          {data?.courses && data.courses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Course:</span>
              <select
                value={selectedCourseFilter}
                onChange={(e) =>
                  setSelectedCourseFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                }
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#007791] focus:outline-hidden"
              >
                <option value="ALL">All Enrolled Courses</option>
                {data.courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No session attendance recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Your attendance status will appear here as lecturers conduct class sessions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 -mx-1 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[540px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Session Date</th>
                  <th className="py-3.5 px-4">Course Name</th>
                  <th className="py-3.5 px-4">Session ID</th>
                  <th className="py-3.5 px-4 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const isPresent = rec.status === 'PRESENT';
                  return (
                    <tr key={`${rec.courseId}-${rec.sessionId}`} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {new Date(rec.sessionDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{rec.courseName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">#{rec.sessionId}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>PRESENT</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>ABSENT</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
