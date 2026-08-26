"use client";

import React, { useState, useEffect } from "react";
// Import from shared packages - ALL logic/UI ada di presentation layer, route hanya komposisi
import { WorkRealitySurface, WorkRealityModel } from "@repo/presentation-experience";
import { deriveWorkRealityModel } from "@repo/presentation-features";
import { WorkRealityLoading } from "@repo/presentation-ui-system";
import type { CaseAggregate } from "@capabilities/legal-case/implementation/contracts/index.js";
import type { CommunicationEvent } from "@capabilities/communication/implementation/contracts/communication.contracts.js";
// Import LawyersHub product context - HANYA domain configuration, tidak ada UI logic
import { provideLawyersHubContext, LawyersHubProductContext } from "@products/lawyershub";

// THIN ROUTE SHELL: apps/web hanya route → composition → product experience
// Semua state derivation dan UI logic sudah diekstrak ke packages/presentation
// case-014 tetap berfungsi sama persis sebagai regression specimen
export default function CasePage({ params }: { params: { id: string } }) {
  const [model, setModel] = useState<WorkRealityModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [productContext, setProductContext] = useState<LawyersHubProductContext | null>(null);

  useEffect(() => {
    const fetchWorkData = async () => {
      try {
        // Route HANYA melakukan fetch data mentah - semua derivation di shared feature
        const caseResp = await fetch(`/api/cases/${params.id}`);
        const commsResp = await fetch(`/api/communication/list?work_id=${params.id}`);
        
        if (caseResp.ok && commsResp.ok) {
          const work: CaseAggregate = await caseResp.json();
          const communications: CommunicationEvent[] = await commsResp.json().then(r => r.events || []);
          
          // Derive model sekali di route, kirim ke shared component
          const workModel = deriveWorkRealityModel(work, communications);
          setModel(workModel);
          
          // Load product context hanya untuk domain configuration
          const ctx = provideLawyersHubContext(new Headers());
          setProductContext(ctx);
        }
      } catch (err) {
        console.error("[CasePage] Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkData();
  }, [params.id]);

  if (loading) {
    // Shared loading state sudah diekstrak ke @repo/presentation-ui-system untuk reuse
    return <WorkRealityLoading />;
  }

  if (!model) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="border rounded-2xl bg-white p-8 shadow-sm text-center">
            <h1 className="text-2xl font-bold">Work not found</h1>
            <p className="mt-2 text-slate-600">The work ID you're looking for doesn't exist.</p>
          </div>
        </div>
      </main>
    );
  }

  // HANYA composition: route menentukan perspective + product context, shared component yang merender semua UI
  // ONE MODEL → MANY PERSPECTIVES + ONE BLOCK → MANY PRODUCTS
  // LawyersHub sebagai product domain menggunakan perspective 'professional' default untuk lawyer users
  // Branding diambil dari product context, tidak ada duplikasi UI infrastructure
  const defaultPerspective = productContext?.productId === "lawyershub" ? "professional" : "operator";
  
  return <WorkRealitySurface model={model} perspective={defaultPerspective} />;
}