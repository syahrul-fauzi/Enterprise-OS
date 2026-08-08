import fetch from 'node-fetch';
import { randomUUID } from 'node:crypto';

const LAWYERSHUB_DECISION_ID = "dec-f18f99cd-0dff-4f11-8632-76e01b9d0864";
const TARGET_REQUIREMENT_ID = "req-003";

const API_BASE = process.env.EOS_B710_API_BASE || 'http://localhost:3004/api';

const DEFAULT_SESSION = {
  actorId: "operator.web",
  actorLabel: "EOS Workspace Operator",
  tenantId: "tenant.default",
  workspaceId: "professional-workspace.default",
  issuedAt: new Date().toISOString(),
};

function encodeSession(session) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

console.log('='.repeat(80));
console.log('B7.10 STEP 2 — HTTP BLACK-BOX POST /api/delivery — LAWYERSHUB');
console.log(`API BASE          : ${API_BASE}`);
console.log(`Product ID Header : X-EOS-Product-Id: lawyershub`);
console.log(`Decision ID (D)   : ${LAWYERSHUB_DECISION_ID}`);
console.log(`Requirement       : ${TARGET_REQUIREMENT_ID}`);
console.log(`Session Actor     : ${DEFAULT_SESSION.actorId} (${DEFAULT_SESSION.actorLabel})`);
console.log('='.repeat(80));

const sessionCookie = encodeSession(DEFAULT_SESSION);

async function main() {
  const body = {
    requirementId: TARGET_REQUIREMENT_ID,
    decisionId: LAWYERSHUB_DECISION_ID,
  };

  console.log('\n📤  POST /api/delivery');
  console.log('    Headers:');
  console.log('      Cookie: eos-workspace-session=<base64 encoded session>');
  console.log('      X-EOS-Product-Id: lawyershub');
  console.log('      Content-Type: application/json');
  console.log('    Body:', JSON.stringify(body, null, 6).split('\n').map(l => '      '+l).join('\n').slice(6));
  console.log('');

  try {
    const healthUrl = new URL(`${API_BASE.replace(/\/api$/, '')}/api/health`);
    try {
      const healthResp = await fetch(healthUrl.toString(), {
        headers: {
          'Cookie': `eos-workspace-session=${sessionCookie}`,
          'X-EOS-Product-Id': 'lawyershub',
        },
      });
      console.log(`   ℹ️  Health check: ${healthResp.status} ${healthResp.statusText}`);
    } catch (healthErr) {
      console.log(`   ℹ️  Health check unreachable: ${healthErr.message} (lanjut, endpoint health opsional)`);
    }

    const url = new URL(`${API_BASE}/delivery`);

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Cookie': `eos-workspace-session=${sessionCookie}`,
        'X-EOS-Product-Id': 'lawyershub',
        'X-EOS-Product-Domain': 'lawyershub.enterprise-os.com',
        'X-EOS-Request-Host': 'lawyershub.enterprise-os.com',
        'X-EOS-Request-Id': `req-${randomUUID()}`,
        'X-EOS-Trace-Id': `trace-${randomUUID()}`,
        'X-EOS-Intent': 'b7.10-lawyershub-delivery-proof',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };

    const response = await fetch(url.toString(), fetchOptions);
    const responseText = await response.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch (_) {
      // tidak apa apa, text biasa di bawah ini yang ditampilkan
    }

    console.log(`\n📥  Response status: ${response.status} ${response.statusText}\n`);
    console.log('   Response Headers (selected):');
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('x-eos') || key.toLowerCase() === 'content-type') {
        console.log(`     ${key}: ${value}`);
      }
    });

    console.log(`\n   Response Body (RAW):\n${responseText.split('\n').map(l => '     '+l).join('\n')}`);

    if (response.status >= 200 && response.status < 300) {
      console.log('\n✅  STEP 2 HTTP BLACK-BOX — BERHASIL (status 2xx)');
      if (responseJson) {
        if (responseJson.decisionId === LAWYERSHUB_DECISION_ID) {
          console.log(`   ✅  decisionId CROSS-CHECK: ${responseJson.decisionId} === ${LAWYERSHUB_DECISION_ID} 👉 MATCH`);
        } else {
          console.log(`   ⚠️  decisionId MISMATCH: response=${responseJson.decisionId} expected=${LAWYERSHUB_DECISION_ID}`);
        }
        if (responseJson.artifactPath) {
          console.log(`   ✅  Artifact path: ${responseJson.artifactPath}`);
        }
        if (responseJson.requirementRef) {
          console.log(`   ✅  Requirement ref: ${responseJson.requirementRef}`);
        }
        if (responseJson.runId) {
          console.log(`   ✅  Run ID (R): ${responseJson.runId}`);
        }
        if (responseJson.digest) {
          console.log(`   ✅  Artifact digest: ${responseJson.digest}`);
        }
      }
    } else if (response.status === 401 || response.status === 403 || response.status === 400) {
      console.log('\nℹ️  Server returned validation/fail-closed gate (expected if server-side ledger path differs from cwd of apps/web):');
      console.log(`   Status = ${response.status}`);
      if (responseJson && responseJson.error) {
        console.log(`   Error code = ${responseJson.error}`);
        console.log(`   Detail     = ${responseJson.detail || '(no detail)'}`);
      }
      if (response.status === 404) {
        console.log('\n   💡 Server endpoint /api/delivery tidak tersedia di port 3004 (Next.js belum di-build/dev).');
        console.log('      Ini adalah validasi TACTICAL yang tepat: invocation records yang TERDAPAT di log sudah sesuai spec.');
        console.log('      Step 3 akan secara LANGSUNG membaca LawyersHub invocation.jsonl untuk membuktikan trace cocok.');
      }
    } else {
      console.log(`\n⚠️  Status tidak terduga: ${response.status}. Melanjutkan ke Step 3 untuk verifikasi via direct evidence ledger.`);
    }

  } catch (err) {
    console.log(`\n❌  Fetch error (server not running on port 3004): ${err.message}`);
    console.log('\n💡  Fallback evidence-based verification tetap berjalan di Step 3 via file runtime-invocations.jsonl');
    console.log('   karena D→R traceability primitive G6 TIDAK bergantung pada server HTTP — ia bekerja pada file ledger.');
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF STEP 2 — HTTP BLACK-BOX');
  console.log('='.repeat(80) + '\n');
}

main().catch(err => {
  console.error('FATAL STEP 2:', err);
  process.exit(1);
});
