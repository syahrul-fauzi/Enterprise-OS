"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Input,
  TextArea,
  Select,
} from "@repo/presentation-ui-system";

const SafeLink = Link as any;

const Icon = {
  Sparkles: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
  Home: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  Briefcase: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  ),
  Users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  Bell: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 0112 3a8.969 8.969 0 018.876 4.5" />
    </svg>
  ),
  Moon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  Clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6h4.5" />
    </svg>
  ),
  Warning: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  TrendUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  TrendDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
    </svg>
  ),
  Lightning: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Eye: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  EyeOff: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ),
  List: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5.25 6.75h13.5m-13.5 5.25h13.5m-13.5 5.25h13.5" />
    </svg>
  ),
};

function StatusBadge({ intent = "neutral", children }: { intent?: "success" | "warning" | "danger" | "info" | "primary" | "neutral"; children: React.ReactNode }) {
  const intentClass: Record<string, string> = {
    success: "bg-status-success/10 text-status-success border-status-success/20",
    warning: "bg-status-warning/10 text-status-warning-fg border-status-warning/20",
    danger: "bg-status-danger/10 text-status-danger-fg border-status-danger/20",
    info: "bg-status-info/10 text-status-info-fg border-status-info/20",
    primary: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
    neutral: "bg-surface-sunken text-text-secondary border-surface-border",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${intentClass[intent]}`}>
      {children}
    </span>
  );
}

function StepIndicator({ current = 2, total = 3 }: { current?: number; total?: number }) {
  const steps = ["Input Kebutuhan", "Pemahaman Intent", "Pembentukan Work"];
  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-4" role="list">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" role="listitem">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                active
                  ? "bg-brand-primary text-text-inverse border-brand-primary shadow-token-sm"
                  : done
                  ? "bg-status-success/10 text-status-success border-status-success/20"
                  : "bg-surface-sunken text-text-muted border-surface-border"
              }`}
              aria-current={active ? "step" : undefined}
            >
              <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                active
                  ? "bg-white/20 text-text-inverse"
                  : done
                  ? "bg-status-success text-status-success-fg"
                  : "bg-surface-border text-text-secondary"
              }`} aria-hidden="true">
                {done ? <Icon.Check className="w-3 h-3" /> : idx}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {idx < total && (
              <div className={`w-6 sm:w-12 h-0.5 rounded-full transition-colors ${done || active ? "bg-brand-primary/40" : "bg-surface-border"}`} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Breadcrumb({ items }: { items: ReadonlyArray<{ href?: string; label: string; current?: boolean }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex items-center flex-wrap gap-1.5 text-text-muted">
        {items.map((item, i) => (
          <li key={item.label + i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-text-muted/50">/</span>}
            {item.current ? (
              <span className="text-text-primary font-medium truncate max-w-[12rem] inline-block align-bottom" aria-current="page">
                {item.label}
              </span>
            ) : item.href ? (
              <SafeLink href={item.href} className="hover:text-text-primary transition-colors inline-flex items-center gap-1">
                {i === 0 && <Icon.Home className="w-3.5 h-3.5" aria-hidden="true" />}
                {item.label}
              </SafeLink>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  description,
  intent = "neutral",
  IconComp,
  delta,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  description: string;
  intent?: "neutral" | "warning" | "danger" | "success" | "info";
  IconComp: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  delta?: { value: number | string; positive: boolean; label?: string };
}) {
  const intentIconWrap: Record<string, string> = {
    neutral: "bg-brand-primary/10 text-brand-primary",
    warning: "bg-status-warning/10 text-status-warning-fg",
    danger: "bg-status-danger/10 text-status-danger-fg",
    success: "bg-status-success/10 text-status-success-fg",
    info: "bg-status-info/10 text-status-info-fg",
  };
  const intentValueColor: Record<string, string> = {
    neutral: "text-text-primary",
    warning: "text-text-primary",
    danger: "text-status-danger-fg",
    success: "text-status-success-fg",
    info: "text-text-primary",
  };
  return (
    <Card size="sm" hoverable className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${intentIconWrap[intent]}`} aria-hidden="true">
          <IconComp className="w-5 h-5" />
        </div>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded ${
            delta.positive ? "bg-status-success/10 text-status-success-fg" : "bg-status-danger/10 text-status-danger-fg"
          }`}>
            {delta.positive ? <Icon.TrendUp className="w-3 h-3" aria-hidden="true" /> : <Icon.TrendDown className="w-3 h-3" aria-hidden="true" />}
            <span>{delta.positive ? "+" : ""}{delta.value}</span>
          </span>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <p className="text-xs font-medium text-text-muted truncate">{label}</p>
        <div className="mt-1 flex items-baseline gap-1">
          <p className={`text-2xl sm:text-3xl font-bold ${intentValueColor[intent]} tracking-tight tabular-nums`}>
            {value}
            {suffix && <span className="text-sm font-semibold text-text-muted ml-0.5">{suffix}</span>}
          </p>
        </div>
        <p className="mt-1.5 text-xs text-text-muted line-clamp-1">{description}</p>
      </div>
    </Card>
  );
}

export function HighFidelityPrototype() {
  const [search, setSearch] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState<"7D" | "30D" | "90D">("30D");

  const periodData = {
    "7D": { response: { v: "4.2h", d: "23%", p: true }, complete: { v: "83%", d: "12%", p: true }, bottleneck: { v: "7", d: "75%", p: true } },
    "30D": { response: { v: "4.8h", d: "15%", p: true }, complete: { v: "81%", d: "8%", p: true }, bottleneck: { v: "25", d: "60%", p: true } },
    "90D": { response: { v: "5.1h", d: "10%", p: true }, complete: { v: "79%", d: "5%", p: true }, bottleneck: { v: "78", d: "55%", p: true } },
  } as const;
  const d = periodData[tab];

  return (
    <main id="main-content" role="main" className="min-h-screen bg-surface-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-brand-primary focus:text-text-inverse focus:px-4 focus:py-2 focus:rounded-md focus:shadow-token-md focus:font-semibold">
        Lewati ke konten utama
      </a>

      <header className="sticky top-0 z-40 bg-surface border-b border-surface-border backdrop-blur-sm bg-surface/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-8">
              <SafeLink href="/" className="flex items-center gap-2 group" aria-label="Enterprise OS — beranda">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-primary via-brand-primary to-brand-secondary flex items-center justify-center text-text-inverse text-sm font-bold shadow-token-sm group-hover:shadow-token-md transition-all duration-eos-fast ease-eos-standard">
                  EOS
                </div>
                <span className="hidden sm:inline text-base font-bold text-text-primary tracking-tight">Enterprise OS</span>
              </SafeLink>

              <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-1">
                <SafeLink href="/my-reality" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold bg-brand-primary/10 text-brand-primary transition-colors">
                  <Icon.Home className="w-4 h-4" aria-hidden="true" />
                  My Reality
                </SafeLink>
                <SafeLink href="/work" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors">
                  <Icon.Briefcase className="w-4 h-4" aria-hidden="true" />
                  My Work
                </SafeLink>
                <SafeLink href="/people" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors">
                  <Icon.Users className="w-4 h-4" aria-hidden="true" />
                  People
                </SafeLink>
                <SafeLink href="/intent/new" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold bg-brand-primary text-text-inverse hover:bg-brand-primary/90 shadow-token-sm transition-all duration-eos-fast ease-eos-standard">
                  <Icon.Plus className="w-4 h-4" aria-hidden="true" />
                  New Intent
                </SafeLink>
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-2 h-10 px-3.5 rounded-md border border-surface-border bg-surface-sunken/50 focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all w-64 lg:w-80">
                <Icon.Search className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari work, dokumen, orang..."
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                  aria-label="Pencarian global"
                />
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface text-[10px] font-semibold text-text-muted border border-surface-border" aria-hidden="true">⌘K</kbd>
              </div>

              <button
                type="button"
                aria-label="Notifikasi (3 belum dibaca)"
                className="relative h-10 w-10 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
              >
                <Icon.Bell className="w-5 h-5" aria-hidden="true" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-status-danger ring-2 ring-surface" aria-hidden="true" />
              </button>

              <button
                type="button"
                aria-label="Ganti tema gelap/terang"
                className="h-10 w-10 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
              >
                <Icon.Moon className="w-5 h-5" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-surface-border">
                <div className="hidden sm:block text-right leading-tight">
                  <p className="text-sm font-semibold text-text-primary">Dr. Sarah</p>
                  <p className="text-xs text-text-muted">Advokat • Tenant Alpha</p>
                </div>
                <button type="button" aria-label="Menu pengguna" className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center text-text-inverse text-sm font-bold shadow-token-sm hover:shadow-token-md transition-shadow">
                  S
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Progres langkah kerja" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <StepIndicator current={2} total={3} />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <Breadcrumb items={[
          { href: "/my-reality", label: "Beranda" },
          { href: "/intent/new", label: "Intent" },
          { label: "Refinement", current: true },
        ]} />
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border bg-brand-primary/10 text-brand-primary border-brand-primary/30">
                <Icon.Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Detail Intent
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary tracking-tight">
                Pemahaman Kebutuhan Anda
              </h1>
              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
                Review pemahaman EOS di bawah ini. Jika sudah sesuai, lanjutkan untuk membentuk Work dan memulai perjalanan kerja Anda.
              </p>
            </div>

            <Card size="lg" className="overflow-hidden">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                        Ekspresi Awal Pengguna
                      </p>
                      <p className="text-sm text-text-secondary">
                        Masukan asli dari pengguna yang diterima EOS
                      </p>
                    </div>
                    <StatusBadge intent="info"><Icon.Eye className="w-3 h-3" /> Langsung dari input</StatusBadge>
                  </div>
                  <blockquote className="rounded-lg bg-surface-sunken border border-surface-border p-4 sm:p-5">
                    <p className="text-text-primary leading-relaxed">
                      "Saya ingin mendirikan PT untuk startup teknologi saya. Butuh bantuan dari awal sampai selesai, termasuk pembuatan akta, NPWP perusahaan, dan pendaftaran ke Kemenkumham. Mohon infokan berapa lama prosesnya dan apa saja dokumen yang perlu saya siapkan."
                    </p>
                  </blockquote>
                </div>

                <div className="border-t border-surface-divider pt-6 space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                        Interpretasi EOS
                      </p>
                      <p className="text-sm text-text-secondary">
                        Pemahaman terstruktur yang diekstrak dari ekspresi alami
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge intent="success"><Icon.Check className="w-3 h-3" /> Confidence 95%</StatusBadge>
                      <StatusBadge intent="primary">Domain: Legal</StatusBadge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-brand-primary/15 bg-brand-primary/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
                        Tujuan Utama
                      </p>
                      <p className="text-base font-semibold text-text-primary leading-snug">
                        Mendirikan PT untuk startup teknologi
                      </p>
                    </div>
                    <div className="rounded-lg border border-status-info/15 bg-status-info/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-status-info-fg mb-2">
                        Work Type
                      </p>
                      <p className="text-base font-semibold text-text-primary leading-snug">
                        Legal — Company Formation
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-sunken/60 p-4 sm:col-span-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                        Hasil yang Diharapkan
                      </p>
                      <p className="text-sm text-text-primary leading-relaxed">
                        PT berhasil didirikan dengan dokumen legal lengkap (akta pendirian, NPWP perusahaan, NIB, dan pendaftaran Kemenkumham). Pengguna memahami timeline proses dan kelengkapan dokumen yang diperlukan.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-surface-border bg-surface p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                      Kebutuhan yang Diidentifikasi
                    </p>
                    <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                      {[
                        "Pembuatan akta pendirian PT",
                        "Pendaftaran NPWP perusahaan",
                        "Pendaftaran NIB / OSS",
                        "Pendaftaran ke Kemenkumham (AHU)",
                        "Informasi timeline proses",
                        "Checklist dokumen persyaratan",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-status-success/10 text-status-success flex items-center justify-center shrink-0" aria-hidden="true">
                            <Icon.Check className="w-3 h-3" />
                          </span>
                          <span className="text-text-primary leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-surface-divider pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <Button intent="neutral" variant="outline" size="lg" leftIcon={<Icon.ChevronRight className="w-4 h-4 rotate-180" />}>
                    Revisi Kebutuhan
                  </Button>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Button intent="secondary" variant="soft" size="lg">
                      Ajukan Pertanyaan Clarifikasi
                    </Button>
                    <Button
                      intent="primary"
                      variant="solid"
                      size="lg"
                      rightIcon={<Icon.ChevronRight className="w-4 h-4" />}
                    >
                      Bentuk Work dari Intent ini
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card size="lg" title="Demo: Improved Password Input (Signup Flow)" subtitle="Contoh perbaikan form: show/hide password, strength bar, dan helper text yang konsisten">
              <div className="max-w-md space-y-5">
                <Input
                  label="Email Perusahaan"
                  type="email"
                  placeholder="anda@startup-tech.co.id"
                  helperText="Gunakan email domain perusahaan untuk akses tenant"
                  required
                  size="lg"
                />

                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <label htmlFor="demo-password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Kata Sandi
                      <span className="ml-1 text-status-danger" aria-hidden="true">*</span>
                    </label>
                    <span id="demo-pw-label" className="text-xs font-medium text-status-success" aria-live="polite">
                      Sangat kuat
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="demo-password"
                      type={showPw ? "text" : "password"}
                      defaultValue="EOS@DemoStr0ng!"
                      aria-describedby="demo-pw-strength demo-pw-helper"
                      required
                      minLength={8}
                      className="w-full h-12 px-4 pr-12 text-base rounded-md bg-surface text-text-primary border border-surface-border placeholder:text-text-muted transition-all duration-eos-fast ease-eos-standard focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 disabled:bg-surface-sunken disabled:text-text-disabled disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      aria-pressed={showPw}
                      className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPw ? <Icon.EyeOff className="w-5 h-5" aria-hidden="true" /> : <Icon.Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                  <div id="demo-pw-strength" className="flex gap-1.5 pt-1" role="progressbar" aria-valuenow={4} aria-valuemin={0} aria-valuemax={4} aria-label="Kekuatan kata sandi">
                    {[0, 1, 2, 3].map((bar) => (
                      <div key={bar} className="h-1.5 flex-1 rounded-full bg-status-success transition-all duration-eos-fast" aria-hidden="true" />
                    ))}
                  </div>
                  <p id="demo-pw-helper" className="text-xs text-text-muted">
                    Minimal 8 karakter, kombinasi huruf besar-kecil, angka, dan simbol.
                  </p>
                </div>

                <div>
                  <Select
                    label="Role dalam Perusahaan"
                    placeholder="Pilih peran Anda..."
                    required
                    size="lg"
                    options={[
                      { value: "founder", label: "Founder / Pemilik" },
                      { value: "director", label: "Direktur" },
                      { value: "legal", label: "Kepala Legal" },
                      { value: "ops", label: "Operasional" },
                      { value: "other", label: "Lainnya" },
                    ]}
                    helperText="Peran Anda menentukan izin akses fitur EOS"
                  />
                </div>
              </div>
            </Card>
          </div>

          <aside className="lg:w-[24rem] xl:w-[26rem] shrink-0 space-y-6">
            <Card size="md" title="EOS Companion" subtitle="Asisten AI yang selalu kontekstual dengan work Anda">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-surface-divider">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center text-brand-primary">
                    <Icon.Sparkles className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-success border-2 border-surface" aria-label="Aktif" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">EOS Companion Aktif</p>
                  <p className="text-xs text-text-muted">Memantau 3 work • 2 insight baru</p>
                </div>
              </div>

              <ul role="list" className="space-y-2.5">
                <li className="rounded-lg border border-status-warning/20 bg-status-warning/5 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-7 h-7 rounded-md bg-status-warning/15 text-status-warning-fg flex items-center justify-center shrink-0" aria-hidden="true">
                      <Icon.Warning className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">SLA Bottleneck Terdeteksi</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        Work <span className="font-medium text-text-primary">#LH-GOLDEN-001</span> mendekati batas SLA 48 jam. Segera tugaskan advokat.
                      </p>
                      <button type="button" className="mt-2 text-xs font-semibold text-brand-primary hover:underline">
                        Lihat Detail Work →
                      </button>
                    </div>
                  </div>
                </li>
                <li className="rounded-lg border border-brand-primary/15 bg-brand-primary/5 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-7 h-7 rounded-md bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0" aria-hidden="true">
                      <Icon.Sparkles className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">Rekomendasi: Pakai Work Template</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        Ditemukan template <span className="font-medium">"Pendirian PT Startup"</span> — 12 kali digunakan, rata-rata selesai 18% lebih cepat.
                      </p>
                      <button type="button" className="mt-2 text-xs font-semibold text-brand-primary hover:underline">
                        Gunakan Template →
                      </button>
                    </div>
                  </div>
                </li>
                <li className="rounded-lg border border-surface-border bg-surface-sunken/40 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-7 h-7 rounded-md bg-status-info/15 text-status-info-fg flex items-center justify-center shrink-0" aria-hidden="true">
                      <Icon.Clock className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">Estimasi Proses</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        Pendirian PT standar: <span className="font-medium text-text-primary">14–21 hari kerja</span> tergantung kelengkapan dokumen.
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
            </Card>

            <Card
              size="md"
              title="Performance Overview"
              headerActions={
                <div role="tablist" aria-label="Periode overview performa" className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg border border-surface-border">
                  {(["7D", "30D", "90D"] as const).map((p) => {
                    const selected = tab === p;
                    return (
                      <Button
                        key={p}
                        size="xs"
                        variant={selected ? "solid" : "ghost"}
                        intent={selected ? "primary" : "neutral"}
                        onClick={() => setTab(p)}
                        role="tab"
                        aria-selected={selected}
                        aria-controls={`panel-hf-${p}`}
                        id={`tab-hf-${p}`}
                        className="min-w-[3rem]"
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>
              }
            >
              <div role="tabpanel" id={`panel-hf-${tab}`} aria-labelledby={`tab-hf-${tab}`} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                {[
                  { label: "Response Time", val: d.response.v, delta: d.response.d, pos: d.response.p, IconComp: Icon.Clock },
                  { label: "Work Completion", val: d.complete.v, delta: d.complete.d, pos: d.complete.p, IconComp: Icon.Check },
                  { label: "Bottleneck Resolved", val: d.bottleneck.v, delta: d.bottleneck.d, pos: d.bottleneck.p, IconComp: Icon.List },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="p-4 rounded-lg bg-surface-sunken/60 border border-surface-border hover:border-brand-primary/20 transition-colors"
                    role="group"
                    aria-labelledby={`hf-metric-${tab}-${m.label}`}
                  >
                    <p id={`hf-metric-${tab}-${m.label}`} className="text-sm text-text-muted mb-2 font-medium">
                      {m.label}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-text-primary tracking-tight tabular-nums">{m.val}</p>
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${m.pos ? "text-status-success-fg" : "text-status-danger-fg"}`}>
                        {m.pos ? <Icon.TrendUp className="w-4 h-4" aria-hidden="true" /> : <Icon.TrendDown className="w-4 h-4" aria-hidden="true" />}
                        {m.delta}
                      </span>
                    </div>
                    <div className="h-16 mt-4 bg-surface rounded-md flex items-end gap-0.5 p-2" role="img" aria-label={`Tren 7 titik data ${m.label}`}>
                      {[0.3, 0.5, 0.4, 0.7, 0.55, 0.8, 0.65].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm transition-colors ${h >= 0.7 ? "bg-status-success/70" : h >= 0.5 ? "bg-brand-primary/60" : "bg-brand-primary/30"} hover:opacity-100 opacity-80`}
                          style={{ height: `${h * 100}%` }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>

        <section aria-label="Ringkasan pekerjaan" className="mt-8 sm:mt-10 space-y-4">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">Ringkasan Pekerjaan</h2>
              <p className="text-sm text-text-secondary mt-1">Snapshot metrik kunci workspace Anda periode 30 hari terakhir.</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge intent="success">+12 work baru</StatusBadge>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4" role="list" aria-label="5 kartu ringkasan pekerjaan">
            <div role="listitem">
              <SummaryCard label="Total Pekerjaan" value={47} description="Semua status" intent="neutral" IconComp={Icon.List} delta={{ value: 12, positive: true }} />
            </div>
            <div role="listitem">
              <SummaryCard label="Sedang Diproses" value={18} description="Dalam eksekusi aktif" intent="warning" IconComp={Icon.Clock} delta={{ value: 3, positive: false, label: "+3 antrian" }} />
            </div>
            <div role="listitem">
              <SummaryCard label="Bottleneck" value={2} description="Perlu perhatian segera" intent="danger" IconComp={Icon.Warning} />
            </div>
            <div role="listitem">
              <SummaryCard label="Selesai" value={25} description="Berhasil diselesaikan" intent="success" IconComp={Icon.Check} delta={{ value: 8, positive: true }} />
            </div>
            <div role="listitem">
              <SummaryCard label="Response Time" value={4.8} suffix="h" description="Rata-rata 30 hari terakhir" intent="info" IconComp={Icon.Clock} delta={{ value: 15, positive: true, label: "Lebih cepat 15%" }} />
            </div>
          </div>
        </section>

        <section aria-label="Next Best Action — aksi prioritas tinggi" className="mt-8 sm:mt-10 rounded-xl overflow-hidden border border-surface-border shadow-token-sm">
          <div className="bg-gradient-to-r from-brand-primary/10 via-brand-primary/8 to-brand-secondary/10 border-b border-brand-primary/15 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-primary/15 flex items-center justify-center flex-shrink-0 text-brand-primary shadow-token-sm" aria-hidden="true">
                  <Icon.Lightning className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-1">
                    Next Best Action
                  </p>
                  <p className="font-semibold text-text-primary leading-snug truncate" aria-live="polite">
                    Tugaskan Advokat ke Pendirian PT ABC sekarang untuk menghindari pelanggaran SLA 48 jam.
                  </p>
                </div>
              </div>
              <Button
                intent="primary"
                variant="solid"
                size="lg"
                className="shadow-token-sm hover:shadow-token-md transition-shadow"
                rightIcon={<Icon.ChevronRight className="w-4 h-4" />}
              >
                Tugaskan Advokat Sekarang
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HighFidelityPrototype;
