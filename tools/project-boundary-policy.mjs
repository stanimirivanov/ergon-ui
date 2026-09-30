const TAG_DIMENSIONS = ['type', 'scope', 'platform'];

const ALLOWED_TYPES = new Set([
  'type:app',
  'type:application',
  'type:data-access',
  'type:feature',
  'type:model',
  'type:test',
  'type:ui',
]);

const ALLOWED_PLATFORMS = new Set([
  'platform:native',
  'platform:shared',
  'platform:web',
]);

const ALLOWED_SCOPES = new Set([
  'scope:follow-up',
  'scope:session',
  'scope:shared',
  'scope:workbench',
]);

const TYPE_DEPENDENCIES = new Map([
  ['type:model', new Set(['type:model'])],
  ['type:application', new Set(['type:application', 'type:model'])],
  [
    'type:data-access',
    new Set(['type:data-access', 'type:application', 'type:model']),
  ],
  [
    'type:feature',
    new Set(['type:data-access', 'type:application', 'type:model', 'type:ui']),
  ],
  ['type:ui', new Set(['type:ui'])],
  [
    'type:app',
    new Set([
      'type:feature',
      'type:data-access',
      'type:application',
      'type:model',
      'type:ui',
    ]),
  ],
  ['type:test', ALLOWED_TYPES],
]);

const SCOPE_DEPENDENCIES = new Map([
  ['scope:shared', new Set(['scope:shared'])],
  ['scope:follow-up', new Set(['scope:follow-up', 'scope:shared'])],
  ['scope:session', new Set(['scope:session', 'scope:shared'])],
  [
    'scope:workbench',
    new Set([
      'scope:workbench',
      'scope:follow-up',
      'scope:session',
      'scope:shared',
    ]),
  ],
]);

const PLATFORM_DEPENDENCIES = new Map([
  ['platform:shared', new Set(['platform:shared'])],
  ['platform:web', new Set(['platform:web', 'platform:shared'])],
  ['platform:native', new Set(['platform:native', 'platform:shared'])],
]);

const LEGACY_ROOTS = [
  'packages/application',
  'packages/domain',
  'packages/infrastructure',
];

const CAPABILITY_PROJECT_PATH =
  /^packages\/([^/]+)\/(model|application|data-access-(web|native)|feature-(web|native))$/;
const APP_PROJECT_PATH = /^apps\/[^/]+$/;

const ROLE_METADATA = new Map([
  ['model', { type: 'type:model', platform: 'platform:shared' }],
  ['application', { type: 'type:application', platform: 'platform:shared' }],
  ['data-access-web', { type: 'type:data-access', platform: 'platform:web' }],
  [
    'data-access-native',
    { type: 'type:data-access', platform: 'platform:native' },
  ],
  ['feature-web', { type: 'type:feature', platform: 'platform:web' }],
  ['feature-native', { type: 'type:feature', platform: 'platform:native' }],
]);

const SPECIAL_PACKAGE_LOCATIONS = new Map([
  [
    'packages/ui-web',
    {
      type: 'type:ui',
      scope: 'scope:shared',
      platform: 'platform:web',
    },
  ],
]);

const FORBIDDEN_CORE_DEPENDENCIES = [
  /^react(?:-|$)/,
  /^@reduxjs\//,
  /^redux$/,
  /^effect$/,
  /^@effect\//,
  /^tailwindcss$/,
  /^@tailwindcss\//,
];

const ACCEPTED_DECISION_PATH =
  /^docs\/decisions\/\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

/**
 * Finite ledger for projects that have not yet moved to capability-first paths.
 * Removing or moving one of these projects requires updating the ledger in the
 * same change, so the transitional topology cannot silently become permanent.
 */
export const LEGACY_PROJECT_LOCATIONS = new Map([
  [
    'packages/infrastructure/session-web',
    {
      type: 'type:data-access',
      scope: 'scope:session',
      platform: 'platform:web',
      target: 'packages/session/data-access-web',
    },
  ],
]);

/**
 * Reviewed application cores. Add an entry only with an accepted decision that
 * identifies the executable client-owned policy; legacy contract-only projects
 * are tracked separately above and do not qualify.
 */
export const APPROVED_APPLICATION_CORES = new Map();

