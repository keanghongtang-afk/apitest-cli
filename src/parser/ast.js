import fs from 'fs';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { HTTP_METHODS } from '../config/constants.js';
import { resolveImportPath } from '../utils/path.js';

const traverse = traverseModule.default || traverseModule;

export function parseFileWithAST(filePath) {
  if (!fs.existsSync(filePath)) return { rawRoutes: [], mounts: [], importedFiles: [] };

  const content = fs.readFileSync(filePath, 'utf-8');
  let ast;

  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'classProperties', 'dynamicImport']
    });
  } catch (err) {
    return { rawRoutes: [], mounts: [], importedFiles: [] };
  }

  const rawRoutes = [];
  const importsMap = new Map();
  const mounts = [];
  const importedFiles = new Set();

  traverse(ast, {
    ImportDeclaration(pathNode) {
      const source = pathNode.node.source.value;
      if (!source.startsWith('.')) return;

      const targetFile = resolveImportPath(filePath, source);
      if (!targetFile) return;

      importedFiles.add(targetFile);
      for (const specifier of pathNode.node.specifiers) {
        importsMap.set(specifier.local.name, targetFile);
      }
    },

    CallExpression(pathNode) {
      const callee = pathNode.node.callee;
      const args = pathNode.node.arguments;

      if (callee.type === 'Identifier' && callee.name === 'require' && args.length > 0) {
        if (args[0].type === 'StringLiteral' && args[0].value.startsWith('.')) {
          const targetFile = resolveImportPath(filePath, args[0].value);
          if (targetFile) {
            importedFiles.add(targetFile);
            const parent = pathNode.parent;
            if (parent.type === 'VariableDeclarator') {
              if (parent.id.type === 'Identifier') {
                importsMap.set(parent.id.name, targetFile);
              } else if (parent.id.type === 'ObjectPattern') {
                for (const prop of parent.id.properties) {
                  if (prop.value && prop.value.type === 'Identifier') {
                    importsMap.set(prop.value.name, targetFile);
                  }
                }
              }
            }
          }
        }
      }

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const methodName = callee.property.name.toLowerCase();

        if (HTTP_METHODS.has(methodName) && args.length > 0) {
          if (args[0].type === 'StringLiteral') {
            rawRoutes.push({ method: methodName.toUpperCase(), path: args[0].value });
          } else {
            let curr = callee.object;
            while (curr && curr.type === 'CallExpression') {
              if (
                curr.callee.type === 'MemberExpression' &&
                curr.callee.property.type === 'Identifier' &&
                curr.callee.property.name === 'route' &&
                curr.arguments.length > 0 &&
                curr.arguments[0].type === 'StringLiteral'
              ) {
                rawRoutes.push({
                  method: methodName.toUpperCase(),
                  path: curr.arguments[0].value
                });
                break;
              }
              curr = curr.callee.object;
            }
          }
        }

        if (methodName === 'use' || methodName === 'register') {
          let prefix = '/';
          let targetArg = null;

          if (args.length >= 2 && args[0].type === 'StringLiteral') {
            prefix = args[0].value;
            targetArg = args[1];
          } else if (args.length >= 1) {
            targetArg = args[0];
          }

          if (methodName === 'register' && args.length >= 2 && args[1].type === 'ObjectExpression') {
            const prefixProp = args[1].properties.find(
              (p) => p.key && (p.key.name === 'prefix' || p.key.value === 'prefix')
            );
            if (prefixProp && prefixProp.value && prefixProp.value.type === 'StringLiteral') {
              prefix = prefixProp.value.value;
            }
          }
        if (targetArg) {
                    if (targetArg.type === 'Identifier' && importsMap.has(targetArg.name)) {
                    mounts.push({ prefix, targetFile: importsMap.get(targetArg.name) });
                    }

                    if (targetArg.type === 'CallExpression' && targetArg.callee.name === 'require') {
                    if (targetArg.arguments[0] && targetArg.arguments[0].type === 'StringLiteral') {
                        const targetFile = resolveImportPath(filePath, targetArg.arguments[0].value);
                        if (targetFile) mounts.push({ prefix, targetFile });
                    }
                    }
                }
                }
            }
            }
        });

  return { rawRoutes, mounts, importedFiles: Array.from(importedFiles) };
}