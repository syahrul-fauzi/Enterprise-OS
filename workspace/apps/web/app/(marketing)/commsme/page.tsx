"use client";

import { useState } from 'react';
import { CreateUMKMWorkModal } from '../../../../../capabilities/services-id/experience/components/CreateUMKMWorkModal';
import { useWorkspaceSession } from '@repo/presentation-hooks';

export default function CommsMePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { session } = useWorkspaceSession();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">CommsMe - Pendamping Hukum UMKM</h1>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Setup UMKM Baru
      </button>
      
      <CreateUMKMWorkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessionId={session?.sessionId || ""}
        tenantId={session?.tenantId || ""}
        workspaceId={session?.workspaceId || ""}
        actorId={session?.actorId || ""}
      />
    </div>
  );
}