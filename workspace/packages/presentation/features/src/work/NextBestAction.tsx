"use client";

import React from 'react';
import { Button } from '@repo/presentation-ui-system';

interface NextBestActionProps {
  text: string;
  buttonLabel: string;
  onExecute: () => void;
}

const LightningIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export function NextBestAction({ text, buttonLabel, onExecute }: NextBestActionProps) {
  return (
    <section
      aria-labelledby="nba-heading"
      className="bg-gradient-to-r from-red-50 via-white to-red-50 border-0 p-6 sm:p-8"
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600" aria-hidden="true">
              <LightningIcon />
            </div>
            <div className="min-w-0 flex-1">
              <p id="nba-heading" className="text-sm font-black uppercase tracking-widest text-red-600 mb-2">
                ⚡ Next Best Action — TINDAKAN SEGERA
              </p>
              <p className="text-xl font-bold text-slate-900 leading-snug" aria-live="polite">
                {text}
              </p>
            </div>
          </div>
          <Button
            intent="primary"
            variant="solid"
            size="lg"
            onClick={onExecute}
            className="px-8 py-4 text-lg font-bold bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200/80"
            rightIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            }
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}