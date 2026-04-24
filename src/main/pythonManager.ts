import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import { app } from 'electron';

let pythonProcess: ChildProcess | null = null;
const PORT = 18230;

function getBackendPath(): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return path.join(process.cwd(), 'backend', 'main.py');
  }
  return path.join(process.resourcesPath, 'backend', 'main.py');
}

const HOST = app.isPackaged ? '127.0.0.1' : '0.0.0.0';

export function startPython(): Promise<void> {
  return new Promise((resolve, reject) => {
    const mainPy = getBackendPath();
    const env = { ...process.env, YOURMEMO_DEV: app.isPackaged ? '' : '1' };
    pythonProcess = spawn('python3', [
      '-m', 'uvicorn', 'main:app', '--port', String(PORT), '--host', HOST,
    ], {
      cwd: path.dirname(mainPy),
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    pythonProcess.stderr?.on('data', (data: Buffer) => {
      console.log(`[python] ${data.toString().trim()}`);
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python backend:', err);
      reject(err);
    });

    waitForHealth(resolve, reject, 30);
  });
}

function waitForHealth(resolve: () => void, reject: (e: Error) => void, retries: number) {
  if (retries <= 0) {
    reject(new Error('Python backend health check timed out'));
    return;
  }

  const req = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
    if (res.statusCode === 200) {
      resolve();
    } else {
      setTimeout(() => waitForHealth(resolve, reject, retries - 1), 500);
    }
  });

  req.on('error', () => {
    setTimeout(() => waitForHealth(resolve, reject, retries - 1), 500);
  });

  req.end();
}

export function stopPython() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}
