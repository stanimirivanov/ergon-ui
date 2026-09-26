import { access, readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const PROJECT_ROOTS = ['apps', 'packages'];
const TAG_DIMENSIONS = ['layer', 'scope', 'platform'];
const ALLOWED_LAYERS = new Set([
  'layer:application',
  'layer:composition',
  'layer:domain',
  'layer:infrastructure',
  'layer:test',
  'layer:ui-primitives',
]);
const EXPECTED_PACKAGE_LAYERS = new Map([
  ['packages/application', 'layer:application'],
  ['packages/domain', 'layer:domain'],
  ['packages/infrastructure', 'layer:infrastructure'],
  ['packages/ui-web', 'layer:ui-primitives'],
]);
const IGNORED_DIRECTORIES = new Set(['dist', 'node_modules', 'out-tsc']);
const ALLOWED_PLATFORMS = new Set([
  'platform:native',
  'platform:shared',
  'platform:web',
]);
const ALLOWED_SCOPES = new Set([
  'scope:follow-up',
  'scope:shared',
  'scope:workbench',
]);

const errors = [];
const projects = await discoverProjects();

for (const project of projects) {
  const manifest = JSON.parse(await readFile(project.manifestPath, 'utf8'));
  const tags = manifest.nx?.tags;

  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
    errors.push(`${project.path}: nx.tags must be an array of strings`);
    continue;
  }

  for (const dimension of TAG_DIMENSIONS) {
    const matchingTags = tags.filter((tag) => tag.startsWith(`${dimension}:`));
    if (matchingTags.length !== 1) {
      errors.push(
        `${project.path}: expected exactly one ${dimension}:* tag, found ${matchingTags.length}`,
      );
    }
  }

  const expectedLayer = [...EXPECTED_PACKAGE_LAYERS].find(
    ([path]) => project.path === path || project.path.startsWith(`${path}/`),
  )?.[1];
  if (expectedLayer !== undefined && !tags.includes(expectedLayer)) {
    errors.push(
      `${project.path}: its package path requires the ${expectedLayer} tag`,
    );
  }

  for (const tag of tags) {
    if (tag.startsWith('type:')) {
      errors.push(
        `${project.path}: obsolete ${tag} tag must be expressed as a layer:* tag`,
      );
    }
    if (tag.startsWith('layer:') && !ALLOWED_LAYERS.has(tag)) {
      errors.push(`${project.path}: unsupported project layer ${tag}`);
    }
    if (tag.startsWith('platform:') && !ALLOWED_PLATFORMS.has(tag)) {
      errors.push(`${project.path}: unsupported project platform ${tag}`);
    }
    if (tag.startsWith('scope:') && !ALLOWED_SCOPES.has(tag)) {
      errors.push(`${project.path}: unsupported project scope ${tag}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Project boundary metadata is invalid:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Verified architecture tags for ${projects.length} projects.`);
}

async function discoverProjects() {
  const projects = [];

  for (const root of PROJECT_ROOTS) {
    await visitDirectory(root);
  }

  return projects.sort((left, right) => left.path.localeCompare(right.path));

  async function visitDirectory(directory) {
    const manifestPath = join(directory, 'package.json');
    try {
      await access(manifestPath);
      projects.push({
        manifestPath,
        path: relative('.', directory).replaceAll('\\', '/'),
      });
      return;
    } catch {
      // A grouping directory is not an Nx project; inspect its children.
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
