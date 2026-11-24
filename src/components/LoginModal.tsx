'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';
import { AITLogo } from './AITLogo';
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: User) => void;
}

function resolveLoginIdentifier(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const clean = trimmed.toLowerCase();

  // Real student index numbers & aliases
  if (clean === 'ads23b00245y' || clean === 'eugene') {
    return 'ads23b00245y@campusattend.com';
  }
  if (clean === 'ads23b00188y' || clean === 'jebuni') {
    return 'ads23b00188y@campusattend.com';
  }
  if (clean === 'ads23b00112y' || clean === 'selorm') {
    return 'ads23b00112y@campusattend.com';
  }
  if (clean === 'bscs16bit0030y' || clean === 'ocean' || clean === 'bliss') {
    return 'bscs16bit0030y@campusattend.com';
  }
  if (clean === 'ads23b00249y' || clean === 'israel') {
    return 'ads23b00249y@campusattend.com';
  }
  if (clean === 'ads23b00113y' || clean === 'derek') {
    return 'ads23b00113y@campusattend.com';
  }
  if (clean === 'ads23b00133y' || clean === 'ibrahim') {
    return 'ads23b00133y@campusattend.com';
  }

  // Lecturer aliases
  if (clean === 'wendy' || clean === 'drwendy' || clean === 'dr.wendy' || clean === 'dr-wendy') {
    return 'dr.wendy@campusattend.com';
  }

  // Administrator alias
  if (clean === 'admin' || clean === 'administrator') {
    return 'admin@campusattend.com';
  }

  // For any student ID entered without @ domain, default to @campusattend.com
  return `${clean}@campusattend.com`;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const rawIdentifier = customEmail || email;
    const loginPass = customPass || password;

    if (!rawIdentifier || !loginPass) {
      setError('Please provide your Student ID (or email) and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolvedEmail = resolveLoginIdentifier(rawIdentifier);
      const data = await api.auth.login(resolvedEmail, loginPass);
      onSuccess(data.user);
    } catch (err: any) {
      setError(err?.data?.error || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-cyan-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Sea-Blue circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#007791]/15 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-block p-2 rounded-2xl bg-white/80 backdrop-blur-md shadow-sm border border-cyan-100 mb-4">
          <AITLogo size="lg" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Student Attendance System
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          CS403 Software Engineering Project • Role-Based Academic Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-xl shadow-cyan-900/10 rounded-3xl border border-white sm:border-cyan-100">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Student ID
                </label>
                <span className="text-[10px] font-semibold text-slate-400">or Faculty Email</span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ADS23B00133Y or admin@campusattend.com"
                  className="block w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007791] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="block w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007791] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-[#007791] to-cyan-600 hover:from-cyan-800 hover:to-[#007791] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#007791] disabled:opacity-50 transition-all cursor-pointer active:scale-98"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
