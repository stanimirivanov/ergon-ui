import { rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const outputRoot = fileURLToPath(
  new URL('../../dist/user-guide/', import.meta.url),
);
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function runStep(label, command, args, environment = process.env) {
  console.log(`\n${label}`);
  const isWindowsCommandScript =
    process.platform === 'win32' && command.endsWith('.cmd');
  const result = spawnSync(
    isWindowsCommandScript ? (process.env['ComSpec'] ?? 'cmd.exe') : command,
    isWindowsCommandScript ? ['/d', '/s', '/c', command, ...args] : args,
    {
      cwd: repositoryRoot,
      env: environment,
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      `${label} failed: ${result.error?.message ?? `exit ${result.status}`}`,
    );
  }
}

// This script may remove only its ignored, generated output directory.
if (
  path.resolve(outputRoot) !==
  path.resolve(repositoryRoot, 'dist', 'user-guide')
) {
  throw new Error('Unexpected user-guide output path; refusing to remove it.');
}
rmSync(outputRoot, { recursive: true, force: true });

runStep('Building the workbench', pnpm, ['build']);
runStep('Installing the guide browser', pnpm, [
  'exec',
  'playwright',
  'install',
  'chromium',
]);
runStep(
  'Recording the asserted follow-up workflow',
  pnpm,
  [
    'exec',
    'nx',
    'e2e',
    '@ergon/workbench-e2e',
    '--grep',
    '@user-guide',
    '--skip-nx-cache',
  ],
  { ...process.env, ERGON_E2E_MODE: 'user-guide' },
);
runStep('Assembling the user-guide book', process.execPath, [
  fileURLToPath(new URL('./assemble-book.mjs', import.meta.url)),
]);
console.log('\n[ok] User guide generated under dist/user-guide');
