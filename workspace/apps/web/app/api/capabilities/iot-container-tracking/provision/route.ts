
import { NextResponse } from 'next/server';
import { capabilityRegistry } from '@repo/core-kernel/registry/capability-command-registry';
import { commands } from '../../../../../../../../workspace/capabilities/iot-container-tracking/implementation/commands/tracking.commands';
import { ProvisionContainerInputSchema } from '../../../../../../../../workspace/capabilities/iot-container-tracking/implementation/contracts/tracking.contracts';

// Register the command on-demand when the route is first accessed
capabilityRegistry.register(commands.provision);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedInput = ProvisionContainerInputSchema.parse(body);

    const result = await capabilityRegistry.invoke(
      'iot-container-tracking',
      'provision',
      validatedInput
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    // General error
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[API - iot-container-tracking/provision] Error: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}