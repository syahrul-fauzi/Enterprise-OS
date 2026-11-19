#!/usr/bin/env python3
import os
import json
import hashlib
import datetime
import logging

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EOS_STATE_DIR = os.path.join(REPO_ROOT, ".eos-state")
ESI_P0_DIR = os.path.join(EOS_STATE_DIR, "esi-p0")
EVIDENCE_DIR = os.path.join(EOS_STATE_DIR, "evidence")
LOG_FILE = os.path.join(EVIDENCE_DIR, "esi-hash-compute.log")

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

def compute_record_hash(record_data):
    """
    Compute SHA-256 hash of record data, excluding hash-related fields
    """
    hash_data = {k: v for k, v in record_data.items() 
                 if k not in ['hash', 'hash_algorithm', 'hash_computed_at']}
    hash_json = json.dumps(hash_data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(hash_json.encode('utf-8')).hexdigest()

def verify_record_hash(record_file):
    """
    Verify hash of a record file
    """
    log.info(f"🔍 Verifikasi hash untuk {os.path.basename(record_file)}")
    
    try:
        with open(record_file, 'r') as f:
            record = json.load(f)
    except Exception as e:
        log.error(f"❌ GAGAL: Tidak dapat membaca file: {str(e)}")
        return False, None, None
    
    if 'hash' not in record:
        log.warning(f"⚠️  Peringatan: File tidak memiliki field hash")
        computed_hash = compute_record_hash(record)
        return None, computed_hash, "NO_EXISTING_HASH"
    
    existing_hash = record['hash']
    computed_hash = compute_record_hash(record)
    
    if existing_hash == computed_hash:
        log.info(f"✅ PASS: Hash cocok: {existing_hash[:16]}...")
        return True, computed_hash, "HASH_MATCH"
    else:
        log.error(f"❌ GAGAL: Hash tidak cocok!")
        log.error(f"   Existing: {existing_hash}")
        log.error(f"   Computed: {computed_hash}")
        return False, computed_hash, "HASH_MISMATCH"

def add_hash_to_record(record_file):
    """
    Recompute and update hash for a record file
    """
    log.info(f"🔧 Memperbarui hash untuk {os.path.basename(record_file)}")
    
    try:
        with open(record_file, 'r') as f:
            record = json.load(f)
    except Exception as e:
        log.error(f"❌ GAGAL: Tidak dapat membaca file: {str(e)}")
        return False
    
    computed_hash = compute_record_hash(record)
    record['hash'] = computed_hash
    record['hash_algorithm'] = "sha256"
    record['hash_computed_at'] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    try:
        with open(record_file, 'w') as f:
            json.dump(record, f, indent=2, ensure_ascii=False)
        log.info(f"✅ PASS: Hash diperbarui: {computed_hash[:16]}...")
        return True
    except Exception as e:
        log.error(f"❌ GAGAL: Tidak dapat menulis file: {str(e)}")
        return False

def main():
    log.info("🚀 Memulai ESI Hash Computation Runtime")
    log.info(f"📂 ESI P0 Directory: {ESI_P0_DIR}")
    log.info("---")
    
    total_verified = 0
    total_passed = 0
    total_failed = 0
    total_updated = 0
    
    # Process all JSON files in ESI P0 directory
    for filename in sorted(os.listdir(ESI_P0_DIR)):
        if filename.endswith('.json'):
            record_file = os.path.join(ESI_P0_DIR, filename)
            total_verified += 1
            
            is_valid, computed_hash, status = verify_record_hash(record_file)
            
            if status == "NO_EXISTING_HASH" or status == "HASH_MISMATCH":
                if add_hash_to_record(record_file):
                    total_updated += 1
                    total_passed += 1
                else:
                    total_failed += 1
            elif is_valid:
                total_passed += 1
            else:
                total_failed += 1
            
            log.info("---")
    
    # Ringkasan akhir
    log.info("📊 Ringkasan Hash Computation Runtime:")
    log.info(f"📄 Total file diverifikasi: {total_verified}")
    log.info(f"✅ Total hash cocok/ditambahkan: {total_passed}")
    log.info(f"🔧 Total hash ditambahkan: {total_updated}")
    log.info(f"❌ Total hash tidak cocok: {total_failed}")
    log.info(f"📄 Log file: {LOG_FILE}")
    
    if total_failed == 0:
        log.info("🎉 Semua hash computation berhasil! ESI-FOUNDATION-002 hash runtime selesai.")
        return 0
    else:
        log.warning(f"⚠️ Ada {total_failed} file dengan hash tidak cocok. Periksa laporan untuk detail.")
        return 1

if __name__ == "__main__":
    exit(main())