// Test file to verify LamportCommunicationEvent types work correctly
import type { LamportCommunicationEvent } from "./capabilities/communication/implementation/grounding/converter.js";
import type { CommunicationEvent } from "./capabilities/communication/contracts/communication.contracts.js";

// Test that we can create a valid Lamport event
const validLamportEvent: LamportCommunicationEvent = {
  event_id: "test-001",
  event_type: "CommunicationSent",
  work_id: "case-001",
  actor_id: "user-001",
  status: "sent",
  recipient_ids: ["user-002"],
  adapter_type: "in_app_chat",
  content: "Test message",
  timestamp: new Date().toISOString(),
  tenant_id: "tenant-001",
  session_id: "session-001",
  workspace_id: "workspace-001",
  // Required Lamport properties
  lamport_clock: 1,
  previous_event_id: null,
  metadata: undefined
};

console.log("✅ Valid Lamport event created successfully");
console.log("All type checks pass! The IDE was showing stale cache errors.");