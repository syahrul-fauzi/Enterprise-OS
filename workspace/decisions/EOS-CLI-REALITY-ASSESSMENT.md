# EOS CLI Reality Assessment

Status: Draft
Owner: Enterprise Architecture / Tooling
Scope: `workspace/packages/tooling/eos-cli`

## 1. Purpose

Dokumen ini menjawab pertanyaan paling dasar sebelum ownership matrix atau
refactor dilakukan:

- apa status nyata `eos-cli` saat ini
- mana surface yang terbukti dipakai
- mana yang hanya terbukti tersedia
- mana yang terutama berfungsi sebagai runtime/test substrate

Dokumen ini sengaja berhenti pada **reality check berbasis bukti**.

Dokumen ini **bukan** ownership matrix, **bukan** roadmap, dan **bukan**
strategi remediation.

## 2. Method

Reality check ini disusun dari bukti berikut:

- manifest paket dan entrypoint CLI
- inventaris source file dan test file
- command yang benar-benar diregistrasikan di `src/index.ts`
- referensi `pnpm eos ...` pada workflow, script workspace, dokumentasi, dan
  artefak EOS yang sudah materialized
- path penulisan artefak pada implementation saat ini

## 3. Facts

### 3.1 Package shape

- Paket: `@repo/tooling-eos-cli`
- `private: true`
- binary `eos` masih menunjuk ke `./src/index.ts`
- package ini bukan hanya command handler; isi `src/` mencakup runtime,
  producers, projections, repositories, bundles, contracts, dan scripts

Evidence:

- `workspace/packages/tooling/eos-cli/package.json`
- `workspace/packages/tooling/eos-cli/src/`

### 3.2 Command surface

`src/index.ts` saat ini meregistrasikan 15 `case` top-level, tetapi itu termasuk
alias dan help.

Surface command yang bermakna secara operasional:

- `status`
- `execution`
- `gate-c`
- `verify-product`
- `verify-portfolio`
- `verify-capability-registry`
- `discover-capability`
- `plan-capability`
- `verify-foundation`
- `verify-constitution`
- `query`

Rinciannya:

- 11 top-level command families operasional
- `execution` punya 5 subcommand:
  - `status`
  - `refresh-status`
  - `next`
  - `advance`
  - `complete-dod`
- `gate-c` punya 8 subcommand:
  - `status`
  - `refresh-status`
  - `regenerate`
  - `accept`
  - `genesis-evidence`
  - `verify-genesis-baseline`
  - `coverage`
  - `run-case`

Evidence:

- `workspace/packages/tooling/eos-cli/src/index.ts`

### 3.3 Test reality

- Paket ini memiliki **29** file test.
- Namun mayoritas test memverifikasi runtime, producer, projection, evidence,
  dan contract internals.
- Bukti test yang langsung menyentuh command module sangat sedikit. Yang
  terlihat eksplisit adalah `gate-c-status-projection.test.ts` yang mengimpor
  `buildGateCStatusProjection` dari surface command.

Interpretasi faktual:

- yang banyak dites saat ini adalah **capability/runtime substrate**
- yang relatif sedikit dibuktikan langsung adalah **CLI invocation surface**

Evidence:

- `workspace/packages/tooling/eos-cli/tests/`
- `workspace/packages/tooling/eos-cli/tests/gate-c-status-projection.test.ts`

### 3.4 Confirmed operational usage

Berikut usage yang dapat dibuktikan langsung dari workflow, script workspace,
atau artefak EOS yang sudah ada:

| Surface | Evidence of use | Status |
| --- | --- | --- |
| `verify-foundation` | `workspace/package.json` script `governance:gate`; banyak artefak verification mencatat `execution_scope` / `consumer_command: pnpm eos verify-foundation` | Confirmed operational |
| `verify-capability-registry` | `workspace/package.json` script `governance:gate` | Confirmed operational |
| `gate-c refresh-status` | `workspace/package.json` script `governance:gate` | Confirmed operational |
| `gate-c verify-genesis-baseline` | `.github/workflows/gate-c-genesis-baseline.yml`; `workspace/package.json` script `verify:genesis-baseline` | Confirmed operational |
| `gate-c genesis-evidence` | tersimpan pada log historis `enterprise/science/gate-c/execution/runs/*/logs/original.yaml` | Confirmed historical operational use |
| `gate-c accept` | disebut dalam report historis `enterprise/science/gate-c/execution/runs/*/report.yaml` sebagai langkah resmi acceptance | Confirmed historical operational use |
| `verify-product lawyershub` | `workspace/products/lawyershub/evidence/verification/proof-of-composition.md` | Confirmed documented use |
| `status` | `workspace/README.md` menyebut `pnpm eos status` sebagai read model consumer | Confirmed documented use |

### 3.5 Present but direct usage not yet proven

Berikut surface yang **jelas ada** dan pada beberapa kasus menghasilkan artefak,
tetapi dari bukti yang dikumpulkan sekarang belum terlihat invocation operasional
yang eksplisit dari workflow/script utama:

