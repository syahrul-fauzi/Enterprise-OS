```yaml
# ============================================================================
# EOS IMPLEMENTATION BLUEPRINT — 3 DOMAIN
# SINGLE SOURCE OF TRUTH #1
# ============================================================================
#
# EPISTEMIC DISCIPLINE
#
# [Design Intention]
#   Pernyataan desain / target / keputusan yang belum dibuktikan oleh artefak.
#
# [Execution Claim]
#   Klaim bahwa artefak tertentu telah dibuat / dijalankan.
#   Execution Claim TIDAK otomatis berarti implementasi benar.
#
# [Verified Fact]
#   Hanya fakta yang dapat diverifikasi langsung melalui codebase,
#   command output, checksum, runtime behavior, atau evidence artifact.
#
# RULE:
#   Blueprint selesai ≠ EOS selesai.
#   Blueprint valid ≠ implementasi valid.
#   Architecture compliance ≠ product readiness.
#
# EOS PRODUCT GATE:
#
#   PERSON
#      ↓
#   ENTER
#      ↓
#   START WORK
#      ↓
#   WORK CONTEXT
#      ↓
#   ACTORS
#      ↓
#   COMMUNICATION
#      ↓
#   ACTION
#      ↓
#   EXECUTION
#      ↓
#   EXTERNAL TRUTH
#      ↓
#   OUTCOME
#      ↓
#   EVIDENCE
#
# Ultimate proof:
#
#   REAL PERSON
#      +
#   REAL WORK
#      +
#   REAL ACTORS
#      +
#   REAL EXECUTION
#      +
#   REAL WORLD OUTCOME
#
# ============================================================================

blueprint_metadata:
  id: EOS-IMPLEMENTATION-BLUEPRINT
  version: "1.0.0"
  status: EXECUTION_SSOT
  classification: DESIGN_INTENTION_UNTIL_VERIFIED
  primary_repository_location: "EOS-IMPLEMENTATION-BLUEPRINT.yaml"

  epistemic_rules:
    design_intention:
      meaning: "Target design only. Must not be reported as implemented."
    execution_claim:
      meaning: "Artifact or execution was produced. Must include exact path/command."
    verified_fact:
      meaning: "Fact directly verified against code, runtime, checksum, or evidence."
    prohibition:
      - "Do not convert Design Intention into Verified Fact."
      - "Do not convert passing tests into real-world outcome."
      - "Do not convert staging deployment into business validation."
      - "Do not convert architecture correctness into product-market fit."

  evidence_journal:
    path: "EVIDENCE.md"
    policy: APPEND_ONLY

  gap_analysis:
    path: "build/evidence/eos-implementation-gap-analysis.yaml"

# ============================================================================
# 1. COMMANDER OBJECTIVE
# ============================================================================

commander_objective:

  primary_statement: >
    Turn EOS from a validated technical substrate into a production product
    capable of repeatedly moving real people's Work to real-world Outcomes.

  current_mode:
    architecture_discovery: FROZEN
    primitive_hunting: FROZEN
    generic_platform_building: FROZEN
    productization: ACTIVE
    production: ACTIVE
    real_work: ACTIVE
    real_outcome: ACTIVE
    business_validation: ACTIVE

  north_star:
    statement: >
      A person can enter EOS, understand a Work, continue the Work,
      coordinate with other actors, execute the next action, return later
      without reconstructing context, and reach a traceable real-world outcome.

  primary_product_unit:
    name: Work
    rule: >
      Work is the continuity boundary. Every meaningful product interaction
      must either create, inspect, update, execute against, communicate about,
      or produce evidence for a Work.

# ============================================================================
# 2. THREE DOMAIN IDENTITIES
# ============================================================================

domains:

  domain_a_services_id:
    canonical_name: Services-ID
    fqdn: services-id.com
    role:
      classification: SHARED_PLATFORM
      intended_role: >
        Shared Identity, KYC, Service Registry and reusable platform services.
    epistemic_status: DESIGN_INTENTION

  domain_b_lawyershub:
    canonical_name: LawyersHub
    fqdn: lawyershub.id
    role:
      classification: PRIMARY_PRODUCT
      intended_role: >
        Legal practice Work execution environment covering legal case,
        documents, professional coordination and client-facing execution.
    epistemic_status: DESIGN_INTENTION

  domain_c_indolawclub:
    canonical_name: IndonesiaLawyersClub
    fqdn: indonesialawyersclub.id
    role:
      classification: COMMUNITY_MARKETPLACE_PRODUCT
      intended_role: >
        Legal professional community, marketplace and CPD environment.
    epistemic_status: DESIGN_INTENTION

# ============================================================================
# 3. EOS CROSS-DOMAIN EXPERIENCE CONTRACT
# ============================================================================

cross_domain_experience_contract:

  invariant:
    statement: >
      Three domains may differ in vocabulary, workflow and business rules,
      but the underlying Work continuity model must remain coherent.

  shared_model:
    - WORK_IDENTITY
    - WORK_CONTEXT
    - ACTORS
    - RESPONSIBILITIES
    - COMMUNICATION
    - ACTION
    - EXECUTION
    - STATE
    - EVIDENCE
    - EXTERNAL_TRUTH
    - OUTCOME

  perspective_rule:
    statement: >
      Perspective berbeda. Reality satu.

    customer:
      question: "Apa status pekerjaan saya?"
    professional:
      question: "Apa yang harus saya kerjakan berikutnya?"
    operator:
      question: "Apa yang macet dan membutuhkan intervensi?"
    agent:
      question: "Apa yang dapat saya inspeksi atau eksekusi?"

  communication_rule:
    statement: >
      Communication is a mechanism of Work continuity, not a separate
      product universe.

  agent_rule:
    statement: >
      Agent is a participant in Work, not an independent chatbot universe.

  outcome_rule:
    statement: >
      Outcome may only be represented as real when supported by external
      truth or an explicitly identified human verification boundary.

# ============================================================================
# 4. ARCHITECTURE HYPOTHESES
# ============================================================================

cross_cutting_architecture_hypotheses:

  ccah_001_shared_identity:
    classification: DESIGN_INTENTION
    statement: >
      Services-ID is intended to provide shared identity infrastructure
      consumed by LawyersHub and IndonesiaLawyersClub.
    rationale: >
      Avoid duplicate identity implementations and preserve one professional
      identity across products.
    risk:
      - "Services-ID becomes critical dependency."
      - "Identity outage can affect multiple products."
    required_validation:
      - OIDC proof of concept
      - failure recovery test
      - security review
      - production observability

  ccah_002_domain_boundaries:
    classification: DESIGN_INTENTION
    statement: >
      Domain boundaries must remain explicit. Shared capabilities may be
      consumed through public contracts but domain-specific business logic
      must remain owned by its domain.
    boundary:
      services_id:
        owns:
          - identity
          - KYC
          - shared platform services
      lawyershub:
        owns:
          - legal work
          - legal documents
          - professional execution
      indolawclub:
        owns:
          - community
          - marketplace
          - CPD

  ccah_003_reuse_after_evidence:
    classification: DESIGN_INTENTION
    statement: >
      Capability extraction is earned by repeated evidence of meaningful
      cross-domain reuse, not by speculative abstraction.

  ccah_004_work_experience_continuity:
    classification: DESIGN_INTENTION
    statement: >
      Cross-domain integration must preserve Work identity and context
      rather than create isolated product-specific copies of Work history.

# ============================================================================
# 5. LAYER 1 — BUSINESS
# ============================================================================

business_layer:

  domain_a:
    purpose: >
      Provide shared identity and reusable platform infrastructure where
      justified by actual cross-domain demand.

    capabilities:
      - shared_identity
      - KYC
      - service_registry
      - shared_platform_services

    scope_out:
      - legal_case_management
      - legal_document_workflow
      - community_forum
      - marketplace_business_logic

  domain_b:
    purpose: >
      Enable legal professionals and their clients to move legal Work
      from intake to outcome with continuity across actors.

    primary_work:
      name: Legal Case
      golden_work:
        name: "Pendirian PT"
        status: DESIGN_INTENTION

    capabilities:
      - legal_case
      - legal_document
      - professional_coordination
      - client_experience
      - evidence
      - external_outcome

  domain_c:
    purpose: >
      Connect legal professionals and clients through community,
      marketplace and professional development experiences.

    capabilities:
      - membership
      - community
      - marketplace
      - CPD

  cross_domain_dependency_matrix:

    - source: LawyersHub
      target: Services-ID
      type: HARD_DEPENDENCY
      purpose: identity_and_KYC
      status: DESIGN_INTENTION

    - source: IndonesiaLawyersClub
      target: Services-ID
      type: HARD_DEPENDENCY
      purpose: identity_and_KYC
      status: DESIGN_INTENTION

    - source: IndonesiaLawyersClub
      target: LawyersHub
      type: SOFT_DEPENDENCY
      purpose: optional_work_handoff
      rule: >
        Only explicit, authenticated and authorized Work handoff may cross
        the boundary.
      status: DESIGN_INTENTION

# ============================================================================
# 6. LAYER 2 — DELIVERY
# ============================================================================

delivery_layer:

  global_definition_of_done:

    machine:
      - build_green
      - typecheck_green
      - relevant_tests_green
      - deployment_healthcheck_green

    product:
      - person_can_enter
      - person_can_start_work
      - person_can_understand_work
      - person_can_act
      - work_can_move
      - person_can_return
      - actor_can_continue_without_reconstruction

    reality:
      - real_person
      - real_work
      - real_actor
      - real_execution
      - real_external_boundary
      - real_external_truth
      - real_outcome

    business:
      - repeat_usage
      - measurable_user_value
      - willingness_to_pay

  definition_of_ready:
    - acceptance_criteria_defined
    - dependency_defined
    - affected_work_path_defined
    - verification_command_defined
    - ship_condition_defined

  agent_execution_contract:

    every_work_item_must_contain:
      - mission
      - current_state
      - target_outcome
      - files_or_surfaces
      - acceptance_criteria
      - dependencies
      - forbidden_changes
      - verification_command
      - ship_condition

    every_agent_must_return:
      - changed_files
      - diff_summary
      - commands_run
      - command_results
      - runtime_surface
      - evidence
      - blockers
      - next_action

    forbidden_completion:
      - "Plan only"
      - "Architecture discussion only"
      - "Ready to implement"
      - "Will continue later"

    terminal_states:
      - SHIPPED
      - BLOCKED
      - FAILED
      - NEEDS_HUMAN

# ============================================================================
# 7. PRODUCTIZATION ROADMAP
# ============================================================================

roadmap:

  phase_0:
    name: "EOS SUBSTRATE FREEZE"
    objective: >
      Stop architectural exploration and preserve validated substrate.
    status: ACTIVE
    rule: >
      Modify substrate only when a real production obstruction proves that
      existing behavior cannot support the golden Work.

  phase_1:
    name: "EOS FACE"
    objective: >
      Make EOS usable by a real person without explaining the underlying
      architecture.

    surfaces:
      - "/"
      - "/workspace"
      - "/work"
      - "/work/new"
      - "/work/[id]"

    acceptance:
      - CAN_ENTER
      - CAN_START_WORK
      - CAN_UNDERSTAND_WORK
      - CAN_ACT
      - CAN_RETURN

    release_gate: R1_PRODUCT_READY

  phase_2:
    name: "LAWYERSHUB GOLDEN WORK"
    objective: >
      Complete one real legal Work with real actors and a real-world outcome.

    golden_work:
      name: "Pendirian PT"

    actor_chain:
      - customer
      - lawyer
      - notary
      - EOS_agent
      - external_authority

    required_flow:
      - intent
      - work_creation
      - context
      - actor_assignment
      - communication
      - document_collection
      - professional_action
      - agent_inspection
      - external_submission
      - external_response
      - professional_review
      - outcome
      - evidence

    release_gate: R4_REAL_OUTCOME_READY

  phase_3:
    name: "PRODUCTION HARDENING"
    objective: >
      Harden the exact paths required by real Work.

    focus:
      - authentication
      - authorization
      - tenant_isolation
      - observability
      - retry
      - failure_recovery
      - notifications
      - backup
      - security
      - deployment
      - durability

    rule: >
      No generic infrastructure expansion without connection to real Work.

  phase_4:
    name: "LAWYERSHUB PRIVATE PRODUCTION"
    objective: >
      Put the Golden Work in front of a small cohort of real users.

    target:
      classification: DESIGN_INTENTION
      user_count: "5-20"

    measurements:
      - time_to_start_work
      - time_to_next_action
      - context_reconstruction
      - handoff_friction
      - work_completion
      - external_outcome
      - manual_intervention
      - repeat_usage

    release_gate: R5_BUSINESS_READY

  phase_5:
    name: "ILC → WORK CONTINUITY"
    objective: >
      Convert real ILC intent/conversation into canonical Work without
      losing context.

    required_flow:
      - conversation
      - intent
      - context
      - work_creation
      - professional_handoff
      - execution

    invariant:
      "Conversation is not the Work."

  phase_6:
    name: "SERVICES-ID SHARED PLATFORM"
    objective: >
      Extract only the shared capabilities proven necessary by the first
      production flows.

    priority:
      - identity
      - KYC
      - shared service registry
      - only evidence-backed shared services

    rule:
      >
      Do not build Services-ID as a large platform before actual consuming
      Work proves the need.

  phase_7:
    name: "THREE-DOMAIN VALIDATION"
    objective: >
      Demonstrate that one Work continuity model survives three distinct
      business domains.

    domains:
      - LawyersHub
      - IndonesiaLawyersClub
      - Services-ID

    success_condition:
      >
      Different domain. Different vocabulary. Same continuity model.

  phase_8:
    name: "GTM"
    objective: >
      Sell a concrete Work outcome rather than sell architecture.

    positioning_rule:
      >
      Customer buys the result of a completed Work. EOS is the underlying
      operating system.

# ============================================================================
# 8. LAYER 3 — ARCHITECTURE
# ============================================================================

architecture_layer:

  canonical_product_model:

    work:
      identity: canonical
      context: canonical
      state: canonical
      evidence: canonical

    actors:
      - customer
      - professional
      - operator
      - agent
      - external_actor

    interaction:
      primary: Work_Surface
      secondary: contextual_chat
      rule: >
        Chat may explain, inspect, recommend or initiate an approved action,
        but Work remains the system of continuity.

  work_reality_surface:

    required_sections:
      - CURRENT
      - NEXT
      - PEOPLE
      - ACTIVITY
      - ACTION
      - EVIDENCE
      - OUTCOME

  actor_experience:

    customer:
      primary_question: "Where is my Work?"
      capabilities:
        - understand_status
        - provide_information
        - approve
        - communicate

    professional:
      primary_question: "What must I do next?"
      capabilities:
        - review
        - execute
        - request_changes
        - communicate

    operator:
      primary_question: "What is blocked?"
      capabilities:
        - inspect
        - intervene
        - coordinate

    agent:
      primary_question: "What can I inspect or execute?"
      capabilities:
        - inspect
        - recommend
        - execute_bounded_action
        - record_evidence

  communication_architecture:

    invariant:
      >
      Every meaningful communication must remain grounded in a Work.

    model:
      communication:
        - work_id
        - actor
        - channel
        - content_or_artifact
        - timestamp
        - resulting_action

  agent_architecture:

    invariant:
      >
      Agent participation must be Work-grounded, bounded and observable.

    execution_model:
      - trigger
      - context
      - inspect
      - recommendation
      - authorization_if_required
      - action
      - evidence
      - handoff

  domain_boundaries:

    services_id:
      owns:
        - identity
        - KYC
        - shared_platform_capabilities

    lawyershub:
      owns:
        - legal_case
        - legal_document
        - legal_workflow
        - professional_execution

    indolawclub:
      owns:
        - membership
        - community
        - marketplace
        - CPD

    rule:
      >
      No domain may directly mutate another domain's private persistence.

# ============================================================================
# 9. SECURITY
# ============================================================================

security_architecture:

  identity:
    intended_model:
      - OIDC
      - Authorization_Code
      - PKCE

  service_to_service:
    intended_model:
      - authenticated_service_identity
      - TLS
      - explicit_contract

  authorization:
    model:
      shared_identity:
        - identity
        - organization
      local_domain:
        - domain_specific_permissions

  secrets:
    rule:
      >
      Production secrets must never be committed into source control.

  data:
    sensitive_data:
      - legal_documents
      - KYC_information
      - identity_information

    required_properties:
      - encrypted_at_rest
      - encrypted_in_transit
      - auditable_access
      - least_privilege

# ============================================================================
# 10. LAYER 4 — OPERATIONS
# ============================================================================

operational_layer:

  environments:

    local:
      purpose: development_only

    staging:
      purpose:
        - integration
        - QA
        - human_verification

    production:
      purpose:
        - real_users
        - real_work
        - real_outcomes

  production_gate:

    machine:
      - healthcheck
      - logs
      - metrics
      - traces

    operational:
      - backup
      - restore
      - incident_response
      - monitoring
      - alerting

  incident_severity:

    SEV1:
      examples:
        - production_work_unavailable
        - identity_outage
        - suspected_sensitive_data_breach

    SEV2:
      examples:
        - important_work_function_degraded
        - non-critical product path unavailable

    SEV3:
      examples:
        - non-blocking_UI_issue
        - cosmetic defect

  rule:
    >
    Operational maturity follows actual production risk. Do not build
    enterprise-scale operations before production demand requires it.

# ============================================================================
# 11. LAYER 5 — GOVERNANCE
# ============================================================================

governance_layer:

  architecture_decisions:
    required_when:
      - boundary_changes
      - security_model_changes
      - persistent_data_model_changes
      - cross_domain_contract_changes
      - major_dependency_changes

    artifact:
      path: "docs/adr/ADR-XXXX.md"

  release_governance:

    normal:
      requirement:
        - code_review
        - relevant_tests
        - security_check
        - deployment_verification

    hotfix:
      requirement:
        - engineer_review
        - smoke_test
        - post_incident_review

  risk_register:
    principle:
      >
      Risks must be tied to actual business and production consequences.

# ============================================================================
# 12. LAYER 6 — FINANCIAL
# ============================================================================

financial_layer:

  principle:
    >
    Financial milestones must correspond to actual deliverables and
    acceptance evidence.

  rule:
    >
    No payment milestone is considered complete merely because engineering
    reports completion.

  required_chain:
    - business_requirement
    - milestone
    - acceptance_criteria
    - implementation
    - evidence
    - acceptance
    - payment

  current_status:
    budget:
      status: NOT_DEFINED
    pricing:
      status: NOT_DEFINED
    commercial_model:
      status: NOT_DEFINED

# ============================================================================
# 13. LAYER 7 — EVIDENCE
# ============================================================================

evidence_layer:

  epistemic_chain:

    forward:
      business_requirement:
        ↓ milestone:
        ↓ acceptance_criteria:
        ↓ implementation:
        ↓ automated_test:
        ↓ runtime_evidence:
        ↓ human_evidence:
        ↓ real_world_outcome

    backward:
      evidence:
        ↓
      acceptance_criteria:
        ↓
      milestone:
        ↓
      business_requirement

  evidence_types:

    machine_truth:
      examples:
        - build
        - test
        - checksum
        - API_result
        - deployment_health

    surface_truth:
      examples:
        - rendered_UI
        - route_behavior
        - runtime_interaction

    human_truth:
      examples:
        - user_can_complete_task
        - user_can_explain_status
        - actor_handoff_without_reconstruction

    world_truth:
      examples:
        - external_authority_response
        - verified_registration
        - actual service completion

  rule:
    >
    Machine Truth MUST NOT be reported as World Truth.

  production_release_evidence:
    required:
      - git_commit
      - build_identifier
      - deployment_identifier
      - runtime_health
      - relevant_test_results

# ============================================================================
# 14. REQUIREMENT TRACEABILITY MATRIX
# ============================================================================

requirement_traceability:

  requirement:
    format: "REQ-<DOMAIN>-<PHASE>-<NUMBER>"

  acceptance:
    format: "AC-<DOMAIN>-<PHASE>-<NUMBER>"

  test:
    format: "TEST-<DOMAIN>-<PHASE>-<NUMBER>"

  evidence:
    format: "EVID-<DOMAIN>-<PHASE>-<NUMBER>"

  rule:
    forward:
      >
      Every requirement must terminate in evidence.
    backward:
      >
      Every acceptance evidence must trace back to a requirement.

# ============================================================================
# 15. RELEASE GATES
# ============================================================================

release_gates:

  R0_MACHINE_READY:
    required:
      - build_green
      - typecheck_green
      - relevant_tests_green
      - deployment_health_green

  R1_PRODUCT_READY:
    required:
      - can_enter
      - can_start_work
      - can_understand_work
      - can_act
      - can_return

  R2_HUMAN_READY:
    required:
      - real_human
      - no_system_explanation_required
      - successful_task_completion
      - successful_actor_handoff

  R3_REAL_WORK_READY:
    required:
      - real_request
      - real_professional
      - real_execution

  R4_REAL_OUTCOME_READY:
    required:
      - external_boundary
      - external_truth
      - verified_outcome
      - evidence

  R5_BUSINESS_READY:
    required:
      - repeat_usage
      - measurable_user_value
      - customer_acceptance
      - willingness_to_pay

  R6_GTM_READY:
    required:
      - stable_production
      - defined_ICP
      - concrete_use_case
      - customer_reference
      - pricing
      - onboarding
      - support

# ============================================================================
# 16. MASTER EXECUTION QUEUE
# ============================================================================

master_execution_queue:

  P0:
    id: RELEASE-GOLDEN-WORK-001
    objective: >
      Ship one real Work from entry to real-world outcome.
    domain: LawyersHub
    golden_work: "Pendirian PT"
    actors:
      - customer
      - lawyer
      - notary
      - EOS_agent
      - external_authority

  P1:
    id: PRODUCTION-HARDENING-001
    objective: >
      Harden only the production path proven necessary by P0.

  P2:
    id: PRIVATE-PRODUCTION-001
    objective: >
      Put the product in the hands of a small real-user cohort.

  P3:
    id: ILC-WORK-CONTINUITY-001
    objective: >
      Preserve context from ILC intent/conversation into canonical Work.

  P4:
    id: SERVICES-ID-SHARED-CAPABILITY-001
    objective: >
      Extract only shared capabilities proven necessary by real usage.

  P5:
    id: THREE-DOMAIN-VALIDATION-001
    objective: >
      Validate that the Work continuity model survives all three domains.

  P6:
    id: GTM-001
    objective: >
      Convert repeated Work success into a commercial product.

# ============================================================================
# 17. MASTER SHIP CONDITION
# ============================================================================

master_ship_condition:

  technical:
    - substrate_stable
    - production_build_green
    - deployment_verified

  product:
    - real_person_can_enter
    - real_person_can_start_work
    - real_person_can_understand_work
    - real_person_can_act
    - real_person_can_return

  continuity:
    - context_survives
    - actor_handoff_survives
    - communication_remains_grounded
    - evidence_remains_traceable

  reality:
    - real_external_action
    - real_external_truth
    - real_world_outcome

  business:
    - repeatable_value
    - repeat_usage
    - willingness_to_pay

# ============================================================================
# 18. COMMANDER RULE
# ============================================================================

commander_rule:

  statement: >
    EOS is not finished when the architecture is finished.
    EOS is finished when a real person can repeatedly use it to move
    real Work to a real-world Outcome.

  forbidden_loop:
    - architecture
    - primitive
    - audit
    - abstraction
    - architecture

  required_loop:
    - real_work
    - observe
    - fix_obstruction
    - deploy
    - real_user
    - real_outcome
    - repeat

# ============================================================================
# 19. CURRENT EPISTEMIC STATUS
# ============================================================================

current_epistemic_status:

  blueprint:
    status: DESIGN_INTENTION

  implementation:
    status: MUST_BE_VERIFIED_AGAINST_CODEBASE

  machine_truth:
    status: MUST_BE_VERIFIED

  human_truth:
    status: MUST_BE_VERIFIED

  world_truth:
    status: MUST_BE_VERIFIED

  business_truth:
    status: NOT_YET_ESTABLISHED

  critical_warning: >
    This document is the execution framework and Single Source of Truth.
    It is NOT itself proof that EOS has implemented every declared capability.

# ============================================================================
# END
# ============================================================================
```
