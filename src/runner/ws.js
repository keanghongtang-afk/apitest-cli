import pc from 'picocolors';
import boxen from 'boxen';
import ora from 'ora';
import inquirer from 'inquirer';
import { ExitPromptError } from '@inquirer/core';
import WebSocket from 'ws';
import { getResponsiveWidth } from './http.js';

const accent = pc.cyan;
const muted = pc.gray;

async function promptForMessageParams() {
  const messageParams = {};
  const { addMessageParams } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addMessageParams',
      message: `${accent('❯')} Add JSON message parameters?`,
      default: false,
    },
  ]);

  if (!addMessageParams) return messageParams;

  let addingMessageParams = true;
  while (addingMessageParams) {
    const { key, value, next } = await inquirer.prompt([
      { type: 'input', name: 'key', message: '  parameter name' },
      { type: 'input', name: 'value', message: '  parameter value' },
      { type: 'confirm', name: 'next', message: '  add another?', default: false },
    ]);

    if (key.trim()) messageParams[key.trim()] = value;
    addingMessageParams = next;
  }

  return messageParams;
}

export async function executeWebSocket(url, params = {}, registerInterrupt = () => {}) {
  const spinner = ora({
    text: `${accent('WS')} ${url}`,
    color: 'cyan',
  }).start();

  const startTime = performance.now();

  return new Promise((resolve) => {
    const socket = new WebSocket(url);
    let settled = false;
    const messageQueue = [];
    const messageWaiters = [];

    registerInterrupt(() => socket.close());

    const finish = (handler, ...args) => {
      if (settled) return;
      settled = true;
      registerInterrupt(null);
      while (messageWaiters.length > 0) messageWaiters.shift()(false);
      handler(...args);
      resolve();
    };

    const waitForMessage = () => {
      if (messageQueue.length > 0) return Promise.resolve(messageQueue.shift());
      return new Promise((messageResolve) => messageWaiters.push(messageResolve));
    };

    socket.once('open', async () => {
      const duration = (performance.now() - startTime).toFixed(0);
      spinner.succeed(`${pc.bold('101')} Switching Protocols ${muted(`· ${duration}ms`)}`);
      console.log(muted('  Press Ctrl+C to close this connection and return to test type selection.'));

      if (Object.keys(params).length > 0) {
        socket.send(JSON.stringify(params));
        if (!(await waitForMessage())) return;
      }

      promptForPayload();
    });

    async function promptForPayload() {
      while (!settled && socket.readyState === WebSocket.OPEN) {
        try {
          const payload = await promptForMessageParams();

          if (socket.readyState === WebSocket.OPEN && Object.keys(payload).length > 0) {
            socket.send(JSON.stringify(payload));
            if (!(await waitForMessage())) return;
          }
        } catch (error) {
          if (error instanceof ExitPromptError) {
            socket.close();
            return;
          }
          finish(() => spinner.fail(pc.red(`Payload failed: ${error.message}`)));
          return;
        }
      }
    }

    socket.on('message', (data) => {
      const text = data.toString();
      let responseBody = text;

      try {
        responseBody = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
      }

      process.stdout.write('\n');
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
      if (messageWaiters.length > 0) {
        messageWaiters.shift()(true);
      } else {
        messageQueue.push(true);
      }
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
