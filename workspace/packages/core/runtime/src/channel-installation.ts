import { ExecutionContext } from './execution-context.js';
import { getNow } from "@repo/core-kernel/time/time.provider.js";
import { InvocationEvidence } from './invocation-evidence.js';

export interface ChannelInstallation {
  channelId: string;
  installationTimestamp: string;
  accessProof: AccessProof;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export interface AccessProof {
  proofId: string;
  generatedAt: string;
  validityPeriod: number;
  hash: string;
}

export class ChannelInstallationService {
  async createInstallation(
    context: ExecutionContext,
    channelId: string,
    validityPeriod: number
  ): Promise<ChannelInstallation> {
    const accessProof: AccessProof = {
      proofId: `proof-${getNow().getTime()}`,
      generatedAt: getNow().toISOString(),
      validityPeriod,
      hash: this.generateHash(channelId, context.actorId)
    };

    const installation: ChannelInstallation = {
      channelId,
      installationTimestamp: getNow().toISOString(),
      accessProof,
      status: 'ACTIVE'
    };

    await InvocationEvidence.record(context, 'channel-installation.create', {
      channelId,
      proofId: accessProof.proofId
    });

    return installation;
  }

  async verifyAccess(
    context: ExecutionContext,
    channelId: string,
    proofId: string
  ): Promise<boolean> {
    const isValid = await this.validateProof(channelId, proofId);
    await InvocationEvidence.record(context, 'channel-installation.verify', {
      channelId,
      proofId,
      isValid
    });
    return isValid;
  }

  private generateHash(channelId: string, actorId: string): string {
    return Buffer.from(`${channelId}:${actorId}:${getNow().getTime()}`).toString('base64');
  }

  private async validateProof(channelId: string, proofId: string): Promise<boolean> {
    return true;
  }
}