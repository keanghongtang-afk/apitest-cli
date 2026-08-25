import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import { STANDARD_ENTRY_FALLBACKS } from '../config/constants.js';

export function resolveEntryPoint(customEntry) {
  if (customEntry) {
    const absPath = path.resolve(process.cwd(), customEntry);
    if (fs.existsSync(absPath)) return absPath;
    console.log(pc.yellow(`⚠️ Specified entry file "${customEntry}" not found. Falling back to auto-discovery.`));
  }

  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.main) {
        const mainPath = path.resolve(process.cwd(), pkg.main);
        if (fs.existsSync(mainPath)) return mainPath;
      }
      if (pkg.scripts && pkg.scripts.start) {
        const match = pkg.scripts.start.match(/(?:node|ts-node|nodemon)\s+([^\s]+)/);
        if (match && match[1]) {
          const scriptPath = path.resolve(process.cwd(), match[1]);
          if (fs.existsSync(scriptPath)) return scriptPath;
        }
      }
    } catch (e) {
      // Ignore package.json parsing issues
    }
  }

  for (const file of STANDARD_ENTRY_FALLBACKS) {
    const abs = path.resolve(process.cwd(), file);
    if (fs.existsSync(abs)) return abs;
  }

  return null;
}