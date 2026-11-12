// SMACE-ARCH-004: Business production lifecycle layer - menangani customer brief dan spesifikasi
// Ditambah quality & brand validation sesuai 8-langkah vertical slice
import { CreativeBrief, BriefStatus } from "../../contracts/creative-brief.contract.js";

export function processCustomerBrief(rawBrief: any): CreativeBrief {
  // Transformasi customer input menjadi spesifikasi terverifikasi (Langkah 1-2: Customer Brief → Creative Specification)
  const validatedBrief: CreativeBrief = {
    id: `brief-${rawBrief.id}`,
    tenantId: rawBrief.tenantId,
    workspaceId: rawBrief.workspaceId,
    customerId: rawBrief.customerId,
    productData: rawBrief.productImages,
    brandGuidelines: rawBrief.brandGuidelines,
    targetMarketplace: rawBrief.targetMarketplace,
    requiredAssets: rawBrief.assetCount || 5,
    specifications: {
      angles: rawBrief.specifications?.angles || ['front', 'side', 'top'],
      background: rawBrief.specifications?.background || '#FFFFFF',
      format: rawBrief.specifications?.format || 'PNG',
      resolution: rawBrief.specifications?.resolution || '4096x4096',
      style: rawBrief.specifications?.style || 'product-photography'
    },
    selectedProvider: rawBrief.selectedProvider || 'comfyui',
    requiredProviderType: rawBrief.requiredProviderType || 'comfyui', // SMACE-008-W003: Mendukung pemilihan provider tipe "adobe-firefly"
    budget: rawBrief.budget || 1500000, // Default budget IDR 1.5jt untuk product photography
    status: BriefStatus.DRAFT,
    createdAt: new Date().toISOString()
  };

  return validatedBrief;
}

export function validateBriefCompliance(brief: CreativeBrief): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!brief.brandGuidelines) issues.push('Brand guidelines tidak ditemukan');
  if (brief.requiredAssets > 20) issues.push('Jumlah aset melebihi batas maksimum 20');
  if (!['comfyui', 'adobe', 'adobe-firefly'].includes(brief.selectedProvider)) issues.push('Provider tidak didukung');
  if (!brief.budget || brief.budget <= 0) issues.push('Budget tidak valid');
  if (!brief.workspaceId) issues.push('workspaceId wajib diisi untuk tenant isolation');
  if (!brief.requiredProviderType || !['comfyui', 'adobe', 'adobe-firefly'].includes(brief.requiredProviderType)) {
    issues.push('requiredProviderType harus salah satu dari: comfyui, adobe, adobe-firefly');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// SMACE-ARCH-004: Langkah 5 - Quality & Brand Validation
export function validateOutputAgainstBrief(brief: CreativeBrief, generatedAssets: string[]): { 
  passed: boolean; 
  technicalIssues: string[]; 
  brandIssues: string[] 
} {
  const technicalIssues: string[] = [];
  const brandIssues: string[] = [];

  // Cek jumlah aset sesuai requirement
  if (generatedAssets.length < brief.requiredAssets) {
    technicalIssues.push(`Jumlah aset dihasilkan (${generatedAssets.length}) kurang dari requirement (${brief.requiredAssets})`);
  }

  // Cek brand guideline compliance (contoh: background color sesuai brand)
  if (brief.brandGuidelines?.requiredBackgroundColor && 
      brief.specifications.background !== brief.brandGuidelines.requiredBackgroundColor) {
    brandIssues.push('Background color tidak sesuai brand guideline');
  }

  return {
    passed: technicalIssues.length === 0 && brandIssues.length === 0,
    technicalIssues,
    brandIssues
  };
}

// SMACE-ARCH-004: Langkah 6 - Human Approval flow (Customer/reviewer menyetujui/menolak/revisi)
import { evidenceRegistryService } from "../../../../capabilities/evidence-registry/implementation/services/index.js"; // Reuse EOS Evidence Registry

export async function processApproval(
  brief: CreativeBrief, 
  actorId: string, 
  decision: 'approved' | 'rejected' | 'revision_requested',
  comments?: string
): Promise<{ 
  success: boolean; 
  newStatus: BriefStatus;
  approvalRecord: any
}> {
  // Validasi actor yang bisa memberikan persetujuan (hanya customer atau reviewer yang terotorisasi)
  const authorizedActors = [brief.customerId, `reviewer:${brief.tenantId}:creative`];
  if (!authorizedActors.includes(actorId)) {
    throw new Error(`Actor ${actorId} tidak memiliki otoritas untuk menyetujui brief ini`);
  }

  // Simpan record approval yang akan disimpan
  const approvalRecord = {
    actorId,
    decision,
    comments: comments || '',
    timestamp: new Date().toISOString()
  };

  // Catat approval ke EOS Evidence Registry untuk audit trail
  await evidenceRegistryService.record({
    workId: brief.canonicalWorkId!,
    type: 'brief.approval.processed',
    actorId,
    payload: approvalRecord,
    timestamp: approvalRecord.timestamp
  });

  // Update status brief berdasarkan decision
  let newStatus: BriefStatus;
  switch(decision) {
    case 'approved':
      newStatus = BriefStatus.APPROVED;
      break;
    case 'rejected':
      newStatus = BriefStatus.REJECTED;
      break;
    case 'revision_requested':
      newStatus = BriefStatus.QUALITY_CHECK; // Kembali ke quality check untuk revisi
      break;
    default:
      throw new Error(`Decision tidak valid: ${decision}`);
  }

  // Update brief state
  brief.status = newStatus;
  brief.updatedAt = new Date().toISOString();
  if (!brief.approvalHistory) brief.approvalHistory = [];
  brief.approvalHistory.push(approvalRecord);

  // Catat approval ke EOS Evidence Registry - prinsip EOS: setiap perubahan harus punya bukti
  await evidenceRegistry.record({
    workId: brief.canonicalWorkId!,
    type: 'brief.approval.processed',
    actorId: `smace:approval-system:${actorId}`,
    payload: {
      briefId: brief.id,
      previousStatus: BriefStatus.QUALITY_CHECK,
      newStatus,
      decision,
      comments
    },
    timestamp: approvalRecord.timestamp
  });

  return {
    success: true,
    newStatus,
    approvalRecord
  };
}