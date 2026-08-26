# PROTOKOL TEST HUMAN-REAL-001 + WORK-MOVE-REAL-001
## Generated: 2026-08-25T12:00:00Z
### Rules for Observer:
- **NO BRIEFING**: Anda tidak menjelaskan apa itu EOS, Work Reality, atau istilah teknis apapun.
- **FIRST IMPRESSION ONLY**: Jawab dengan pengalaman pertama Anda.
- **JANGAN MENEBAK**: Jika bingung, tulis "SAYA TIDAK TAHU".
- **ALAMI SAJA**: Lakukan tindakan pertama yang ingin Anda lakukan tanpa dipandu.

---

## SESI 1: HUMAN-REAL-001 (Comprehension Test)
URL: http://localhost:3004/products/lawyershub/cases/case-ptabc-001

### Test untuk CUSTOMER (sudah masuk sebagai customer-001)
> **Pertanyaan 1**: "Tanpa saya jelaskan layar ini, pekerjaan ini sekarang sedang berada di tahap mana?"
```text
(Jawaban Anda)
```

> **Pertanyaan 2**: "Apa yang harus Anda lakukan selanjutnya, menurut layar ini?"
```text
(Jawaban Anda)
```

---

### Test untuk PROFESSIONAL (sudah masuk sebagai lawyer-001)
> **Pertanyaan 1**: "Tanpa saya jelaskan layar ini, pekerjaan ini sekarang sedang berada di tahap mana?"
```text
(Jawaban Anda)
```

> **Pertanyaan 2**: "Kalau Anda yang bertanggung jawab sekarang, apa yang akan Anda lakukan?"
```text
(Jawaban Anda)
```

---

### Test untuk OPERATOR (sudah masuk sebagai operator-001)
> **Pertanyaan 1**: "Tanpa saya jelaskan layar ini, pekerjaan ini sekarang sedang berada di tahap mana?"
```text
(Jawaban Anda)
```

> **Pertanyaan 2**: "Dari layar ini, apa yang sedang menunggu atau berpotensi macet?"
```text
(Jawaban Anda)
```

---

### Pertanyaan Akhir SEMUA ROLE
> **"Kalau Anda harus menjelaskan layar ini kepada orang lain dalam satu kalimat, apa yang Anda katakan?"**
```text
(Jawaban Anda)
```

---

## SESI 2: WORK-MOVE-REAL-001 (Execution Test)
Instruksi ke test user: **"PT ABC harus diselesaikan. Silakan lakukan semua yang perlu untuk menyelesaikan pekerjaan ini."**

Observer catat SEMUA perilaku user:
1. [ ] Apakah mereka tahu harus mulai dari mana? (Waktu < 30 detik untuk klik action pertama)
2. [ ] Apakah mereka tahu apa yang harus dilakukan berikutnya?
3. [ ] Apakah mereka tahu siapa yang bertanggung jawab?
4. [ ] Apakah mereka harus bertanya kepada operator?
5. [ ] Apakah mereka mengulang context ("Ini buat apa ya?")
6. [ ] Apakah mereka kehilangan posisi Work ("Ini kasus apa lagi tadi?")
7. [ ] Apakah mereka bisa menemukan blocker?
8. [ ] Apakah mereka bisa mencapai completion (kasus menjadi "closed")?

---

## EVALUASI LEVEL
Setelah test selesai, tentukan level EOS:
- [ ] LEVEL 1 (WEAK): "Looks understandable" — user bingung tapi bisa tebak
- [ ] LEVEL 2 (GOOD): "User can explain what is happening" — semua role bisa jelaskan state
- [ ] LEVEL 3 (STRONG): "User can determine and execute next action" — user selesaiikan semua langkah
- [ ] LEVEL 4 (🔥 EOS SIGNAL): "Different actors can continue the same Work without reconstructing context" — berpindah role tidak kehilangan context