"use client";

import React from "react";

export function LowFidelityPrototype() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <a href="#lowfi-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow">
        Lewati ke konten
      </a>

      <div id="lowfi-content" className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white border-2 border-dashed border-gray-400 rounded p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="w-20 h-8 bg-gray-200 rounded border border-gray-300 flex items-center justify-center text-xs text-gray-500">EOS LOGO</div>
              <nav className="space-x-4 text-sm">
                <span className="bg-gray-200 px-3 py-1.5 rounded">My Reality</span>
                <span className="text-gray-400 px-3 py-1.5">My Work</span>
                <span className="text-gray-400 px-3 py-1.5">People</span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-semibold">+ New Intent</span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full border border-gray-300 text-xs text-gray-500 flex items-center justify-center">🌙</div>
              <div className="w-10 h-10 bg-gray-300 rounded-full border border-gray-400 flex items-center justify-center text-xs text-gray-600">USER</div>
            </div>
          </div>
        </header>

        <section className="bg-gray-100 border-2 border-dashed border-gray-300 rounded p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">STEP INDICATOR — 2 / 3</div>
              <div className="w-full max-w-md h-2 bg-gray-300 rounded overflow-hidden flex gap-1">
                <div className="w-1/3 bg-green-500 rounded-l" />
                <div className="w-1/3 bg-blue-500" />
                <div className="w-1/3 bg-gray-200 rounded-r" />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Breadcrumb: Home / Intent / Refinement
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border-2 border-dashed border-gray-400 rounded p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">PAGE HEADER</div>
              <div className="w-64 h-8 bg-gray-200 rounded mb-2" />
              <div className="w-full max-w-lg h-4 bg-gray-100 rounded" />
            </div>

            <div className="bg-white border-2 border-dashed border-gray-400 rounded p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">FORM SECTION — Intent Input</div>
              <div className="space-y-3">
                <div className="h-3 w-24 bg-gray-200 rounded" />
                <div className="h-32 w-full border-2 border-gray-300 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                  [ TextArea: Jelaskan kebutuhan Anda... ]
                </div>
                <div className="h-3 w-full max-w-sm bg-gray-100 rounded" />
                <div className="h-11 w-48 bg-blue-500 rounded text-white text-sm flex items-center justify-center font-semibold">
                  [ SUBMIT BUTTON ]
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-dashed border-gray-400 rounded p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">CARD — Work Summary (5 cols)</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="h-32 border border-gray-300 rounded bg-gray-50 p-3 space-y-2">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">🗂</div>
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                    <div className="h-7 w-12 bg-gray-300 rounded" />
                    <div className="h-3 w-full bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border-2 border-dashed border-gray-400 rounded p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">WORK LIST — Priority Items</div>
              <div className="space-y-2">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-gray-300 rounded bg-gray-50">
                    <div className="w-1.5 h-16 bg-amber-400 rounded-full" />
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs">📋</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-4 w-3/4 bg-gray-300 rounded" />
                      <div className="h-3 w-1/2 bg-gray-200 rounded" />
                      <div className="h-3 w-2/3 bg-gray-100 rounded" />
                    </div>
                    <div className="text-xs px-2 py-0.5 bg-gray-200 rounded">STATUS</div>
                    <div className="w-5 h-5 text-gray-400">→</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white border-2 border-dashed border-gray-400 rounded p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">EOS COMPANION (AI)</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">🤖</div>
                <div className="flex-1">
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                  <div className="h-2 w-12 bg-green-200 rounded mt-1" />
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                  💡 Insight #1
                  <div className="h-3 w-full bg-gray-200 rounded mt-1" />
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                  ⚠️ Insight #2
                  <div className="h-3 w-3/4 bg-gray-200 rounded mt-1" />
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-dashed border-gray-400 rounded p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">PERFORMANCE METRICS</div>
              <div className="flex gap-1 mb-2">
                <div className="px-2 py-1 bg-gray-200 rounded text-xs">7D</div>
                <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">30D</div>
                <div className="px-2 py-1 bg-gray-200 rounded text-xs">90D</div>
              </div>
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
                    <div className="flex items-baseline gap-2">
                      <div className="h-6 w-14 bg-gray-300 rounded" />
                      <div className="h-3 w-12 bg-green-100 rounded text-green-700 text-xs flex items-center justify-center">+X%</div>
                    </div>
                    <div className="h-8 w-full mt-2 bg-gray-100 rounded flex items-end gap-0.5 p-1">
                      {[30,50,40,70,55,80,65].map((h,idx) => (
                        <div key={idx} className="flex-1 bg-gray-300 rounded-sm" style={{height: `${h}%`}} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="bg-amber-50 border-2 border-amber-300 rounded p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-2">WIREFRAME LEGEND</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-amber-900">
            <div>▢ Dashed = Container Area</div>
            <div>■ Gray Rect = Text</div>
            <div>📋 Icon Placeholder</div>
            <div>[ TXT ] = Component Slot</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LowFidelityPrototype;
