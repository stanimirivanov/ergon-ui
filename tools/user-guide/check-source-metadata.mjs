import { fileURLToPath } from 'node:url';
import { checkRepositoryGuideMetadata } from './source-metadata.mjs';

await checkRepositoryGuideMetadata(
  fileURLToPath(new URL('../../', import.meta.url)),
);
