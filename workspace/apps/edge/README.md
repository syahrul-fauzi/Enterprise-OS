# EOS Edge — Project Context

## 1. Identity

**Project:** Enterprise-OS (EOS)
**Application:** `apps/edge`
**Working Name:** EOS Edge
**Role:** Device-side Runtime / Edge Execution Surface
**Primary Implementation:** Rust + Tauri v2
**Architectural Principle:** Work Continuity

`apps/edge` adalah aplikasi runtime sisi perangkat dalam ekosistem Enterprise-OS yang membawa kemampuan EOS keluar dari browser dan mendekatkannya ke lingkungan tempat pekerjaan benar-benar berlangsung.

`apps/edge` bukan pengganti `apps/web`, bukan aplikasi FACE, dan bukan produk EOS yang berdiri sendiri.

---

## 2. EOS Surface Model

Enterprise-OS memiliki beberapa execution/interaction surfaces dengan boundary yang berbeda:

```text
Enterprise-OS
│
├── apps/api
│   └── System / API Surface
│
├── apps/web
│   └── Experience Surface / EOS Experience Face
│
├── apps/edge
│   └── Device / Edge Runtime Surface
│
└── packages/*
    └── EOS Core / Semantic / Composition Substrate
```

Masing-masing surface memiliki tanggung jawab berbeda, tetapi semuanya mempertahankan invariant yang sama:

> **Work Continuity**

---

## 3. What is EOS Edge?

**EOS Edge** adalah runtime yang memungkinkan EOS beroperasi pada boundary antara sistem digital EOS dan environment perangkat pengguna.

Edge memungkinkan EOS untuk berinteraksi dengan:

* operating system;
* native applications;
* local files and resources;
* device context;
* local state;
* local network;
* offline environment;
* local AI/runtime;
* device capabilities;
* native automation mechanisms.

Dengan demikian, EOS tidak berhenti pada browser.

```text
EOS Web
   │
   │ Work Continuity
   ▼
EOS Edge
   │
   ├── Device
   ├── OS
   ├── Native Applications
   ├── Local Context
   ├── Local State
   └── Local Runtime
   │
   ▼
Real Work Environment
```

---

## 4. Relationship to EOS Experience Face

**FACE adalah Experience Face EOS.**

FACE bukan nama aplikasi Edge.

`apps/web` merupakan primary Experience Face tempat manusia mengalami, melihat, memahami, dan mengambil alih Work dalam EOS.

`apps/edge` mempunyai fungsi yang berbeda:

```text
apps/web
    │
    │ Experience
    ▼
Human
    │
    │ Work
    ▼
apps/edge
    │
    │ Runtime / Execution
    ▼
Device / OS / Application
```

Dengan demikian:

> **Web presents the Work.**
> **Edge carries the Work into the environment.**

---

## 5. Architectural Purpose

Tujuan utama `apps/edge` bukan membuat desktop application baru.

Tujuan utamanya adalah menyediakan **runtime boundary** agar Work yang dikelola EOS dapat mempertahankan:

* identity;
* context;
* state;
* authority;
* execution continuity;
* evidence;
* outcome;

ketika execution berpindah antara:

* browser;
* native application;
* local device;
* human;
* agent;
* online runtime;
* offline runtime.

Prinsip dasarnya:

```text
Execution substrate may change.
Work identity and continuity must remain.
```

---

## 6. Position in the EOS Architecture

EOS mempertahankan Work sebagai objek yang independen terhadap execution substrate.

```text
                    WORK
                     │
        ┌────────────┼────────────┐
        │            │            │
       Web          API         Edge
        │            │            │
      Human        System      Device
        │            │            │
        └────────────┼────────────┘
                     │
              Work Continuity
```

Karena itu `apps/edge` bukan pusat Work.

Ia adalah salah satu **execution surfaces** yang mengonsumsi dan menghasilkan state Work melalui boundary EOS yang ditentukan.

---

## 7. Core Responsibilities

### 7.1 Local Runtime

Menjalankan komponen EOS yang membutuhkan proximity terhadap device.

Contoh:

* local state;
* local event handling;
* device capability access;
* local execution;
* local agent runtime;
* native application interaction.

### 7.2 Context Acquisition

Mengambil context yang hanya tersedia atau lebih reliable di sisi perangkat.

Contoh:

* active application;
* active window;
* device state;
* local environment;
* user interaction context;
* local filesystem context;
* optional ambient/device signals.

