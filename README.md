# apitest-cli

An interactive command-line tool for testing local HTTP APIs and WebSocket services. It analyzes a Node.js application to find HTTP routes, then guides you through sending requests without writing curl commands by hand.

## Demo video

<video src="https://github.com/user-attachments/assets/acd69118-6a36-4526-b8e2-a1fbbc7267d0" controls width="800"></video>

## Features

- Discovers routes from the app entry point and reachable imported files
- Resolves common Express-style router prefixes and nested mounts
- Supports route params like `/users/:id`
- Prompts for optional query parameters
- Prompts for JSON payloads on `POST`, `PUT`, and `PATCH`
- Sends the request through the native `fetch` API
- Works with JavaScript or TypeScript projects using common entry patterns

## Installation

### Install from npm

```bash
npm install --global apitest-cli
```

### Install from source

```bash
git clone https://github.com/keanghongtang-afk/apitest-cli.git
cd apitest-cli
npm install
npm link
```

After linking, the command becomes available as:

```bash
apitest
```

You can also run the CLI directly from the repository:

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

- `-p, --port <number>`: Base port used by the HTTP URL and the default WebSocket URL. Defaults to `3000`.
- `-e, --entry <path>`: Application entry file to analyze. Without this option, the CLI searches the project automatically.

The target service must already be running. The CLI sends requests to the service; it does not start the service for you.

## Interactive workflow

When the CLI starts, it shows a test type selector.

### HTTP tests

1. Select `HTTP endpoint`.
2. Select a discovered route or choose `back` to return to the test type selector.
3. Enter values for route parameters such as `:id`.
4. Add query parameters if needed.
5. Add request headers.
6. For `POST`, `PUT`, and `PATCH`, choose a body type and enter the payload.
7. Review the response displayed in the terminal.

Press `Ctrl+C` during HTTP prompts to return to the test type selector.

### WebSocket tests

1. Select `WebSocket connection`.
2. Choose the default `ws://localhost:<port>/ws` URL or enter a custom `ws://` or `wss://` URL.
3. Add URL parameters if needed.
4. Open the connection.
5. Use `Add JSON message parameters?` to build and send JSON messages repeatedly.
6. View incoming messages as they arrive.

The WebSocket connection stays open until the server closes it or you press `Ctrl+C`. Pressing `Ctrl+C` closes the connection and returns to the test type selector. WebSocket connection errors also return to that selector.

## Example application

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

## Route discovery

The parser uses Babel to inspect the entry file and reachable local files. It recognizes:

- `app.get()`, `app.post()`, `app.put()`, `app.delete()`, and `app.patch()`
- Chained route definitions such as `router.route('/users').get(handler)`
- `app.use()` and `router.use()` mount prefixes
- `router.register()` prefixes such as `{ prefix: '/api' }`
- Relative ES module imports and CommonJS `require()` calls
- Request body fields used by route handlers, for mock JSON generation

If no entry file is supplied, the CLI checks `package.json` and common JavaScript or TypeScript entry filenames, including `index`, `server`, `app`, and `main` files.

WebSocket endpoints are not discovered by the AST parser. They are tested by selecting the WebSocket mode and entering the service URL manually or using the default localhost preset.

## Limitations

- Static analysis cannot reliably detect routes created dynamically or hidden behind unsupported abstractions.
- Only local relative imports are followed by the parser.
- HTTP route discovery currently recognizes the methods listed above.
- The service must be running before requests or WebSocket connections are sent.
- WebSocket messages are sent as JSON objects built from the prompted key/value parameters.

## Development

Install dependencies and start the CLI from the repository:

```bash
npm install
npm start
```

The current package does not include an automated test suite. JavaScript syntax can be checked with:

```bash
node --check bin/index.js
node --check src/runner/ws.js
```

## Contributing

Issues and pull requests are welcome. Please keep changes focused and include documentation updates for user-facing behavior.

## License

MIT. See [LICENSE](LICENSE).
