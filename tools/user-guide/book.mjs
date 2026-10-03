import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stylesheet = fileURLToPath(
  new URL('./assets/guide.css', import.meta.url),
);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function fail(manifestPath, message) {
  throw new Error(`Invalid guide manifest ${manifestPath}: ${message}`);
}

function requiredString(value, field, manifestPath) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(manifestPath, `${field} must be non-empty text`);
  }
  return value.trim();
}

function requiredTextList(value, field, manifestPath) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(manifestPath, `${field} must have at least one entry`);
  }
  return value.map((item, index) =>
    requiredString(item, `${field}[${index}]`, manifestPath),
  );
}

async function requiredAsset(manifestPath, value, field, extension) {
  const relative = requiredString(value, field, manifestPath);
  if (
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/u).some((segment) => segment === '..') ||
    !relative.startsWith('assets/') ||
    path.extname(relative).toLowerCase() !== extension
  ) {
    fail(
      manifestPath,
      `${field} must be an assets/${extension} file inside its guide`,
    );
  }
  const directory = path.dirname(manifestPath);
  const resolved = path.resolve(directory, relative);
  const root = await realpath(directory);
  let actual;
  try {
    actual = await realpath(resolved);
  } catch {
    fail(manifestPath, `${field} does not exist: ${relative}`);
  }
  if (
    !actual.startsWith(`${root}${path.sep}`) ||
    !(await stat(actual)).isFile()
  ) {
    fail(manifestPath, `${field} must identify a file inside its guide`);
  }
  return relative.replaceAll('\\', '/');
}

