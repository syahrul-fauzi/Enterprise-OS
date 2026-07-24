# Evidence Session 001

Date: July 24, 2026
Environment: Local Development

## Scenario
User creates a new legal workspace.

## Actor
Role: Lawyer (Demo Lawyer)

## Journey Observed
1. Login
2. Create workspace
3. Create client
4. Create matter
5. Upload document
6. Review matter
7. Logout

## Delivery Evidence per Feature

### Feature: Authentication
- Observed: Token-based login/logout
- Time: 30 seconds
- Manual steps: 2
- Dependencies: None
- Issues: None

### Feature: Create Workspace
- Observed: Creates workspace with name
- Time: 45 seconds
- Manual steps: 1
- Dependencies: Authentication
- Issues: None

### Feature: Create Client
- Observed: Creates client with name and email
- Time: 1 minute
- Manual steps: 1
- Dependencies: Workspace ID
- Issues: None

### Feature: Create Matter
- Observed: Creates matter with title and description
- Time: 1 minute
- Manual steps: 1
- Dependencies: Workspace ID, Client ID
- Issues: None

### Feature: Upload Document
- Observed: Creates document with name and content
- Time: 45 seconds
- Manual steps: 1
- Dependencies: Matter ID
- Issues: None

### Feature: Review Matter
- Observed: Retrieves matter details
- Time: 30 seconds
- Manual steps: 1
- Dependencies: Matter ID
- Issues: None

## Observations

### Friction
1. No UI/frontend; only API endpoints available
2. Manual JSON payload creation is required for each step
3. No error handling guidance for invalid inputs
4. No visual feedback for success/failure of operations
5. Requirement to remember Workspace ID, Client ID, and Matter ID between steps

### Repeated Patterns
1. CRUD API pattern for all domain entities (User, Workspace, Client, Matter, Document)
2. Authentication flow with token-based access
3. Entity ID dependency chain (Workspace → Client → Matter → Document)

### Manual Workarounds
- Use curl/httpie/postman to send API requests
- Manually manage request payloads
- Manually track and pass entity IDs between steps
- Manually verify response status codes and contents

## Evidence Type Summary

Delivery:
- Feature delivery time: ~5 minutes (total journey)
- Manual steps: 7 steps total
- Dependencies: 3 (FastAPI, Python, Uvicorn)
- Defects: 0

Operational:
- Incidents: 0
- Maintenance effort: 0

Pattern:
- Observed patterns: 3
- Confidence levels: High for all patterns

## Extraction Candidates
Candidate: None
Status: Observe
Reason: Only one product exists; no repeated patterns across multiple products yet
