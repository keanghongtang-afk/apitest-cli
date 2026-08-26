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

export async function executeRequest(url, method, body = null, headers = {}) {
  const config = { method, headers: { ...headers } };

  if (body !== null) {
    config.body = body;
    if (!(body instanceof FormData) && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
  }

  const spinner = ora({
    text: `${accent(method)} ${url}`,
    color: 'cyan',
  }).start();

  const startTime = performance.now();

  try {
    const response = await fetch(url, config);
    const duration = (performance.now() - startTime).toFixed(0);
    const ok = response.ok;

    spinner[ok ? 'succeed' : 'fail'](
      `${pc.bold(response.status)} ${response.statusText} ${muted(`· ${duration}ms`)}`
    );

    const contentType = response.headers.get('content-type') || '';
    let bodyText;

    if (contentType.includes('application/json')) {
      const json = await response.json();
      bodyText = JSON.stringify(json, null, 2);
    } else {
      bodyText = await response.text();
    }

    console.log(
      boxen(bodyText || muted('(empty response body)'), {
        title: muted('response body'),
        titleAlignment: 'left',
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        margin: { top: 0, bottom: 0, left: 0, right: 0 }, // no trailing gap — footer sits right under it
        borderStyle: 'round',
        borderColor: ok ? 'green' : 'red',
        width: getResponsiveWidth(),
      })
    );
  } catch (err) {
    spinner.fail(pc.red(`Request failed: ${err.message}`));
  }
}