# Business Domain Package - Existing Capability Mapping

## Existing Capabilities Inventory

### Core EOS Capabilities (Foundation Layer)
- work-core - Canonical Work identity, continuity, and lifecycle
- identity - Actor identity, authorization, and tenant boundaries
- evidence-registry - Evidence governance, audit, and verification
- governance-evidence - Evidence-based governance decisions
- governance-read-model - Read-only governance state
- trust-framework - Trust and authorization policies
- atomic-composition - Capability composition and execution engine
- capability-resolver - Provider resolution with priority HUMAN → SYSTEM → AGENT

### Execution & Orchestration Capabilities
- agent-orchestration - Agent coordination, delegation, and workforce management
- workflow-engine - Workflow definition and execution
- api-platform - API gateway, intent routing, and service exposure
- connector-ecosystem - External integrations, channels, and runtimes
- persistent-companion - Persistence and state management
- observability - Monitoring, metrics, and operational visibility

### Business Domain Capabilities
- commerce-product - Product catalog, listings, and commerce operations
- retail-inventory - Inventory management and tracking
- legal-case - Legal case management and proceedings
- legal-document - Legal document generation and management
- legal-community - Legal community and collaboration
- consultation - Consultation service delivery
- services-id - Indonesian government service integration
- product-delivery - Product delivery and fulfillment
- investment-compliance - Investment compliance and regulatory checks
- security-hardening - Security and hardening capabilities
- smace - Service Management and Customer Experience
- service-directory - Service directory and discovery
- iot-container-tracking - IoT container tracking and logistics

### Supporting Capabilities
- requirement-management - Requirement definition and tracking
- requirements-registry - Requirements storage and registry
- requirements-traceability-matrix - Requirement traceability
- reasoning - AI reasoning and analysis capabilities
- knowledge-graph - Knowledge graph and semantic relationships
- communication - Communication channels and messaging
- budget-engine - Budget calculation and management
- work-inspection - Work inspection and validation
- full-platform-integration - Full platform integration testing

## Business Domain Package Blueprint Mapping

### Genesis EOS Bounded Contexts (From Blueprint)
| Bounded Context | Description | Existing Capabilities | Gap |
|-----------------|-------------|------------------------|-----|
| Market Intelligence | Lead/prospect discovery, qualification, market signals | - | ✅ Missing - needs LeadProspect domain model |
| Solution Fulfillment | Solution design, proposal, delivery artifacts | requirement-management, product-delivery | ✅ Partial - needs SolutionArtifact domain model |
| Value & Risk Audit | Financial assessment, risk analysis, approval | investment-compliance, budget-engine | ✅ Partial - needs FinancialAssessment domain model |
| Growth & Commerce | Offer creation, campaigns, conversion | commerce-product, smace | ✅ Partial - needs ConversionAsset domain model |
| Customer Success & Retention | Client onboarding, outcome tracking, retention | - | ✅ Missing - needs ClientAccount domain model |

### Existing Product Layer (Products Directory)
- agentic-work - Human+AI work organization and execution
- lawyershub - Legal practice management
- ecommerce-ops - E-commerce operations
- services-id - Government service delivery
- ilc - Indonesian Legal Community

## Key Observations
1. **Core Foundation Complete**: All EOS Core capabilities required by the blueprint are already implemented and tested
2. **Execution Layer Mature**: Agent orchestration, workflow, connectors, and API platform are fully functional
3. **Business Domain Capabilities Exist**: Several domain capabilities (legal, commerce, compliance) are already implemented
4. **Bounded Context Domain Models Missing**: The Genesis-specific domain aggregates (LeadProspect, SolutionArtifact, FinancialAssessment, ConversionAsset, ClientAccount) do not yet exist as standalone domain models
5. **Product Composition Layer Exists**: Agentic Work and other products already provide the experience and execution layer

## Next Steps for BDP-001 Domain Discovery
1. Map existing domain capabilities to Genesis bounded contexts
2. Identify ownership boundaries between existing capabilities and new domain models
3. Define anti-corruption layer contracts between Genesis domains and existing capabilities
4. Validate that no duplicate core primitives are being created
5. Propose initial package structure for Genesis EOS business domain package