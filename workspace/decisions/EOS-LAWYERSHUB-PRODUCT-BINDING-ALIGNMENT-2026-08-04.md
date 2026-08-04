# EOS LawyersHub Product Binding Alignment

## Decision

Align `lawyershub` to the canonical product path:

```text
products/lawyershub
  -> product.binding.yaml
  -> apps/web
  -> /requirements
  -> requirement-management
```

This alignment is added without changing `apps/web` and without reviving
`apps/lawyershub` as the preferred product runtime model.

## Why

- `services-id` and `ilc` already use canonical product binding into `apps/web`.
- `lawyershub` remained present in product portfolio semantics, but did not yet
  carry the same product binding manifest in `products/`.
- Adding the binding gives EOS a cleaner three-product semantic baseline on the
  same thin experience surface.

## Change

Added:

- `workspace/products/lawyershub/product.binding.yaml`

Manifest content:

- product id: `lawyershub`
- display name: `LawyersHub`
- surface: `web`
- route: `/requirements`
- capability: `requirement-management`

## Verification

Executed a non-destructive binding proof:

```bash
EOS_PRODUCT_BINDING_PRODUCT_ID=lawyershub \
pnpm --dir /root/Enterprise-OS/workspace exec node --import tsx --test \
  --test-reporter tap packages/tooling/eos-cli/tests/product-binding-proof.test.ts
```

Result:

- PASS `product binding resolves to the canonical web experience surface`
- PASS `resolved experience surface exposes the shared requirement capability`
- PASS `resolved route reuses the existing Requirement experience implementation`
- PASS `web experience surface source remains product-agnostic`

## Portfolio Impact

Resynced enterprise portfolio verification after adding the binding:

```bash
pnpm --dir /root/Enterprise-OS/workspace eos verify-portfolio enterprise
```

Result:

- portfolio status remains `HEALTHY_PORTFOLIO`
- `lawyershub` capability view in the portfolio report now resolves through the
  canonical `apps/web` binding
- `lawyershub` no longer contributes legacy-only capabilities (`legal-case`,
  `legal-document`) to the shared portfolio capability view
- portfolio `capability_overlap_ratio` increased from `0.2` to `0.3333`

This gives portfolio-level evidence a cleaner reading of the current canonical
product path while leaving legacy product verification artifacts intact.

## Boundary

This change does **not**:

- change `apps/web`
- migrate `apps/lawyershub`
- overwrite existing `products/lawyershub/evidence/verification/*` artifacts
- claim that legacy `lawyershub` verification artifacts are now identical to
  canonical binding evidence

## Next Safe Step

If and when product-level evidence unification for `lawyershub` is needed,
materialize canonical binding evidence under a non-destructive path or after an
explicit decision about replacing legacy verification artifacts.
