import fs from 'node:fs';
import path from 'node:path';

import { diagnostic } from './diagnostic.mjs';
import { headingAnchors } from './markdown.mjs';

const POLICY = 'docs/development/harness.md#repository-policy';
const EXTERNAL_SCHEME = /^[a-z][a-z0-9+.-]*:/iu;
const WINDOWS_ABSOLUTE = /^[a-z]:[\\/]/iu;

/** Validates repository-local Markdown destinations without network access. */
export function checkLinks(repository) {
  const violations = [];
  const exactFiles = new Set(repository.filePaths);
  const exactDirectories = new Set(repository.directoryPaths);
  const caseFolded = new Map(
    [...exactFiles, ...exactDirectories].map((entry) => [
      entry.toLowerCase(),
      entry,
    ]),
  );
  const anchors = new Map(
    repository.documents.map((document) => [
      document.path,
      headingAnchors(document),
    ]),
  );
  const realRoot = fs.realpathSync.native(repository.root);

  for (const document of repository.documents) {
    for (const link of document.links) {
      const destination = link.destination.trim();
      if (
        destination.length === 0 ||
        destination.startsWith('//') ||
        EXTERNAL_SCHEME.test(destination)
      ) {
        continue;
      }
      if (link.hasInvalidPercentEncoding) {
        violations.push(
          linkViolation(
            document.path,
            link.line,
            `link destination near \`${destination}\` contains invalid percent encoding`,
            'replace malformed escapes with valid UTF-8 percent encoding',
          ),
        );
        continue;
      }
      if (destination.includes('\\')) {
        violations.push(
          linkViolation(
            document.path,
            link.line,
            'link uses a backslash path separator',
            'use repository-relative Markdown paths with `/` separators',
          ),
        );
        continue;
      }
      if (destination.startsWith('/') || WINDOWS_ABSOLUTE.test(destination)) {
        violations.push(
          linkViolation(
            document.path,
            link.line,
            `link destination \`${destination}\` is machine-absolute`,
            'use a repository-relative destination',
          ),
        );
        continue;
      }

      const { rawPath, rawFragment } = splitDestination(destination);
      let decodedPath;
      let decodedFragment;
      try {
        decodedPath = decodeURIComponent(rawPath);
        decodedFragment = decodeURIComponent(rawFragment);
      } catch {
        violations.push(
          linkViolation(
            document.path,
            link.line,
            `link destination \`${destination}\` contains invalid percent encoding`,
            'replace malformed escapes with valid UTF-8 percent encoding',
          ),
        );
        continue;
      }
      if (decodedPath.includes('\\')) {
        violations.push(
          linkViolation(
            document.path,
            link.line,
            'link uses a backslash path separator',
            'use repository-relative Markdown paths with `/` separators',
          ),
        );
        continue;
      }

      let target = decodedPath
        ? path.posix.normalize(
            path.posix.join(path.posix.dirname(document.path), decodedPath),
          )
        : document.path;
      if (target === '..' || target.startsWith('../')) {
        violations.push(
          linkViolation(
            document.path,
            link.line,
            `link destination \`${destination}\` escapes the repository`,
            'link only to content contained in this repository',
          ),
        );
        continue;
      }

      if (exactDirectories.has(target))
        target = path.posix.join(target, 'README.md');
      if (!exactFiles.has(target)) {
        const actual = caseFolded.get(target.toLowerCase());
        violations.push(
          linkViolation(
            document.path,
            link.line,
            actual
              ? `link path \`${target}\` does not match repository casing \`${actual}\``
              : `link target \`${target}\` does not exist`,
            actual
              ? `use the exact path \`${actual}\``
              : 'restore the target or update the link to an existing repository path',
          ),
        );
        continue;
      }

      const absoluteTarget = path.resolve(
        repository.root,
        ...target.split('/'),
      );
      const realTarget = fs.realpathSync.native(absoluteTarget);
      if (!isContained(realRoot, realTarget)) {
        violations.push(
          linkViolation(
            document.path,
            link.line,
            `link target \`${target}\` resolves outside the repository`,
            'replace the symlinked destination with repository-contained content',
          ),
        );
        continue;
      }

      if (decodedFragment && target.toLowerCase().endsWith('.md')) {
        const targetAnchors = anchors.get(target);
        if (!targetAnchors?.has(decodedFragment.toLowerCase())) {
          violations.push(
            linkViolation(
              document.path,
              link.line,
              `fragment \`#${decodedFragment}\` does not name a heading in \`${target}\``,
              'use the generated GitHub heading anchor or update the destination heading',
            ),
          );
        }
      }
    }
  }
  return violations;
}

function splitDestination(destination) {
  const hash = destination.indexOf('#');
  const beforeFragment = hash >= 0 ? destination.slice(0, hash) : destination;
  const rawFragment = hash >= 0 ? destination.slice(hash + 1) : '';
  const query = beforeFragment.indexOf('?');
  return {
    rawPath: query >= 0 ? beforeFragment.slice(0, query) : beforeFragment,
    rawFragment,
  };
}

function isContained(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function linkViolation(documentPath, line, message, fix) {
  return diagnostic(documentPath, line, 'markdown.link', message, fix, POLICY);
}
