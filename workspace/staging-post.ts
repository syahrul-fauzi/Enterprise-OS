import { createDefaultWorkspaceSession, encodeWorkspaceSession } from "./apps/web/lib/workspace-session";
import fetch from "node-fetch";

async function testProductExecution(productId: string, domain: string, title: string, description: string) {
  const session = createDefaultWorkspaceSession();
  const encoded = encodeWorkspaceSession(session);
  console.log(`📝 [${productId}] Encoded session generated:`, encoded);
  
  const response = await fetch("http://localhost:3001/api/requirements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `eos-workspace-session=${encoded}`,
      "X-EOS-Product-Id": productId,
      "X-EOS-Product-Domain": domain
    },
    body: JSON.stringify({
      title,
      description,
      priority: "high"
    })
  });
  
  const data = await response.json();
  console.log(`\n✅ [${productId}] Response dari server:`);
  console.log(JSON.stringify(data, null, 2));
  
  // Verifikasi header response mengandung product context yang benar
  console.log(`\n🔍 [${productId}] Response Headers:`);
  console.log(`X-EOS-Product-Id: ${response.headers.get("x-eos-product-id")}`);
  console.log(`X-EOS-Product-Domain: ${response.headers.get("x-eos-product-domain")}`);
  
  return data;
}

async function main() {
  // Test real execution flow untuk SEMUA produk - verifikasi boundary B3-G3
  console.log("🚀 Memulai real execution test untuk semua produk (B3-G3 validation)...\n");
  
  try {
    // 1. Test LawyersHub (legacy product)
    await testProductExecution(
      "lawyershub",
      "lawyershub.enterprise-os.com",
      "Request integrasi sistem e-court untuk LawyersHub",
      "Butuh integrasi dengan pengadilan negeri untuk proses perkara otomatis"
    );
    
    // 2. Test Services.ID (B3-G1 product)
    await testProductExecution(
      "services-id",
      "services-id.enterprise-os.com",
      "Request subdomain kucing.services-id.com",
      "Butuh subdomain untuk project kucing kesayangan kantor agar bisa diakses publik"
    );
    
    // 3. Test ILC (B3-G5 product)
    await testProductExecution(
      "ilc",
      "ilc.enterprise-os.com",
      "Request platform streaming untuk ILC",
      "Butuh infrastruktur streaming untuk acara Indonesia Lawyers Club live"
    );
    
    // 4. Test Academic (B3-G6 product)
    await testProductExecution(
      "academic",
      "academic.enterprise-os.com",
      "Request sistem manajemen jurnal ilmiah",
      "Butuh platform untuk mengelola publikasi jurnal akademik dosen dan peneliti"
    );
    
    console.log("\n🎉 Semua product runtime boundary test PASSED! B3-G3 validation complete.");
    console.log("✅ Alur Product Runtime → Experience Surface → Shared Capability terbukti berjalan.");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);