/**
 * Validates project metadata and declared workspace dependency direction.
 *
 * The caller supplies parsed manifests so tests can exercise policy without
 * reading the repository. ESLint still verifies source imports; this check
 * additionally validates declared and implicit workspace dependencies.
 *
 * @param {readonly {path: string, manifest: Record<string, unknown>, typescriptConfiguration?: {extendsPath: string | undefined, libraries: readonly string[] | undefined, types: readonly string[] | undefined}}[]} projects
 * @param {{legacyProjectLocations?: Map<string, {type: string, scope: string, platform: string, target: string, compilerConfigurationException?: {reason: string, extendsPath: string, libraries: readonly string[], types: readonly string[]}}>, approvedApplicationCores?: Map<string, string>, acceptedDecisionPaths?: Set<string>}} options
 * @returns {string[]} Every policy violation, in discovery order.
 */
export function validateProjectBoundaries(
  projects,
  {
    legacyProjectLocations = LEGACY_PROJECT_LOCATIONS,
    approvedApplicationCores = APPROVED_APPLICATION_CORES,
    acceptedDecisionPaths = new Set(),
  } = {},
) {
  const errors = [];
  const projectsByPath = new Map(
    projects.map((project) => [project.path, project]),
  );
  const projectsByName = new Map();
  const projectTags = new Map();

  for (const project of projects) {
    const name = project.manifest.name;
    if (typeof name !== 'string' || name.length === 0) {
      errors.push(`${project.path}: package.json requires a non-empty name`);
    } else if (projectsByName.has(name)) {
      errors.push(`${project.path}: duplicate workspace project name ${name}`);
    } else {
      projectsByName.set(name, project);
    }

    const tags = project.manifest.nx?.tags;
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
      errors.push(`${project.path}: nx.tags must be an array of strings`);
      continue;
    }

    const tagsByDimension = new Map();
    for (const dimension of TAG_DIMENSIONS) {
      const matchingTags = tags.filter((tag) =>
        tag.startsWith(`${dimension}:`),
      );
      if (matchingTags.length !== 1) {
        errors.push(
          `${project.path}: expected exactly one ${dimension}:* tag, found ${matchingTags.length}`,
        );
      } else {
        tagsByDimension.set(dimension, matchingTags[0]);
      }
    }
    projectTags.set(project.path, tagsByDimension);

    for (const tag of tags) {
      if (tag.startsWith('layer:') || tag.startsWith('adapter:')) {
        errors.push(
          `${project.path}: obsolete ${tag} tag must be expressed by type:*`,
        );
      }
      if (tag.startsWith('type:') && !ALLOWED_TYPES.has(tag)) {
        errors.push(`${project.path}: unsupported project type ${tag}`);
      }
      if (tag.startsWith('platform:') && !ALLOWED_PLATFORMS.has(tag)) {
        errors.push(`${project.path}: unsupported project platform ${tag}`);
      }
      if (tag.startsWith('scope:') && !ALLOWED_SCOPES.has(tag)) {
        errors.push(`${project.path}: unsupported project scope ${tag}`);
      }
    }

    const type = tagsByDimension.get('type');
    const platform = tagsByDimension.get('platform');
    if (
      (type === 'type:model' || type === 'type:application') &&
      platform !== undefined &&
      platform !== 'platform:shared'
    ) {
      errors.push(`${project.path}: ${type} must use platform:shared`);
    }

    const isAppProject = project.path.startsWith('apps/');
    if (
      isAppProject &&
      type !== undefined &&
      type !== 'type:app' &&
      type !== 'type:test'
    ) {
      errors.push(
        `${project.path}: projects under apps require type:app or type:test`,
      );
    }
    if (isAppProject && !APP_PROJECT_PATH.test(project.path)) {
      errors.push(`${project.path}: app projects require apps/<project> paths`);
    }
    if (!isAppProject && (type === 'type:app' || type === 'type:test')) {
      errors.push(`${project.path}: ${type} projects must live under apps`);
    }

    const isLegacyPath = LEGACY_ROOTS.some(
      (root) => project.path === root || project.path.startsWith(`${root}/`),
    );
    const legacyLocation = legacyProjectLocations.get(project.path);
    if (isLegacyPath && legacyLocation === undefined) {
      errors.push(
        `${project.path}: unlisted legacy global-layer path; use a capability-first package path`,
      );
    }
    if (legacyLocation !== undefined) {
      validateLegacyLocation(
        project.path,
        legacyLocation,
        tagsByDimension,
        errors,
      );
    }

    if (!isAppProject && legacyLocation === undefined) {
      validatePackageLocation(project.path, tagsByDimension, errors);
    }

    if (
      type === 'type:application' &&
      legacyLocation === undefined &&
      !approvedApplicationCores.has(project.path)
    ) {
      errors.push(
        `${project.path}: application core requires an explicit accepted-decision entry`,
      );
    }

    if (type === 'type:model' || type === 'type:application') {
      validateCoreTypeScriptConfiguration(
        project,
        legacyLocation?.compilerConfigurationException,
        errors,
      );
      for (const dependencyName of declaredDependencyNames(project.manifest)) {
        if (
          FORBIDDEN_CORE_DEPENDENCIES.some((pattern) =>
            pattern.test(dependencyName),
          )
        ) {
          errors.push(
            `${project.path}: ${type} cannot declare framework dependency ${dependencyName}`,
          );
        }
      }
    }
  }

  for (const [path, location] of legacyProjectLocations) {
    if (!projectsByPath.has(path)) {
      errors.push(
        `${path}: stale legacy-location entry; remove it after migration to ${location.target}`,
      );
    }
  }

  for (const [path, decision] of approvedApplicationCores) {
    const project = projectsByPath.get(path);
    if (project === undefined) {
      errors.push(
        `${path}: stale approved-application entry for ${decision}; remove or update it`,
      );
      continue;
    }
    if (projectTags.get(path)?.get('type') !== 'type:application') {
      errors.push(
        `${path}: approved application core from ${decision} requires type:application`,
      );
    }
    if (!ACCEPTED_DECISION_PATH.test(decision)) {
      errors.push(
        `${path}: approved application core requires a repository decision path, found ${decision || 'an empty reference'}`,
      );
    } else if (!acceptedDecisionPaths.has(decision)) {
      errors.push(
        `${path}: application-core decision ${decision} does not exist or is not accepted`,
      );
    }
  }

  for (const project of projects) {
    const sourceTags = projectTags.get(project.path);
    if (sourceTags === undefined) {
      continue;
    }

    for (const [
      dependencyName,
      requiresWorkspaceProject,
    ] of declaredDependencies(project.manifest)) {
      const target = projectsByName.get(dependencyName);
      if (target === undefined) {
        if (requiresWorkspaceProject) {
          errors.push(
            `${project.path}: workspace dependency ${dependencyName} does not resolve to a discovered project`,
          );
        }
        continue;
      }
      const targetTags = projectTags.get(target.path);
      if (targetTags === undefined) {
        continue;
      }

      validateDependencyDimension(
        project.path,
        target.path,
        'type',
        sourceTags,
        targetTags,
        TYPE_DEPENDENCIES,
        errors,
      );
      validateDependencyDimension(
        project.path,
        target.path,
        'scope',
        sourceTags,
        targetTags,
        SCOPE_DEPENDENCIES,
        errors,
      );
      validateDependencyDimension(
        project.path,
        target.path,
        'platform',
        sourceTags,
        targetTags,
        PLATFORM_DEPENDENCIES,
        errors,
      );
    }
  }

  return errors;
}

