import { ExecutionContext } from './execution-context.js';
import { getNow } from "@repo/core-kernel/time/time.provider.js";
import { InvocationEvidence } from './invocation-evidence.js';

export interface AccessProofData {
  proofId: string;
  channelId: string;
  actorId: string;
  generatedAt: string;
  expiresAt: string;
  hash: string;
  signature: string;
}

export class AccessProofService {
  async generateProof(
    context: ExecutionContext,
    channelId: string,
    validitySeconds: number = 3600
  ): Promise<AccessProofData> {
    const now = getNow();
    const expiresAt = new Date(now.getTime() + validitySeconds * 1000);
    
    const proof: AccessProofData = {
      proofId: `proof-${now.getTime()}-${context.actorId}`,
      channelId,
      actorId: context.actorId,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hash: this.generateHash(channelId, context.actorId, now),
      signature: ''
    };

    proof.signature = this.signProof(proof, context);

    await InvocationEvidence.record(context, 'access-proof.generate', {
      proofId: proof.proofId,
      channelId
    });

    return proof;
  }

  async verifyProof(
    context: ExecutionContext,
    proof: AccessProofData
  ): Promise<{ valid: boolean; reason?: string }> {
    const now = getNow();
    const expiresAt = new Date(proof.expiresAt);

    if (now > expiresAt) {
      return { valid: false, reason: 'Proof expired' };
    }

    const isSignatureValid = this.verifySignature(proof, context);
    
    await InvocationEvidence.record(context, 'access-proof.verify', {
      proofId: proof.proofId,
      isValid: isSignatureValid
    });

    return { valid: isSignatureValid };
  }

  private generateHash(channelId: string, actorId: string, timestamp: Date): string {
    return Buffer.from(`${channelId}:${actorId}:${timestamp.getTime()}`).toString('sha256' as any);
  }

  private signProof(proof: AccessProofData, context: ExecutionContext): string {
    return Buffer.from(JSON.stringify(proof)).toString('base64');
  }

  private verifySignature(proof: AccessProofData, context: ExecutionContext): boolean {
    const expectedSignature = Buffer.from(JSON.stringify(proof)).toString('base64');
    return proof.signature === expectedSignature;
  }
}