import { NextResponse } from 'next/server';

// Root page for API server (localhost:3000)
// Provides professional status page that redirects to /api/health or shows API info
export default function RootPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 bg-gradient-to-r from-emerald-600 to-teal-600">
            <h1 className="text-3xl font-bold text-white">EOS API Server</h1>
            <p className="text-emerald-100 mt-1">Enterprise Operating System - Core API Layer</p>
          </div>
          
          {/* Content */}
          <div className="px-8 py-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Card */}
              <a href="/api/health" className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700 hover:border-emerald-500">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium">System Health</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">Check /api/health for full system status</p>
              </a>
              
              {/* API Docs placeholder */}
              <div className="block p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-white font-medium">API Documentation</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">Internal capabilities and endpoints</p>
              </div>
            </div>
            
            {/* System Info */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">System Components</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Database</span>
                  <span className="px-3 py-1 bg-emerald-900 text-emerald-300 text-sm rounded-full">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Infrastructure</span>
                  <span className="px-3 py-1 bg-emerald-900 text-emerald-300 text-sm rounded-full">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">All Endpoints</span>
                  <span className="px-3 py-1 bg-emerald-900 text-emerald-300 text-sm rounded-full">Available</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-8 py-4 bg-gray-950 border-t border-gray-800">
            <p className="text-center text-gray-500 text-sm">
              Enterprise Operating System v1.0.0 • All systems operational
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}