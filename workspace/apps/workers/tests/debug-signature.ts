import * as crypto from "crypto";

// Debug signature untuk memverifikasi algoritma yang sama di client dan server
const serverKey = "SB-Mid-server-test-key";
const orderId = "TEST-DEBUG-001";
const status = "success";
const gross_amount = "150000";

// Buat signature sesuai Midtrans rules
const signatureString = `${orderId}${status}${gross_amount}${serverKey}`;
const hmac = crypto.createHmac('sha512', serverKey);
const signature_key = hmac.update(signatureString).digest('hex');

console.log("Generated signature:", signature_key);
console.log("Signature string used:", signatureString);

// Coba verifikasi secara lokal
const verifyHmac = crypto.createHmac('sha512', serverKey);
const verifyDigest = verifyHmac.update(signatureString).digest('hex');
console.log("Local verification:", verifyDigest === signature_key ? "PASS" : "FAIL");