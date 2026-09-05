# W4-001: FEEDBACK FORM REAL USER TESTING
## Workflow: LH-REAL-001 "Mendirikan PT XYZ Indonesia"
Jalankan perintah: `cd /root/Enterprise-OS/workspace/products/lawyershub/bin && npx tsx run-real-workflow.ts`

---

## 🎭 Actor 1: PENGUSAHA (Andi, Pemilik Bisnis)
Waktu yang dibutuhkan: ~5 menit

### Langkah yang harus dilakukan:
1. Masukkan nama: `Andi`
2. Masukkan nama case: `PT XYZ Indonesia - Pendirian Perusahaan`
3. Ikuti instruksi sampai selesai

### Pertanyaan Feedback:
```
[ ] 1. Apakah Anda langsung mengerti apa yang harus dilakukan saat pertama kali masuk? (Y/T)
[ ] 2. Apakah Anda tahu Work Anda (Mendirikan PT) sedang berada di status apa? (Y/T)
[ ] 3. Apakah Anda tahu siapa yang akan mengerjakan Work selanjutnya? (Y/T)
[ ] 4. Apakah Anda tahu action apa yang harus Anda lakukan selanjutnya? (Y/T)
[ ] 5. Waktu yang dibutuhkan untuk memahami alur: ____ menit
[ ] 6. Jumlah kebingungan yang dialami: ____ (0 = tidak ada, 5 = sangat banyak)
[ ] 7. Ada blocker yang membuat Anda tidak bisa lanjut? Jelaskan:
```

---

## 🎭 Actor 2: ADVOKAT (Budi, Pengacara Perusahaan)
Waktu yang dibutuhkan: ~5 menit

### Langkah yang harus dilakukan:
1. Lanjutkan workflow yang sudah dimulai Pengusaha
2. Masukkan nama Notaris: `Dedi`
3. Workflow akan mengajukan Anda untuk menyerahkan Work ke Notaris
4. Ikuti instruksi sampai Work berpindah ke Actor 3

### Pertanyaan Feedback:
```
[ ] 1. Apakah Anda langsung memahami keadaan Work saat pertama kali melihatnya? (Y/T)
[ ] 2. Apakah next action yang harus Anda lakukan jelas? (Y/T)
[ ] 3. Apakah context (informasi case, dokumen) cukup untuk melanjutkan? (Y/T)
[ ] 4. Apakah Anda bisa melakukan semua action tanpa bingung? (Y/T)
[ ] 5. Waktu yang dibutuhkan untuk memahami alur: ____ menit
[ ] 6. Jumlah kebingungan yang dialami: ____
[ ] 7. Ada blocker yang membuat Anda tidak bisa lanjut? Jelaskan:
```

---

## 🎭 Actor 3: NOTARIS (Dedi, Notaris Jakarta)
Waktu yang dibutuhkan: ~5 menit

### Langkah yang harus dilakukan:
1. Login ke workflow saat Advokat sudah menyerahkan Work kepada Anda
2. Masukkan nama dokumen: `AKTA PENDIRIAN PT XYZ INDONESIA`
3. Verifikasi semua informasi case
4. Ajukan dokumen ke Kemenkumham (simulasi dalam workflow)
5. Setujui penutupan case setelah dokumen disetujui

### Pertanyaan Feedback:
```
[ ] 1. Apakah Anda bisa masuk di tengah Work tanpa masalah? (Y/T)
[ ] 2. Apakah Anda mengerti apa yang sudah terjadi sebelum Anda masuk? (Y/T)
[ ] 3. Apakah evidence dan dokumen yang ada cukup jelas? (Y/T)
[ ] 4. Apakah Anda bisa melanjutkan Work tanpa bertanya ulang ke orang lain? (Y/T)
[ ] 5. Waktu yang dibutuhkan untuk memahami alur: ____ menit
[ ] 6. Jumlah kebingungan yang dialami: ____
[ ] 7. Ada blocker yang membuat Anda tidak bisa lanjut? Jelaskan:
```

---

## 📊 Klasifikasi Feedback (Opsional untuk Tim EOS)
- 🔴 BLOCKER = User tidak bisa menyelesaikan Work
- 🟡 FRICTION = User bisa selesai tapi bingung/perlu usaha ekstra
- 🟢 PREFERENCE = Masukan personal (warna, layout, dll)