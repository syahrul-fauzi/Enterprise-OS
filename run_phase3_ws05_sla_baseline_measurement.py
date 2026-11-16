"""
run_phase3_ws05_sla_baseline_measurement.py - WS-05 (Reliability & SLA)
Mengukur metrik SLA baseline sesuai dua tahap model pengguna: Tahap A (Baseline measurement)
Sesuai urutan eksekusi: REGRESSION & SECURITY → RELIABILITY / SLA BASELINE
Mengukur semua metrik baseline yang direkomendasikan:
- Invocation success rate
- Task correctness rate
- Median dan p95 execution latency
- Timeout dan failure rate
- Recovery success rate
- Regression pass rate
- Governance violation count
- Evidence completeness
"""

import json
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple
import statistics
import sys
sys.path.insert(0, str(Path(__file__).parent / "skills"))
from state_utils import state_path, get_repository_root

# Daftar 10 skill yang akan diukur baseline-nya
SKILLS = [
    "eos-recon", "eos-dependency-engine", "eos-evidence-engine",
    "eos-face-capability", "eos-face", "eos-face-verification",
    "eos-product-slice", "eos-self-execution", "eos-command-center",
    "eos-verification"
]

# Metrik baseline yang akan diukur (sesuai permintaan pengguna)
BASELINE_METRICS = [
    "invocation_success_rate",
    "task_correctness_rate",
    "median_execution_latency_ms",
    "p95_execution_latency_ms",
    "timeout_failure_rate",
    "recovery_success_rate",
    "regression_pass_rate",
    "governance_violation_count",
    "evidence_completeness_score"
]

def load_skill_manifest(skill_name: str) -> Dict[str, Any] | None:
    """Muat manifest skill dan validasi JSON"""
    repo_root = get_repository_root()
    manifest_path = repo_root / "skills" / skill_name / "manifest.json"
    if not manifest_path.exists():
        print(f"[SLA_BASELINE] ❌ Manifest tidak ditemukan: {skill_name}")
        return None
    
    try:
        with open(manifest_path, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"[SLA_BASELINE] ❌ JSON invalid untuk {skill_name}: {e}")
        return None

def test_skill_invocation(skill_name: str) -> Tuple[bool, float]:
    """Test apakah skill dapat dipanggil (invocation test), ukur latency"""
    start_time = time.time()
    success = False
    
    # Cek apakah skill terdaftar dan dapat dieksekusi dengan memuat manifest dan entry point utama
    repo_root = get_repository_root()
    skill_path = repo_root / "skills" / skill_name / "main.py"
    if not skill_path.exists():
        # Fallback: cek apakah ada file main.py di dalam folder skill (alternatif path)
        skill_path_alt = repo_root / "skills" / skill_name / "__main__.py"
        if not skill_path_alt.exists():
            print(f"[INVOKE_TEST] ❌ {skill_name}: Entry point tidak ditemukan")
            latency = (time.time() - start_time) * 1000
            return False, latency
    
    try:
        # Panggil skill dengan mode test (dry-run) melalui entry point utamanya
        result = subprocess.run(
            ["python3", str(skill_path), "--test-mode"],
            capture_output=True,
            text=True,
            timeout=5  # 5 detik timeout
        )
        # Jika exit code 0 atau test mode berhasil (banyak script mengembalikan 0 untuk test sukses)
        if result.returncode == 0 or "test passed" in result.stdout.lower():
            success = True
            print(f"[INVOKE_TEST] ✅ {skill_name}: invocation berhasil")
        else:
            print(f"[INVOKE_TEST] ⚠️ {skill_name}: return code {result.returncode}, stdout: {result.stdout[:100]}...")
    except subprocess.TimeoutExpired:
        print(f"[INVOKE_TEST] ⚠️ {skill_name}: timeout")
    except Exception as e:
        print(f"[INVOKE_TEST] ❌ {skill_name}: error {e}")
    
    latency = (time.time() - start_time) * 1000  # konversi ke ms
    return success, latency

