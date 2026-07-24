# LawyersHub MVP v0.1

Last Updated: July 24, 2026

---

## Product Status
```
Release Candidate ✅
Validated Vertical Slice ✅
Evidence Loop Active 🔄
```

---

## LawyersHub Evidence Loop
LawyersHub is the **teacher of EOS**, not just a legal product! We follow the **LawyersHub Evidence Loop Execution Model** for Phase C1.3.

Documentation: [evidence-loop.md](./evidence-loop.md)

**Phase C1.3 Operating Rule: Evidence sebelum abstraction.**

---

## Validated User Journey
1. Anonymous Visitor
2. Authentication
3. Create Workspace
4. Create Client
5. Create Matter
6. Upload Document
7. Review Matter
8. Logout

Status: **ALL STEPS PASS ✅**

---

## Application Details
- **Tech Stack**: Python, FastAPI
- **Architecture**: Clean Architecture (Domain → Infrastructure → Application → Experience)
- **Storage**: In-memory (for MVP, production baseline will add persistent DB)
- **Running On**: http://localhost:8000
- **OpenAPI Docs**: http://localhost:8000/docs
- **Test Script**: test_journey.py (validates entire user flow)

---

## Directory Structure
```
lawyershub/
├── application/             # API Endpoints & FastAPI App
├── domain/                  # Core Business Models
│   └── models/
├── infrastructure/          # Storage & External Services
│   └── services/
├── experience/              # Frontend (Empty for now)
├── evidence/                # Evidence Collection Logs
├── sprints/                 # Sprint Definitions
├── evidence-loop.md         # Evidence Loop Execution Model
├── PRODUCT_CONSTITUTION.md  # Product Constitution
├── README.md                # This file!
└── test_journey.py          # User Journey Validation Script
```

---

## Product Constitution
See [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) for product guardrails!

---

## Evidence Collection
All evidence is stored in [evidence/](./evidence/)! Current evidence categories:

### Delivery Evidence
- delivery-log.md
- delivery-metrics.md

### Operational Evidence
- deployment-log.md
- operational-incidents.md
- performance-baseline.md
- maintenance-cost.md

### Pattern Evidence
- friction-log.md
- duplication-observations.md
- reuse-observations.md
- extraction-candidates.md

### Other
- dependency-log.md
- architecture-decisions.md
- user-journey-validation.md
- runtime-start.md

---

## Sprint Definitions
Current Sprint: **Sprint C1.3-001 — LawyersHub Evidence Loop Execution**
See [sprints/](./sprints/) directory!

---

## How to Run
1. Go to lawyershub directory
2. Create virtual environment (if not exists)
3. Activate virtual environment
4. Run server: `uvicorn application.main:app --host 0.0.0.0 --port 8000 --reload`
5. Access OpenAPI docs at http://localhost:8000/docs
6. Run user journey test: `python test_journey.py`

---

## EOS Relation
LawyersHub is the **first product experiment** of Enterprise OS! It is the **source of implementation truth** and the **first platform learning data source**!

EOS Core Slogans:
> Products create evidence. Evidence creates assets. Assets accelerate future products!
>
> The platform does not predict what should be reusable. The platform learns what becomes reusable!
