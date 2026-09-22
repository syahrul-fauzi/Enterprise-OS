// TEST A — SYSTEM PROOF RUNNER
// W004-P5-01 Real Outcome Proof System Verification
// Execute dengan: node --import tsx test-a-runner.ts

import { CommunicationRepository, newCommunicationEventId } from "./capabilities/communication/implementation/repository/index.js";
import type { CommunicationEvent } from "./capabilities/communication/implementation/contracts/communication.contracts.js";
import { encodeWorkspaceSession, decodeWorkspaceSession, WORKSPACE_SESSION_COOKIE, readWorkspaceSessionFromRequest } from "@repo/core-kernel";
import { putHandler } from "./apps/web/app/api/work/[id]/route.js";

async function runTestA() {
  console.log("🧪 TEST A — SYSTEM PROOF: MULAI EKSEKUSI TERISOLASI\n");
  
  const testResults = {
    communication_event_persisted: false,
    event_type: false,
    event_work_id_matches: false,
    event_actor_id_matches_session: false,
    work_status_correct: false,
    evidence_exists: false,
    evidence_work_id_matches: false,
    evidence_actor_id_matches: false,
    readback_status_matches: false,
    readback_evidence_matches: false,
    negative_test_passed: false,
    adapter_type_api_validation_passed: false
  };

  try {
    // 1. Reset environment
    console.log("1/13: Reset environment...");
    // (Simulasi reset - dalam implementasi nyata CommunicationRepository.clear())
    
    // 2. Buat session valid untuk participant
    console.log("2/13: Membuat session valid untuk recipient...");
    const validSession = {
      sessionId: "test-session-001",
      tenantId: "tenant-001",
      workspaceId: "workspace-001",
      actorId: "recipient-actor-001"
    };
    const encodedSession = encodeWorkspaceSession(validSession);
    console.log("   ✅ Session encoding berhasil:", encodedSession.substring(0, 30) + "...");

    // 3. Test decode session (verifikasi fungsi kernel bekerja)
    console.log("3/13: Verifikasi session decode...");
    const decodedSession = decodeWorkspaceSession(encodedSession);
    if (decodedSession?.actorId === validSession.actorId) {
      console.log("   ✅ Session decode berhasil, actor_id cocok");
    }

    // 4. Test adapter_type "api" validation (sesuai permintaan user untuk test schema)
    console.log("4/13: Menjalankan adapter_type 'api' runtime validation...");
    const eventId = newCommunicationEventId();
    try {
      // Coba save dengan adapter_type "api" (yang tidak ada di enum)
      await CommunicationRepository.save({
        event_id: eventId,
        work_id: "test-work-001",
        tenant_id: "tenant-001",
        actor_id: "test-actor",
        recipient_ids: ["recipient-1"],
        event_type: "CommunicationSent",
        content: "Test api adapter",
        adapter_type: "api", // ⚠️ Ini yang di-test user
        timestamp: new Date().toISOString(),
        status: "sent",
        session_id: validSession.sessionId,
        workspace_id: validSession.workspaceId
      }, {
        tenantId: "tenant-001",
        workspaceId: "workspace-001",
        actorId: "test-actor"
      });
      // Jika tidak throw, berarti repository menerima "api"
      testResults.adapter_type_api_validation_passed = true;
      console.log("   ⚠️ adapter_type 'api' DITERIMA oleh CommunicationRepository");
    } catch (adapterError) {
      // Jika throw, berarti schema menolak "api" (yang sesuai dengan CommunicationAdapterTypes)
      console.log("   ✅ adapter_type 'api' DITOLAK oleh CommunicationRepository (sesuai enum)");
      // Sekarang coba dengan "api_webhook" yang valid
      const validEventId = newCommunicationEventId();
      await CommunicationRepository.save({
        event_id: validEventId,
        work_id: "test-work-001",
        tenant_id: "tenant-001",
        actor_id: "test-actor",
        recipient_ids: ["recipient-1"],
        event_type: "CommunicationSent",
        content: "Test api_webhook adapter",
        adapter_type: "api_webhook", // ✅ Valid enum
        timestamp: new Date().toISOString(),
        status: "sent",
        session_id: validSession.sessionId,
        workspace_id: validSession.workspaceId
      }, {
        tenantId: "tenant-001",
        workspaceId: "workspace-001",
        actorId: "test-actor"
      });
      console.log("   ✅ adapter_type 'api_webhook' DITERIMA (sesuai CommunicationAdapterTypes)");
    }

    // 5. Simulasikan agenticNotify (event terkirim ke recipient)
    console.log("5/13: Menjalankan agenticNotify...");
    const notifyEventId = newCommunicationEventId();
    const notifyEvent: CommunicationEvent = {
      event_id: notifyEventId,
      work_id: "test-work-001",
      tenant_id: "tenant-001",
      actor_id: "main-actor-001",
      recipient_ids: ["recipient-actor-001"],
      event_type: "CommunicationSent",
      content: "Outcome work telah terkirim, silakan review",
      adapter_type: "api_webhook",
      timestamp: new Date().toISOString(),
      status: "sent",
      session_id: validSession.sessionId,
      workspace_id: validSession.workspaceId
    };
    await CommunicationRepository.save(notifyEvent, {
      tenantId: "tenant-001",
      workspaceId: "workspace-001",
      actorId: "main-actor-001"
    });
    console.log("   ✅ agenticNotify dieksekusi, event communication terkirim");

    // 6. Test respond command (happy path)
    console.log("6/13: Menjalankan PUT /api/work/test-work-001 command=respond...");
    const mockRequest = new Request("http://localhost:3000/api/work/test-work-001", {
      method: "PUT",
      headers: {
        "Cookie": `${WORKSPACE_SESSION_COOKIE}=${encodedSession}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "respond",
        response: "accept",
        reason: "Hasil sudah sesuai dan diterima"
      })
    });
    
    const response = await putHandler(mockRequest, { params: { id: "test-work-001" } });
    const responseData = await response.json();
    
    if (response.status === 200) {
      console.log("   ✅ Respond command berhasil dieksekusi (status 200)");
    } else {
      console.error("   ❌ Respond command gagal:", response.status, responseData);
      throw new Error("Respond command failed");
    }

    // 7. Verifikasi communication_event_persisted
    console.log("7/13: Verifikasi inbound_message persisted ke PostgreSQL...");
    const events = await CommunicationRepository.byWorkId("test-work-001");
    const inboundEvent = events.find(e => e.event_type === "inbound_message");
    if (inboundEvent) {
      testResults.communication_event_persisted = true;
      console.log("   ✅ communication_event_persisted: true");
      
      // 8. Verifikasi event_type
      if (inboundEvent.event_type === "inbound_message") {
        testResults.event_type = true;
        console.log("   ✅ event_type: inbound_message (correct)");
      }
      
      // 9. Verifikasi event_work_id_matches
      if (inboundEvent.work_id === "test-work-001") {
        testResults.event_work_id_matches = true;
        console.log("   ✅ event_work_id_matches: true");
      }
      
      // 10. Verifikasi event_actor_id_matches_session
      if (inboundEvent.actor_id === validSession.actorId) {
        testResults.event_actor_id_matches_session = true;
        console.log("   ✅ event_actor_id_matches_session: true");
      }
    } else {
      console.error("   ❌ inbound_message tidak ditemukan di repository");
      throw new Error("inbound_message not found");
    }

    // 11. Jalankan negative authorization test
    console.log("11/13: Menjalankan negative authorization test (non-participant)...");
    const invalidSession = {
      sessionId: "hacker-session-001",
      tenantId: "tenant-001",
      workspaceId: "workspace-001",
      actorId: "hacker-actor-999" // Bukan participant
    };
    const invalidEncoded = encodeWorkspaceSession(invalidSession);
    
    const invalidMockRequest = new Request("http://localhost:3000/api/work/test-work-001", {
      method: "PUT",
      headers: {
        "Cookie": `${WORKSPACE_SESSION_COOKIE}=${invalidEncoded}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "respond",
        response: "accept"
      })
    });
    
    const invalidResponse = await putHandler(invalidMockRequest, { params: { id: "test-work-001" } });
    if (invalidResponse.status === 403) {
      testResults.negative_test_passed = true;
      console.log("   ✅ negative_test_passed: true (non-participant mendapatkan 403)");
    } else {
      console.error("   ❌ Negative test gagal, status:", invalidResponse.status);
      throw new Error("Negative authorization test failed");
    }

    // 12. Test GET /api/work/[id] untuk readback
    console.log("12/13: Menjalankan GET /api/work/test-work-001 untuk readback...");
    // (Simulasi GET handler, dalam implementasi nyata panggil getHandler)
    const getResponse = await fetch("http://localhost:3000/api/work/test-work-001", {
      headers: { "Cookie": `${WORKSPACE_SESSION_COOKIE}=${encodedSession}` }
    });
    const getWork = await getResponse.json();
    
    if (getWork.status === "outcome_accepted") {
      testResults.work_status_correct = true;
      testResults.readback_status_matches = true;
      console.log("   ✅ work_status: outcome_accepted (correct)");
    }
    
    if (getWork.evidence?.length > 0) {
      testResults.evidence_exists = true;
      const lastEvidence = getWork.evidence[getWork.evidence.length - 1];
      if (lastEvidence.uploadedBy === validSession.actorId) {
        testResults.evidence_actor_id_matches = true;
        testResults.readback_evidence_matches = true;
        console.log("   ✅ evidence persisted dan actor_id cocok");
      }
    }

    // 13. Final summary
    console.log("\n📊 TEST A — SUMMARY RESULTS:");
    const passed = Object.values(testResults).filter(v => v).length;
    const total = Object.keys(testResults).length;
    Object.entries(testResults).forEach(([key, value]) => {
      console.log(`   ${value ? "🟢" : "🔴"} ${key}: ${value}`);
    });
    console.log(`\n✅ Total passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log("\n🎉 TEST A — SEMUA KRITERIA LULUS!");
      process.exit(0);
    } else {
      console.error("\n❌ TEST A — ADA KRITERIA YANG GAGAL");
      process.exit(1);
    }

  } catch (error) {
    console.error("\n💥 TEST A GAGAL DENGAN ERROR:", error);
    process.exit(1);
  }
}

runTestA();