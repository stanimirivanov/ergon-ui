import { access, readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const PROJECT_ROOTS = ['apps', 'packages'];
const TAG_DIMENSIONS = ['type', 'scope', 'platform'];
const ALLOWED_TYPES = new Set([
  'type:adapter',
  'type:app',
  'type:application',
  'type:data-access',
  'type:domain',
  'type:e2e',
  'type:feature',
  'type:ui',
  'type:util',
]);
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

  for (const tag of tags) {
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
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const manifestPath = join(root, entry.name, 'package.json');
      try {
        await access(manifestPath);
      } catch {
        continue;
      }
      projects.push({
        manifestPath,
        path: relative('.', join(root, entry.name)).replaceAll('\\', '/'),
      });
    }
  }

  return projects.sort((left, right) => left.path.localeCompare(right.path));
}
