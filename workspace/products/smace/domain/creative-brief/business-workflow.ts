// @ts-nocheck
import type { CreativeBrief, CreativeSpecification, BriefStatus, ApprovalStatus } from "../../../contracts/creative-brief.contract.js";

export function generateCreativeSpecificationFromBrief(brief: CreativeBrief): CreativeSpecification {
  // Generasi spesifikasi dari brief customer (logika bisnis SMACE)
  // Mengambil nilai pertama dari array karena interface memerlukan single value (sesuai creative-brief.contract.ts)
  const defaultAngles = ['front', 'side', 'top'];
  const defaultBackgrounds = ['white', 'transparent'];
  const defaultFormats = ['png', 'webp'];
  const defaultResolutions = ['2048x2048', '1024x1024'];
  const defaultStyles = ['product-photography', 'ecommerce-ready'];
  
  return {
    id: `spec-${brief.id}`,
    briefId: brief.id,
    angles: defaultAngles,
    background: defaultBackgrounds[0],
    format: defaultFormats[0],
    resolution: defaultResolutions[0],
    style: defaultStyles[0],
    assetCount: brief.assetCount
  };
}

export function updateBusinessLifecycleState(brief: CreativeBrief, newStatus: BriefStatus): CreativeBrief {
  // Update state business lifecycle (bukan EOS Work state, tapi state bisnis SMACE)
  return {
    ...brief,
    status: newStatus
  };
}

export function processHumanApproval(brief: CreativeBrief, approval: ApprovalStatus): CreativeBrief {
  // Proses approval human reviewer (logika bisnis SMACE)
  switch(approval) {
    case 'APPROVED':
      return updateBusinessLifecycleState(brief, 'APPROVED');
    case 'REJECTED':
      return updateBusinessLifecycleState(brief, 'REJECTED');
    case 'REQUEST_REVISION':
      return updateBusinessLifecycleState(brief, 'REVISION');
    default:
      return brief;
  }
}

// In-memory store untuk brief (sementara, sebelum integrasi dengan EOS persistence)
const briefStore: Map<string, CreativeBrief> = new Map();

export function storeBrief(brief: CreativeBrief): void {
  briefStore.set(brief.id, brief);
}

export async function getBriefById(briefId: string): Promise<CreativeBrief | undefined> {
  // Mengambil brief dari store (SMACE-ARCH-001: memisahkan data akses dari logika bisnis)
  return briefStore.get(briefId);
}