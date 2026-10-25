/**
 * API Endpoint for device capability reporting (EDGE-DEVICE-001)
 * Menyediakan HTTP entrypoint untuk perangkat edge melaporkan kemampuan hardware dan firmware
 * AUDIT-005 compliant: hanya memanggil capability yang sudah ada, tidak membuat semantic authority baru
 * Mengikuti pola yang sama dengan /work/sync/route.ts untuk sinkronisasi edge
 */
import { NextResponse } from "next/server";
import { decodeWorkspaceSession } from '@repo/core-kernel/src/session/workspace-session.js';
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { safeRecordEvidence } from "../../../../../../../../workspace/capabilities/work-core/implementation/utils/evidence.utils";
import { MockWebSocketClient } from "../../../../../../../../apps/edge/websocket-adapter.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      deviceId, 
      sessionId, // Edge devices send session as payload, we decode it to get canonical workspace/tenant
      espIdfVersion,
      availableSramKB,
      i2sEnabled,
      supportsOpus,
      implementsVad,
      maxCpuFrequencyMHz
    } = body;

    // Canonical auth enforcement for edge devices: decode session to get verified workspace/tenant IDs
    const session = decodeWorkspaceSession(sessionId);
    if (!session?.workspaceId || !session?.tenantId) {
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid or missing workspace session',
        status: 'AUTH_INCONSISTENCY_RESOLVED'
      }, { status: 401 });
    }
    const { workspaceId, tenantId, actorId } = session;

    // Validasi input wajib sesuai kontrak edge-001-boundary-contract-v1
    if (!deviceId) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: deviceId is mandatory"
      }, { status: 400 });
    }

    // Jalankan validasi hardware ESP32-S3 menggunakan primitive yang sudah ada di websocket-adapter
    const hardwareValidation = MockWebSocketClient.validateEsp32s3HardwareCapabilities({
      espIdfVersion,
      availableSramKB,
      i2sEnabled,
      supportsOpus,
      implementsVad,
      maxCpuFrequencyMHz
    });

    if (!hardwareValidation.valid) {
      console.error(`[API /work/device-capabilities] ESP32-S3 validation failed for device ${deviceId}:`, hardwareValidation.errors);
      return NextResponse.json({
        success: false,
        error: "ESP32-S3 hardware capabilities validation failed",
        hardwareErrors: hardwareValidation.errors
      }, { status: 400 });
    }

    // Panggil capability existing di connector-ecosystem untuk mendaftarkan perangkat (tidak membuat logic baru)
    const registerResult = await capabilityRegistry.invoke(
      "connector-ecosystem",
      "registerDevice",
      {
        deviceId,
        deviceType: "esp32s3-voice",
        workspaceId,
        tenantId,
        sessionId,
        capabilities: {
          supportsOpus,
          implementsVad,
          i2sEnabled,
          espIdfVersion,
          availableSramKB,
          maxCpuFrequencyMHz
        },
        registeredAt: new Date().toISOString()
      }
    );

    // Rekam evidence ke evidence-registry sesuai prinsip verifiable execution (hanya append, tidak modify)
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "edge-device-registration",
      command: "register-esp32s3-device",
      work_id: `edge-device-${deviceId}`,
      tenant_id: tenantId,
      actor_id: deviceId,
      timestamp: new Date().toISOString(),
      actorType: "edge-device",
      metadata: {
        hardwareValidationPassed: true,
        reportedCapabilities: { supportsOpus, implementsVad, i2sEnabled, espIdfVersion, availableSramKB, maxCpuFrequencyMHz }
      },
      outcome: "COMPLETED"
    });

    // Kembalikan hasil ke perangkat edge
    return NextResponse.json({
      success: (registerResult as any).success,
      deviceId,
      registeredAt: new Date().toISOString(),
      hardwareValidationPassed: true,
      message: "ESP32-S3 device successfully registered with EOS control plane"
    }, { status: 201 });

  } catch (error) {
    console.error("[API /work/device-capabilities] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}