/** Validates a recording before any generated chapter or navigation is written. */
export async function readGuideManifest(manifestPath) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    fail(manifestPath, `cannot read JSON: ${error.message}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(manifestPath, 'root must be an object');
  }
  if (parsed.schemaVersion !== 2) fail(manifestPath, 'schemaVersion must be 2');
  if (!Number.isSafeInteger(parsed.order) || parsed.order < 0) {
    fail(manifestPath, 'order must be a non-negative integer');
  }
  const slug = requiredString(parsed.slug, 'slug', manifestPath);
  if (
    !slugPattern.test(slug) ||
    slug !== path.basename(path.dirname(manifestPath))
  ) {
    fail(manifestPath, 'slug must match its lowercase hyphenated directory');
  }
  if (parsed.verification !== 'simulated-bff') {
    fail(manifestPath, 'verification must explicitly identify simulated-bff');
  }
  if (!['workflow', 'state-comparison'].includes(parsed.presentation)) {
    fail(manifestPath, 'presentation must be workflow or state-comparison');
  }
  const overview = requiredTextList(parsed.overview, 'overview', manifestPath);
  const prerequisites = requiredTextList(
    parsed.prerequisites,
    'prerequisites',
    manifestPath,
  );
  const limitations = requiredTextList(
    parsed.limitations,
    'limitations',
    manifestPath,
  );
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    fail(manifestPath, 'steps must have at least one entry');
  }
  const ids = new Set();
  const steps = await Promise.all(
    parsed.steps.map(async (step, index) => {
      if (step === null || typeof step !== 'object') {
        fail(manifestPath, `steps[${index}] must be an object`);
      }
      const id = requiredString(step.id, `steps[${index}].id`, manifestPath);
      if (!slugPattern.test(id) || ids.has(id)) {
        fail(
          manifestPath,
          `steps[${index}].id must be unique lowercase hyphenated words`,
        );
      }
      ids.add(id);
      return {
        id,
        title: requiredString(
          step.title,
          `steps[${index}].title`,
          manifestPath,
        ),
        body: requiredString(step.body, `steps[${index}].body`, manifestPath),
        expected: requiredString(
          step.expected,
          `steps[${index}].expected`,
          manifestPath,
        ),
        image: await requiredAsset(
          manifestPath,
          step.image,
          `steps[${index}].image`,
          '.png',
        ),
      };
    }),
  );
  if (
    !Array.isArray(parsed.troubleshooting) ||
    parsed.troubleshooting.length === 0
  ) {
    fail(manifestPath, 'troubleshooting must have at least one entry');
  }
  const troubleshooting = parsed.troubleshooting.map((item, index) => ({
    symptom: requiredString(
      item?.symptom,
      `troubleshooting[${index}].symptom`,
      manifestPath,
    ),
    guidance: requiredString(
      item?.guidance,
      `troubleshooting[${index}].guidance`,
      manifestPath,
    ),
  }));
  const guide = {
    order: parsed.order,
    slug,
    title: requiredString(parsed.title, 'title', manifestPath),
    summary: requiredString(parsed.summary, 'summary', manifestPath),
    audience: requiredString(parsed.audience, 'audience', manifestPath),
    verification: parsed.verification,
    presentation: parsed.presentation,
    overview,
    prerequisites,
    steps,
    troubleshooting,
    limitations,
    video: await requiredAsset(manifestPath, parsed.video, 'video', '.webm'),
  };
  const readerWords = [
    guide.summary,
    guide.audience,
    ...overview,
    ...prerequisites,
    ...steps.flatMap((step) => [step.title, step.body, step.expected]),
    ...troubleshooting.flatMap((item) => [item.symptom, item.guidance]),
    ...limitations,
  ]
    .join(' ')
    .trim()
    .split(/\s+/u).length;
  if (readerWords < 400) {
    fail(
      manifestPath,
      `guide has only ${readerWords} reader-facing words; a chapter needs substantive context, outcomes, and recovery`,
    );
  }
  return guide;
}

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const markdownList = (entries) =>
  entries.map((entry) => `- ${entry}`).join('\n');

function renderMarkdown(guide) {
  const stepsHeading =
    guide.presentation === 'workflow'
      ? 'Follow the workflow'
      : 'Compare the access states';
  const steps = guide.steps
    .map(
      (step, index) =>
        `### ${index + 1}. ${step.title}\n\n${step.body}\n\n**Expected result:** ${step.expected}\n\n![${step.title}](./${step.image})`,
    )
    .join('\n\n');
  const recovery = guide.troubleshooting
    .map((item) => `### ${item.symptom}\n\n${item.guidance}`)
    .join('\n\n');
  return `# ${guide.title}\n\n## TL;DR\n\n${guide.summary}\n\n> Illustrated with simulated BFF responses and synthetic data; this is not a live backend verification.\n\n<video controls src="./${guide.video}">Your browser does not support embedded video.</video>\n\n## About this ${guide.presentation === 'workflow' ? 'workflow' : 'guide'}\n\n**Audience:** ${guide.audience}\n\n${guide.overview.join('\n\n')}\n\n## Before you begin\n\n${markdownList(guide.prerequisites)}\n\n## ${stepsHeading}\n\n${steps}\n\n## Troubleshooting\n\n${recovery}\n\n## Limits of this walkthrough\n\n${markdownList(guide.limitations)}\n`;
}

