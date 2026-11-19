'use client';

import React from 'react';
import { User } from '@/types';
import { AITLogo } from './AITLogo';
import { LogOut, Shield, GraduationCap, BookOpen } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const getRoleBadge = () => {
    switch (user.role) {
      case 'ADMIN':
        return {
          icon: <Shield className="w-3.5 h-3.5 text-amber-500" />,
          label: 'Administrator',
          className: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'LECTURER':
        return {
          icon: <BookOpen className="w-3.5 h-3.5 text-cyan-600" />,
          label: 'Lecturer',
          className: 'bg-cyan-50 text-cyan-900 border-cyan-200'
        };
      case 'STUDENT':
        return {
          icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Student',
          className: 'bg-emerald-50 text-emerald-900 border-emerald-200'
        };
    }
  };

  const badge = getRoleBadge();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-6">
            <AITLogo size="md" />
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                API Live
              </span>
              <span className="text-slate-400">CS403 Capstone Project</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-500 font-medium">{user.email}</p>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${badge.className}`}>
              {badge.icon}
              <span>{badge.label}</span>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all duration-150 cursor-pointer active:scale-95"
              title="Sign out of system"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
