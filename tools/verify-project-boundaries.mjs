import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import {
  APPROVED_APPLICATION_CORES,
  validateProjectBoundaries,
} from './project-boundary-policy.mjs';

const PROJECT_ROOTS = ['apps', 'packages'];
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules', 'out-tsc']);

const projects = await discoverProjects();
const acceptedDecisionPaths = await loadAcceptedDecisionPaths();
const errors = validateProjectBoundaries(projects, { acceptedDecisionPaths });

if (errors.length > 0) {
  console.error('Project boundary metadata is invalid:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Verified type, scope, platform, and workspace dependency boundaries for ${projects.length} projects.`,
  );
}

async function discoverProjects() {
  const projects = [];

  for (const root of PROJECT_ROOTS) {
    await visitDirectory(root);
  }

  return projects.sort((left, right) => left.path.localeCompare(right.path));

  async function visitDirectory(directory) {
    const manifestPath = join(directory, 'package.json');
    if (await exists(manifestPath)) {
      const manifest = await readJson(manifestPath);

      projects.push({
        manifest,
        manifestPath,
        path: relative('.', directory).replaceAll('\\', '/'),
        typescriptConfiguration: isCoreProject(manifest)
          ? await loadTypeScriptConfiguration(
              join(directory, 'tsconfig.lib.json'),
            )
          : undefined,
      });
      return;
    }

    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await visitDirectory(join(directory, entry.name));
    }
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function loadAcceptedDecisionPaths() {
  const acceptedDecisionPaths = new Set();
  for (const decisionPath of new Set(APPROVED_APPLICATION_CORES.values())) {
    if (!(await exists(decisionPath))) {
      continue;
    }
    const decision = await readFile(decisionPath, 'utf8');
    if (/^- Status: Accepted\s*$/m.test(decision)) {
      acceptedDecisionPaths.add(decisionPath);
    }
  }
  return acceptedDecisionPaths;
}

function isCoreProject(manifest) {
  const tags = manifest.nx?.tags;
  return (
    Array.isArray(tags) &&
    (tags.includes('type:model') || tags.includes('type:application'))
  );
}

async function loadTypeScriptConfiguration(configPath, seen = new Set()) {
  if (!(await exists(configPath))) {
    return undefined;
  }

  const normalizedPath = resolve(configPath);
  if (seen.has(normalizedPath)) {
    throw new Error(
      `Circular TypeScript configuration inheritance at ${configPath}`,
    );
  }
  seen.add(normalizedPath);

  const configuration = await readJson(configPath);
  const extendsPath = resolveExtendsPath(configPath, configuration.extends);
  const inherited =
    extendsPath === undefined
      ? undefined
      : await loadTypeScriptConfiguration(extendsPath.absolute, seen);
  const compilerOptions = configuration.compilerOptions;

  return {
    extendsPath: extendsPath?.relative,
    libraries: compilerOptions?.lib ?? inherited?.libraries,
    types: compilerOptions?.types ?? inherited?.types,
  };
}

function resolveExtendsPath(configPath, inheritedPath) {
  if (typeof inheritedPath !== 'string' || inheritedPath.length === 0) {
    return undefined;
  }
  const withExtension = inheritedPath.endsWith('.json')
    ? inheritedPath
    : `${inheritedPath}.json`;
  const absolute = resolve(dirname(configPath), withExtension);
  return {
    absolute,
    relative: relative('.', absolute).replaceAll('\\', '/'),
  };
}

async function readJson(path) {
  const source = await readFile(path, 'utf8');
  try {
    const value = JSON.parse(source);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('Expected a JSON object');
    }
    return value;
  } catch (error) {
    throw new Error(`Cannot parse ${path}`, { cause: error });
  }
}