function declaredDependencies(manifest) {
  const declarations = new Map();
  for (const section of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const dependencies = manifest[section];
    if (dependencies !== undefined && dependencies !== null) {
      for (const [name, version] of Object.entries(dependencies)) {
        declarations.set(
          name,
          declarations.get(name) === true ||
            (typeof version === 'string' && version.startsWith('workspace:')),
        );
      }
    }
  }

  const implicitDependencies = manifest.nx?.implicitDependencies;
  if (Array.isArray(implicitDependencies)) {
    for (const name of implicitDependencies) {
      if (typeof name === 'string') {
        declarations.set(name, true);
      }
    }
  }
  return declarations;
}

function declaredDependencyNames(manifest) {
  return declaredDependencies(manifest).keys();
}

function validatePackageLocation(path, tags, errors) {
  const specialLocation = SPECIAL_PACKAGE_LOCATIONS.get(path);
  if (specialLocation !== undefined) {
    validateExpectedTags(path, specialLocation, tags, errors);
    return;
  }

  const match = CAPABILITY_PROJECT_PATH.exec(path);
  if (match === null) {
    errors.push(
      `${path}: package projects require packages/<scope>/<role[-platform]> capability-first paths`,
    );
    return;
  }

  const [, capability, role] = match;
  const roleMetadata = ROLE_METADATA.get(role);
  validateExpectedTags(
    path,
    {
      ...roleMetadata,
      scope: `scope:${capability}`,
    },
    tags,
    errors,
  );
}

