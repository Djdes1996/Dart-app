/** Het uitserveren van de client: HTML, CSS, JavaScript en plaatjes. */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

/**
 * Zet een URL om naar een bestandspad binnen een map, en weigert alles wat
 * daarbuiten wijst.
 * @returns {string|null} het pad, of null als het buiten de map valt
 */
function resolveWithin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

/**
 * Maakt een handler die bestanden uit één of meer mappen serveert.
 * @param {Array<{prefix: string, root: string}>} mounts
 * @param {string} fallback bestand voor '/'
 */
export function createStaticHandler(mounts, fallback = 'index.html') {
  return async function handle(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Alleen GET');
      return true;
    }

    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath === '') urlPath = `/${fallback}`;

    for (const mount of mounts) {
      if (!urlPath.startsWith(mount.prefix)) continue;

      const filePath = resolveWithin(mount.root, urlPath.slice(mount.prefix.length));
      if (!filePath) continue;

      let info;
      try {
        info = await stat(filePath);
      } catch {
        continue;
      }
      if (!info.isFile()) continue;

      const type = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, {
        'content-type': type,
        'content-length': info.size,
        'cache-control': 'no-cache',
      });
      if (req.method === 'HEAD') {
        res.end();
        return true;
      }
      createReadStream(filePath).pipe(res);
      return true;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Niet gevonden');
    return true;
  };
}
