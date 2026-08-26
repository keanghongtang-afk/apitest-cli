# apitest-cli

A lightweight CLI for discovering and testing API endpoints from a local Node.js application using static AST analysis.

## Overview

`apitest-cli` inspects a project entry file, follows imported modules, and identifies Express-style route registrations such as `app.get()`, `app.post()`, `router.use()`, and `router.register()`. It then lets you choose an endpoint from the discovered list, fill in path parameters and optional query/body values, and send a real HTTP request to your local app.

This tool is useful when you want to quickly probe a running API without manually writing curl commands or reading the entire server codebase.

## Features

- Discovers routes from the app entry point and reachable imported files
- Resolves common Express-style router prefixes and nested mounts
- Supports route params like `/users/:id`
- Prompts for optional query parameters
- Prompts for JSON payloads on `POST`, `PUT`, and `PATCH`
- Sends the request through the native `fetch` API
- Works with JavaScript or TypeScript projects using common entry patterns

## Installation

```bash
git clone https://github.com/keanghongtang-afk/apitest-cli.git
cd apitest-cli
npm install
npm link
```
or you can install from npm directly
```bash
npm i -g apitest-cli
```
After linking, the command becomes available as:

```bash
apitest
```

You can also run it directly without installing globally:

```bash
node bin/index.js
```

## Usage

```bash
apitest
apitest --port 3000
apitest --entry src/server.js
apitest --entry app.js --port 8080
```

### Options

- `-p, --port <number>`: base port for the app, default is `3000`
- `-e, --entry <path>`: explicit application entry file to analyze

## Example

```js
const express = require('express');
const app = express();
const router = express.Router();

router.get('/users/:id', getUser);
router.post('/users', createUser);

app.use('/api', router);
app.get('/health', healthCheck);
```

When run, the CLI will discover values similar to:

- `GET /api/users/:id`
- `POST /api/users`
- `GET /health`

Then it will guide you interactively through:

1. Selecting the route
2. Filling in path params such as `:id`
3. Adding query string values
4. Sending a JSON body for supported methods
5. Executing the request against `http://localhost:<port>`

## How route discovery works

The CLI uses Babel’s AST parser to inspect the application source and detect:

- relative imports
- `require()` calls for routers and modules
- `app.get()`, `app.post()`, `app.put()`, `app.delete()`, and `app.patch()`
- `app.use()` and `router.use()` mount prefixes
- `router.register({ prefix: '...' })` style patterns

It traverses reachable files starting from the entry point and merges route prefixes with child route paths to reconstruct the full endpoint list.

## Entry point resolution

If no explicit entry is provided, the tool tries to resolve the app by checking:

- `package.json` `main`
- `package.json` `scripts.start`
- common filenames such as `index.js`, `server.js`, `app.js`, and `main.js`
- TypeScript equivalents like `index.ts`, `server.ts`, `app.ts`, and `main.ts`

## Notes and limitations

- This is a static analyzer, not a full runtime framework inspector.
- It relies on recognizable string-literal route definitions and common Express-like patterns.
- If routes are built dynamically or hidden behind advanced abstraction layers, they may not be detected.
- The CLI assumes the target service is running locally before you send requests.
- The CLI still only able to detect in node.js/Expressjs

## Development

```bash
npm start
```

This starts the CLI entry point in the project itself.

## Contribution

Anyone is welcome to contribute to the development of this CLI program.
For the better backend development

## License

ISC
