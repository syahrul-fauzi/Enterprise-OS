
import type { CapabilityCommand } from '@repo/core-kernel/types';
import {
  ProvisionContainerInputSchema,
  UpdateStatusInputSchema,
  type ProvisionContainerInput,
} from '../contracts/tracking.contracts';
import { containerTrackingRepository } from '../repository/ContainerTrackingRepositoryInMemory';
import { safeRecordEvidence } from '@capabilities/work-core/implementation/utils/evidence.utils';

// Functional implementation
const provision: CapabilityCommand = {
  name: 'provision',
  capability: 'iot-container-tracking',
  description: 'Provisions a new container for tracking.',
  inputSchema: ProvisionContainerInputSchema,
  async execute(input: ProvisionContainerInput) {
    const { work_id, container_id } = input;

    const existing = await containerTrackingRepository.findByWorkId(work_id);
    if (existing) {
      throw new Error(`Work ID ${work_id} is already associated with a container.`);
    }

    const newData = {
      work_id,
      container_id,
      status: 'provisioned' as const,
      location_history: [],
      last_updated: new Date().toISOString(),
    };

    await containerTrackingRepository.save(newData);

    await safeRecordEvidence({
      work_id,
      tenant_id: 'system', // Placeholder
      actor_id: 'system', // Placeholder
      capability: 'iot-container-tracking',
      command: 'provision',
      workspace_id: null,
      timestamp: new Date().toISOString(),
      container_provisioned: true,
      container_id,
    });

    return { success: true, status: 'provisioned', data: newData };
  },
};

// Placeholder implementation
const updateStatus: CapabilityCommand = {
  name: 'updateStatus',
  capability: 'iot-container-tracking',
  description: 'Updates the status and location of a container.',
  inputSchema: UpdateStatusInputSchema,
  async execute(input: any) {
    console.log('Updating container status:', input);
    // TODO: Implement repository logic to find by container_id
    // TODO: Update location_history
    // TODO: Potentially update status
    // TODO: Record evidence
    return { success: true, status: 'in_transit' };
  },
};

export const commands = {
  provision,
  updateStatus,
};

// Register iot-container-tracking commands with canonical capability registry (aligns with work-core pattern)
export function registerIotContainerTrackingCapability() {
	// Enable command registration even in test/standalone environments to support test execution
	if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
		console.log("[IoT-Container-Tracking] Test/standalone environment detected - enabling safe auto-registration");
		// Register all commands in commands array for test environment
		import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
			if (capabilityRegistry) {
				Object.values(commands).forEach((command) => {
					capabilityRegistry.register(command);
				});
				// Register iot-container-tracking capability
				capabilityRegistry.registerCapability({
					id: "iot-container-tracking",
					name: "IoT Container Tracking",
					description: "Real-time tracking and provisioning for shipping containers via IoT sensors",
					providerTypes: ["system", "edge"],
					domainRestrictions: ["logistics", "supply-chain"],
					requiredAuthorizations: ["iot:provision", "tenant:iot_enabled"],
					riskLevel: "low",
					severity: "LOW",
					isAvailable: async () => true
				});
				console.log("[IoT-Container-Tracking] All test commands registered successfully");
			}
		});
		return;
	}
	// Register all commands in production environment - REUSE canonical @repo/core-kernel registry
	import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
		if (capabilityRegistry) {
			Object.values(commands).forEach((command) => {
				capabilityRegistry.register(command);
			});
			// Register iot-container-tracking capability
			capabilityRegistry.registerCapability({
				id: "iot-container-tracking",
				name: "IoT Container Tracking",
				description: "Real-time tracking and provisioning for shipping containers via IoT sensors",
				providerTypes: ["system", "edge"],
				domainRestrictions: ["logistics", "supply-chain"],
				requiredAuthorizations: ["iot:provision", "tenant:iot_enabled"],
				riskLevel: "low",
				severity: "LOW",
				isAvailable: async () => true
			});
			console.log("[IoT-Container-Tracking] IoT Container Tracking capability registered successfully - all commands added to canonical capability registry");
		}
	}).catch(err => {
		console.error("[IoT-Container-Tracking] Failed to register iot-container-tracking capability:", err);
	});
}