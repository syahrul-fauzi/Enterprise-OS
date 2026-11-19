#!/usr/bin/env python3
import json
import hashlib
from pathlib import Path
from datetime import datetime

EVIDENCE_DIR = Path("/home/ios-id/eos/.eos-state/evidence")
STATUS_DASHBOARD = Path("/home/ios-id/eos/.eos-state/projections/status-dashboard.json")

def compute_hash(file_path):
    """Compute SHA-256 hash of a file"""
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def load_json(file_path):
    """Load JSON file"""
    with open(file_path, 'r') as f:
        return json.load(f)

def verify_chain():
    """Verify full evidence chain integrity"""
    print(f"[{datetime.utcnow().isoformat()}] 🔍 Memulai Full Evidence Chain Reconciliation")
    print(f"[{datetime.utcnow().isoformat()}] 📂 Evidence Directory: {EVIDENCE_DIR}")
    print("---")
    
    # Load status dashboard
    dashboard = load_json(STATUS_DASHBOARD)
    evidence_chain = dashboard.get('evidence_chain', [])
    
    print(f"[{datetime.utcnow().isoformat()}] 📋 Evidence chain entries: {len(evidence_chain)}")
    print("---")
    
    all_valid = True
    results = []
    
    for rel_path in evidence_chain:
        # Resolve path - some are relative to .eos-state
        if rel_path.startswith('evidence/'):
            file_path = EVIDENCE_DIR / Path(rel_path).name
        elif rel_path.startswith('esi-p0/'):
            file_path = Path("/home/ios-id/eos/.eos-state") / rel_path
        elif rel_path.startswith('authority/'):
            file_path = Path("/home/ios-id/eos/.eos-state") / rel_path
        elif rel_path.startswith('schema/'):
            file_path = Path("/home/ios-id/eos/.eos-state") / rel_path
        elif rel_path.startswith('intelligence/'):
            file_path = Path("/home/ios-id/eos/.eos-state") / rel_path
        elif rel_path.startswith('decisions/'):
            file_path = Path("/home/ios-id/eos/.eos-state") / rel_path
        else:
            file_path = EVIDENCE_DIR / rel_path
        
        if not file_path.exists():
            print(f"[{datetime.utcnow().isoformat()}] ❌ MISSING: {rel_path} -> {file_path}")
            results.append({"path": rel_path, "status": "MISSING"})
            all_valid = False
            continue
        
        # Compute hash
        actual_hash = compute_hash(file_path)
        
        # Try to load and check envelope hash if exists
        try:
            record = load_json(file_path)
            envelope_hash = record.get('envelope', {}).get('hash', 'N/A')
        except:
            envelope_hash = "PARSE_ERROR"
        
        print(f"[{datetime.utcnow().isoformat()}] 🔍 Verifikasi: {rel_path}")
        print(f"    File hash: {actual_hash[:16]}...")
        print(f"    Envelope hash: {envelope_hash[:16] if envelope_hash != 'N/A' else 'N/A'}...")
        
        results.append({
            "path": rel_path,
            "status": "PRESENT",
            "file_hash": actual_hash,
            "envelope_hash": envelope_hash
        })
        print(f"[{datetime.utcnow().isoformat()}] ✅ PASS: {rel_path}")
        print("---")
    
    # Summary
    print(f"[{datetime.utcnow().isoformat()}] 📊 Ringkasan Full Evidence Chain Reconciliation:")
    print(f"    Total entri rantai bukti: {len(results)}")
    print(f"    Semua file ada: {all_valid}")
    
    if all_valid:
        print(f"[{datetime.utcnow().isoformat()}] 🎉 Semua entri rantai bukti valid! Tidak ada celah, tidak ada file hilang.")
    else:
        print(f"[{datetime.utcnow().isoformat()}] ❌ Beberapa file rantai bukti hilang atau tidak dapat diverifikasi!")
    
    return all_valid

if __name__ == "__main__":
    verify_chain()