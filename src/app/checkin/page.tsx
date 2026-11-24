'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { api } from '@/lib/api';
import { Course } from '@/types';
import { AITLogo } from '@/components/AITLogo';
import { BiometricCamera } from '@/components/BiometricCamera';
import { formatStudentId, matchStudentQuery } from '@/lib/studentId';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Calendar,
  UserCheck,
  ArrowRight,
  Clock,
  IdCard,
  QrCode,
  Sparkles,
  Camera,
  ChevronLeft
} from 'lucide-react';

function CheckinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const courseIdParam = searchParams.get('courseId');
  const courseNameParam = searchParams.get('courseName');
  const dateParam = searchParams.get('date');
  const pinParam = searchParams.get('pin');
  const rosterParam = searchParams.get('roster');

  // Step states: 1 = Identify, 2 = Biometric Camera, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number>(
    courseIdParam ? Number(courseIdParam) : 1
  );
  const [sessionDate, setSessionDate] = useState<string>(
    dateParam || new Date().toISOString().slice(0, 10)
  );
  const [studentInput, setStudentInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>(pinParam || '');

  // Validation & Verified student
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string>('');

  // Real students roster
  const demoStudents = [
    { name: 'IBRAHIM ALHASSAN', email: 'ads23b00133y@campusattend.com', id: 20 },
    { name: 'DEREK NHYIRA YANKYERAH', email: 'ads23b00113y@campusattend.com', id: 19 },
    { name: 'EUGENE NARH AYIKU', email: 'ads23b00245y@campusattend.com', id: 14 },
    { name: 'JEBUNI MOHAMMED JAMALDEEN', email: 'ads23b00188y@campusattend.com', id: 15 },
    { name: 'SELORM AMU KOBLA', email: 'ads23b00112y@campusattend.com', id: 16 },
    { name: 'OCEAN BLISS', email: 'bscs16bit0030y@campusattend.com', id: 17 },
    { name: 'ISRAEL AYIKU', email: 'ads23b00249y@campusattend.com', id: 18 },
  ];

  // Pre-load courses only if no course was supplied in the QR URL
  useEffect(() => {
    if (!courseIdParam) {
      api.courses
        .list()
        .then((res) => {
          setCourses(res.courses);
          if (res.courses.length > 0) {
            setSelectedCourseId(res.courses[0].id);
          }
        })
        .catch(() => {
          // Safe catch: mobile students opening /checkin do not need to be authenticated
        });
    }
  }, [courseIdParam]);

  // Verify student enrolment in the course session without requiring lecturer JWT
  const handleVerifyStudentIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInput.trim()) {
      setError('Please enter your Student ID or University Email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let rosterList: { id: number; name: string; email: string }[] = [];

      // 1. If 6-digit PIN entered (e.g. by back-row students), fetch active course session & roster dynamically
      const cleanPin = pinInput.replace(/\D/g, '');
      if (cleanPin.length === 6) {
        try {
          const pinRes = await fetch(`/api/checkin?pin=${cleanPin}`);
          if (pinRes.ok) {
            const pinData = await pinRes.json();
            if (pinData.active && pinData.session) {
              setSelectedCourseId(pinData.session.courseId);
              setSessionDate(pinData.session.sessionDate);
              if (Array.isArray(pinData.session.roster) && pinData.session.roster.length > 0) {
                rosterList = pinData.session.roster;
              }
            }
          }
        } catch {
          // continue fallback
        }
      }

      // 2. Check if roster was embedded in the scanned QR Code URL
      if (rosterList.length === 0 && rosterParam) {
        try {
          rosterList = JSON.parse(decodeURIComponent(rosterParam));
        } catch {
          rosterList = [];
        }
      }

      // 3. If no roster yet, try backend or fallback to enrolled list
      if (rosterList.length === 0) {
        try {
          const res = await api.enrolments.list(selectedCourseId);
          rosterList = res.enrolments.map((e) => ({
            id: e.student.id,
            name: e.student.name,
            email: e.student.email,
          }));
        } catch {
          // On mobile phones without lecturer tokens, use enrolled students fallback
          rosterList = demoStudents;
        }
      }

      // Search student by Student ID (e.g. STU-0005, ADS23B00133Y), numeric ID (#5), or institutional email
      const match = rosterList.find((s) => matchStudentQuery(s, studentInput));

      if (!match) {
        setError(
          `Enrolment Not Found: "${studentInput}" was not found in this course session roster. Please verify your Student ID (e.g. STU-0005) or ensure the 6-Digit PIN is correct.`
        );
        setLoading(false);
        return;
      }

      setVerifiedStudent(match);
      setStep(2); // Proceed to camera verification
    } catch (err: any) {
      setError(err?.message || 'Failed to verify course enrolment');
    } finally {
      setLoading(false);
    }
  };

  // Called when biometric camera confirms facial match
  const handleBiometricSuccess = (photoDataUrl: string) => {
    setCapturedPhotoUrl(photoDataUrl);
    const now = new Date();
    setTimestamp(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );

    if (verifiedStudent) {
      // 1. Post to internal check-in API route for real-time lecturer projector sync over network
      fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          date: sessionDate,
          studentId: verifiedStudent.id,
          studentName: verifiedStudent.name,
        }),
      }).catch((e) => console.error('Live sync error:', e));

      // 2. Also broadcast checkin event via localStorage if testing on same device
      const checkinPayload = {
        courseId: selectedCourseId,
        studentId: verifiedStudent.id,
        studentName: verifiedStudent.name,
        timestamp: now.toISOString(),
      };
      localStorage.setItem('ait_latest_checkin', JSON.stringify(checkinPayload));
    }

    setStep(3); // Show official digital slip

    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#007791', '#0ea5e9', '#10b981', '#ffffff'],
    });
  };

  const activeCourseName =
    courseNameParam ||
    courses.find((c) => c.id === selectedCourseId)?.name ||
    'Academic Course Session';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-cyan-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80 bg-cyan-400/15 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-md mx-auto w-full text-center relative z-10 mb-6">
        <div className="inline-block p-2 rounded-2xl bg-white/90 backdrop-blur-md shadow-sm border border-cyan-100 mb-3">
          <AITLogo size="sm" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Student Self Check-In
        </h1>
        <p className="text-xs text-slate-600 font-medium">
          Student Attendance Management System • Biometric Verification
        </p>
      </div>

      {/* Main Interactive Flow */}
      <div className="max-w-md mx-auto w-full relative z-10 flex-1 flex flex-col justify-center">
        {/* STEP 1: IDENTITY & ENROLMENT VERIFICATION */}
        {step === 1 && (
          <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-cyan-950/10 border border-white sm:border-cyan-100 space-y-5 animate-in fade-in">
            {/* Course & Session Info Pill */}
            <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-[#007791] uppercase tracking-wider mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Class Session Details</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {activeCourseName}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date: {sessionDate}</span>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifyStudentIdentity} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Student ID / University Index Number
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">or School Email</span>
                </div>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IdCard className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU-0005, ADS23B00133Y, or 5"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007791] focus:border-transparent font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Primary identifier used by lecturers to record and audit class attendance.
                </p>
              </div>

              {/* Course Selector if not bound in query */}
              {!courseIdParam && courses.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Course Being Attended
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#007791] focus:outline-hidden bg-slate-50/70"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lecture PIN verification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  6-Digit Lecture Hall PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 582194 (Displayed on Projector)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="block w-full px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007791] font-mono tracking-widest text-center font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#007791] to-cyan-600 hover:from-cyan-800 hover:to-[#007791] text-white font-extrabold text-sm shadow-md shadow-cyan-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify Identity & Proceed to Camera</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Fillers for Mobile Testing */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Tap demo student ID to test:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoStudents.map((ds) => (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => setStudentInput(formatStudentId(ds))}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:border-cyan-300 border border-transparent text-left text-xs font-bold text-slate-700 transition-all cursor-pointer group"
                  >
                    <p className="truncate text-slate-900 group-hover:text-[#007791]">{ds.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100/70 text-[#007791]">
                        {formatStudentId(ds)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BIOMETRIC SELFIE CAMERA VERIFICATION */}
        {step === 2 && verifiedStudent && (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <BiometricCamera
              studentName={verifiedStudent.name}
              studentId={formatStudentId(verifiedStudent)}
              onVerified={handleBiometricSuccess}
              onCancel={() => setStep(1)}
            />
          </div>
        )}

        {/* STEP 3: OFFICIAL ATTENDANCE CONFIRMATION SLIP */}
        {step === 3 && verifiedStudent && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-100 text-center space-y-6 animate-in zoom-in-95">
            {/* Success Insignia */}
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border-4 border-emerald-50">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1.5">
                Biometric Status: Present & Verified
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Attendance Recorded!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your presence has been verified and securely locked into the Attendance Registry.
              </p>
            </div>

            {/* Student Snapshot & Verification Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-3">
              <div className="flex items-center gap-3.5">
                {capturedPhotoUrl ? (
                  <img
                    src={capturedPhotoUrl}
                    alt="Verified Selfie"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-cyan-100 text-[#007791] flex items-center justify-center font-black flex-shrink-0">
                    {verifiedStudent.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-base font-extrabold text-slate-900 leading-tight">
                    {verifiedStudent.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-[#007791] text-white font-mono font-black text-xs tracking-wide">
                      {formatStudentId(verifiedStudent)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      #{verifiedStudent.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {verifiedStudent.email}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Course</p>
                  <p className="font-bold text-slate-800 leading-tight">{activeCourseName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Recorded Time</p>
                  <p className="font-bold text-slate-800 font-mono">
                    {sessionDate} @ {timestamp}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-3.5 px-4 rounded-xl bg-[#007791] hover:bg-cyan-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setStudentInput('');
                  setVerifiedStudent(null);
                  setCapturedPhotoUrl(null);
                }}
                className="w-full py-2.5 text-center text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Check in another student
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 mt-6 relative z-10">
        Student Attendance Management System • CS403 Software Engineering Project
      </footer>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-bold text-sm">
          Loading Attendance Check-In System...
        </div>
      }
    >
      <CheckinContent />
    </Suspense>
  );
}
