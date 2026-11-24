'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { api, authStorage } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { LoginModal } from '@/components/LoginModal';
import { AdminDashboard } from '@/components/AdminDashboard';
import { LecturerDashboard } from '@/components/LecturerDashboard';
import { StudentDashboard } from '@/components/StudentDashboard';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authStorage.getToken();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-[#007791] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-700">Connecting to Attendance Management System...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 w-full">
      <Navbar user={currentUser} onLogout={handleLogout} />

      {/* Main Strict Role-Based Portal with padding for fixed header */}
      <main className="flex-1 w-full pt-16 sm:pt-20">
        {currentUser.role === 'ADMIN' && <AdminDashboard currentUser={currentUser} />}
        {currentUser.role === 'LECTURER' && <LecturerDashboard currentUser={currentUser} />}
        {currentUser.role === 'STUDENT' && <StudentDashboard currentUser={currentUser} />}
      </main>

      {/* Institutional Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-800">
              Student Attendance Management System — Academic Portal
            </p>
            <p className="text-[11px] text-slate-400">
              CS403 Software Engineering Project • Role-Based Academic Management
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-[#007791] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#007791]"></span>
              Official Academic Portal
            </span>
            <span className="text-slate-300">•</span>
            <span>Academic Year 2025/2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
