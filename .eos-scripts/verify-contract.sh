#!/usr/bin/env python3
import yaml
import os
import datetime
import logging

# Skrip validasi kontrak domain Sovereign Groups untuk EOS
# Mematuhi SMACE-002 pattern dan canonical boundary mapping dari Sovereign-Groups.md

# Konfigurasi path
TEMPLATE_PATH = "/root/Enterprise-OS/.eos-state/contracts/SMACE-002-contract.yaml"
DOMAINS_DIR = "/root/Enterprise-OS/.eos-state/contracts/domains"
SOVEREIGN_GROUPS = "/root/Enterprise-OS/Sovereign-Groups.md"
LOG_FILE = "/root/Enterprise-OS/.eos-state/contracts/validation_report.log"

# Setup logging
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

# Buat direktori domains jika belum ada
os.makedirs(DOMAINS_DIR, exist_ok=True)
open(LOG_FILE, 'w').close()

def extract_domains():
    """Extract daftar domain dari tabel markdown di Sovereign-Groups.md"""
    domains = []
    with open(SOVEREIGN_GROUPS, 'r') as f:
        for line in f:
            if '| SG-' in line:
                parts = [p.strip() for p in line.split('|') if p.strip()]
                if len(parts) >= 4:
                    domain_id = parts[0]
                    domain_name = parts[1]
                    canonical_boundary = parts[2]
                    status = parts[3]
                    domains.append((domain_id, domain_name, canonical_boundary, status))
    return domains

def generate_domain_contract(domain_id, domain_name, canonical_boundary, status):
    """Generate kontrak domain dari template SMACE-002"""
    output_file = os.path.join(DOMAINS_DIR, f"{domain_id}.yaml")
    
    log.info(f"🔧 Membuat kontrak untuk {domain_id}: {domain_name}")
    
    # Load template
    with open(TEMPLATE_PATH, 'r') as f:
        contract = yaml.safe_load(f)
    
    # Update field kunci
    contract['slice_id'] = domain_id
    contract['domainType'] = domain_id.lower()  # lowercase domain_id
    contract['description'] = f"Kontrak domain {domain_name} yang mematuhi prinsip EOS Work Continuity. Tidak mengubah primitive inti work-core."
    contract['last_updated'] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    contract['status'] = status
    contract['canonical_boundary'] = canonical_boundary
    
    # Hapus requirement spesifik ComfyUI
    comfyui_req = "Setiap eksekusi ComfyUI harus ter-link ke logicalWorkId yang valid dari work-core sebelum memulai proses"
    if comfyui_req in contract['continuity_requirements']:
        contract['continuity_requirements'].remove(comfyui_req)
    
    # Tambahkan requirement spesifik domain
    contract['continuity_requirements'].append(f"Semua eksekusi di domain {domain_name} harus ter-link ke logicalWorkId yang valid dari work-core")
    
    # Simpan kontrak yang sudah diupdate
    with open(output_file, 'w') as f:
        yaml.dump(contract, f, sort_keys=False)
    
    log.info(f"✅ Kontrak {domain_id} dibuat di {output_file}")
    return output_file

def validate_domain_contract(contract_file):
    """Validasi kontrak domain sesuai kriteria SMACE-002"""
    domain_id = os.path.basename(contract_file).replace('.yaml', '')
    log.info(f"🔍 Memvalidasi kontrak untuk {domain_id}...")
    
    try:
        with open(contract_file, 'r') as f:
            contract = yaml.safe_load(f)
    except Exception as e:
        log.error(f"❌ GAGAL: {domain_id} - Format YAML tidak valid: {str(e)}")
        return False
    
    # Cek aturan SMACE-002: larangan generate logicalWorkId di luar work-core
    has_logical_work_id_rule = any("logicalWorkId di luar work-core" in req for req in contract.get('continuity_requirements', []))
    if not has_logical_work_id_rule:
        log.error(f"❌ GAGAL: {domain_id} - Tidak memiliki aturan pelarangan logicalWorkId di luar work-core")
        return False
    
    # Cek kedua identifier ada
    identifiers = contract.get('identifier_definitions', {})
    if not ('logicalWorkId' in identifiers and 'runtimeJobId' in identifiers):
        log.error(f"❌ GAGAL: {domain_id} - Tidak memiliki logicalWorkId dan runtimeJobId dalam identifier_definitions")
        return False
    
    # Cek canonical boundary
    domain_boundary = contract.get('canonical_boundary')
    if not domain_boundary:
        log.error(f"❌ GAGAL: {domain_id} - Tidak memiliki canonical_boundary yang valid")
        return False
    
    log.info(f"✅ BERHASIL: {domain_id} - Semua kriteria SMACE-002 terpenuhi")
    return True

def main():
    domains = extract_domains()
    log.info(f"🚀 Memulai validasi dan generate kontrak untuk {len(domains)} domain")
    log.info(f"📋 Template kontrak: {TEMPLATE_PATH}")
    log.info(f"📂 Output kontrak domain: {DOMAINS_DIR}")
    log.info("---")
    
    total_passed = 0
    total_failed = 0
    
    for domain in domains:
        domain_id, domain_name, canonical_boundary, status = domain
        output_file = os.path.join(DOMAINS_DIR, f"{domain_id}.yaml")
        
        # Generate jika file belum ada
        if not os.path.exists(output_file):
            generate_domain_contract(domain_id, domain_name, canonical_boundary, status)
        
        # Validasi kontrak
        if validate_domain_contract(output_file):
            total_passed += 1
        else:
            total_failed += 1
        log.info("---")
    
    # Ringkasan akhir
    log.info("📊 Ringkasan Validasi Kontrak Domain:")
    log.info(f"✅ Total lulus: {total_passed}")
    log.info(f"❌ Total gagal: {total_failed}")
    log.info(f"📄 Laporan lengkap: {LOG_FILE}")
    
    if total_failed == 0:
        log.info("🎉 Semua kontrak domain valid! WSG-002 selesai dieksekusi.")
        return 0
    else:
        log.warning(f"⚠️ Ada {total_failed} kontrak yang gagal divalidasi. Periksa laporan untuk detail.")
        return 1

if __name__ == "__main__":
    exit(main())