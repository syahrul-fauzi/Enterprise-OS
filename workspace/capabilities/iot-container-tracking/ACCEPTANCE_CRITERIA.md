
# Acceptance Criteria: iot-container-tracking Capability

This document defines the acceptance criteria for the `iot-container-tracking` capability, as part of the `HIGH-VALUE-007` product slice.

## 1. Intent
- **Work ID:** HIGH-VALUE-007
- **User Job:** Track a shipping container across international borders, receive real-time location and status updates, and link this data to a core EOS Work primitive.

## 2. Product Experience
- **Lifecycle:** `provisioned` → `in_transit` → `stalled` → `arrived` → `decommissioned`
- **User-facing Wording:** "Track Container", "View Container Status", "Container Location History"

## 3. UI (FACE Layer)
- A component `ContainerTrackingCard.tsx` must be created to display real-time container data.
- This component must be integrated into a user-facing dashboard.

## 4. API
- `POST /api/capabilities/iot-container-tracking/provision`: To register a new container and associate it with a Work ID.
- `GET /api/capabilities/iot-container-tracking/[work_id]`: To retrieve the latest tracking data for a given Work ID.
- `POST /api/webhooks/iot-provider`: An inbound webhook to receive data pushes from external IoT hardware providers.

## 5. Capability
- `iot-container-tracking.provision`: A command to create and provision a new tracking entity.
- `iot-container-tracking.updateStatus`: A command to process incoming data from the webhook and update the container's state.
- The capability must be registered in the global `capabilityRegistry`.

## 6. Persistence
- A `ContainerTrackingRepository` must be created to store and retrieve container data.
- The repository must support retrieval by `work_id`.
- Data to be stored: `work_id`, `container_id`, `status`, `location_history (timestamp, lat, long)`, `last_updated`.

## 7. State Transition
- The capability must correctly manage the state transitions defined in the Product Experience section.
- State changes must be triggered by explicit commands (`provision`, `updateStatus`).

## 8. Evidence
- Every state-mutating command (`provision`, `updateStatus`) must record an evidence entry using `safeRecordEvidence`.
- The evidence must link back to the `work_id`.

## 9. Test
- An end-to-end test file `iot-container-tracking.test.ts` must be created.
- The test must invoke the API endpoints, trigger capability commands, verify state changes in the repository, and check for corresponding evidence records.
- The test must not use mocks for any core EOS primitives (Repository, Capability Registry, Evidence Ledger).