function documentHtml(title, description, navigation, content, fromGuide) {
  const stylesheetHref = fromGuide
    ? '../assets/guide.css'
    : './assets/guide.css';
  const homeHref = fromGuide ? '../' : './';
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="description" content="${escapeHtml(description)}">\n<title>${escapeHtml(title)} · Ergon User Guide</title>\n<link rel="stylesheet" href="${stylesheetHref}">\n</head>\n<body>\n<header><a class="brand" href="${homeHref}">Ergon User Guide</a></header>\n<div class="layout"><nav aria-label="Guide chapters"><h2>Guides</h2><ol>${navigation}</ol></nav><main>${content}</main></div>\n<footer>Generated from asserted Playwright scenarios. Simulated data is labelled.</footer>\n</body>\n</html>\n`;
}

function navigationHtml(guides, current, fromGuide) {
  return guides
    .map(
      (guide) =>
        `<li><a href="${fromGuide ? '../' : './'}${guide.slug}/"${guide.slug === current ? ' aria-current="page"' : ''}>${escapeHtml(guide.title)}</a></li>`,
    )
    .join('');
}

function renderGuideHtml(guide, guides) {
  const isWorkflow = guide.presentation === 'workflow';
  const stepsHeading = isWorkflow
    ? 'Follow the workflow'
    : 'Compare the access states';
  const paragraphs = (items) =>
    items.map((item) => `<p>${escapeHtml(item)}</p>`).join('');
  const list = (items) =>
    `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  const steps = guide.steps
    .map(
      (step, index) =>
        `<section class="step" id="step-${index + 1}"><p class="eyebrow">Step ${index + 1}</p><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p><p><strong>Expected result:</strong> ${escapeHtml(step.expected)}</p><img src="./${step.image}" alt="${escapeHtml(step.title)}" loading="lazy"></section>`,
    )
    .join('');
  const recovery = guide.troubleshooting
    .map(
      (item) =>
        `<section><h3>${escapeHtml(item.symptom)}</h3><p>${escapeHtml(item.guidance)}</p></section>`,
    )
    .join('');
  const content = `<article><p class="eyebrow">Illustrative ${isWorkflow ? 'workflow' : 'state comparison'}</p><h1>${escapeHtml(guide.title)}</h1><p class="lead">${escapeHtml(guide.summary)}</p><div class="notice" role="note">Simulated BFF responses and synthetic data. This recording does not verify a live backend.</div><video controls preload="metadata"><source src="./${guide.video}" type="video/webm">Your browser does not support embedded video.</video><section><h2>About this ${isWorkflow ? 'workflow' : 'guide'}</h2><p><strong>Audience:</strong> ${escapeHtml(guide.audience)}</p>${paragraphs(guide.overview)}</section><section><h2>Before you begin</h2>${list(guide.prerequisites)}</section><section><h2>${stepsHeading}</h2>${steps}</section><section><h2>Troubleshooting</h2>${recovery}</section><section><h2>Limits of this walkthrough</h2>${list(guide.limitations)}</section></article>`;
  return documentHtml(
    guide.title,
    guide.summary,
    navigationHtml(guides, guide.slug, true),
    content,
    true,
  );
}

/** Validates all manifests and assembles a relative-link static book. */
export async function assembleBook(outputRoot) {
  const entries = await readdir(outputRoot, { withFileTypes: true });
  const guides = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'assets') {
      guides.push(
        await readGuideManifest(
          path.join(outputRoot, entry.name, 'guide.json'),
        ),
      );
    }
  }
  if (guides.length === 0) throw new Error('No guide manifests were recorded.');
  guides.sort(
    (left, right) =>
      left.order - right.order || left.title.localeCompare(right.title),
  );
  const orders = new Set();
  for (const guide of guides) {
    if (orders.has(guide.order))
      throw new Error(`Duplicate guide order: ${guide.order}`);
    orders.add(guide.order);
  }
  for (const guide of guides) {
    const directory = path.join(outputRoot, guide.slug);
    await writeFile(
      path.join(directory, 'README.md'),
      renderMarkdown(guide),
      'utf8',
    );
    await writeFile(
      path.join(directory, 'index.html'),
      renderGuideHtml(guide, guides),
      'utf8',
    );
  }
  const cards = guides
    .map(
      (guide) =>
        `<li><a class="card" href="./${guide.slug}/"><strong>${escapeHtml(guide.title)}</strong><span>${escapeHtml(guide.summary)}</span></a></li>`,
    )
    .join('');
  const indexContent = `<section><p class="eyebrow">Executable documentation</p><h1>Learn Ergon through illustrated browser guides</h1><p class="lead">Each chapter includes a recording, annotated screenshots, context, expected results, and recovery guidance. Current chapters use simulated BFF data and are marked accordingly.</p><ol class="cards">${cards}</ol></section>`;
  await writeFile(
    path.join(outputRoot, 'index.html'),
    documentHtml(
      'Home',
      'Ergon executable user guides',
      navigationHtml(guides, undefined, false),
      indexContent,
      false,
    ),
    'utf8',
  );
  await writeFile(
    path.join(outputRoot, 'README.md'),
    `# Ergon User Guide\n\nGenerated from asserted Playwright scenarios. Current chapters use simulated BFF data.\n\n${guides.map((guide) => `- [${guide.title}](./${guide.slug}/README.md)`).join('\n')}\n`,
    'utf8',
  );
  await mkdir(path.join(outputRoot, 'assets'), { recursive: true });
  await copyFile(stylesheet, path.join(outputRoot, 'assets', 'guide.css'));
  return guides.length;
}
