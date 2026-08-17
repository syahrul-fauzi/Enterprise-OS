# EOS B4 HUMAN BLACK-BOX OBSERVER SCRIPT
## Generated: 2026-08-17T02-17-16Z

### RULE FOR YOU (Observer):
- Anda TIDAK AKAN diberi briefing tentang EOS/LawyersHub/Services/ILC/Academic.
- Jawab dengan PENGALAMAN PERTAMA ANDA SAJA.
- Jika bingung, TULISKAN "SAYA TIDAK TAHU" atau "SAYA BINGUNG". Jangan menebak.
- Setiap halaman: Baca sebentar, lakukan tindakan alami pertama yang ingin Anda lakukan, lalu jawab pertanyaan.

---

## SESI 1: LawyersHub
URL: http://localhost:3004/products/lawyershub

**LH-Q1**: Dalam 1 kalimat, produk ini untuk apa?
```text
(jawaban Anda)
```

**LH-Q2**: Apa tindakan alami PERTAMA yang Anda lakukan / ingin lakukan di halaman ini?
```text
(jawaban Anda)
```

**LH-Q3**: Setelah Anda klik tombol utama / lakukan tindakan pertama, apa hasil yang Anda HARAPKAN terjadi? Bagaimana workflow produk ini dari awal sampai selesai?
```text
(jawaban Anda)
```

---

## SESI 2: Services.ID
URL: http://localhost:3004/products/services-id

**SRV-Q1**: Dalam 1 kalimat, produk ini untuk apa? (Jangan lihat jawaban LawyersHub — jawab natural)
```text
(jawaban Anda)
```

**SRV-Q2**: Tindakan alami PERTAMA Anda di sini = apa? (Bandingkan dengan LawyersHub — apakah input field dan pilihan selector-nya TERASA beda pekerjaan?)
```text
(jawaban Anda)
```

**SRV-Q3**: Hasil akhir yang Anda harapkan dari produk ini = apa? Apakah lifecycle selesainya sama dengan "kasus hukum closed"?
```text
(jawaban Anda)
```

---

## SESI 3: ILC vs Academic DISTINCTNESS
ILC URL: http://localhost:3004/products/ilc
Academic URL: http://localhost:3004/products/academic

**D1**: Buka ILC, lalu Academic. Menurut Anda, ini 2 produk BERBEDA atau hanya "ganti warna + copy"? Apa perbedaan UTAMA yang Anda lihat?
```text
(jawaban Anda — sebutkan CTA button, field form, dan expected outcome masing-masing)
```

**D2**: [LawyersHub vs Services.ID] Form dan tombol CTA keduanya — menurut Anda, ini "beda label doang" atau benar-benar untuk PEKERJAAN BERBEDA?
```text
(jawaban Anda)
```

---

## SESI 4: GOVERNANCE TRACE (Observability)
URL: http://localhost:3004/products/lawyershub/requirements/case-101/trace

**G8**: Lihat 8 node di halaman ini.
(a) Sebutkan node-node yang Anda lihat!
(b) Di node DECISION — apa NEXT ACTION yang direkomendasikan untuk kasus ini?
(c) Apakah node-node ini membantu Anda MEMAHAMI apa yang terjadi dengan data Anda, atau hanya tulisan teknis yang tidak berguna?
```text
(a) ...
(b) ...
(c) ...
```

---

## SESI 5: SHARED RAIL INVISIBILITY CHECK
Buka KEEMPAT halaman landing (LH, SRV, ILC, Academic). Scroll SAMPAI BAWAH masing-masing.

**INV1**: Apakah Anda melihat kata-kata ini di HALAMAN LANDING (bukan halaman trace governance)?
  [ ] EOS
  [ ] registry / command registry
  [ ] command bus
  [ ] shared rail
  [ ] capability invocation
  [ ] unified command
Centang kata YANG ANDA TEMUKAN di landing pages. Biarkan kosong jika TIDAK DITEMUKAN.

```text
(jawaban Anda — centang atau daftar kata yang ditemukan)
```

---

## SESI AKHIR: Verdict
Untuk setiap kalimat, lingkari PASS atau FAIL:

B4-G1 [PASS / FAIL] — Saya paham LawyersHub untuk apa + natural first action jelas + expected outcome produk-spesifik
B4-G2 [PASS / FAIL] — Saya paham Services.ID untuk PEKERJAAN BERBEDA + natural first action BERBEDA + expected outcome BERBEDA
B4-G3 [PASS / FAIL] — LawyersHub ≠ Services.ID ≠ ILC ≠ Academic — saya rasakan beda produk, bukan sekadar skin
B4-G4 [PASS / FAIL] — Di landing pages (bukan trace), saya TIDAK menemukan bahasa teknis EOS/internal
B4-G5 [PASS / FAIL] — Governance trace node dapat saya baca dan saya bisa sebut next action per produk
B4-G6 [PASS / FAIL] — Secara keseluruhan, ini rasanya seperti beberapa produk berbeda dalam satu workspace, BUKAN satu aplikasi dengan beberapa tema warna.

```text
(pilih PASS/FAIL per gate, dan beri satu kalimat penutup)
```
