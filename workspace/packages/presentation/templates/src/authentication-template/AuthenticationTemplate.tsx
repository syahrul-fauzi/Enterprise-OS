"use client";

import React from 'react';
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";

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
    <GlobalNavigation
      userCapabilities={[]}
      productId="eos-public"
      isPublic
    >
      <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <main className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">{title}</h1>
            <p className="mt-2 text-base text-text-secondary">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </GlobalNavigation>
  );
}