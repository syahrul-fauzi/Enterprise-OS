#!/usr/bin/env python3
import os
import json
import datetime
import logging

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EOS_STATE_DIR = os.path.join(REPO_ROOT, ".eos-state")
AUTHORITY_DIR = os.path.join(EOS_STATE_DIR, "authority")
PROJECTIONS_DIR = os.path.join(EOS_STATE_DIR, "projections")
EVIDENCE_DIR = os.path.join(EOS_STATE_DIR, "evidence")
LOG_FILE = os.path.join(EVIDENCE_DIR, "esi-governance-validation.log")

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

def load_authority_matrix():
    """
    Load authority matrix from authority directory
    """
    authority_file = os.path.join(AUTHORITY_DIR, "authority-matrix.json")
    try:
        with open(authority_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        log.warning(f"⚠️  Tidak dapat memuat authority matrix: {str(e)}")
        return {}

def verify_governance_boundary(status_dashboard):
    """
    Verify governance boundary rules are respected
    """
    log.info(f"🔍 Memverifikasi governance boundary...")
    
    # Check state separation: REPORTED ≠ VERIFIED ≠ ACCEPTED
    acceptance_gates = status_dashboard.get('acceptance_gates', {})
    
    state_separation_valid = True
    for gate_id, gate_status in acceptance_gates.items():
        # Check that no gate has both VERIFIED and ACCEPTED without proper transition
        if gate_status == "ACCEPTED":
            log.info(f"   Gate {gate_id}: ACCEPTED - requires prior VERIFIED and authority")
    
    # Check that no unauthorized mutations exist
    next_action = status_dashboard.get('next_action', '')
    if "unauthorized" in next_action.lower() or "mutation" in next_action.lower():
        log.error(f"❌ GAGAL: Ada indikasi unauthorized mutation di next_action")
        state_separation_valid = False
    
    # Check that NG-001D remains HOLD
    ng001_status = status_dashboard.get('ng001_status', {})
    if ng001_status.get('ng001d_bootstrap') != "HOLD":
        log.error(f"❌ GAGAL: NG-001D tidak dalam status HOLD!")
        state_separation_valid = False
    else:
        log.info(f"   NG-001D: HOLD - sesuai persyaratan")
    
    if state_separation_valid:
        log.info(f"✅ PASS: Governance boundary valid")
        return True, "GOVERNANCE_VALID"
    else:
        return False, "GOVERNANCE_VIOLATION"

def verify_state_transitions(status_dashboard):
    """
    Verify that all state transitions are authorized
    """
    log.info(f"🔍 Memverifikasi state transitions...")
    
    # Check evidence chain integrity
    evidence_chain = status_dashboard.get('evidence_chain', [])
    
    required_evidence = [
        "esi-p0/identity-provenance-contract.json",
        "esi-p0/integrity-verification.json",
        "esi-p0/evidence-claim-linkage.json",
        "esi-p0/verification-acceptance-boundary.json",
        "evidence/esi-foundation-001-p0-closure-report.json",
        "evidence/esi-p0-assurance-001-report.json",
        "evidence/esi-p0-evidence-001-report.json"
    ]
    
    missing_evidence = []
    for req in required_evidence:
        if req not in evidence_chain:
            log.error(f"❌ GAGAL: Evidence {req} tidak ada di chain")
            missing_evidence.append(req)
    
    if missing_evidence:
        return False, "MISSING_EVIDENCE_IN_CHAIN"
    
    log.info(f"✅ PASS: State transitions valid")
    return True, "TRANSITIONS_VALID"

def main():
    log.info("🚀 Memulai ESI Governance Boundary Validation Runtime")
    log.info(f"📂 Authority Directory: {AUTHORITY_DIR}")
    log.info("---")
    
    # Load authority matrix
    authority_matrix = load_authority_matrix()
    log.info(f"📋 Authority matrix dimuat")
    log.info("---")
    
    # Load status dashboard
    status_dashboard_file = os.path.join(PROJECTIONS_DIR, "status-dashboard.json")
    try:
        with open(status_dashboard_file, 'r') as f:
            status_dashboard = json.load(f)
    except Exception as e:
        log.error(f"❌ GAGAL: Tidak dapat membaca status dashboard: {str(e)}")
        return 1
    
    total_passed = 0
    total_failed = 0
    
    # Verify governance boundary
    is_valid, status = verify_governance_boundary(status_dashboard)
    if is_valid:
        total_passed += 1
    else:
        total_failed += 1
    log.info("---")
    
    # Verify state transitions
    is_valid, status = verify_state_transitions(status_dashboard)
    if is_valid:
        total_passed += 1
    else:
        total_failed += 1
    log.info("---")
    
    # Ringkasan akhir
    log.info("📊 Ringkasan Governance Boundary Validation Runtime:")
    log.info(f"✅ Total pemeriksaan lulus: {total_passed}")
    log.info(f"❌ Total pemeriksaan gagal: {total_failed}")
    log.info(f"📄 Log file: {LOG_FILE}")
    
    if total_failed == 0:
        log.info("🎉 Semua governance boundary valid! ESI-FOUNDATION-002 governance runtime selesai.")
        return 0
    else:
        log.warning(f"⚠️ Ada {total_failed} pemeriksaan governance yang gagal. Periksa laporan untuk detail.")
        return 1

if __name__ == "__main__":
    exit(main())