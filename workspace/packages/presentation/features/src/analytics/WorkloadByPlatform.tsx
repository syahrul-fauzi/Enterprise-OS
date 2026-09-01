"use client";

import React from 'react';

const platformData = [
  { name: 'GitHub', value: 3, percentage: 25, color: 'bg-purple-500' },
  { name: 'Shopee', value: 2, percentage: 17, color: 'bg-orange-500' },
  { name: 'Zendesk', value: 4, percentage: 33, color: 'bg-green-500' },
  { name: 'Internal', value: 3, percentage: 25, color: 'bg-sky-500' },
];

const totalWork = platformData.reduce((sum, item) => sum + item.value, 0);

export function WorkloadByPlatform() {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
      <h3 className="text-base font-bold text-white mb-4">Workload by Platform</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut Chart Placeholder */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-slate-700"></div>
          <div className="absolute inset-2 rounded-full bg-slate-800 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{totalWork}</p>
              <p className="text-xs text-slate-400">Total Work</p>
            </div>
          </div>
          {/* Note: Actual chart SVG would be rendered here */}
        </div>

        {/* Legend */}
        <div className="w-full space-y-3">
          {platformData.map((platform) => (
            <div key={platform.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${platform.color}`}></span>
                <span className="text-slate-300">{platform.name}</span>
              </div>
              <div className="font-semibold text-white">
                {platform.value} ({platform.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}