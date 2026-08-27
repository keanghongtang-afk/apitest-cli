import pc from 'picocolors';
import boxen from 'boxen';
import ora from 'ora';
import WebSocket from 'ws';
import { getResponsiveWidth } from './http.js';

const accent = pc.cyan;
const muted = pc.gray;

export async function executeWebSocket(url, params = {}) {
  const spinner = ora({
    text: `${accent('WS')} ${url}`,
    color: 'cyan',
  }).start();

  const startTime = performance.now();

  return new Promise((resolve) => {
    const socket = new WebSocket(url);
    let settled = false;

    const finish = (handler, ...args) => {
      if (settled) return;
      settled = true;
      handler(...args);
      resolve();
    };

    socket.once('open', () => {
      const duration = (performance.now() - startTime).toFixed(0);
      spinner.succeed(`${pc.bold('101')} Switching Protocols ${muted(`· ${duration}ms`)}`);

      if (Object.keys(params).length > 0) {
        socket.send(JSON.stringify(params));
      }
    });

    socket.on('message', (data) => {
      const text = data.toString();
      let responseBody = text;

      try {
        responseBody = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
      }

      console.log(
        boxen(responseBody || muted('(empty response message)'), {
          title: muted('websocket message'),
          titleAlignment: 'left',
          padding: { top: 0, bottom: 0, left: 1, right: 1 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'green',
          width: getResponsiveWidth(),
        })
      );

      finish(() => socket.close());
    });

    socket.once('error', (error) => {
      finish(() => spinner.fail(pc.red(`WebSocket failed: ${error.message}`)));
    });

    socket.once('close', (code, reason) => {
      if (!settled) {
        const details = reason.toString() ? `: ${reason.toString()}` : '';
        finish(() => spinner.succeed(`Connection closed (${code}${details})`));
      }
    });
  });
}
