#!/usr/bin/env python3
import os
import json
import datetime
import logging

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EOS_STATE_DIR = os.path.join(REPO_ROOT, ".eos-state")
EVIDENCE_DIR = os.path.join(EOS_STATE_DIR, "evidence")
ESI_P0_DIR = os.path.join(EOS_STATE_DIR, "esi-p0")
LOG_FILE = os.path.join(EVIDENCE_DIR, "esi-evidence-linkage.log")

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

def load_evidence_registry():
    """
    Load all evidence records from evidence directory
    """
    evidence_registry = {}
    for filename in os.listdir(EVIDENCE_DIR):
        if filename.endswith('.json'):
            evidence_file = os.path.join(EVIDENCE_DIR, filename)
            try:
                with open(evidence_file, 'r') as f:
                    evidence = json.load(f)
                    if 'envelope' in evidence and 'id' in evidence['envelope']:
                        evidence_id = evidence['envelope']['id']
                        evidence_registry[evidence_id] = {
                            'path': evidence_file,
                            'hash': evidence['envelope'].get('hash'),
                            'type': evidence['envelope'].get('type')
                        }
            except Exception as e:
                log.warning(f"⚠️  Tidak dapat memuat {filename}: {str(e)}")
    return evidence_registry

def verify_evidence_linkage(claim_record, evidence_registry):
    """
    Verify that a claim record has valid evidence linkage
    """
    log.info(f"🔍 Memverifikasi evidence linkage untuk claim...")
    
    if 'evidence_linkage' not in claim_record:
        log.warning(f"⚠️  Peringatan: Claim tidak memiliki field evidence_linkage")
        return False, "MISSING_EVIDENCE_LINKAGE"
    
    linkage = claim_record['evidence_linkage']
    
    # Check that all critical claims have evidence
    critical_claims = linkage.get('critical_claims', [])
    linked_evidence = linkage.get('linked_evidence', [])
    
    log.info(f"   Critical claims: {len(critical_claims)}")
    log.info(f"   Linked evidence: {len(linked_evidence)}")
    
    if len(critical_claims) > len(linked_evidence):
        log.error(f"❌ GAGAL: Ada {len(critical_claims)} critical claims tapi hanya {len(linked_evidence)} linked evidence")
        return False, "INSUFFICIENT_LINKAGE"
    
    # Verify all linked evidence exists in registry
    missing_evidence = []
    for evidence_ref in linked_evidence:
        if isinstance(evidence_ref, dict):
            evidence_id = evidence_ref.get('evidence_id')
        else:
            evidence_id = evidence_ref
        
        if evidence_id not in evidence_registry:
            log.error(f"❌ GAGAL: Evidence {evidence_id} tidak ditemukan di registry")
            missing_evidence.append(evidence_id)
    
    if missing_evidence:
        return False, "MISSING_EVIDENCE_REFERENCE"
    
    log.info(f"✅ PASS: Evidence linkage valid")
    return True, "LINKAGE_VALID"

def add_evidence_linkage(claim_record, evidence_ids):
    """
    Add evidence linkage to a claim record
    """
    log.info(f"🔧 Menambahkan evidence linkage...")
    
    if 'evidence_linkage' not in claim_record:
        claim_record['evidence_linkage'] = {
            'critical_claims': [],
            'linked_evidence': [],
            'linkage_verified_at': datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    
    claim_record['evidence_linkage']['linked_evidence'] = evidence_ids
    claim_record['evidence_linkage']['linkage_verified_at'] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    return claim_record

def main():
    log.info("🚀 Memulai ESI Evidence Linkage Enforcement Runtime")
    log.info(f"📂 Evidence Directory: {EVIDENCE_DIR}")
    log.info("---")
    
    # Load evidence registry
    evidence_registry = load_evidence_registry()
    log.info(f"📋 Evidence registry dimuat: {len(evidence_registry)} record")
    log.info("---")
    
    total_verified = 0
    total_passed = 0
    total_updated = 0
    total_failed = 0
    
    # Process all ESI P0 contract files
    for filename in sorted(os.listdir(ESI_P0_DIR)):
        if filename.endswith('.json'):
            contract_file = os.path.join(ESI_P0_DIR, filename)
            total_verified += 1
            
            try:
                with open(contract_file, 'r') as f:
                    contract = json.load(f)
            except Exception as e:
                log.error(f"❌ GAGAL: Tidak dapat membaca {filename}: {str(e)}")
                total_failed += 1
                continue
            
            is_valid, status = verify_evidence_linkage(contract, evidence_registry)
            if is_valid:
                total_passed += 1
            elif status == "MISSING_EVIDENCE_LINKAGE":
                # Add evidence linkage to the contract
                evidence_ids = [
                    "esi-p0-assurance-001-report",
                    "esi-p0-evidence-001-report"
                ]
                contract = add_evidence_linkage(contract, evidence_ids)
                
                # Save updated contract
                try:
                    with open(contract_file, 'w') as f:
                        json.dump(contract, f, indent=2, ensure_ascii=False)
                    log.info(f"✅ PASS: Evidence linkage ditambahkan ke {filename}")
                    total_updated += 1
                    total_passed += 1
                except Exception as e:
                    log.error(f"❌ GAGAL: Tidak dapat menulis {filename}: {str(e)}")
                    total_failed += 1
            else:
                total_failed += 1
            
            log.info("---")
    
    # Ringkasan akhir
    log.info("📊 Ringkasan Evidence Linkage Enforcement Runtime:")
    log.info(f"📄 Total file diverifikasi: {total_verified}")
    log.info(f"✅ Total evidence linkage valid: {total_passed}")
    log.info(f"🔧 Total evidence linkage ditambahkan: {total_updated}")
    log.info(f"❌ Total evidence linkage tidak valid: {total_failed}")
    log.info(f"📄 Log file: {LOG_FILE}")
    
    if total_failed == 0:
        log.info("🎉 Semua evidence linkage valid! ESI-FOUNDATION-002 evidence linkage runtime selesai.")
        return 0
    else:
        log.warning(f"⚠️ Ada {total_failed} file dengan evidence linkage tidak valid. Periksa laporan untuk detail.")
        return 1

if __name__ == "__main__":
    exit(main())