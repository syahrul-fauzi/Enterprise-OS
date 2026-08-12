import { randomUUID } from "node:crypto";
import {
  UserRepositoryPostgres,
  TenantRepositoryPostgres,
  WorkspaceRepositoryPostgres,
  MembershipRepositoryPostgres,
} from "../capabilities/identity/implementation/repositories";
import { initIdentitySchema } from "../capabilities/identity/implementation/repositories/base.repository";
import { passwordService } from "../capabilities/identity/implementation/services/password.service";
import {
  UserId, TenantId, WorkspaceId, MembershipId,
  type UserAggregate, type TenantAggregate, type WorkspaceAggregate, type MembershipAggregate
} from "../capabilities/identity/implementation/contracts/identity.contracts";
import { slugifyForTenant } from "../capabilities/identity/implementation/services/password.service";

async function seed() {
  await initIdentitySchema();
  const users = [
    { email: "alice@eos.dev", password: "password123", displayName: "Alice", tenantName: "Alice Personal" },
    { email: "bob@eos.dev", password: "password123", displayName: "Bob", tenantName: "Bob Personal" },
  ];
  for (const s of users) {
    const existing = await UserRepositoryPostgres.byEmail(s.email);
    if (existing) {
      console.log(`  SKIP: ${s.email} already exists (${existing.id})`);
      continue;
    }
    const now = new Date();
    const user: UserAggregate = {
      id: UserId(`user-${randomUUID()}`),
      email: s.email.trim().toLowerCase(),
      displayName: s.displayName,
      passwordHash: passwordService.hash(s.password),
      createdAt: now, updatedAt: now,
    };
    await UserRepositoryPostgres.save(user);
    const slugBase = slugifyForTenant(`${s.displayName}-${s.email.split("@")[0]}`);
    let slug = slugBase;
    let counter = 1;
    while (await TenantRepositoryPostgres.bySlug(slug)) {
      slug = `${slugBase}-${++counter}`;
    }
    const tenant: TenantAggregate = {
      id: TenantId(`tenant-${randomUUID()}`),
      name: s.tenantName, slug, ownerId: user.id,
      createdAt: now, updatedAt: now,
    };
    await TenantRepositoryPostgres.save(tenant);
    const workspace: WorkspaceAggregate = {
      id: WorkspaceId(`workspace-${randomUUID()}`),
      tenantId: tenant.id, name: "Professional Workspace",
      slug: slugifyForTenant("Professional Workspace"),
      productId: "services-id.default",
      createdAt: now, updatedAt: now,
    };
    await WorkspaceRepositoryPostgres.save(workspace);
    const membership: MembershipAggregate = {
      id: MembershipId(`membership-${randomUUID()}`),
      userId: user.id, tenantId: tenant.id, workspaceId: workspace.id,
      role: "owner", joinedAt: now, updatedAt: now,
    };
    await MembershipRepositoryPostgres.save(membership);
    console.log(`  CREATED: ${s.email} [${user.id}] -> tenant=${tenant.name} workspace=${workspace.id} role=owner`);
  }
  console.log("Seed complete.");
}
seed();
