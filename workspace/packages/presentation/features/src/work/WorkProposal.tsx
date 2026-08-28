'use client';

import React from 'react';
import type { WorkRealityModel } from '@repo/presentation-entities';
import type { IntentContract } from '../intent/types.js';

// Reusable WorkProposal building block - displays final work details before creation
// Implements EOS-FACE-FORMATION-001: Formation layer requirement for work preview
// Every block earns its existence: Formation → WorkProposal (per user's prinsip keras)
interface WorkProposalProps {
  workModel: WorkRealityModel;
  originIntent: IntentContract;
  onConfirmFormation: () => void;
  onReviseProposal: () => void;
  isSubmitting?: boolean;
  className?: string;
}

const WorkProposal: React.FC<WorkProposalProps> = ({
  workModel,
  originIntent,
  onConfirmFormation,
  onReviseProposal,
  isSubmitting = false,
  className = '',
}) => {
  const { identity, state, participants, inspections, coordination } = workModel;

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Proposal Pekerjaan yang Akan Dibentuk</h3>
        
        {/* Work Identity Section - core work information */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Detail Pekerjaan</h4>
          <h5 className="text-lg font-medium text-gray-900 mb-2">{identity.title}</h5>
          <p className="text-gray-600 mb-3">{identity.description}</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {identity.status}
            </span>
            <span className="text-xs text-gray-500">ID yang akan dihasilkan: {identity.workId}</span>
          </div>
        </div>

        {/* State & Next Action */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Status & Langkah Selanjutnya</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Status Saat Ini</p>
              <p className="text-gray-900 font-medium">{state.currentState}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Langkah Selanjutnya</p>
              <p className="text-gray-900 font-medium">{state.nextAction}</p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Pihak yang Terlibat</h4>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => (
              <span
                key={participant.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              >
                {participant.role === 'customer' ? '👤' : 
                 participant.role === 'professional' ? '⚖️' : 
                 participant.role === 'agent' ? '🤖' : '🎛️'}
                <span className="ml-2">{participant.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Initial Coordination Plan */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-500 mb-3">Rencana Awal Koordinasi</h4>
          <ul className="space-y-2">
            {coordination.slice(0, 3).map((action, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400">{idx + 1}.</span>
                <div>
                  <span className="font-medium text-gray-900">{action.actor}:</span>{' '}
                  <span className="text-gray-600">{action.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Origin Intent Provenance - F14/F15 compliance visibility */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-800 mb-2">Provenansi: Intent → Work</h4>
          <p className="text-sm text-amber-700 mb-1">Origin: {originIntent.expression}</p>
          <p className="text-xs text-amber-600">
            Relasi <code className="bg-amber-100 px-1 rounded">formedInto</code> akan tercatat dalam evidence chain work ini.
          </p>
        </div>
      </div>

      {/* Action buttons - Human confirmation for work formation */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={onReviseProposal}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Revisi Proposal
        </button>
        <button
          type="button"
          onClick={onConfirmFormation}
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962::0 016 12H2c0 2.983 1.153 5.702 3.042 7.709l2.958-2.418z"></path>
              </svg>
              Membentuk Pekerjaan...
            </>
          ) : (
            'Konfirmasi & Bentuk Pekerjaan Ini'
          )}
        </button>
      </div>
    </div>
  );
};

// Named export required for barrel exports in index.ts - critical for presentation system consistency
export { WorkProposal };