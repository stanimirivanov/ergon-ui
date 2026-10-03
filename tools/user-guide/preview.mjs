import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputRoot = fileURLToPath(
  new URL('../../dist/user-guide/', import.meta.url),
);
const port = Number.parseInt(process.env['GUIDE_PORT']?.trim() ?? '4173', 10);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error('GUIDE_PORT must be an integer between 1 and 65535.');
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.webm', 'video/webm'],
]);

const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const root = path.resolve(outputRoot);
    let requested = path.resolve(root, relative);
    if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    if ((await stat(requested)).isDirectory()) {
      requested = path.join(requested, 'index.html');
    }
    const actual = await realpath(requested);
    if (!actual.startsWith(`${await realpath(root)}${path.sep}`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const file = await stat(actual);
    if (!file.isFile()) throw new Error('Not a file');
    const headers = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'self'; img-src 'self'; media-src 'self'; style-src 'self'",
      'Content-Type':
        contentTypes.get(path.extname(actual).toLowerCase()) ??
        'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    };
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/u);
    if (range) {
      const first = range[1];
      const last = range[2];
      const suffix = first.length === 0 ? Number.parseInt(last, 10) : 0;
      const start =
        first.length > 0
          ? Number.parseInt(first, 10)
          : Math.max(0, file.size - suffix);
      const end =
        last.length > 0 && first.length > 0
          ? Number.parseInt(last, 10)
          : file.size - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start > end ||
        start >= file.size
      ) {
        response.writeHead(416, {
          ...headers,
          'Content-Range': `bytes */${file.size}`,
        });
        response.end();
        return;
      }
      const boundedEnd = Math.min(end, file.size - 1);
      response.writeHead(206, {
        ...headers,
        'Content-Length': boundedEnd - start + 1,
        'Content-Range': `bytes ${start}-${boundedEnd}/${file.size}`,
      });
      if (request.method === 'HEAD') response.end();
      else createReadStream(actual, { start, end: boundedEnd }).pipe(response);
      return;
    }
    response.writeHead(200, { ...headers, 'Content-Length': file.size });
    if (request.method === 'HEAD') response.end();
    else createReadStream(actual).pipe(response);
  } catch (error) {
    response.writeHead(error?.code === 'ENOENT' ? 404 : 400, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
    response.end(error?.code === 'ENOENT' ? 'Not found' : 'Bad request');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[ok] Ergon user guide available at http://127.0.0.1:${port}`);
});