Context harus dinormalisasi menjadi bentuk yang dapat dipahami EOS.

### 7.3 State Hydration

Mendukung proses:

```text
EOS Work State
      ↓
Edge State
      ↓
Local Execution
      ↓
Updated State
      ↓
EOS
```

State hydration tidak boleh membuat Edge memiliki definisi Work sendiri yang bertentangan dengan EOS Core.

### 7.4 Native Execution

Menyediakan controlled execution boundary untuk kebutuhan yang tidak dapat dilakukan secara langsung oleh browser.

Contoh:

```text
EOS Intent
   ↓
Edge Capability
   ↓
Native OS API
   ↓
Application
   ↓
Execution Result
   ↓
Evidence / State
```

### 7.5 Offline Continuity

Edge harus mampu mempertahankan bagian Work yang diperlukan ketika konektivitas ke server/cloud tidak tersedia.

```text
ONLINE
  ↓
State synchronized
  ↓
NETWORK INTERRUPTION
  ↓
LOCAL EDGE STATE
  ↓
LOCAL EXECUTION
  ↓
NETWORK RESTORED
  ↓
RECONCILIATION
```

Offline mode bukan Work baru.

Ia merupakan continuation dari Work yang sama.

---

## 8. Technology Boundary

### Primary Technology

```text
Rust
Tauri v2
```

Rust + Tauri v2 adalah **implementation technology**, bukan identitas arsitektur EOS.

Arsitektur tidak boleh bergantung secara konseptual pada Tauri.

Dengan demikian:

```text
EOS Architecture
       │
       ▼
Edge Runtime Contract
       │
       ▼
Rust + Tauri v2
```

Jika teknologi implementasi berubah di masa depan, konsep `Edge Runtime` tetap valid.

---

## 9. Proposed Internal Boundary

Initial structure:

```text
apps/edge/
│
├── src/
│   └── ...
│
├── src-tauri/
│   └── ...
│
├── capabilities/
│   ├── context/
│   ├── device/
│   ├── execution/
│   ├── hydration/
│   └── continuity/
│
├── platforms/
│   ├── windows/
│   └── android/
│
└── README.md
```

Struktur tersebut bersifat **initial implementation boundary**, bukan keputusan final mengenai package topology EOS.

Jangan memindahkan domain/core semantics ke `apps/edge` hanya karena Edge membutuhkannya.

Core semantics tetap berada pada boundary EOS yang sesuai.

---

## 10. Relationship with `apps/api`

`apps/api` tetap menjadi system/API surface EOS.

Edge tidak membuat API authority sendiri.

```text
apps/api
    │
    │ canonical EOS interaction
    ▼
apps/edge
    │
    │ local execution
    ▼
Device
```

Edge dapat melakukan local work, tetapi canonical Work semantics tetap mengikuti EOS.

---

## 11. Relationship with `apps/web`

`apps/web` adalah Experience Face.

Edge melengkapi Web, bukan menggantikannya.

```text
             EOS
              │
       ┌──────┴──────┐
       │             │
      Web           Edge
       │             │
   Experience     Execution
       │             │
       └──────┬──────┘
              │
       Work Continuity
```

Contoh:

```text
User melihat Work di Web
        ↓
EOS menentukan next action
        ↓
Edge menerima authorized execution
        ↓
Native application melakukan pekerjaan
        ↓
Result / evidence kembali ke EOS
        ↓
Web merepresentasikan state terbaru
```

---

## 12. Relationship with Agents

Agent bukan sinonim Edge.

Agent dapat berjalan di:

* server;
* cloud;
* browser;
* edge;
* local runtime.

Edge hanya menyediakan execution/context boundary apabila agent membutuhkan kemampuan perangkat.

```text
Agent
  │
  │ intent / action
  ▼
EOS
  │
  │ authorized capability
  ▼
Edge
  │
  ▼
Native Environment
```

Dengan demikian Edge tetap tunduk kepada EOS capability, authority, dan Work semantics.

---

## 13. Work Continuity Contract

Setiap interaksi Edge harus dapat dijelaskan sebagai continuation terhadap Work.

Minimal lifecycle:

```text
Observe
   ↓
Contextualize
   ↓
Hydrate
   ↓
Authorize
   ↓
Execute
   ↓
Observe Result
   ↓
Persist / Synchronize
   ↓
Continue Work
```