function validateExpectedTags(path, expected, actual, errors) {
  for (const dimension of TAG_DIMENSIONS) {
    const expectedTag = expected[dimension];
    const actualTag = actual.get(dimension);
    if (expectedTag !== undefined && actualTag !== expectedTag) {
      errors.push(
        `${path}: its location requires ${expectedTag}, found ${actualTag ?? 'no tag'}`,
      );
    }
  }
}

function validateLegacyLocation(path, expected, actual, errors) {
  for (const dimension of TAG_DIMENSIONS) {
    const expectedTag = expected[dimension];
    const actualTag = actual.get(dimension);
    if (actualTag !== expectedTag) {
      errors.push(
        `${path}: legacy ledger requires ${expectedTag}, found ${actualTag ?? 'no tag'}, until migration to ${expected.target}`,
      );
    }
  }
}

function validateCoreTypeScriptConfiguration(project, exception, errors) {
  const configuration = project.typescriptConfiguration;
  if (configuration === undefined) {
    errors.push(
      `${project.path}: core project requires a readable tsconfig.lib.json`,
    );
    return;
  }

  const libraries = configuration.libraries ?? [];
  const types = configuration.types ?? [];
  const platformLibraries = libraries.filter((library) =>
    /^(dom(?:\.|$)|webworker(?:\.|$)|scripthost$)/i.test(library),
  );
  const isNeutral =
    configuration.extendsPath === 'tsconfig.core.json' &&
    configuration.libraries !== undefined &&
    configuration.types !== undefined &&
    platformLibraries.length === 0 &&
    types.length === 0;

  if (exception !== undefined) {
    if (isNeutral) {
      errors.push(
        `${project.path}: stale compiler-configuration exception (${exception.reason})`,
      );
    }
    if (
      configuration.extendsPath !== exception.extendsPath ||
      !hasSameValues(libraries, exception.libraries) ||
      !hasSameValues(types, exception.types)
    ) {
      errors.push(
        `${project.path}: compiler configuration exceeds the documented exception (${exception.reason})`,
      );
    }
    return;
  }

  if (
    configuration.libraries === undefined ||
    configuration.types === undefined
  ) {
    errors.push(
      `${project.path}: tsconfig.core.json must resolve explicit lib and types options`,
    );
  }
  if (configuration.extendsPath !== 'tsconfig.core.json') {
    errors.push(
      `${project.path}: core project must extend tsconfig.core.json directly`,
    );
  }
  if (platformLibraries.length > 0) {
    errors.push(
      `${project.path}: core project enables platform libraries ${platformLibraries.join(', ')}`,
    );
  }
  if (types.length > 0) {
    errors.push(
      `${project.path}: core project enables ambient platform types ${types.join(', ')}`,
    );
  }
}

function hasSameValues(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  return sortedActual.every((value, index) => value === sortedExpected[index]);
}

function validateDependencyDimension(
  sourcePath,
  targetPath,
  dimension,
  sourceTags,
  targetTags,
  allowedDependencies,
  errors,
) {
  const sourceTag = sourceTags.get(dimension);
  const targetTag = targetTags.get(dimension);
  if (sourceTag === undefined || targetTag === undefined) {
    return;
  }

  const allowedTargets = allowedDependencies.get(sourceTag);
  if (allowedTargets !== undefined && !allowedTargets.has(targetTag)) {
    errors.push(
      `${sourcePath}: ${sourceTag} cannot depend on ${targetTag} project ${targetPath}`,
    );
  }
}
