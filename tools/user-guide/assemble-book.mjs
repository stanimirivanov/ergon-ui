import { fileURLToPath } from 'node:url';
import { assembleBook } from './book.mjs';

const outputRoot = fileURLToPath(
  new URL('../../dist/user-guide/', import.meta.url),
);
const count = await assembleBook(outputRoot);
console.log(
  `[ok] Assembled ${count} guide chapter(s) as Markdown and static HTML`,
);
