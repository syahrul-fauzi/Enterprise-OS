import { DigestEngine } from "@repo/core-kernel";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  ConstitutionDependencyDiscovery,
  ConstitutionDependencyModuleInput,
} from "./engine.js";

type GovernedModuleDefinition = {
  readonly module_id: string;
  readonly module_kind: ConstitutionDependencyModuleInput["module_kind"];
  readonly file_path: string;
  readonly package_specifiers?: readonly string[];
};

function readModuleImports(path: string): readonly string[] {
  const source = readFileSync(path, "utf8");
  return Array.from(
    new Set(
      Array.from(source.matchAll(/from\s+["']([^"']+)["']/g))
        .map((match) => match[1] ?? "")
        .sort((left, right) => left.localeCompare(right)),
    ),
  );
}

function listSourceFiles(rootDir: string): readonly string[] {
  const entries = readdirSync(rootDir, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  return entries.flatMap((entry) => {
    const entryPath = resolve(rootDir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [entryPath] : [];
  });
}

function resolveGovernedPackageSpecifierTarget(
  specifier: string,
  packageModuleIdByName: ReadonlyMap<string, string>,
): string | null {
  if (
    specifier === "@repo/core-constitution" ||
    specifier.includes("core/constitution/dist/index.js") ||
    specifier.includes("core/constitution/src/index.ts")
  ) {
    return "core-constitution:index";
  }

  const packageTarget = packageModuleIdByName.get(specifier);
  if (packageTarget) {
    return packageTarget;
  }

  return null;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function canonicalizeDependencyModules(
  modules: readonly ConstitutionDependencyModuleInput[],
): readonly ConstitutionDependencyModuleInput[] {
  return modules
    .map((module) => ({
      module_id: module.module_id,
      module_kind: module.module_kind,
      imports: [...module.imports].sort((left, right) => left.localeCompare(right)),
      dependency_targets: [...(module.dependency_targets ?? [])].sort((left, right) =>
        left.localeCompare(right),
      ),
    }))
    .sort(
      (left, right) =>
        left.module_kind.localeCompare(right.module_kind) || left.module_id.localeCompare(right.module_id),
    );
}

function serializeCanonicalDependencyModules(
  modules: readonly ConstitutionDependencyModuleInput[],
): string {
  return DigestEngine.serialize(canonicalizeDependencyModules(modules));
}

type PackageManifest = {
  readonly name?: string;
  readonly exports?: Record<string, unknown>;
};

function normalizePackageModuleId(packageName: string): string {
  return packageName.replace(/^@repo\//, "").replaceAll("/", "-");
}

function normalizeExportSubpath(exportKey: string): string {
  return exportKey.replace(/^\.\//, "");
}

function buildPackageSpecifier(packageName: string, exportKey: string): string {
  return exportKey === "." ? packageName : `${packageName}/${normalizeExportSubpath(exportKey)}`;
}

function buildModuleIdForExport(packageName: string, exportKey: string): string {
  return exportKey === "."
    ? `${normalizePackageModuleId(packageName)}:index`
    : `${normalizePackageModuleId(packageName)}:${normalizeExportSubpath(exportKey)}`;
}

function pickExportTarget(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const defaultTarget = pickExportTarget(record.default);
    if (defaultTarget) {
      return defaultTarget;
    }
    const typesTarget = pickExportTarget(record.types);
    if (typesTarget) {
      return typesTarget;
    }
  }

  return null;
}

function resolveSourceFileFromExportTarget(packageDir: string, exportTarget: string): string | null {
  if (!exportTarget.startsWith("./dist/") || exportTarget.includes("*")) {
    return null;
  }

  if (!/\.(?:d\.ts|js|mjs)$/.test(exportTarget)) {
    return null;
  }

  const sourceBase = resolve(
    packageDir,
    exportTarget
      .replace(/^\.\//, "")
      .replace(/^dist\//, "src/")
      .replace(/\.d\.ts$/, "")
      .replace(/\.js$/, "")
      .replace(/\.mjs$/, ""),
  );

  const candidates = [
    `${sourceBase}.ts`,
    `${sourceBase}.tsx`,
    resolve(sourceBase, "index.ts"),
    resolve(sourceBase, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildWildcardExportModules(input: {
  readonly packageDir: string;
  readonly packageName: string;
  readonly moduleKind: ConstitutionDependencyModuleInput["module_kind"];
  readonly exportKey: string;
  readonly exportTarget: string;
}): readonly GovernedModuleDefinition[] {
  if (!input.exportKey.includes("*") || !input.exportTarget.includes("*")) {
    return [];
  }

  const sourceRoot = resolve(input.packageDir, "src");
  const sourceFiles = existsSync(sourceRoot) ? listSourceFiles(sourceRoot) : [];
  const normalizedTarget = input.exportTarget.replace(/^\.\//, "");
  const [targetPrefix, targetSuffix] = normalizedTarget.split("*");
  if (targetPrefix === undefined || targetSuffix === undefined) {
    return [];
  }

  return sourceFiles
    .flatMap((sourceFilePath) => {
      const sourceRelativePath = sourceFilePath.slice(sourceRoot.length + 1).replace(/\\/g, "/");
      const exportSubpath = sourceRelativePath
        .replace(/\.tsx?$/, "")
        .replace(/\/index$/, "")
        .replace(/^index$/, "");

      if (!exportSubpath) {
        return [];
      }

      const emittedRelativePath = sourceRelativePath
        .replace(/\.tsx?$/, ".js")
        .replace(/\\/g, "/");
      const emittedTarget = `src/${emittedRelativePath}`.replace(/^src\//, "dist/");

      if (!emittedTarget.startsWith(targetPrefix) || !emittedTarget.endsWith(targetSuffix)) {
        return [];
      }

      return [
        {
          module_id: buildModuleIdForExport(input.packageName, `./${exportSubpath}`),
          module_kind: input.moduleKind,
          file_path: sourceFilePath,
          package_specifiers: [buildPackageSpecifier(input.packageName, `./${exportSubpath}`)],
        },
      ];
    })
    .sort((left, right) => left.module_id.localeCompare(right.module_id));
}

function classifyPackageSurface(input: {
  readonly packageName: string;
  readonly packageDir: string;
}): ConstitutionDependencyModuleInput["module_kind"] | null {
  if (input.packageName === "@repo/core-constitution") {
    return null;
  }

  if (input.packageName === "@repo/composition") {
    return "composition_surface";
  }

  if (input.packageName === "@repo/core-runtime") {
    return "runtime_surface";
  }

  if (input.packageName === "@repo/core-capability-registry") {
    return "registry_surface";
  }

  if (input.packageName === "@repo/tooling-eos-cli") {
    return null;
  }

  return "repo_surface";
}

function buildPackageSurfaceModules(workspaceRoot: string): readonly GovernedModuleDefinition[] {
  const packageManifestPaths = [
    ...readdirSync(resolve(workspaceRoot, "packages/core"), { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(workspaceRoot, "packages/core", entry.name, "package.json")),
    ...readdirSync(resolve(workspaceRoot, "packages/presentation"), { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(workspaceRoot, "packages/presentation", entry.name, "package.json")),
    ...readdirSync(resolve(workspaceRoot, "packages/tooling"), { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(workspaceRoot, "packages/tooling", entry.name, "package.json")),
    resolve(workspaceRoot, "packages/composition/package.json"),
  ];

  return packageManifestPaths
    .filter((manifestPath) => existsSync(manifestPath))
    .flatMap((manifestPath) => {
      const packageDir = dirname(manifestPath);
      const packageManifest = readJsonFile<PackageManifest>(manifestPath);
      const packageName = packageManifest.name;
      const sourceIndexPath = resolve(packageDir, "src/index.ts");

      if (!packageName || !existsSync(sourceIndexPath)) {
        return [];
      }

      const moduleKind = classifyPackageSurface({ packageName, packageDir });
      if (!moduleKind) {
        return [];
      }

      const modules: GovernedModuleDefinition[] = [
        {
          module_id: buildModuleIdForExport(packageName, "."),
          module_kind: moduleKind,
          file_path: sourceIndexPath,
          package_specifiers: [buildPackageSpecifier(packageName, ".")],
        },
      ];

      const exportEntries = Object.entries(packageManifest.exports ?? {})
        .filter(([exportKey]) => exportKey !== "." && exportKey !== "./styles.css")
        .sort(([left], [right]) => left.localeCompare(right));

      for (const [exportKey, exportValue] of exportEntries) {
        const exportTarget = pickExportTarget(exportValue);
        if (!exportTarget) {
          continue;
        }

        if (exportKey.includes("*") || exportTarget.includes("*")) {
          modules.push(
            ...buildWildcardExportModules({
              packageDir,
              packageName,
              moduleKind,
              exportKey,
              exportTarget,
            }),
          );
          continue;
        }

        const sourceFilePath = resolveSourceFileFromExportTarget(packageDir, exportTarget);
        if (!sourceFilePath) {
          continue;
        }

        modules.push({
          module_id: buildModuleIdForExport(packageName, exportKey),
          module_kind: moduleKind,
          file_path: sourceFilePath,
          package_specifiers: [buildPackageSpecifier(packageName, exportKey)],
        });
      }

      return modules;
    })
    .filter(
      (module, index, all) => all.findIndex((entry) => entry.module_id === module.module_id) === index,
    )
    .sort((left, right) => left.module_id.localeCompare(right.module_id));
}

function buildGovernedModuleDefinitions(workspaceRoot: string): readonly GovernedModuleDefinition[] {
  const toolingRoot = resolve(workspaceRoot, "packages/tooling/eos-cli/src");
  const commandDir = resolve(toolingRoot, "commands");
  const scriptDir = resolve(toolingRoot, "scripts");

  const commandAdapterModules = readdirSync(commandDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => ({
      module_id: `tooling-eos-cli:commands/${entry.name.replace(/\.ts$/, "")}`,
      module_kind: "command_adapter" as const,
      file_path: resolve(commandDir, entry.name),
    }))
    .sort((left, right) => left.module_id.localeCompare(right.module_id));

  const toolingSupportModules = [
    {
      module_id: "tooling-eos-cli:constitution-support",
      module_kind: "tooling_support" as const,
      file_path: resolve(toolingRoot, "constitution-support.ts"),
    },
    {
      module_id: "tooling-eos-cli:index",
      module_kind: "tooling_support" as const,
      file_path: resolve(toolingRoot, "index.ts"),
    },
    {
      module_id: "tooling-eos-cli:schema",
      module_kind: "tooling_support" as const,
      file_path: resolve(toolingRoot, "schema.ts"),
    },
    {
      module_id: "tooling-eos-cli:state",
      module_kind: "tooling_support" as const,
      file_path: resolve(toolingRoot, "state.ts"),
    },
    ...readdirSync(scriptDir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => ({
        module_id: `tooling-eos-cli:scripts/${entry.name.replace(/\.ts$/, "")}`,
        module_kind: "tooling_support" as const,
        file_path: resolve(scriptDir, entry.name),
      })),
  ].sort((left, right) => left.module_id.localeCompare(right.module_id));

  return [
    {
      module_id: "core-constitution:index",
      module_kind: "constitution_engine",
      file_path: resolve(workspaceRoot, "packages/core/constitution/src/index.ts"),
      package_specifiers: ["@repo/core-constitution"],
    },
    {
      module_id: "core-constitution:engine",
      module_kind: "constitution_engine",
      file_path: resolve(workspaceRoot, "packages/core/constitution/src/engine.ts"),
    },
    ...buildPackageSurfaceModules(workspaceRoot),
    ...commandAdapterModules,
    ...toolingSupportModules,
    {
      module_id: "composition:compose",
      module_kind: "composition_surface",
      file_path: resolve(workspaceRoot, "packages/composition/src/compose/index.ts"),
    },
    {
      module_id: "composition:plan",
      module_kind: "composition_surface",
      file_path: resolve(workspaceRoot, "packages/composition/src/plan/index.ts"),
    },
    {
      module_id: "composition:graph",
      module_kind: "composition_surface",
      file_path: resolve(workspaceRoot, "packages/composition/src/graph/index.ts"),
    },
    {
      module_id: "tooling-eos-cli:projection-domain",
      module_kind: "projection_domain",
      file_path: resolve(workspaceRoot, "packages/tooling/eos-cli/src/projection-domain.ts"),
    },
    {
      module_id: "tooling-eos-cli:projection-builders",
      module_kind: "projection_builder",
      file_path: resolve(workspaceRoot, "packages/tooling/eos-cli/src/projection-builders.ts"),
    },
    {
      module_id: "tooling-eos-cli:projection-factories",
      module_kind: "projection_builder",
      file_path: resolve(workspaceRoot, "packages/tooling/eos-cli/src/projection-factories.ts"),
    },
    {
      module_id: "tooling-eos-cli:projections",
      module_kind: "projection_api",
      file_path: resolve(workspaceRoot, "packages/tooling/eos-cli/src/projections.ts"),
    },
    {
      module_id: "tooling-eos-cli:projection-serialization",
      module_kind: "serializer",
      file_path: resolve(workspaceRoot, "packages/tooling/eos-cli/src/projection-serialization.ts"),
    },
    {
      module_id: "tooling-eos-cli:storage-catalog",
      module_kind: "storage_catalog",
      file_path: resolve(workspaceRoot, "packages/tooling/eos-cli/src/storage-catalog.ts"),
    },
    {
      module_id: "tooling-eos-cli:projection-storage",
      module_kind: "storage_catalog",
      file_path: resolve(workspaceRoot, "packages/tooling/eos-cli/src/projection-storage.ts"),
    },
  ] as const;
}

export function inspectConstitutionDependencyDiscovery(
  workspaceRoot: string,
): {
  readonly modules: readonly ConstitutionDependencyModuleInput[];
  readonly discovery: ConstitutionDependencyDiscovery;
} {
  const buildResolvedModules = (): readonly ConstitutionDependencyModuleInput[] => {
    const modules = buildGovernedModuleDefinitions(workspaceRoot);
    const moduleIdByPath = new Map(
      modules.map((module) => [resolve(module.file_path), module.module_id] as const),
    );
    const packageModuleIdBySpecifier = new Map(
      modules
        .filter((module): module is GovernedModuleDefinition & { package_specifiers: readonly string[] } =>
          Array.isArray(module.package_specifiers),
        )
        .flatMap((module) =>
          module.package_specifiers.map((specifier) => [specifier, module.module_id] as const),
        ),
    );

    const resolveGovernedDependencyTarget = (fromFilePath: string, specifier: string): string | null => {
      const packageTarget = resolveGovernedPackageSpecifierTarget(specifier, packageModuleIdBySpecifier);
      if (packageTarget) {
        return packageTarget;
      }

      if (!specifier.startsWith(".")) {
        return null;
      }

      const basePath = resolve(dirname(fromFilePath), specifier);
      const candidates = [
        basePath,
        `${basePath}.ts`,
        `${basePath}.tsx`,
        `${basePath}.js`,
        `${basePath}.mjs`,
        resolve(basePath, "index.ts"),
        resolve(basePath, "index.tsx"),
        resolve(basePath, "index.js"),
        resolve(basePath, "index.mjs"),
      ];

      for (const candidate of candidates) {
        const directMatch = moduleIdByPath.get(candidate);
        if (directMatch) {
          return directMatch;
        }

        const sourceMatch = moduleIdByPath.get(
          candidate
            .replace("/dist/", "/src/")
            .replace(/\.js$/, ".ts")
            .replace(/\.mjs$/, ".ts"),
        );
        if (sourceMatch) {
          return sourceMatch;
        }
      }

      return null;
    };

    return modules.map((module) => {
      const imports = readModuleImports(module.file_path);
      return {
        module_id: module.module_id,
        module_kind: module.module_kind,
        imports,
        dependency_targets: imports
          .map((specifier) => resolveGovernedDependencyTarget(module.file_path, specifier))
          .filter((target): target is string => target !== null)
          .sort((left, right) => left.localeCompare(right)),
      };
    });
  };

  const firstPass = buildResolvedModules();
  const secondPass = buildResolvedModules();
  if (
    serializeCanonicalDependencyModules(firstPass) !==
    serializeCanonicalDependencyModules(secondPass)
  ) {
    throw new Error("CONSTITUTION_DEPENDENCY_DISCOVERY_NON_DETERMINISTIC");
  }

  const modules = canonicalizeDependencyModules(firstPass);
  const canonicalSnapshot = serializeCanonicalDependencyModules(modules);
  return {
    modules,
    discovery: {
      deterministic: true,
      discovery_digest: DigestEngine.digestText(canonicalSnapshot),
      module_count: modules.length,
    },
  };
}

export function discoverConstitutionDependencyModules(
  workspaceRoot: string,
): readonly ConstitutionDependencyModuleInput[] {
  return inspectConstitutionDependencyDiscovery(workspaceRoot).modules;
}
