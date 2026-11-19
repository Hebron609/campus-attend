import React from 'react';

export const AITLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-11 h-11', icon: 'w-7 h-7', text: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 'w-16 h-16', icon: 'w-10 h-10', text: 'text-2xl', sub: 'text-xs' },
  };

  const s = sizeMap[size];

  return (
    <div className="flex items-center gap-3">
      <div className={`${s.box} rounded-xl bg-gradient-to-br from-cyan-600 via-[#007791] to-sky-900 flex items-center justify-center shadow-md shadow-cyan-900/20 text-white relative overflow-hidden flex-shrink-0 border border-cyan-400/30`}>
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
        <svg
          className={`${s.icon} relative z-10`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Graduation Cap / Academic Crest */}
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      </div>
      <div>
        <div className={`font-black tracking-tight text-slate-900 flex items-center gap-1.5 ${s.text}`}>
          <span className="text-[#007791]">CAMPUS</span>
          <span className="text-slate-800 font-bold">ATTEND</span>
        </div>
        <p className={`font-medium text-slate-500 uppercase tracking-wider ${s.sub}`}>
          Student Attendance Management System
        </p>
      </div>
    </div>
  );
};
