"use client";

import React from 'react';
// Minimal public authentication template - removes GlobalNavigation dependency that was causing Next.js serialization errors
// Fixes W003-P7-03 chain's /enter route failure while maintaining core layout
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
    <div className="min-h-screen bg-surface-base">
      <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <main className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">{title}</h1>
            <p className="mt-2 text-base text-text-secondary">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}