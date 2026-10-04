const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const VITE_PORT = 3000;
const VITE_URL = `http://localhost:${VITE_PORT}/pos-n-sales-system/`;

function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function start() {
  console.log('[Electron Dev] Starting Vite dev server...');
  const vitePath = path.resolve(__dirname, '../node_modules/vite/bin/vite.js');
  const viteProcess = spawn(process.execPath, [vitePath, '--port=' + VITE_PORT, '--host=0.0.0.0'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: false,
  });

  // Wait for Vite to be up
  let ready = false;
  let attempts = 0;
  while (!ready && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    ready = await checkServerReady(VITE_URL);
    attempts++;
  }

  console.log('[Electron Dev] Vite server is ready. Launching Electron POS container...');
  const electronPath = require('electron');
  const mainScript = path.resolve(__dirname, '../electron/main.cjs');

  const electronProcess = spawn(electronPath, [mainScript], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_START_URL: VITE_URL,
    },
  });

  electronProcess.on('close', (code) => {
    console.log(`[Electron Dev] Electron window closed with code ${code}. Terminating dev server...`);
    viteProcess.kill();
    process.exit(code || 0);
  });

  process.on('SIGINT', () => {
    viteProcess.kill();
    electronProcess.kill();
    process.exit(0);
  });
}

start().catch(console.error);
