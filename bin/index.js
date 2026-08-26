#!/usr/bin/env node
import { ExitPromptError } from '@inquirer/core';
import path from 'path';
import fs from 'fs';
import { Command } from 'commander';
import pc from 'picocolors';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import { discoverEndpoints } from '../src/parser/graph.js';
import { executeRequest } from '../src/runner/http.js';
import { getResponsiveWidth } from '../src/runner/http.js';
import { generateMockBody } from '../src/utils/mock-data.js';
const program = new Command();

// ============================================================
// THEME — Claude-Code-inspired palette
// ============================================================
const accent = pc.cyan;
const muted = pc.gray;
const dim = (s) => pc.dim(s);
const bullet = accent('⏺');

const methodColor = {
  GET: pc.green,
  POST: pc.yellow,
  PUT: pc.blue,
  PATCH: pc.magenta,
  DELETE: pc.red,
};

process.on('SIGINT', () => {
  console.log(muted('\n\n⏹  Session ended.'));
  process.exit(0);
});

function banner(entryPoint, port) {
  const lines = [
    `${accent(pc.bold('apitest'))} ${dim('· AST-backed API testing CLI')}`,
    '',
    `${muted('entry')}   ${path.relative(process.cwd(), entryPoint)}`,
    `${muted('server')}  http://localhost:${port}`,
  ];

  console.log(
    boxen(lines.join('\n'), {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );
}

function sectionHeader(text) {
  console.log(`\n${bullet} ${pc.bold(text)}`);
}

function statusLine(text) {
  console.log(`  ${muted('└')} ${muted(text)}`);
}

program
  .name('apitest')
  .description('AST-backed static analyzer and API testing CLI')
  .option('-p, --port <number>', 'Base port for running server', '3000')
  .option('-e, --entry <path>', 'Explicit application entry point file')
  .action(async (options) => {
    const baseUrl = `http://localhost:${options.port}`;

    const parseSpinner = ora({
      text: 'Parsing reachable AST graph...',
      color: 'cyan',
    }).start();

    const { endpoints, entryPoint } = discoverEndpoints(options.entry);

    if (!entryPoint) {
      parseSpinner.fail('Could not locate an application entry point.');
      console.log(
        muted('  Use --entry to specify one (e.g., apitest --entry src/server.js).')
      );
      return;
    }

    if (endpoints.length === 0) {
      parseSpinner.fail('No mounted endpoints detected from entry point graph.');
      return;
    }

    parseSpinner.succeed(`Discovered ${pc.bold(endpoints.length)} endpoint(s)`);

    banner(entryPoint, options.port);

    // ============================================================
    // MAIN CLI LOOP
    // ============================================================

    while (true) {
      const choices = [
        ...endpoints.map((e) => {
          const color = methodColor[e.method] || pc.white;
          return {
            name: `${color(e.method.padEnd(6))} ${e.path}  ${dim(`(${e.file})`)}`,
            value: e,
          };
        }),
        new inquirer.Separator(muted('─'.repeat(40))),
        { name: pc.red('✕ exit'), value: '/exit' },
      ];

      const { selected } = await inquirer.prompt([
        {
          type: 'select',
          name: 'selected',
          message: accent('❯') + ' Select an endpoint to test',
          choices,
          pageSize: 12,
        },
      ]);

      if (selected === '/exit') {
        console.log(muted('\n⏹  Session ended.'));
        break;
      }

      sectionHeader(
        `${methodColor[selected.method]?.(selected.method) || selected.method} ${selected.path}`
      );

      let finalPath = selected.path;

      // ============================================================
      // PARAMETER REPLACEMENTS
      // ============================================================

      const paramMatches = finalPath.match(/:[a-zA-Z0-9_]+/g);

      if (paramMatches) {
        for (const param of paramMatches) {
          const paramName = param.replace(':', '');

          const { value } = await inquirer.prompt([
            {
              type: 'input',
              name: 'value',
              message: `${accent('❯')} Value for ${muted(':' + paramName)}`,
              validate: (input) =>
                input.trim() !== '' || 'Parameter value cannot be empty.',
            },
          ]);

          finalPath = finalPath.replace(param, value);
        }

        statusLine(`resolved path → ${finalPath}`);
      }

      // ============================================================
      // QUERY PARAMETERS
      // ============================================================

      const { addQuery } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addQuery',
          message: `${accent('❯')} Add query parameters?`,
          default: false,
        },
      ]);

      if (addQuery) {
        const queryParams = new URLSearchParams();
        let addingMore = true;

        while (addingMore) {
          const { key, val, next } = await inquirer.prompt([
            { type: 'input', name: 'key', message: '  key' },
            { type: 'input', name: 'val', message: '  value' },
            {
              type: 'confirm',
              name: 'next',
              message: '  add another?',
              default: false,
            },
          ]);

          if (key.trim()) queryParams.append(key.trim(), val.trim());
          addingMore = next;
        }

        const queryString = queryParams.toString();
        if (queryString) {
          finalPath += `?${queryString}`;
          statusLine(`query → ${queryString}`);
        }
      }

      // ============================================================
      // HEADERS
      // ============================================================

      const headers = {};
      let addingHeaders = true;

      while (addingHeaders) {
        const { headerType } = await inquirer.prompt([
          {
            type: 'select',
            name: 'headerType',
            message: `${accent('❯')} Select a request header`,
            choices: [
              { name: 'Authorization (Bearer Token)', value: 'bearer' },
              { name: 'API Key', value: 'api-key' },
              { name: 'Content-Type', value: 'content-type' },
              { name: 'Accept', value: 'accept' },
              { name: 'Custom Header', value: 'custom' },
              new inquirer.Separator(muted('─'.repeat(30))),
              { name: dim('done'), value: 'done' },
            ],
          },
        ]);

        if (headerType === 'done') {
          addingHeaders = false;
          break;
        }

        if (headerType === 'bearer') {
          const { token } = await inquirer.prompt([
            {
              type: 'password',
              name: 'token',
              message: '  JWT token',
              mask: '*',
              validate: (input) => input.trim() !== '' || 'JWT token cannot be empty.',
            },
          ]);
          headers.Authorization = `Bearer ${token.trim()}`;
          statusLine('Authorization header set');
        }

        if (headerType === 'api-key') {
          const { apiKey } = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: '  API key',
              mask: '*',
              validate: (input) => input.trim() !== '' || 'API key cannot be empty.',
            },
          ]);
          headers['X-API-Key'] = apiKey.trim();
          statusLine('X-API-Key header set');
        }

        if (headerType === 'content-type') {
          const { contentType } = await inquirer.prompt([
            {
              type: 'select',
              name: 'contentType',
              message: '  Content-Type',
              choices: [
                'application/json',
                'application/x-www-form-urlencoded',
                'text/plain',
                'multipart/form-data',
              ],
            },
          ]);
          headers['Content-Type'] = contentType;
          statusLine(`Content-Type: ${contentType}`);
        }

        if (headerType === 'accept') {
          const { accept } = await inquirer.prompt([
            {
              type: 'select',
              name: 'accept',
              message: '  Accept',
              choices: ['application/json', 'text/plain', '*/*'],
            },
          ]);
          headers.Accept = accept;
          statusLine(`Accept: ${accept}`);
        }

        if (headerType === 'custom') {
          const { key, value } = await inquirer.prompt([
            {
              type: 'input',
              name: 'key',
              message: '  header name',
              validate: (input) => input.trim() !== '' || 'Header name cannot be empty.',
            },
            {
              type: 'password',
              name: 'value',
              message: '  header value',
              mask: '*',
              validate: (input) => input.trim() !== '' || 'Header value cannot be empty.',
            },
          ]);
          headers[key.trim()] = value.trim();
          statusLine(`${key.trim()} header set`);
        }
      }

      // ============================================================
      // PAYLOAD BODY
      // ============================================================

      let bodyData = null;

      if (['POST', 'PUT', 'PATCH'].includes(selected.method)) {
        const { sendBody } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'sendBody',
            message: `${accent('❯')} Include a request payload body?`,
            default: true,
          },
        ]);

        if (sendBody) {
          const { bodyType } = await inquirer.prompt([
            {
              type: 'select',
              name: 'bodyType',
              message: '  Payload body type',
              choices: [
                { name: 'application/json', value: 'json' },
                { name: 'application/x-www-form-urlencoded', value: 'form' },
                { name: 'text/plain', value: 'text' },
                { name: 'multipart/form-data', value: 'multipart' },
              ],
            },
          ]);

          if (bodyType === 'json') {
            const detectedFields = selected.bodyFields || [];
            let mockObj = null;

            if (detectedFields.length > 0) {
              statusLine(`detected fields → ${detectedFields.join(', ')}`);

              const { fillMode } = await inquirer.prompt([
                {
                  type: 'select',
                  name: 'fillMode',
                  message: '  How do you want to fill the body?',
                  choices: [
                    { name: `Generate mock data (${detectedFields.length} field(s))`, value: 'mock' },
                    { name: 'Enter JSON manually', value: 'manual' },
                  ],
                },
              ]);

              if (fillMode === 'mock') {
                mockObj = generateMockBody(detectedFields);

                console.log(
                  boxen(JSON.stringify(mockObj, null, 2), {
                    title: muted('generated mock body'),
                    titleAlignment: 'left',
                    padding: { top: 0, bottom: 0, left: 1, right: 1 },
                    margin: { top: 0, bottom: 0, left: 0, right: 0 },
                    borderStyle: 'round',
                    borderColor: 'cyan',
                  })
                );

                const { useMock } = await inquirer.prompt([
                  {
                    type: 'confirm',
                    name: 'useMock',
                    message: '  Use this mock body as-is?',
                    default: true,
                  },
                ]);

                if (useMock) {
                  bodyData = JSON.stringify(mockObj, null, 2);
                }
                // if declined, mockObj is kept and used to prefill the
                // editable prompt below — nothing is thrown away
              }
            }

            if (bodyData === null) {
              // Prefill with the mock that was just shown (if any) so the
              // user is editing what they saw, not a freshly re-rolled one.
              const editableDefault = mockObj
                ? JSON.stringify(mockObj)
                : detectedFields.length > 0
                ? JSON.stringify(generateMockBody(detectedFields))
                : '{}';

              if (mockObj) {
                statusLine('edit the mock body below, then press enter');
              }

              let validJson = false;
              while (!validJson) {
                const { jsonInput } = await inquirer.prompt([
                  {
                    type: 'input',
                    name: 'jsonInput',
                    message: '  raw JSON',
                    default: editableDefault,
                  },
                ]);
                try {
                  JSON.parse(jsonInput);
                  bodyData = jsonInput;
                  validJson = true;
                } catch (e) {
                  console.log(pc.red(`  ✕ Invalid JSON: ${e.message}`));
                }
              }
            }

            headers['Content-Type'] = 'application/json';
            statusLine('body type → json');
          }

          if (bodyType === 'form') {
            const formParams = new URLSearchParams();
            let addingMore = true;
            while (addingMore) {
              const { key, val, next } = await inquirer.prompt([
                { type: 'input', name: 'key', message: '  field key' },
                { type: 'input', name: 'val', message: '  field value' },
                { type: 'confirm', name: 'next', message: '  add another?', default: false },
              ]);
              if (key.trim()) formParams.append(key.trim(), val.trim());
              addingMore = next;
            }
            bodyData = formParams.toString();
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            statusLine('body type → form-urlencoded');
          }

          if (bodyType === 'text') {
            const { textInput } = await inquirer.prompt([
              { type: 'input', name: 'textInput', message: '  raw text body', default: '' },
            ]);
            bodyData = textInput;
            headers['Content-Type'] = 'text/plain';
            statusLine('body type → text/plain');
          }

          if (bodyType === 'multipart') {
            const multipart = new FormData();
            let addingMore = true;

            while (addingMore) {
              const { key, fieldKind } = await inquirer.prompt([
                { type: 'input', name: 'key', message: '  field name' },
                {
                  type: 'select',
                  name: 'fieldKind',
                  message: '  field type',
                  choices: [
                    { name: 'Text value', value: 'text' },
                    { name: 'File (read from disk)', value: 'file' },
                  ],
                },
              ]);

              if (key.trim() && fieldKind === 'text') {
                const { val } = await inquirer.prompt([
                  { type: 'input', name: 'val', message: '  field value' },
                ]);
                multipart.append(key.trim(), val);
              } else if (key.trim() && fieldKind === 'file') {
                let filePath;
                let fileBuffer = null;

                while (fileBuffer === null) {
                  ({ filePath } = await inquirer.prompt([
                    { type: 'input', name: 'filePath', message: '  path to file' },
                  ]));
                  try {
                    fileBuffer = fs.readFileSync(filePath.trim());
                  } catch (e) {
                    console.log(pc.red(`  ✕ Could not read file: ${e.message}`));
                  }
                }

                const fileName = path.basename(filePath.trim());
                multipart.append(key.trim(), new Blob([fileBuffer]), fileName);
                statusLine(`attached "${fileName}" (${fileBuffer.length} bytes)`);
              }

              const { next } = await inquirer.prompt([
                { type: 'confirm', name: 'next', message: '  add another field?', default: false },
              ]);
              addingMore = next;
            }

            bodyData = multipart;
            delete headers['Content-Type'];
            statusLine('body type → multipart/form-data');
          }
        }
      }

      // ============================================================
      // EXECUTE REQUEST
      // ============================================================

      const fullUrl = `${baseUrl}${finalPath}`;
      await executeRequest(fullUrl, selected.method, bodyData, headers);

      // Footer sits directly under the response box — one line, no blank
      // line above it — so the next prompt doesn't look disconnected.
      console.log(muted('─'.repeat(getResponsiveWidth())) + '\n');
    }
  });

program.parseAsync().catch((err) => {
  if (err instanceof ExitPromptError) {
    console.log(muted('\n⏹  Session ended.'));
    process.exit(0);
  }
  console.error(pc.red('\n✕ Unexpected error:'));
  console.error(err);
  process.exit(1);
});