| Surface | Reality status |
| --- | --- |
| `verify-constitution` | Present and artifact-producing, but direct operational usage not yet proven from workflow/script |
| `verify-portfolio` | Present and artifact-producing, but direct operational usage not yet proven from workflow/script |
| `execution` family | Present and stateful, but direct operational usage not yet proven from workflow/script |
| `discover-capability` | Present, usage not yet proven |
| `plan-capability` | Present, usage not yet proven |
| `query` | Present, runtime tested, usage not yet proven |

### 3.6 Artifact-producing surfaces

`eos-cli` saat ini bukan hanya membaca state. Beberapa surface jelas menghasilkan
artefak EOS resmi:

| Surface | Artifact reality |
| --- | --- |
| `execution` | menulis `enterprise/execution/CAPABILITY-REGISTRY.yaml` dan `enterprise/execution/EXECUTION-STATUS.yaml` |
| `gate-c` | menulis berbagai YAML evidence/run artifact, termasuk `enterprise/science/gate-c/execution/gate-c-status.yaml` dan ledger terkait |
| `verify-foundation` | menulis banyak artefak ke `workspace/foundation/evidence/verification/**` dan `workspace/foundation/evidence/registry/**` |
| `verify-constitution` | menulis report, law results, proof bundle, trust framework, dan artefak governance terkait |
| `verify-product` | menulis evidence verifikasi produk, projection artifact, dan summary text |
| `verify-portfolio` | menulis report dan summary portofolio |
| `verify-capability-registry` | menulis registry, debt budget, certification, dan summary artifacts |

Evidence:

- `workspace/packages/tooling/eos-cli/src/commands/execution.ts`
- `workspace/packages/tooling/eos-cli/src/gate/commands/gate-c.ts`
- `workspace/packages/tooling/eos-cli/src/foundation/commands/verify-foundation.ts`
- `workspace/packages/tooling/eos-cli/src/commands/verify-constitution.ts`
- `workspace/packages/tooling/eos-cli/src/commands/verify-product.ts`
- `workspace/packages/tooling/eos-cli/src/commands/verify-portfolio.ts`
- `workspace/packages/tooling/eos-cli/src/commands/capability-registry.ts`

## 4. Observations

### 4.1 `eos-cli` is not a trivial CLI wrapper

Reality saat ini menunjukkan bahwa `eos-cli` bukan paket CLI tipis. Paket ini
memadukan:

- command surface
- runtime/capability implementation
- projection/materialization logic
- producer/evidence logic
- test substrate

Artinya pertanyaan "dipakai atau cuma sampah?" tidak bisa dijawab biner.
Sebagian surface jelas bernilai operasional, tetapi paket ini juga memikul
fungsi runtime yang lebih luas daripada sekadar CLI.

### 4.2 Operational value is real, but uneven

Surface berikut punya nilai operasional yang jelas:

- governance gate flow
- Gate C baseline verification / refresh-status
- foundation verification
- product verification
- repository status readout

Namun tidak semua command family punya bukti pemakaian yang setara.

### 4.3 Tests validate internals more than CLI invocation

Ini penting untuk penentuan langkah berikut:

- kepercayaan terhadap runtime internals relatif tinggi
- kepercayaan terhadap command invocation surface lebih rendah, karena bukti test
  langsung pada handler command relatif minim

### 4.4 `eos-cli` already participates in EOS artifact lifecycle

Karena command-command tertentu benar-benar menulis artefak resmi EOS, maka
`eos-cli` saat ini **bukan** sekadar reference implementation yang bisa dihapus
tanpa dampak.

Surface tertentu sudah menjadi bagian dari governance, gate, dan verification
lifecycle yang nyata.

## 5. Unknowns

Reality check ini masih menyisakan hal-hal yang **belum** bisa dipastikan hanya
dari bukti yang sudah dibaca:

- frekuensi nyata pemakaian tiap command oleh operator manusia
- apakah `discover-capability`, `plan-capability`, `query`, dan sebagian
  `execution` dipakai rutin atau hanya disiapkan
- berapa persen surface command yang dianggap canonical oleh tim saat ini
- mana command yang dipertahankan untuk jangka panjang vs hanya compatibility /
  historical surface

## 6. Current Position

Berdasarkan bukti yang ada saat ini, posisi paling akurat adalah:

1. `eos-cli` **bukan sampah**.
2. `eos-cli` **punya surface yang benar-benar dipakai** dalam workflow EOS.
3. `eos-cli` juga **lebih besar dari sekadar CLI**, karena banyak runtime dan
   capability implementation masih hidup di paket yang sama.
4. Karena itu, langkah berikutnya **tidak boleh** diasumsikan sebagai rewrite
   ataupun ownership matrix otomatis.
5. Keputusan berikutnya harus diturunkan dari fakta ini:
   - mana surface yang confirmed operational
   - mana yang present but unproven
   - mana yang terutama runtime/test substrate

## 7. Audit Boundary

Dokumen ini berhenti pada:

- inventaris surface
- bukti pemakaian
- bukti test
- bukti artefak
- status aktual paket

Dokumen ini **tidak** memutuskan:

- apa yang harus dihapus
- apa yang harus diekstrak
- apa yang harus dipertahankan
- ownership matrix final
- urutan refactor
