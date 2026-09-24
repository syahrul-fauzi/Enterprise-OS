"use client";

import React from 'react';
// Professional Enterprise Authentication Template
// Complete UI/UX overhaul for EOS (Enterprise Operating System)
// Glassmorphism design + subtle animations + enterprise-grade visual hierarchy
export interface AuthenticationTemplateProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthenticationTemplate({ 
  children,
  title,
  subtitle
}: AuthenticationTemplateProps) {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 h-full w-full bg-transparent bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* Subtle gradient orbs for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl"></div>
      
      {/* Main content container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <main className="w-full max-w-md space-y-8">
          {/* Header section with logo */}
          <div className="text-center">
            {/* EOS Logo - Enterprise branding */}
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25 mb-6">
              <span className="text-white font-black text-2xl tracking-tighter">EOS</span>
            </div>
            <h1 className="mt-2 text-center text-4xl font-bold tracking-tight text-white drop-shadow-sm">
              {title}
            </h1>
            <p className="mt-3 text-center text-base text-slate-400 max-w-sm mx-auto">
              {subtitle}
            </p>
          </div>
          
          {/* Card wrapper with glassmorphism effect */}
          <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-black/30">
            {children}
          </div>
          
          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Enterprise Operating System v1.0.0 • Secure Access Portal
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}