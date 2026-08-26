import fs from 'fs';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { HTTP_METHODS } from '../config/constants.js';
import { resolveImportPath } from '../utils/path.js';

const traverse = traverseModule.default || traverseModule;

// Cache parsed ASTs across files — several routes commonly point to the
// same controller file, so avoid re-parsing it each time.
const astCache = new Map();

function getAST(filePath) {
  if (astCache.has(filePath)) return astCache.get(filePath);
  if (!fs.existsSync(filePath)) {
    astCache.set(filePath, null);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  let ast = null;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'classProperties', 'dynamicImport'],
    });
  } catch (err) {
    ast = null;
  }

  astCache.set(filePath, ast);
  return ast;
}

// ============================================================
// Walks a function node (arrow / function expression / declaration)
// looking for req.body usage:
//   req.body.email          (MemberExpression)
//   req.body['email']       (computed MemberExpression)
//   const { a, b } = req.body   (destructuring)
// ============================================================
function extractFieldsFromFunctionNode(fnPath) {
  if (!fnPath) return [];

  const fields = new Set();
  const node = fnPath.node;
  const firstParam = node.params && node.params[0];
  if (!firstParam || firstParam.type !== 'Identifier') return [];
  const reqParamName = firstParam.name;

  fnPath.traverse({
    MemberExpression(mp) {
      const { object, property, computed } = mp.node;
      const isReqBody =
        object.type === 'MemberExpression' &&
        object.object.type === 'Identifier' &&
        object.object.name === reqParamName &&
        object.property.type === 'Identifier' &&
        object.property.name === 'body';

      if (!isReqBody) return;

      if (!computed && property.type === 'Identifier') {
        fields.add(property.name);
      } else if (computed && property.type === 'StringLiteral') {
        fields.add(property.value);
      }
    },

    VariableDeclarator(vd) {
      const init = vd.node.init;
      const isReqBody =
        init &&
        init.type === 'MemberExpression' &&
        init.object.type === 'Identifier' &&
        init.object.name === reqParamName &&
        init.property.type === 'Identifier' &&
        init.property.name === 'body';

      if (!isReqBody || vd.node.id.type !== 'ObjectPattern') return;

      for (const prop of vd.node.id.properties) {
        if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
          fields.add(prop.key.name);
        }
      }
    },
  });

  return Array.from(fields);
}

// Finds a function assigned to `name` anywhere in `ast` (declaration or
// `const name = (req,res) => {}`), regardless of export status.
function findLocalFunctionByName(ast, name) {
  let found = null;

  traverse(ast, {
    FunctionDeclaration(p) {
      if (found) return;
      if (p.node.id && p.node.id.name === name) found = p;
    },
    VariableDeclarator(p) {
      if (found) return;
      if (
        p.node.id.type === 'Identifier' &&
        p.node.id.name === name &&
        p.node.init &&
        (p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression')
      ) {
        found = p.get('init');
      }
    },
  });

  return found;
}

// ============================================================
// Given a file + export name, parses that file (cached) and locates the
// matching function definition. Covers:
//   export function name() {}
//   export const name = (req, res) => {}
//   export default function() {} / export default (req,res) => {}
//   export default name;                      (re-export of local fn)
//   module.exports.name = function/arrow
//   exports.name = function/arrow
//   module.exports = { name: function/arrow }
// Returns a Babel NodePath positioned at the function node, or null.
// ============================================================
function findExportedHandler(filePath, exportName) {
  const ast = getAST(filePath);
  if (!ast || exportName === '*') return null; // namespace imports not resolved

  let found = null;

  traverse(ast, {
    FunctionDeclaration(p) {
      if (found) return;
      if (exportName !== 'default' && p.node.id && p.node.id.name === exportName) {
        found = p;
      }
    },

    VariableDeclarator(p) {
      if (found) return;
      if (
        exportName !== 'default' &&
        p.node.id.type === 'Identifier' &&
        p.node.id.name === exportName &&
        p.node.init &&
        (p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression')
      ) {
        found = p.get('init');
      }
    },

    ExportDefaultDeclaration(p) {
      if (found) return;
      if (exportName !== 'default') return;

      const decl = p.node.declaration;
      if (
        decl.type === 'FunctionDeclaration' ||
        decl.type === 'ArrowFunctionExpression' ||
        decl.type === 'FunctionExpression'
      ) {
        found = p.get('declaration');
      } else if (decl.type === 'Identifier') {
        found = findLocalFunctionByName(ast, decl.name);
      }
    },

    AssignmentExpression(p) {
      if (found) return;
      const { left, right } = p.node;

      // module.exports.name = ... / exports.name = ...
      if (
        left.type === 'MemberExpression' &&
        left.property.type === 'Identifier' &&
        left.property.name === exportName &&
        (right.type === 'ArrowFunctionExpression' || right.type === 'FunctionExpression')
      ) {
        const objectMatches =
          (left.object.type === 'MemberExpression' &&
            left.object.object.name === 'module' &&
            left.object.property.name === 'exports') ||
          (left.object.type === 'Identifier' && left.object.name === 'exports');

        if (objectMatches) found = p.get('right');
      }

      // module.exports = { name: function/arrow, ... }
      if (
        left.type === 'MemberExpression' &&
        left.object.name === 'module' &&
        left.property.name === 'exports' &&
        right.type === 'ObjectExpression'
      ) {
        const propPath = p
          .get('right.properties')
          .find(
            (pp) =>
              pp.node.key &&
              pp.node.key.name === exportName &&
              (pp.node.value.type === 'ArrowFunctionExpression' ||
                pp.node.value.type === 'FunctionExpression')
          );
        if (propPath) found = propPath.get('value');
      }
    },
  });

  return found;
}

// ============================================================
// Resolves a route handler argument down to req.body field names.
// Handles:
//   (req, res) => { ... }        inline
//   createUser                   local named function, same file
//   createUser                   imported (named or default) from another file
//   controller.createUser        property off a whole-module require/import
// ============================================================
function extractBodyFields(argPaths, ctx) {
  const fields = new Set();

  for (const argPath of argPaths) {
    const node = argPath.node;
    if (!node) continue;

    let targetFnPath = null;

    if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
      targetFnPath = argPath;
    } else if (node.type === 'Identifier') {
      if (ctx.localFunctions.has(node.name)) {
        targetFnPath = ctx.localFunctions.get(node.name);
      } else if (ctx.importsMap.has(node.name)) {
        const ref = ctx.importsMap.get(node.name);
        targetFnPath = findExportedHandler(ref.file, ref.exportName);
      }
    } else if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
      const objName = node.object.type === 'Identifier' ? node.object.name : null;
      if (objName && ctx.importsMap.has(objName)) {
        const ref = ctx.importsMap.get(objName);
        targetFnPath = findExportedHandler(ref.file, node.property.name);
      }
    }

    if (targetFnPath) {
      for (const f of extractFieldsFromFunctionNode(targetFnPath)) fields.add(f);
    }
  }

  return Array.from(fields);
}