Edge tidak boleh menjadi black-box executor yang kehilangan hubungan dengan Work.

---

## 14. Evidence Principle

Execution di Edge harus menghasilkan state/evidence yang dapat dikorelasikan kembali dengan Work.

```text
Work
 │
 ├── Intent
 ├── Context
 ├── Authority
 ├── Edge Execution
 ├── Result
 └── Evidence
```

Dengan demikian:

> **An action executed on a device must remain attributable to the Work that caused it.**

Ini mempertahankan prinsip EOS mengenai continuity, governance, dan evidence.

---

## 15. Security Boundary

Karena Edge memiliki proximity terhadap operating system, Edge merupakan security-sensitive boundary.

Capabilities harus bersifat explicit dan scoped.

Contoh:

```text
Capability
    ↓
Permission
    ↓
Authorization
    ↓
Execution
    ↓
Evidence
```

Tidak boleh:

```text
Agent
  ↓
arbitrary OS access
```

Edge harus menjadi **controlled execution boundary**, bukan unrestricted automation daemon.

---

## 16. Non-Goals

`apps/edge` bukan:

* replacement untuk `apps/web`;
* replacement untuk `apps/api`;
* standalone ERP;
* desktop dashboard;
* generic remote-control application;
* generic AI chatbot;
* second EOS core;
* second Work database;
* arbitrary OS automation engine;
* Face application.

Terutama:

> **Edge tidak mendefinisikan ulang EOS Work model.**

---

## 17. Strategic Role

Strategically, `apps/edge` memperluas EOS dari:

```text
System / Browser
```

menjadi:

```text
System
   +
Experience
   +
Device
   +
Environment
```

Sehingga EOS dapat bergerak dari sekadar system yang **merepresentasikan Work** menjadi system yang dapat **accompany Work across execution boundaries**.

```text
                 WORK
                  │
                  ▼
             EOS Core
                  │
       ┌──────────┼──────────┐
       │          │          │
      API        WEB        EDGE
       │          │          │
     System    Experience   Runtime
                            │
                            ▼
                       Environment
```

---

## 18. Strategic Thesis

`apps/edge` menjadi experimental/implementation surface untuk menguji pertanyaan yang lebih besar dari EOS:

> **Can a Work remain continuous when its execution moves across browser, native application, device, agent, and network boundaries?**

Jawaban terhadap pertanyaan tersebut harus dibuktikan melalui:

* state continuity;
* context continuity;
* authority continuity;
* execution continuity;
* evidence continuity;
* recovery after interruption.

---

## 19. Initial Success Criteria

Keberhasilan `apps/edge` bukan diukur dari jumlah fitur desktop/mobile.

Ukuran utamanya:

### Work Continuity

Apakah Work dapat dilanjutkan tanpa kehilangan identity dan context?

### Context Continuity

Apakah Edge dapat memperoleh context yang diperlukan tanpa memutus semantic relationship dengan Work?

### Execution Continuity

Apakah Work dapat berpindah dari Web/Cloud ke local/native execution?

### Offline Continuity

Apakah Work tetap dapat bergerak ketika connectivity terputus?

### Evidence Continuity

Apakah execution Edge tetap dapat ditelusuri kembali ke Work?

### Human Continuity

Apakah manusia dapat mengambil alih execution tanpa kehilangan context?

---

## 20. One-Line Definition

> **`apps/edge` is the Enterprise-OS device-side runtime surface that extends Work Continuity from the EOS system and Experience Face into the user's local execution environment.**

Versi singkat untuk repository:

> **EOS Edge — the device-side runtime surface for Work Continuity.**

---

## 21. Architectural Principle

```text
API serves EOS.
Web presents EOS.
Edge accompanies EOS into the environment.
Core defines the semantics.
Work Continuity connects them.
```

**EOS Edge bukan EOS yang baru.**

Ia adalah **surface baru dari EOS** yang memungkinkan prinsip Work Continuity bekerja sampai ke boundary perangkat dan execution environment.

### Jadi secara strategis, posisi kita sekarang

```text
                    ENTERPRISE-OS
                         │
              ┌──────────┼──────────┐
              │          │          │
           API         WEB        EDGE
              │          │          │
          System      Experience   Device
          Surface       Face       Runtime
              │          │          │
              └──────────┼──────────┘
                         │
                  WORK CONTINUITY
```