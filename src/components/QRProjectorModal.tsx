'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Course, Enrolment } from '@/types';
import {
  X,
  RefreshCw,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Smartphone,
  Save,
  Check
} from 'lucide-react';

interface QRProjectorModalProps {
  course: Course;
  sessionDate: string;
  roster: Enrolment[];
  attendanceMap: Record<number, 'present' | 'absent'>;
  onUpdateAttendance: (studentId: number, status: 'present' | 'absent') => void;
  onFinalizeSave: () => void;
  onClose: () => void;
  saving: boolean;
}

export const QRProjectorModal: React.FC<QRProjectorModalProps> = ({
  course,
  sessionDate,
  roster,
  attendanceMap,
  onUpdateAttendance,
  onFinalizeSave,
  onClose,
  saving,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [currentPin, setCurrentPin] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [checkinUrl, setCheckinUrl] = useState<string>('');

  // Generate new dynamic token and 6-digit PIN
  const refreshDynamicToken = () => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = `${course.id}-${sessionDate}-${randomHex}`;

    setSessionToken(token);
    setCurrentPin(pin);
    setTimeLeft(30);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const url = `${origin}/checkin?courseId=${course.id}&courseName=${encodeURIComponent(
      course.name
    )}&date=${sessionDate}&pin=${pin}&token=${token}`;

    setCheckinUrl(url);

    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#007791', // AIT Sea Blue
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('QR code generation error:', err));
  };

  // Timer loop for rotating QR code (anti-proxy TTL guard)
  useEffect(() => {
    refreshDynamicToken();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          refreshDynamicToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [course.id, sessionDate]);

  // Listen for cross-tab check-in events (when student verifies in another tab/window)
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'ait_latest_checkin' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          if (payload.courseId === course.id) {
            onUpdateAttendance(payload.studentId, 'present');
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [course.id, onUpdateAttendance]);

  const presentCount = Object.values(attendanceMap).filter((s) => s === 'present').length;
  const totalStudents = roster.length;
  const percentPresent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto w-full">
      <div className="bg-white rounded-3xl w-full max-w-[94vw] xl:max-w-7xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col my-auto max-h-[92vh]">
        {/* Projector Top Header */}
        <div className="bg-gradient-to-r from-sky-950 via-[#007791] to-cyan-700 px-6 sm:px-8 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xs">
              <Smartphone className="w-6 h-6 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950">
                  Live Attendance Projector
                </span>
                <span className="text-xs text-cyan-200 font-semibold">• Date: {sessionDate}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                {course.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Close Projector Screen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split into QR Code & Live Attendance Feed */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto">
          {/* Left: Dynamic QR Code Presentation (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center text-center space-y-5 bg-gradient-to-b from-slate-50 to-cyan-50/40 p-6 sm:p-8 rounded-3xl border border-cyan-100">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100/80 text-[#007791] text-xs font-extrabold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anti-Proxy Dynamic QR Code</span>
              </span>
              <h3 className="text-lg font-black text-slate-900">
                Scan with Smartphone to Check In
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enter your student index number and verify your face to be recorded as present.
              </p>
            </div>

            {/* QR Code Canvas Frame */}
            <div className="relative p-4 bg-white rounded-3xl shadow-xl border-2 border-[#007791]/30">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Session Attendance QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 rounded-xl object-contain mx-auto"
                />
              ) : (
                <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center bg-slate-100 rounded-xl animate-pulse">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              )}

              {/* Dynamic countdown overlay pill */}
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 py-1.5 px-3 rounded-xl border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-cyan-600" />
                <span>Expires in:</span>
                <span className="font-mono text-cyan-700 font-extrabold text-sm">{timeLeft}s</span>
              </div>
            </div>

            {/* 6-Digit Rotating PIN (Auditorium Fallback) */}
            <div className="w-full max-w-sm bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-slate-400">Back-Row Lecture PIN:</p>
                <p className="text-2xl font-black tracking-widest font-mono text-[#007791]">
                  {currentPin.slice(0, 3)}-{currentPin.slice(3)}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Enter manually
              </span>
            </div>

            {/* Direct Link to test student scan in new tab */}
            <a
              href={checkinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition-all shadow-md shadow-cyan-900/10 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Simulate Student Scan (Opens /checkin in new tab)</span>
            </a>
          </div>

          {/* Right: Live Attendance Roster Status (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Progress Summary Card */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-extrabold text-cyan-300 tracking-wider">
                    Live Check-in Counter
                  </span>
                  <span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30">
                    {percentPresent}% Present
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{presentCount}</span>
                  <span className="text-sm font-semibold text-slate-400">/ {totalStudents} Enrolled</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentPresent}%` }}
                  />
                </div>
              </div>

              {/* Roster Live List */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Student Roster Status
                  </h4>
                  <span className="text-[11px] text-slate-400">Click to manually toggle</span>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {roster.map((enr) => {
                    const isPresent = attendanceMap[enr.student.id] === 'present';
                    return (
                      <div
                        key={enr.id}
                        onClick={() =>
                          onUpdateAttendance(enr.student.id, isPresent ? 'absent' : 'present')
                        }
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isPresent
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isPresent ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isPresent ? <Check className="w-3.5 h-3.5" /> : enr.student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{enr.student.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID #{enr.student.id}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isPresent
                              ? 'bg-emerald-200/80 text-emerald-900'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isPresent ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Finalize Button */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onFinalizeSave}
                disabled={saving}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#007791] to-cyan-600 hover:from-cyan-800 hover:to-[#007791] text-white font-extrabold text-sm shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Finalize & Record Session Attendance</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
