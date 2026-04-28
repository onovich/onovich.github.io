const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { existsSync, copyFileSync, mkdirSync } = require('fs');
const { spawn } = require('child_process');
const simpleGit = require('simple-git');

const rootDir = path.resolve(__dirname, '..');
const siteDir = path.join(rootDir, 'site');
const contentDir = path.join(siteDir, 'src', 'content');
const imagesDir = path.join(siteDir, 'public', 'images');

let devServerProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (devServerProcess) devServerProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('content:list', async () => {
  const files = await fs.readdir(contentDir);
  return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
});

ipcMain.handle('content:read', async (_event, section) => {
  const file = path.join(contentDir, `${section}.json`);
  const text = await fs.readFile(file, 'utf-8');
  return JSON.parse(text);
});

ipcMain.handle('content:write', async (_event, section, data) => {
  const file = path.join(contentDir, `${section}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  return true;
});

ipcMain.handle('image:import', async (_event, section) => {
  const result = await dialog.showOpenDialog({
    title: '选择图片',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
    ],
  });

  if (result.canceled) return [];

  const targetDir = path.join(imagesDir, section);
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

  const imported = [];
  for (const source of result.filePaths) {
    const filename = path.basename(source);
    const target = path.join(targetDir, filename);
    copyFileSync(source, target);
    imported.push(`/images/${section}/${filename.replace(/\\/g, '/')}`);
  }
  return imported;
});

ipcMain.handle('preview:start', async () => {
  if (devServerProcess) return 'http://localhost:4321';

  devServerProcess = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: siteDir,
    shell: true,
    stdio: 'ignore',
  });

  devServerProcess.on('exit', () => { devServerProcess = null; });
  setTimeout(() => shell.openExternal('http://localhost:4321'), 1200);
  return 'http://localhost:4321';
});

ipcMain.handle('publish', async (_event, message) => {
  const git = simpleGit(rootDir);
  await git.add(['site/src/content', 'site/public/images']);
  const status = await git.status();
  if (status.files.length === 0) return '没有需要发布的变更。';

  await git.commit(message || `Update site content ${new Date().toISOString()}`);
  await git.push();
  return '已提交并推送。GitHub Actions 将自动部署。';
});
