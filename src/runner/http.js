import pc from 'picocolors';
import boxen from 'boxen';
import ora from 'ora';

const accent = pc.cyan;
const muted = pc.gray;

export function getResponsiveWidth() {
  const columns = process.stdout.columns || 80;
  const maxWidth = 100;
  const minWidth = 40;
  const horizontalMargin = 4;

  return Math.max(minWidth, Math.min(maxWidth, columns - horizontalMargin));
}

// ============================================================
// Pure request execution — no terminal output. Shared by the CLI
// (which wraps this with a spinner + boxen) and the web UI server
// (which returns the same data as JSON to the browser).
// ============================================================
export async function performRequest(url, method, body = null, headers = {}) {
  const config = { method, headers: { ...headers } };

  if (body !== null) {
    config.body = body;
    if (!(body instanceof FormData) && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
  }

  const startTime = performance.now();

  try {
    const response = await fetch(url, config);
    const duration = Number((performance.now() - startTime).toFixed(0));
    const ok = response.ok;

    const contentType = response.headers.get('content-type') || '';
    let bodyText;

    if (contentType.includes('application/json')) {
      const json = await response.json();
      bodyText = JSON.stringify(json, null, 2);
    } else {
      bodyText = await response.text();
    }

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      ok,
      status: response.status,
      statusText: response.statusText,
      duration,
      contentType,
      bodyText,
      headers: responseHeaders,
      error: null,
    };
  } catch (err) {
    const duration = Number((performance.now() - startTime).toFixed(0));
    return {
      ok: false,
      status: null,
      statusText: null,
      duration,
      contentType: null,
      bodyText: null,
      headers: {},
      error: err.message,
    };
  }
}

export async function executeRequest(url, method, body = null, headers = {}) {
  const spinner = ora({
    text: `${accent(method)} ${url}`,
    color: 'cyan',
  }).start();

  const result = await performRequest(url, method, body, headers);

  if (result.error) {
    spinner.fail(pc.red(`Request failed: ${result.error}`));
    return;
  }

  spinner[result.ok ? 'succeed' : 'fail'](
    `${pc.bold(result.status)} ${result.statusText} ${muted(`· ${result.duration}ms`)}`
  );

  console.log(
    boxen(result.bodyText || muted('(empty response body)'), {
      title: muted('response body'),
      titleAlignment: 'left',
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 0, left: 0, right: 0 }, // no trailing gap — footer sits right under it
      borderStyle: 'round',
      borderColor: result.ok ? 'green' : 'red',
      width: getResponsiveWidth(),
    })
  );
}