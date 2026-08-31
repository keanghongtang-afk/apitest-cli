import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performRequest } from '../runner/http.js';
import { generateMockBody } from '../utils/mock-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const STATIC_FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
};

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // Guard against runaway bodies (e.g. a very large base64 file field).
      if (raw.length > 50 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Rebuilds a native FormData from the JSON-serializable field list the
// browser sends: [{ key, kind: 'text', value }] or
// [{ key, kind: 'file', filename, base64 }]. Keeps the multipart-building
// logic in one place, matching how bin/index.js builds it for the CLI flow.
function buildMultipartBody(fields = []) {
  const form = new FormData();
  for (const field of fields) {
    if (!field || !field.key) continue;
    if (field.kind === 'file') {
      const buffer = Buffer.from(field.base64 || '', 'base64');
      form.append(field.key, new Blob([buffer]), field.filename || field.key);
    } else {
      form.append(field.key, field.value ?? '');
    }
  }
  return form;
}

/**
 * Creates (but does not start listening on) the web UI's HTTP server.
 *
 * @param {object} opts
 * @param {Array}  opts.endpoints  Endpoints already discovered by discoverEndpoints().
 * @param {string} opts.entryPoint Absolute path to the analyzed entry file.
 * @param {string} opts.baseUrl    Base URL of the target app under test (e.g. http://localhost:3000).
 */
export function createServer({ endpoints, entryPoint, baseUrl }) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://internal');

      // ---- static assets -------------------------------------------------
      if (req.method === 'GET' && STATIC_FILES[url.pathname]) {
        const { file, type } = STATIC_FILES[url.pathname];
        const filePath = path.join(PUBLIC_DIR, file);
        fs.readFile(filePath, (err, contents) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Failed to load UI asset');
            return;
          }
          res.writeHead(200, { 'Content-Type': type });
          res.end(contents);
        });
        return;
      }

      // ---- API: metadata about the analyzed app --------------------------
      if (req.method === 'GET' && url.pathname === '/api/meta') {
        return sendJSON(res, 200, {
          entryPoint,
          baseUrl,
          endpointCount: endpoints.length,
        });
      }

      // ---- API: discovered endpoints ---------------------------------
      if (req.method === 'GET' && url.pathname === '/api/endpoints') {
        return sendJSON(res, 200, { endpoints });
      }

      // ---- API: mock body generation for a set of field names -----------
      if (req.method === 'POST' && url.pathname === '/api/mock') {
        const { fields } = await readJSONBody(req);
        if (!Array.isArray(fields)) {
          return sendJSON(res, 400, { error: 'fields must be an array of strings' });
        }
        return sendJSON(res, 200, { body: generateMockBody(fields) });
      }

      // ---- API: execute an HTTP request against the target app ----------
      if (req.method === 'POST' && url.pathname === '/api/execute') {
        const payload = await readJSONBody(req);
        const { targetPath, method, headers = {}, bodyType, bodyRaw, multipartFields } = payload;

        if (!targetPath || !method) {
          return sendJSON(res, 400, { error: 'targetPath and method are required' });
        }

        let body = null;
        const outgoingHeaders = { ...headers };

        if (bodyType === 'multipart') {
          body = buildMultipartBody(multipartFields);
          delete outgoingHeaders['Content-Type']; // let FormData set its own boundary
        } else if (bodyType === 'json' || bodyType === 'form' || bodyType === 'text') {
          body = bodyRaw ?? '';
        }

        const targetUrl = `${baseUrl}${targetPath}`;
        const result = await performRequest(targetUrl, method, body, outgoingHeaders);
        return sendJSON(res, 200, { ...result, requestedUrl: targetUrl });
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } catch (err) {
      sendJSON(res, 500, { error: err.message });
    }
  });
}