export function parseFileWithAST(filePath) {
  const ast = getAST(filePath);
  if (!ast) return { rawRoutes: [], mounts: [], importedFiles: [] };

  const rawRoutes = [];
  const importsMap = new Map(); // localName -> { file, exportName }
  const localFunctions = new Map(); // name -> NodePath (function)
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
        if (specifier.type === 'ImportDefaultSpecifier') {
          importsMap.set(specifier.local.name, { file: targetFile, exportName: 'default' });
        } else if (specifier.type === 'ImportSpecifier') {
          importsMap.set(specifier.local.name, {
            file: targetFile,
            exportName: specifier.imported.name,
          });
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          importsMap.set(specifier.local.name, { file: targetFile, exportName: '*' });
        }
      }
    },

    FunctionDeclaration(pathNode) {
      if (pathNode.node.id) {
        localFunctions.set(pathNode.node.id.name, pathNode);
      }
    },

    VariableDeclarator(pathNode) {
      const init = pathNode.node.init;
      if (
        pathNode.node.id.type === 'Identifier' &&
        init &&
        (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
      ) {
        localFunctions.set(pathNode.node.id.name, pathNode.get('init'));
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
                importsMap.set(parent.id.name, { file: targetFile, exportName: 'default' });
              } else if (parent.id.type === 'ObjectPattern') {
                for (const prop of parent.id.properties) {
                  if (prop.value && prop.value.type === 'Identifier') {
                    const exportName =
                      prop.key.type === 'Identifier' ? prop.key.name : prop.value.name;
                    importsMap.set(prop.value.name, { file: targetFile, exportName });
                  }
                }
              }
            }
          }
        }
      }

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const methodName = callee.property.name.toLowerCase();
        const ctx = { importsMap, localFunctions };

        if (HTTP_METHODS.has(methodName) && args.length > 0) {
          if (args[0].type === 'StringLiteral') {
            const handlerArgPaths = pathNode.get('arguments').slice(1);
            rawRoutes.push({
              method: methodName.toUpperCase(),
              path: args[0].value,
              bodyFields: extractBodyFields(handlerArgPaths, ctx),
            });
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
                  path: curr.arguments[0].value,
                  bodyFields: extractBodyFields(pathNode.get('arguments'), ctx),
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
              mounts.push({ prefix, targetFile: importsMap.get(targetArg.name).file });
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
    },
  });

  return { rawRoutes, mounts, importedFiles: Array.from(importedFiles) };
}