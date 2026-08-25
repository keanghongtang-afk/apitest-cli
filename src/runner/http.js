import pc from 'picocolors';

export async function executeRequest(url, method, bodyJson = null, headers = {}) {
  console.log(pc.cyan(`\n🚀 Sending ${method} request to: ${url}`));
  const config = { method, headers: {...headers} };

  if (bodyJson !== null) {
    config.body = bodyJson;
    config.headers['Content-Type'] = 'application/json';
  }

  const startTime = performance.now();
  try {
    const response = await fetch(url, config);
    const duration = (performance.now() - startTime).toFixed(2);
    const statusText = `${response.status} ${response.statusText}`;
    const statusColor = response.ok ? pc.green(statusText) : pc.red(statusText);

    console.log(`\nStatus: ${statusColor} (${duration} ms)`);
    console.log(pc.bold('\n--- Response Body ---'));

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log(await response.text());
    }
  } catch (err) {
    console.error(pc.red(`\n❌ Request failed:`), err.message);
  }
}