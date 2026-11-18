'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { api, authStorage } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { LoginModal } from '@/components/LoginModal';
import { AdminDashboard } from '@/components/AdminDashboard';
import { LecturerDashboard } from '@/components/LecturerDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';
import { Shield, BookOpen, GraduationCap, Users, RefreshCw } from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authStorage.getToken();
      const savedUser = authStorage.getUser();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user } = await api.auth.me();
        setCurrentUser(user);
        authStorage.setUser(user);
      } catch (err) {
        // Token invalid or expired
        authStorage.clear();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    await api.auth.logout();
    setCurrentUser(null);
  };

  const handleQuickSwitch = async (email: string) => {
    setSwitchingRole(true);
    try {
      const data = await api.auth.login(email, 'password123');
      setCurrentUser(data.user);
    } catch (err: any) {
      alert(err?.message || 'Failed to switch demo account');
    } finally {
      setSwitchingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-[#007791] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-700">Connecting to AIT Attendance System...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={currentUser} onLogout={handleLogout} />

      {/* Floating Demo Role Switcher Toolbar for Presentation / Evaluation */}
      <aside aria-label="Demo accounts toolbar" className="bg-slate-900 text-white text-xs border-b border-slate-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-extrabold text-cyan-300 uppercase tracking-wider text-[10px]">
              Evaluation Role Switcher:
            </span>
            <span className="text-slate-400 hidden md:inline">
              (Quickly test permissions & workflows without retyping password)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleQuickSwitch('admin@attendance.local')}
              disabled={switchingRole || currentUser.email === 'admin@attendance.local'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                currentUser.role === 'ADMIN'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Admin</span>
            </button>

            <button
              onClick={() => handleQuickSwitch('alice@attendance.local')}
              disabled={switchingRole || currentUser.email === 'alice@attendance.local'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                currentUser.email === 'alice@attendance.local'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Lecturer (Alice)</span>
            </button>

            <button
              onClick={() => handleQuickSwitch('kwame@attendance.local')}
              disabled={switchingRole || currentUser.email === 'kwame@attendance.local'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                currentUser.email === 'kwame@attendance.local'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Lecturer (Kwame)</span>
            </button>

            <button
              onClick={() => handleQuickSwitch('akosua@attendance.local')}
              disabled={switchingRole || currentUser.email === 'akosua@attendance.local'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                currentUser.email === 'akosua@attendance.local'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Student (Akosua)</span>
            </button>

            <button
              onClick={() => handleQuickSwitch('yaw@attendance.local')}
              disabled={switchingRole || currentUser.email === 'yaw@attendance.local'}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                currentUser.email === 'yaw@attendance.local'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Student (Yaw)</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Role-Based Dashboard View */}
      <main className="flex-1">
        {currentUser.role === 'ADMIN' && <AdminDashboard currentUser={currentUser} />}
        {currentUser.role === 'LECTURER' && <LecturerDashboard currentUser={currentUser} />}
        {currentUser.role === 'STUDENT' && <StudentDashboard currentUser={currentUser} />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-800">
              Accra Institute of Technology (AIT) — Student Attendance Management System
            </p>
            <p className="text-[11px] text-slate-400">
              CS403 Capstone Project • Frontend by Students QA & Development Team
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Live Backend Connected
            </span>
            <span className="text-slate-300">|</span>
            <span>PostgreSQL & Neon DB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
