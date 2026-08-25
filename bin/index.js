#!/usr/bin/env node
import { ExitPromptError } from '@inquirer/core';
import path from 'path';
import { Command } from 'commander';
import pc from 'picocolors';
import inquirer from 'inquirer';
import { discoverEndpoints } from '../src/parser/graph.js';
import { executeRequest } from '../src/runner/http.js';

const program = new Command();

// Ctrl + C
process.on('SIGINT', () => {
  console.log(pc.yellow('\n\n👋 Goodbye!'));
  process.exit(0);
});

program
  .name('apitest')
  .description('AST-backed static analyzer and API testing CLI')
  .option('-p, --port <number>', 'Base port for running server', '3000')
  .option('-e, --entry <path>', 'Explicit application entry point file')
  .action(async (options) => {
    const baseUrl = `http://localhost:${options.port}`;

    console.log(pc.yellow(`🔍 Parsing reachable AST graph...`));

    const { endpoints, entryPoint } = discoverEndpoints(options.entry);

    if (!entryPoint) {
      console.log(
        pc.red(
          '❌ Could not locate an application entry point. Use --entry to specify one (e.g., apitest --entry src/server.js).'
        )
      );
      return;
    }

    console.log(
      pc.gray(
        `Entry point resolved: ${path.relative(
          process.cwd(),
          entryPoint
        )}`
      )
    );

    if (endpoints.length === 0) {
      console.log(
        pc.red('No mounted endpoints detected from entry point graph.')
      );
      return;
    }

    console.log(
      pc.green(`\nDiscovered ${endpoints.length} endpoint(s):`)
    );

    // ============================================================
    // MAIN CLI LOOP
    // ============================================================

    while (true) {
      const choices = [
        ...endpoints.map((e) => ({
          name: `${pc.bold(e.method.padEnd(6))} ${e.path} ${pc.gray(
            `(${e.file})`
          )}`,
          value: e,
        })),

        new inquirer.Separator(),

        {
          name: pc.red('/exit'),
          value: '/exit',
        },
      ];

      // ============================================================
      // SELECT ENDPOINT
      // ============================================================

      const { selected } = await inquirer.prompt([
        {
          type: 'select',
          name: 'selected',
          message: 'Select an endpoint to test:',
          choices,
        },
      ]);

      // ============================================================
      // EXIT
      // ============================================================

      if (selected === '/exit') {
        console.log(pc.yellow('\n👋 Goodbye!'));
        break;
      }

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
              message: `Enter value for parameter "${paramName}":`,
              validate: (input) =>
                input.trim() !== '' ||
                'Parameter value cannot be empty.',
            },
          ]);

          finalPath = finalPath.replace(param, value);
        }
      }

      // ============================================================
      // QUERY PARAMETERS
      // ============================================================

      const { addQuery } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addQuery',
          message: 'Do you want to add query parameters?',
          default: false,
        },
      ]);

      if (addQuery) {
        const queryParams = new URLSearchParams();
        let addingMore = true;

        while (addingMore) {
          const { key, val, next } = await inquirer.prompt([
            {
              type: 'input',
              name: 'key',
              message: 'Query parameter key:',
            },
            {
              type: 'input',
              name: 'val',
              message: 'Query parameter value:',
            },
            {
              type: 'confirm',
              name: 'next',
              message: 'Add another query parameter?',
              default: false,
            },
          ]);

          if (key.trim()) {
            queryParams.append(key.trim(), val.trim());
          }

          addingMore = next;
        }

        const queryString = queryParams.toString();

        if (queryString) {
          finalPath += `?${queryString}`;
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
            message: 'Select a request header:',
            choices: [
              {
                name: 'Authorization (Bearer Token)',
                value: 'bearer',
              },
              {
                name: 'API Key',
                value: 'api-key',
              },
              {
                name: 'Content-Type',
                value: 'content-type',
              },
              {
                name: 'Accept',
                value: 'accept',
              },
              {
                name: 'Custom Header',
                value: 'custom',
              },

              new inquirer.Separator(),

              {
                name: 'Done',
                value: 'done',
              },
            ],
          },
        ]);

        // Done adding headers
        if (headerType === 'done') {
          addingHeaders = false;
          break;
        }

        // --------------------------------------------------------
        // JWT / BEARER TOKEN
        // --------------------------------------------------------

        if (headerType === 'bearer') {
          const { token } = await inquirer.prompt([
            {
              type: 'password',
              name: 'token',
              message: 'Enter JWT token:',
              mask: '*',
              validate: (input) =>
                input.trim() !== '' ||
                'JWT token cannot be empty.',
            },
          ]);

          headers.Authorization = `Bearer ${token.trim()}`;

          console.log(pc.green('✓ Authorization header added'));
        }

        // --------------------------------------------------------
        // API KEY
        // --------------------------------------------------------

        if (headerType === 'api-key') {
          const { apiKey } = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: 'Enter API key:',
              mask: '*',
              validate: (input) =>
                input.trim() !== '' ||
                'API key cannot be empty.',
            },
          ]);

          headers['X-API-Key'] = apiKey.trim();

          console.log(pc.green('✓ API key header added'));
        }

        // --------------------------------------------------------
        // CONTENT TYPE
        // --------------------------------------------------------

        if (headerType === 'content-type') {
          const { contentType } = await inquirer.prompt([
            {
              type: 'select',
              name: 'contentType',
              message: 'Select Content-Type:',
              choices: [
                'application/json',
                'application/x-www-form-urlencoded',
                'text/plain',
                'multipart/form-data',
              ],
            },
          ]);

          headers['Content-Type'] = contentType;

          console.log(
            pc.green(`✓ Content-Type: ${contentType}`)
          );
        }

        // --------------------------------------------------------
        // ACCEPT
        // --------------------------------------------------------

        if (headerType === 'accept') {
          const { accept } = await inquirer.prompt([
            {
              type: 'select',
              name: 'accept',
              message: 'Select Accept type:',
              choices: [
                'application/json',
                'text/plain',
                '*/*',
              ],
            },
          ]);

          headers.Accept = accept;

          console.log(pc.green(`✓ Accept: ${accept}`));
        }

        // --------------------------------------------------------
        // CUSTOM HEADER
        // --------------------------------------------------------

        if (headerType === 'custom') {
          const { key, value } = await inquirer.prompt([
            {
              type: 'input',
              name: 'key',
              message: 'Header name:',
              validate: (input) =>
                input.trim() !== '' ||
                'Header name cannot be empty.',
            },
            {
              type: 'password',
              name: 'value',
              message: 'Header value:',
              mask: '*',
              validate: (input) =>
                input.trim() !== '' ||
                'Header value cannot be empty.',
            },
          ]);

          headers[key.trim()] = value.trim();

          console.log(
            pc.green(`✓ Header "${key.trim()}" added`)
          );
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
            message: 'Include a JSON payload body?',
            default: true,
          },
        ]);

        if (sendBody) {
          let validJson = false;

          while (!validJson) {
            const { jsonInput } = await inquirer.prompt([
              {
                type: 'input',
                name: 'jsonInput',
                message:
                  'Enter raw JSON string (e.g., {"key": "value"}):',
                default: '{}',
              },
            ]);

            try {
              JSON.parse(jsonInput);

              bodyData = jsonInput;
              validJson = true;
            } catch (e) {
              console.log(
                pc.red(
                  `❌ Invalid JSON syntax: ${e.message}`
                )
              );
            }
          }
        }
      }

      // ============================================================
      // EXECUTE REQUEST
      // ============================================================

      const fullUrl = `${baseUrl}${finalPath}`;

      await executeRequest(
        fullUrl,
        selected.method,
        bodyData,
        headers
      );

      // ============================================================
      // RETURN TO ENDPOINT MENU
      // ============================================================

      console.log(pc.gray('\nReturning to endpoint menu...\n'));
    }
  });

program.parseAsync().catch((err) => {
  if (err instanceof ExitPromptError) {
    console.log(pc.yellow('\n👋 Exiting apitest...'));
    process.exit(0);
  }

  console.error(pc.red('\n❌ Unexpected error:'));
  console.error(err);
  process.exit(1);
});