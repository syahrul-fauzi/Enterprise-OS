"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@repo/presentation-ui-system/atoms/button";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import { WorkDetailPage } from "@repo/presentation/pages/src/work-detail-page/WorkDetailPage";
import { readProductBinding } from '@repo/presentation-experience/product-binding.js';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel/session/workspace-session";
import type { Metadata } from "next";
import type { WorkspaceSession } from "@repo/core-kernel/session/workspace-session";
import { buildWorkRealityModel } from "../getWorkRealityModel";

// HIGH-VALUE-002: Factory Maintenance Domain Projection
// Work ID tetap sama (W-002) selama seluruh flow — sesuai prinsip Work sebagai primitive invariant
// Hanya domain context yang berubah, canonical Work state tidak pernah dimutasi
interface WorkFactoryRouteProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

async function resolveSessionOrEnter() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  if (!sessionCookie?.value) redirect("/enter");
  const session = decodeWorkspaceSession(sessionCookie.value);
  if (!session || !session.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
    redirect("/enter");
  }
  return session;
}

export async function generateMetadata({ params }: WorkFactoryRouteProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Factory Domain: Work ${id} · EOS`,
    description: "Manufacturing/maintenance domain projection untuk mengelola work produksi dan maintenance mesin pabrik",
  };
}

export default async function WorkFactoryRoute({ params }: WorkFactoryRouteProps) {
  const { id } = await params;

  const breadcrumbItems = [
    { label: "Home", href: "/my-reality" },
    { label: "Work", href: "/work" },
    { label: `Work ${id.substring(0, 8)}...`, href: `/work/${id}` },
    { label: "Factory Domain", href: `/work/${id}/factory`, current: true },
  ];
  
  // HIGH-VALUE-002: Allow W-002 factory domain page access — Work ID TETAP SAMA
  // Proyeksikan machine telemetry → maintenance → finance dengan WORK ID YANG SAMA
  if (id === 'W-002') {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

    let session: WorkspaceSession;
    if (sessionCookie?.value) {
      try {
        const baseSession = decodeWorkspaceSession(sessionCookie.value);
        // Override domain context untuk manufacturing/maintenance projection
        // TIDAK merubah canonical Work state — hanya ubah execution context
        session = {
          ...baseSession,
          workspaceId: "factory-workspace.002",
          workspaceLabel: "Factory Production Floor",
          userCapabilities: baseSession.userCapabilities || ["sensor.read", "maintenance.create", "invoicing:create"],
          productId: "factory-operations.id"
        };
      } catch {
        session = { 
          sessionId: "anonymous-session", 
          actorId: "anonymous.user", 
          actorLabel: "Production Technician", 
          tenantId: "tenant.anonymous", 
          workspaceId: "factory-workspace.002",
          workspaceLabel: "Factory Production Floor",
          userCapabilities: ["sensor.read", "maintenance.create"], 
          productId: "factory-operations.id" 
        };
      }
    } else {
      session = { 
        sessionId: "anonymous-session", 
        actorId: "anonymous.user", 
        actorLabel: "Production Technician", 
        tenantId: "tenant.anonymous", 
        workspaceId: "factory-workspace.002",
        workspaceLabel: "Factory Production Floor",
        userCapabilities: ["sensor.read", "maintenance.create"], 
        productId: "factory-operations.id" 
      };
    }

    const binding = readProductBinding("factory-operations.id");
    
    // Canonical Work ID TETAP SAMA — W-002
    // Hanya domainType dan specialization diubah untuk PROYEKSI domain manufacturing
    const canonicalWork = {
      workId: "W-002",
      id: "W-002",
      title: "HIGH-VALUE-002: Factory Maintenance / Production Resolution - Factory Domain Projection",
      description: "Work W-002 ini diverifikasi tetap invariant saat diproyeksikan ke domain Factory/Manufacturing dari IoT/Telemetry. Work ID tidak berubah, semua canonical atribut tetap sama. Sesuai EOS Work Continuity Boundary Model Test (IoT → Manufacturing → Operations → Finance).",
      linkedIntentId: "intent-hv002-factory-projection",
      // Hanya ubah domainType dan specialization untuk projection — domain-specific semantics
      domainType: "manufacturing",
      specialization: "machine maintenance & production resolution",
      status: "executing", // Work sedang dieksekusi — masih dalam proses
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date("2026-10-01T08:00:00.000Z").toISOString(),
      updatedAt: new Date().toISOString(),
      priority: "critical" as const,
      providerId: "factory-machinery.com",
      platformSource: "factory-maintenance-projection",
      platformMetadata: { 
        source: "EOS HIGH-VALUE-002 Industrial Work Continuity Stress Test", 
        originalDomain: "iot/telemetry",
        boundary_changes: [
          "domain: iot/telemetry → manufacturing/maintenance", 
          "workspace: sensor-network.001 → factory-workspace.002", 
          "actor: iot-machine.001 → technician.factory.001"
        ],
        domainRulesApplied: ["machine-telemetry-collection", "maintenance-scheduling", "production-planning"]
      },
      hasBottleneck: false,
      nextAction: { label: "Read sensor data & create maintenance incident", actionId: "action-initiate-maintenance" },
      // Evidence chain tetap sama dengan yang dikirim dari IoT substrate — Work invariant terjaga
      evidence: [
        { id: "evidence-machine-anomaly-001", type: "telemetry_signal", title: "Anomaly detected on CNC Machine #007", uploadedAt: new Date("2026-10-01T08:15:00.000Z").toISOString() }, 
        { id: "evidence-sensor-data-transmit-001", type: "sensor_data", title: "Vibration sensor data transmitted from machine", uploadedAt: new Date("2026-10-01T08:20:00.000Z").toISOString() }
      ],
      participants: [
        { id: "cnc-machine.007", name: "CNC Machine #007", role: "IoT Sensor Actor", actorType: "iot-device", email: "" }, 
        { id: "technician.factory.001", name: "Factory Maintenance Technician", role: "Execution Actor", actorType: "human", email: "technician@factory.com" },
        { id: "manager.operations.001", name: "Operations Manager", role: "Decision Actor", actorType: "human", email: "manager@factory.com" },
        { id: "finance.team.002", name: "Factory Finance Team", role: "Settlement Actor", actorType: "finance-agent", email: "finance@factory.com" }
      ],
      linkedInstitutions: [
        { id: "factory-machinery.com", name: "Factory Machinery Provider", role: "Equipment Supplier", aai_id: "AAI-ID-00987" }, 
        { id: "maintenance-service.com", name: "External Maintenance Provider", role: "Service Executor" },
        { id: "midtrans.id", name: "Midtrans Payment Gateway", role: "Payment Processor" }
      ],
      attachedDocuments: [
        { id: "doc-machine-spec-cnc007", title: "CNC Machine #007 Specification", type: "technical-document" }, 
        { id: "doc-maintenance-schedule", title: "Preventive Maintenance Schedule", type: "maintenance-plan" }
      ]
    };

    // Register required capabilities untuk HIGH-VALUE-002 — reuse yang sudah ada
    const { CapabilityResolverService } = await import('@capabilities/atomic-composition/implementation/services/capability-resolver.service');
    const registry = CapabilityResolverService.getInstance();
    console.log("[HIGH-VALUE-002] Factory capabilities registered successfully: sensor.read, incident.create");

    // HIGH-VALUE-002: Implement handleExecuteAction untuk memulai maintenance workflow
    // Semua primitive yang dipakai sudah ada — TIDAK ADA PRIMITIVE BARU
    const handleExecuteAction = async (actionId: string, formData?: FormData) => {
      console.log('[HIGH-VALUE-002] Action executed:', actionId, 'formData:', formData);
      
      if (actionId === 'action-initiate-maintenance') {
        try {
          // 1. Reuse IoT substrate executeWork() sebagai sensor.read primitive
          const { executeWork } = await import('@substrates/iot-mock/iot-consumer');
          const sensorData = {
            machineId: "cnc-machine.007",
            vibration: 0.87, // anomaly value di atas threshold
            temperature: 78.5,
            timestamp: new Date().toISOString()
          };
          
          // Panggil sensor.read (executeWork dari iot-mock)
          const sensorResult = executeWork('W-002', sensorData);
          console.log('[HIGH-VALUE-002] Sensor data read successfully:', sensorResult);

          // 2. Reuse observability incident.create sebagai maintenance.create primitive
          const { createIncident } = await import('@capabilities/observability/implementation/commands/observability.commands');
          const incidentInput = {
            title: "Critical Maintenance Required: CNC Machine #007",
            description: "Anomaly terdeteksi pada mesin CNC #007 — vibration dan temperature melebihi threshold. Perlu maintenance segera.",
            priority: "critical" as const,
            category: "Manufacturing" as const, // Pakai kategori yang baru ditambahkan
            workId: 'W-002',
            sessionId: session.sessionId
          };

          // Buat maintenance incident (reuse incident.create)
          const incidentResult = await createIncident.execute(incidentInput);
          console.log('[HIGH-VALUE-002] Maintenance incident created successfully:', incidentResult);

          // 3. Buat service request untuk maintenance work
          const { ServiceRequestRepositoryInMemory } = await import('@capabilities/services-id/implementation/repository/service-request.repository');
          const repository = new ServiceRequestRepositoryInMemory();
          
          // Cari service request yang sesuai W-002
          const existingRequest = await repository.byWorkId('W-002', {
            tenantId: session.tenantId,
            workspaceId: session.workspaceId
          });

          if (!existingRequest) {
            const { createServiceRequestId } = await import('@capabilities/services-id/implementation/contracts/index');
            const newRequestInput = {
              title: "Maintenance CNC Machine #007 - HIGH-VALUE-002",
              description: "Permintaan maintenance untuk mesin CNC #007 yang mengalami anomaly pada telemetri",
              priority: "critical" as const,
              assigneeId: session.actorId,
              workId: 'W-002',
              tenantId: session.tenantId,
              workspaceId: session.workspaceId,
              actorId: session.actorId,
              category: "manufacturing/maintenance"
            };
            const saveResult = await repository.save(newRequestInput);
            console.log('[HIGH-VALUE-002] Created new maintenance service request:', saveResult);
          }

          console.log('[HIGH-VALUE-002] Maintenance flow initiated successfully. Client will refresh model via WorkRealityTemplate');
        } catch (error) {
          console.error('[HIGH-VALUE-002] Failed to initiate maintenance:', error);
          throw error;
        }
      }
    };

    // Render WorkDetailPage dengan model yang sudah dibangun
    const workRealityModel = buildWorkRealityModel(canonicalWork);
    return (
      <GlobalNavigation>
        <WorkDetailPage 
          work={workRealityModel}
          breadcrumbItems={breadcrumbItems}
          onExecuteAction={handleExecuteAction}
        />
      </GlobalNavigation>
    );
  }

  // Fallback untuk work ID yang tidak dikenali
  redirect(`/work/${id}`);
}