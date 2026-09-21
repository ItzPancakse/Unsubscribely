import { app, BrowserWindow } from 'electron';
import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

let mainWindow;
let serverProcess;
const serverPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../server.js'
);
dotenv.config({ path: path.join(app.getAppPath(), '.env') });

async function waitForServer() {
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            const response = await fetch('http://127.0.0.1:3000/');
            if (response.ok) return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    throw new Error('The local server did not start on port 3000');
}

async function createWindow() {
    await waitForServer();
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    mainWindow.loadURL('http://127.0.0.1:3000');
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        console.error(`Failed to load app: ${errorCode} ${errorDescription}`);
    });
}

app.whenReady().then(() => {
    serverProcess = fork(serverPath, [], {
        env: process.env,
        stdio: 'inherit',
    });
    createWindow().catch((error) => {
        console.error(error);
        app.quit();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    serverProcess?.kill();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