def calculate_baseline_metrics() -> Dict[str, Any]:
    """Hitung semua metrik baseline untuk seluruh skill"""
    baseline_results = {
        "measurement_timestamp": datetime.now().isoformat(),
        "work_id": "EOS-SKILL-ASSURANCE-001",
        "phase": "WS-05 SLA Baseline Measurement (Tahap A)",
        "overall_metrics": {},
        "skill_details": {}
    }
    
    # Track semua latensi untuk perhitungan median/p95
    all_latencies = []
    total_invocations = 0
    successful_invocations = 0
    total_timeouts = 0
    
    # Jalankan invocation test untuk setiap skill
    for skill in SKILLS:
        print(f"\n[MEASURING] {skill} - SLA baseline metrics...")
        manifest = load_skill_manifest(skill)
        if not manifest:
            baseline_results["skill_details"][skill] = {"status": "failed", "reason": "invalid_manifest"}
            continue
        
        # Test invocation
        success, latency = test_skill_invocation(skill)
        total_invocations += 1
        if success:
            successful_invocations += 1
            all_latencies.append(latency)
        else:
            total_timeouts += 1
        
        # Simpan detail per skill
        baseline_results["skill_details"][skill] = {
            "manifest_valid": True,
            "invocation_success": success,
            "execution_latency_ms": round(latency, 2),
            "has_all_contract_fields": all(k in manifest for k in ["trigger", "input_output", "preconditions", "risk_assessment", "authority_boundaries"]),
            "evidence_fields_complete": all(k in manifest for k in ["author", "version", "dependencies", "execution"])
        }
    
    # Hitung overall metrics
    if total_invocations > 0:
        baseline_results["overall_metrics"]["invocation_success_rate"] = round(successful_invocations / total_invocations * 100, 2)
        baseline_results["overall_metrics"]["timeout_failure_rate"] = round(total_timeouts / total_invocations * 100, 2)
    
    # Hitung latency stats jika ada data
    if len(all_latencies) > 0:
        all_latencies.sort()
        baseline_results["overall_metrics"]["median_execution_latency_ms"] = round(statistics.median(all_latencies), 2)
        # Hitung p95
        p95_index = int(len(all_latencies) * 0.95)
        baseline_results["overall_metrics"]["p95_execution_latency_ms"] = round(all_latencies[p95_index] if p95_index < len(all_latencies) else all_latencies[-1], 2)
    
    # Ambil hasil dari verifikasi sebelumnya untuk governance dan regression
    try:
        with open(state_path('verification', 'EOS-SKILL-ASSURANCE-001_regression_security_verification.json'), 'r') as f:
            prev_verification = json.load(f)
            baseline_results["overall_metrics"]["governance_violation_count"] = len(prev_verification["governance_scan"]["violations_found"])
            baseline_results["overall_metrics"]["regression_pass_rate"] = 100.0 if prev_verification["all_passed"] else 0.0
    except Exception as e:
        print(f"[SLA_BASELINE] ⚠️ Tidak dapat membaca hasil verifikasi sebelumnya: {e}")
        baseline_results["overall_metrics"]["governance_violation_count"] = -1
        baseline_results["overall_metrics"]["regression_pass_rate"] = -1
    
    # Hitung evidence completeness score
    total_evidence_checks = 0
    passed_evidence_checks = 0
    for skill in baseline_results["skill_details"]:
        details = baseline_results["skill_details"][skill]
        if details.get("manifest_valid", False):
            total_evidence_checks += 2  # dua field group
            if details.get("has_all_contract_fields", False):
                passed_evidence_checks +=1
            if details.get("evidence_fields_complete", False):
                passed_evidence_checks +=1
    if total_evidence_checks > 0:
        baseline_results["overall_metrics"]["evidence_completeness_score"] = round(passed_evidence_checks / total_evidence_checks * 100, 2)
    
    # Recovery success rate (dari test sebelumnya, masih dummy karena belum diuji)
    baseline_results["overall_metrics"]["recovery_success_rate"] = None  # Akan diisi setelah test recovery
    baseline_results["overall_metrics"]["task_correctness_rate"] = None  # Akan diisi setelah functional evaluation
    
    return baseline_results

def main():
    print("\n=== EOS-SKILL-ASSURANCE-001: WS-05 SLA Baseline Measurement (Tahap A) ===")
    print("Mengukur baseline metrik sebelum menetapkan target SLA\n")
    
    # Jalankan perhitungan baseline
    baseline_results = calculate_baseline_metrics()
    
    # Tampilkan hasil overall
    print("\n=== HASIL BASELINE MEASUREMENT ===")
    for metric, value in baseline_results["overall_metrics"].items():
        if value is not None:
            print(f"  {metric}: {value}")
        else:
            print(f"  {metric}: PENDING (memerlukan test tambahan)")
    
    # Simpan hasil baseline ke .eos-state/sla/
    output_path = state_path('sla', 'EOS-SKILL-ASSURANCE-001_sla_baseline.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(baseline_results, f, indent=2)
    
    print(f"\n[EVIDENCE_SAVED] Hasil baseline SLA disimpan ke: {output_path}")
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)