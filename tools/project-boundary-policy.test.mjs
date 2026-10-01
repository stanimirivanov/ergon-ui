import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateProjectBoundaries } from './project-boundary-policy.mjs';

const NO_LEGACY_LOCATIONS = new Map();
const ACCEPTED_APPLICATION_DECISION =
  'docs/decisions/0042-own-follow-up-workflow.md';

describe('project boundary policy', () => {
  it('accepts a capability-first frontend graph', () => {
    const projects = [
      project('packages/follow-up/model', '@ergon/follow-up-model', [
        'type:model',
        'scope:follow-up',
        'platform:shared',
      ]),
      project(
        'packages/follow-up/data-access-web',
        '@ergon/follow-up-data-access-web',
        ['type:data-access', 'scope:follow-up', 'platform:web'],
        { '@ergon/follow-up-model': 'workspace:*' },
      ),
      project(
        'packages/follow-up/feature-web',
        '@ergon/follow-up-feature-web',
        ['type:feature', 'scope:follow-up', 'platform:web'],
        { '@ergon/follow-up-data-access-web': 'workspace:*' },
      ),
      project(
        'apps/ergon-workbench',
        '@ergon/workbench',
        ['type:app', 'scope:workbench', 'platform:web'],
        { '@ergon/follow-up-feature-web': 'workspace:*' },
      ),
    ];

    assert.deepEqual(
      validateProjectBoundaries(projects, {
        legacyProjectLocations: NO_LEGACY_LOCATIONS,
      }),
      [],
    );
  });

  it('rejects missing, duplicate, unknown, and obsolete role tags', () => {
    const errors = validateProjectBoundaries(
      [
        project('packages/follow-up/model', '@ergon/model', [
          'type:model',
          'type:unknown',
          'scope:follow-up',
          'platform:shared',
          'layer:domain',
          'adapter:inbound',
        ]),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(errors.some((error) => error.includes('exactly one type:*')));
    assert(errors.some((error) => error.includes('unsupported project type')));
    assert(errors.some((error) => error.includes('obsolete layer:domain')));
    assert(errors.some((error) => error.includes('obsolete adapter:inbound')));
  });

  it('requires every metadata dimension', () => {
    const errors = validateProjectBoundaries(
      [
        project('packages/follow-up/model', '@ergon/missing-type', [
          'scope:follow-up',
          'platform:shared',
        ]),
        project('packages/session/model', '@ergon/missing-scope', [
          'type:model',
          'platform:shared',
        ]),
        project('packages/shared/model', '@ergon/missing-platform', [
          'type:model',
          'scope:shared',
        ]),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(errors.some((error) => error.includes('exactly one type:*')));
    assert(errors.some((error) => error.includes('exactly one scope:*')));
    assert(errors.some((error) => error.includes('exactly one platform:*')));
  });

  it('rejects outward type, scope, and platform dependencies', () => {
    const projects = [
      project(
        'packages/shared/model',
        '@ergon/shared-model',
        ['type:model', 'scope:shared', 'platform:shared'],
        { '@ergon/follow-up-data-access-web': 'workspace:*' },
      ),
      project(
        'packages/follow-up/data-access-web',
        '@ergon/follow-up-data-access-web',
        ['type:data-access', 'scope:follow-up', 'platform:web'],
      ),
    ];

    const errors = validateProjectBoundaries(projects, {
      legacyProjectLocations: NO_LEGACY_LOCATIONS,
    });

    assert(errors.some((error) => error.includes('type:model cannot depend')));
    assert(
      errors.some((error) => error.includes('scope:shared cannot depend')),
    );
    assert(
      errors.some((error) => error.includes('platform:shared cannot depend')),
    );
  });

  it('requires model and application projects to be platform-neutral', () => {
    const errors = validateProjectBoundaries(
      [
        project('packages/follow-up/application', '@ergon/application', [
          'type:application',
          'scope:follow-up',
          'platform:web',
        ]),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(errors.some((error) => error.includes('must use platform:shared')));
  });

  it('enforces capability-first paths and path metadata', () => {
    const errors = validateProjectBoundaries(
      [
        project('packages/misc/arbitrary', '@ergon/arbitrary', [
          'type:model',
          'scope:shared',
          'platform:shared',
        ]),
        project('packages/follow-up/feature-web', '@ergon/wrong-feature', [
          'type:data-access',
          'scope:session',
          'platform:native',
        ]),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(errors.some((error) => error.includes('capability-first paths')));
    assert(errors.some((error) => error.includes('requires type:feature')));
    assert(errors.some((error) => error.includes('requires scope:follow-up')));
    assert(errors.some((error) => error.includes('requires platform:web')));
  });

  it('rejects package names that disagree with capability-first paths', () => {
    const errors = validateProjectBoundaries(
      [
        project('packages/follow-up/model', '@ergon/domain-follow-up', [
          'type:model',
          'scope:follow-up',
          'platform:shared',
        ]),
        project(
          'packages/follow-up/data-access-web',
          '@ergon/session-data-access-web',
          ['type:data-access', 'scope:follow-up', 'platform:web'],
        ),
        project('packages/ui-web', '@ergon/ui', [
          'type:ui',
          'scope:shared',
          'platform:web',
        ]),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(
      errors.some((error) =>
        error.includes(
          'packages/follow-up/model: package name must be @ergon/follow-up-model, found @ergon/domain-follow-up',
        ),
      ),
    );
    assert(
      errors.some((error) =>
        error.includes(
          'packages/follow-up/data-access-web: package name must be @ergon/follow-up-data-access-web, found @ergon/session-data-access-web',
        ),
      ),
    );
    assert(
      errors.some((error) =>
        error.includes(
          'packages/ui-web: package name must be @ergon/ui-web, found @ergon/ui',
        ),
      ),
    );
  });

  it('does not duplicate the missing package-name diagnosis', () => {
    const errors = validateProjectBoundaries(
      [
        project('packages/follow-up/model', undefined, [
          'type:model',
          'scope:follow-up',
          'platform:shared',
        ]),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(errors.some((error) => error.includes('requires a non-empty name')));
    assert(!errors.some((error) => error.includes('package name must be')));
  });

  it('keeps deployable and end-to-end projects under apps', () => {
    const errors = validateProjectBoundaries(
      [
        project('apps/not-a-deployable', '@ergon/not-a-deployable', [
          'type:model',
          'scope:shared',
          'platform:shared',
        ]),
        project('apps/group/nested', '@ergon/nested-app', [
          'type:app',
          'scope:workbench',
          'platform:web',
        ]),
        project('packages/follow-up/test', '@ergon/misplaced-test', [
          'type:test',
          'scope:follow-up',
          'platform:web',
        ]),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(
      errors.some((error) =>
        error.includes('projects under apps require type:app or type:test'),
      ),
    );
    assert(
      errors.some((error) =>
        error.includes('type:test projects must live under apps'),
      ),
    );
    assert(
      errors.some((error) => error.includes('require apps/<project> paths')),
    );
  });

  it('requires an accepted decision for each real application core', () => {
    const application = project(
      'packages/follow-up/application',
      '@ergon/follow-up-application',
      ['type:application', 'scope:follow-up', 'platform:shared'],
    );

    const unapprovedErrors = validateProjectBoundaries([application], {
      legacyProjectLocations: NO_LEGACY_LOCATIONS,
    });
    assert(
      unapprovedErrors.some((error) =>
        error.includes('requires an explicit accepted-decision entry'),
      ),
    );

    assert.deepEqual(
      validateProjectBoundaries([application], {
        legacyProjectLocations: NO_LEGACY_LOCATIONS,
        approvedApplicationCores: new Map([
          ['packages/follow-up/application', ACCEPTED_APPLICATION_DECISION],
        ]),
        acceptedDecisionPaths: new Set([ACCEPTED_APPLICATION_DECISION]),
      }),
      [],
    );
  });

  it('rejects invalid, unaccepted, stale, and misclassified application approvals', () => {
    const model = project(
      'packages/follow-up/model',
      '@ergon/follow-up-model',
      ['type:model', 'scope:follow-up', 'platform:shared'],
    );
    const application = project(
      'packages/session/application',
      '@ergon/session-application',
      ['type:application', 'scope:session', 'platform:shared'],
    );
    const errors = validateProjectBoundaries([model, application], {
      legacyProjectLocations: NO_LEGACY_LOCATIONS,
      approvedApplicationCores: new Map([
        ['packages/follow-up/model', ''],
        [
          'packages/session/application',
          'docs/decisions/0043-own-session-workflow.md',
        ],
        [
          'packages/shared/application',
          'docs/decisions/0099-missing-application.md',
        ],
      ]),
    });

    assert(
      errors.some((error) =>
        error.includes('requires a repository decision path'),
      ),
    );
    assert(errors.some((error) => error.includes('requires type:application')));
    assert(
      errors.some((error) =>
        error.includes('stale approved-application entry'),
      ),
    );
    assert(
      errors.some((error) =>
        error.includes('does not exist or is not accepted'),
      ),
    );
  });

  it('requires core projects to use the platform-neutral TypeScript configuration', () => {
    const errors = validateProjectBoundaries(
      [
        project(
          'packages/follow-up/model',
          '@ergon/follow-up-model',
          ['type:model', 'scope:follow-up', 'platform:shared'],
          undefined,
          {
            extendsPath: 'tsconfig.base.json',
            libraries: ['dom', 'es2022'],
            types: ['node'],
          },
        ),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(errors.some((error) => error.includes('extend tsconfig.core.json')));
    assert(errors.some((error) => error.includes('platform libraries dom')));
    assert(
      errors.some((error) => error.includes('ambient platform types node')),
    );
  });

  it('keeps transitional compiler exceptions explicit and removable', () => {
    const legacyProjectLocations = new Map([
      [
        'packages/application/follow-up',
        {
          type: 'type:application',
          scope: 'scope:follow-up',
          platform: 'platform:shared',
          compilerConfigurationException: {
            reason: 'transitional AbortSignal contract',
            extendsPath: 'tsconfig.base.json',
            libraries: ['dom', 'es2022'],
            types: ['*'],
          },
          target: 'remove after contract consolidation',
        },
      ],
    ]);
    const tags = ['type:application', 'scope:follow-up', 'platform:shared'];
    const transitional = project(
      'packages/application/follow-up',
      '@ergon/application-follow-up',
      tags,
      undefined,
      {
        extendsPath: 'tsconfig.base.json',
        libraries: ['dom', 'es2022'],
        types: ['*'],
      },
    );

    assert.deepEqual(
      validateProjectBoundaries([transitional], { legacyProjectLocations }),
      [],
    );

    const broadenedErrors = validateProjectBoundaries(
      [
        project(
          'packages/application/follow-up',
          '@ergon/application-follow-up',
          tags,
          undefined,
          {
            extendsPath: 'tsconfig.base.json',
            libraries: ['dom', 'es2022', 'webworker'],
            types: ['*', 'node'],
          },
        ),
      ],
      { legacyProjectLocations },
    );
    assert(
      broadenedErrors.some((error) =>
        error.includes('exceeds the documented exception'),
      ),
    );

    const staleErrors = validateProjectBoundaries(
      [
        project(
          'packages/application/follow-up',
          '@ergon/application-follow-up',
          tags,
        ),
      ],
      { legacyProjectLocations },
    );
    assert(
      staleErrors.some((error) =>
        error.includes('stale compiler-configuration exception'),
      ),
    );
  });

  it('rejects framework dependencies from model and application projects', () => {
    const errors = validateProjectBoundaries(
      [
        project(
          'packages/follow-up/model',
          '@ergon/follow-up-model',
          ['type:model', 'scope:follow-up', 'platform:shared'],
          {
            react: '19.3.0',
            effect: '3.22.2',
            tailwindcss: '4.3.0',
          },
        ),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(
      errors.some((error) => error.includes('framework dependency react')),
    );
    assert(
      errors.some((error) => error.includes('framework dependency effect')),
    );
    assert(
      errors.some((error) =>
        error.includes('framework dependency tailwindcss'),
      ),
    );
  });

  it('rejects unresolved workspace dependencies', () => {
    const errors = validateProjectBoundaries(
      [
        project(
          'packages/follow-up/data-access-web',
          '@ergon/follow-up-data-access-web',
          ['type:data-access', 'scope:follow-up', 'platform:web'],
          { '@ergon/missing': 'workspace:*' },
        ),
      ],
      { legacyProjectLocations: NO_LEGACY_LOCATIONS },
    );

    assert(
      errors.some((error) =>
        error.includes('workspace dependency @ergon/missing does not resolve'),
      ),
    );
  });

  it('keeps legacy global-layer locations finite and correctly classified', () => {
    const legacyProjectLocations = new Map([
      [
        'packages/domain/follow-up',
        {
          type: 'type:model',
          scope: 'scope:follow-up',
          platform: 'platform:shared',
          target: 'packages/follow-up/model',
        },
      ],
      [
        'packages/application/follow-up',
        {
          type: 'type:application',
          scope: 'scope:follow-up',
          platform: 'platform:shared',
          target: 'packages/follow-up/application',
        },
      ],
    ]);
    const errors = validateProjectBoundaries(
      [
        project('packages/domain/follow-up', '@ergon/domain-follow-up', [
          'type:model',
          'scope:session',
          'platform:native',
        ]),
        project('packages/infrastructure/unlisted', '@ergon/unlisted', [
          'type:data-access',
          'scope:follow-up',
          'platform:web',
        ]),
      ],
      { legacyProjectLocations },
    );

    assert(
      errors.some((error) =>
        error.includes('legacy ledger requires scope:follow-up'),
      ),
    );
    assert(
      errors.some((error) =>
        error.includes('legacy ledger requires platform:shared'),
      ),
    );
    assert(errors.some((error) => error.includes('unlisted legacy')));
    assert(
      errors.some((error) => error.includes('stale legacy-location entry')),
    );
  });

  it('accepts a correctly classified finite legacy location', () => {
    const legacyProjectLocations = new Map([
      [
        'packages/domain/follow-up',
        {
          type: 'type:model',
          scope: 'scope:follow-up',
          platform: 'platform:shared',
          target: 'packages/follow-up/model',
        },
      ],
    ]);

    assert.deepEqual(
      validateProjectBoundaries(
        [
          project('packages/domain/follow-up', '@ergon/domain-follow-up', [
            'type:model',
            'scope:follow-up',
            'platform:shared',
          ]),
        ],
        { legacyProjectLocations },
      ),
      [],
    );
  });
});

function project(
  path,
  name,
  tags,
  dependencies = undefined,
  typescriptConfiguration = defaultTypeScriptConfiguration(tags),
) {
  return {
    path,
    typescriptConfiguration,
    manifest: {
      name,
      ...(dependencies === undefined ? {} : { dependencies }),
      nx: { tags },
    },
  };
}

function defaultTypeScriptConfiguration(tags) {
  if (!tags.includes('type:model') && !tags.includes('type:application')) {
    return undefined;
  }
  return {
    extendsPath: 'tsconfig.core.json',
    libraries: ['es2022'],
    types: [],
  };
}
