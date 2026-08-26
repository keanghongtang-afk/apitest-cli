import path from 'path';
import { parseFileWithAST } from './ast.js';
import { resolveEntryPoint } from '../utils/entry.js';
import { joinRoutePaths } from '../utils/path.js';

export function discoverEndpoints(customEntry) {
  const entryPoint = resolveEntryPoint(customEntry);
  if (!entryPoint) return { endpoints: [], entryPoint: null };

  const fileGraph = new Map();
  const parsedFiles = new Set();

  function parseReachableGraph(currentFile) {
    if (parsedFiles.has(currentFile)) return;
    parsedFiles.add(currentFile);

    const result = parseFileWithAST(currentFile);
    fileGraph.set(currentFile, result);

    for (const childFile of result.importedFiles) {
      parseReachableGraph(childFile);
    }
  }

  parseReachableGraph(entryPoint);

  const filePrefixes = new Map();

  function resolvePrefixes(currentFile, currentPrefix = '', visited = new Set()) {
    const visitKey = `${currentFile}:${currentPrefix}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);

    const data = fileGraph.get(currentFile);
    if (!data) return;

    for (const mount of data.mounts) {
      const fullPrefix = joinRoutePaths(currentPrefix, mount.prefix);

      if (!filePrefixes.has(mount.targetFile)) {
        filePrefixes.set(mount.targetFile, []);
      }

      const existing = filePrefixes.get(mount.targetFile);
      if (!existing.includes(fullPrefix)) {
        existing.push(fullPrefix);
      }

      resolvePrefixes(mount.targetFile, fullPrefix, new Set(visited));
    }
  }

  resolvePrefixes(entryPoint);

  const finalEndpoints = [];

  for (const [filePath, data] of fileGraph.entries()) {
    if (filePath !== entryPoint && !filePrefixes.has(filePath)) continue;

    const prefixes = filePrefixes.get(filePath) || [''];
    const relFile = path.relative(process.cwd(), filePath);

    for (const route of data.rawRoutes) {
      for (const prefix of prefixes) {
        const fullPath = joinRoutePaths(prefix, route.path);
        finalEndpoints.push({
          method: route.method,
          path: fullPath,
          file: relFile,
          bodyFields: route.bodyFields || [],
        });
      }
    }
  }

  const uniqueMap = new Map();
  for (const ep of finalEndpoints) {
    const key = `${ep.method}:${ep.path}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, ep);
  }

  return { endpoints: Array.from(uniqueMap.values()), entryPoint };
}