'use client';

import React from 'react';
import type { IntentContract } from './types';

// Reusable IntentUnderstandingPreview building block - displays EOS's semantic understanding of the intent
// Implements F5: Human can inspect understanding before work creation
// Implements F4: Resolution generates objective, domain, expected outcome fields
interface IntentUnderstandingPreviewProps {
  intent: IntentContract;
  onConfirm: () => void;
  onRevise: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export const IntentUnderstandingPreview: React.FC<IntentUnderstandingPreviewProps> = ({
  intent,
  onConfirm,
  onRevise,
  isSubmitting = false,
  className = '',
}) => {
  const { resolution, expression } = intent;

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pemahaman EOS atas Kebutuhan Anda</h3>
        
        {/* Original user expression - shows raw input for verification */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Yang Anda sampaikan:</h4>
          <p className="text-gray-900 bg-white p-3 rounded border border-gray-200">"{expression}"</p>
        </div>

        {/* Resolved intent fields - EOS's semantic understanding */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Tujuan Utama:</h4>
            <p className="text-gray-900 font-medium" data-testid="intent-resolved-objective">{resolution.objective}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Konteks:</h4>
            <p className="text-gray-900" data-testid="intent-resolved-context">{resolution.context}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Hasil yang Diharapkan:</h4>
            <p className="text-gray-900">{resolution.expectedOutcome}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Tipe Pekerjaan:</h4>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {resolution.workType}
            </span>
          </div>
        </div>

        {/* Confidence indicator - transparency in AI/automated resolution */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Keyakinan pemahaman:</span>
            <span className="text-sm font-medium text-green-700">{(resolution.confidence * 100).toFixed(0)}% cocok</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${resolution.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons - F6: Human confirms formation or can revise */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={onRevise}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Revisi Permintaan
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 016 12H2c0 2.983 1.153 5.702 3.042 7.709l2.958-2.418z"></path>
              </svg>
              Membuat Pekerjaan...
            </>
          ) : (
            'Konfirmasi & Mulai Pekerjaan Ini'
          )}
        </button>
      </div>
    </div>
  );
};

export default IntentUnderstandingPreview;