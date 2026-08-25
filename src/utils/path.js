import fs from 'fs';
import path from 'path';

export function joinRoutePaths(...parts) {
  const cleaned = parts
    .filter(Boolean)
    .map((p) => String(p).trim().replace(/^\/+|\/+$/g, ''))
    .filter((p) => p.length > 0);
  
  return '/' + cleaned.join('/');
}

export function resolveImportPath(currentFile, importPath) {
  const dir = path.dirname(currentFile);
  let resolved = path.resolve(dir, importPath);

  if (!path.extname(resolved)) {
    const exts = ['.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
    for (const ext of exts) {
      if (fs.existsSync(resolved + ext)) return resolved + ext;
    }
  }
  return fs.existsSync(resolved) ? resolved : null;
}