const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_LIBRARY_ROOT = path.join(app.getPath('desktop'), 'STL Library');
const DEFAULT_WATCH_SOURCE = path.join(app.getPath('desktop'), 'STL FILES');
const MODEL_EXTENSIONS = new Set(['.stl']);

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  const configPath = getConfigPath();
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.libraryRoot && fs.existsSync(parsed.libraryRoot)) {
      return {
        watchSourceRoot: DEFAULT_WATCH_SOURCE,
        knownSourceFiles: undefined,
        ...parsed,
      };
    }
  } catch {
    // no config yet, fall through to default
  }
  return { libraryRoot: DEFAULT_LIBRARY_ROOT, watchSourceRoot: DEFAULT_WATCH_SOURCE, knownSourceFiles: undefined };
}

function saveConfig(config) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

let config = loadConfig();

function getNotesPath() {
  return path.join(app.getPath('userData'), 'notes.json');
}

function loadNotes() {
  try {
    return JSON.parse(fs.readFileSync(getNotesPath(), 'utf-8'));
  } catch {
    return {};
  }
}

function saveNotes(notes) {
  fs.writeFileSync(getNotesPath(), JSON.stringify(notes, null, 2), 'utf-8');
}

let notes = loadNotes();

function migrateNoteKey(oldRelPath, newRelPath) {
  if (oldRelPath === newRelPath) return;
  if (!(oldRelPath in notes)) return;
  notes[newRelPath] = notes[oldRelPath];
  delete notes[oldRelPath];
  saveNotes(notes);
}

const TRASH_DIR = path.join(app.getPath('userData'), 'trash');

function ensureTrashDir() {
  if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR, { recursive: true });
}

// Resolve a relative path (posix-style, from the library root) to an absolute
// path, refusing to escape the library root.
function resolveSafe(relPath) {
  const root = path.resolve(config.libraryRoot);
  const target = path.resolve(root, relPath || '.');
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Path escapes library root');
  }
  return target;
}

function toRelPath(absPath) {
  const root = path.resolve(config.libraryRoot);
  return path.relative(root, absPath).split(path.sep).join('/');
}

function buildTree(absDir) {
  const name = path.basename(absDir);
  const node = { name, relPath: toRelPath(absDir), children: [], fileCount: 0, totalFileCount: 0 };
  let entries = [];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return node;
  }
  node.fileCount = entries.filter(
    (e) => e.isFile() && MODEL_EXTENSIONS.has(path.extname(e.name).toLowerCase())
  ).length;
  node.totalFileCount = node.fileCount;
  entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((e) => {
      const child = buildTree(path.join(absDir, e.name));
      node.children.push(child);
      node.totalFileCount += child.totalFileCount;
    });
  return node;
}

function ensureLibraryRoot() {
  if (!fs.existsSync(config.libraryRoot)) {
    fs.mkdirSync(config.libraryRoot, { recursive: true });
  }
}

function uniqueDestPath(destDir, filename) {
  let candidate = path.join(destDir, filename);
  if (!fs.existsSync(candidate)) return candidate;
  const ext = path.extname(filename);
  const base = filename.slice(0, filename.length - ext.length);
  let n = 1;
  do {
    candidate = path.join(destDir, `${base} (${n})${ext}`);
    n += 1;
  } while (fs.existsSync(candidate));
  return candidate;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStableSize(absPath, retries = 10, intervalMs = 500) {
  let lastSize = -1;
  for (let i = 0; i < retries; i += 1) {
    let size;
    try {
      size = fs.statSync(absPath).size;
    } catch {
      return false;
    }
    if (size === lastSize) return true;
    lastSize = size;
    await delay(intervalMs);
  }
  return true;
}

function notifyLibraryChanged() {
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('library:changed'));
}

let syncInProgress = false;

async function syncNewFilesFromSource() {
  if (syncInProgress) return;
  if (!config.watchSourceRoot || !fs.existsSync(config.watchSourceRoot)) return;
  syncInProgress = true;
  try {
    let entries = [];
    try {
      entries = fs.readdirSync(config.watchSourceRoot, { withFileTypes: true });
    } catch {
      return;
    }
    const sourceFiles = entries
      .filter((e) => e.isFile() && MODEL_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name);

    if (!config.knownSourceFiles) {
      // First run: baseline everything currently there so nothing pre-existing gets duplicated.
      config = { ...config, knownSourceFiles: sourceFiles };
      saveConfig(config);
      return;
    }

    const known = new Set(config.knownSourceFiles);
    const newFiles = sourceFiles.filter((name) => !known.has(name));
    if (newFiles.length === 0) return;

    ensureLibraryRoot();
    let copiedAny = false;
    for (const name of newFiles) {
      const srcAbs = path.join(config.watchSourceRoot, name);
      try {
        await waitForStableSize(srcAbs);
        const destAbs = uniqueDestPath(path.resolve(config.libraryRoot), name);
        fs.copyFileSync(srcAbs, destAbs);
        copiedAny = true;
      } catch {
        // skip this file, it'll be retried on the next sync pass since it's still not in `known`
        continue;
      }
      known.add(name);
    }

    config = { ...config, knownSourceFiles: [...known] };
    saveConfig(config);
    if (copiedAny) notifyLibraryChanged();
  } finally {
    syncInProgress = false;
  }
}

let watchDebounce = null;

function startSourceWatcher() {
  if (!config.watchSourceRoot || !fs.existsSync(config.watchSourceRoot)) return;
  try {
    fs.watch(config.watchSourceRoot, () => {
      clearTimeout(watchDebounce);
      watchDebounce = setTimeout(() => {
        syncNewFilesFromSource();
      }, 1500);
    });
  } catch {
    // watching isn't available on this path, ignore
  }
}

function registerIpcHandlers() {
  ipcMain.handle('config:get', () => config);

  ipcMain.handle('config:chooseLibraryRoot', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      defaultPath: config.libraryRoot,
      title: 'Choose STL Library folder',
    });
    if (result.canceled || !result.filePaths[0]) return config;
    config = { ...config, libraryRoot: result.filePaths[0] };
    saveConfig(config);
    return config;
  });

  ipcMain.handle('tree:get', () => {
    ensureLibraryRoot();
    return buildTree(path.resolve(config.libraryRoot));
  });

  ipcMain.handle('files:list', (_evt, relPath) => {
    const absDir = resolveSafe(relPath);
    // Root ("All Files / Uncategorized") only ever shows files sitting directly in
    // it, since anything filed into a category has been deliberately sorted out of
    // that bucket. Every other (sub)category rolls up files from its subcategories
    // too, so viewing a parent category shows everything filed under it.
    const recursive = relPath !== '';

    function collect(dir) {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return [];
      }
      const files = entries
        .filter((e) => e.isFile() && MODEL_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
        .map((e) => {
          const abs = path.join(dir, e.name);
          const stat = fs.statSync(abs);
          return {
            name: e.name,
            relPath: toRelPath(abs),
            size: stat.size,
            mtime: stat.mtimeMs,
            ext: path.extname(e.name).toLowerCase(),
          };
        });
      if (!recursive) return files;
      const subDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));
      subDirs.forEach((d) => {
        files.push(...collect(path.join(dir, d.name)));
      });
      return files;
    }

    return collect(absDir).sort((a, b) => a.name.localeCompare(b.name));
  });

  ipcMain.handle('file:read', (_evt, relPath) => {
    const abs = resolveSafe(relPath);
    return fs.readFileSync(abs);
  });

  ipcMain.handle('file:rename', (_evt, relPath, newName) => {
    const abs = resolveSafe(relPath);
    const dir = path.dirname(abs);
    const ext = path.extname(abs);
    const safeName = newName.trim().replace(/[\\/:*?"<>|]/g, '_');
    const finalName = safeName.toLowerCase().endsWith(ext.toLowerCase()) ? safeName : safeName + ext;
    const dest = path.join(dir, finalName);
    if (fs.existsSync(dest) && dest !== abs) {
      throw new Error(`A file named "${finalName}" already exists here.`);
    }
    fs.renameSync(abs, dest);
    const newRelPath = toRelPath(dest);
    migrateNoteKey(relPath, newRelPath);
    return { relPath: newRelPath };
  });

  ipcMain.handle('file:move', (_evt, relPath, destDirRelPath) => {
    const abs = resolveSafe(relPath);
    const destDir = resolveSafe(destDirRelPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, path.basename(abs));
    if (fs.existsSync(dest) && dest !== abs) {
      throw new Error('A file with that name already exists in the destination folder.');
    }
    fs.renameSync(abs, dest);
    const newRelPath = toRelPath(dest);
    migrateNoteKey(relPath, newRelPath);
    return { relPath: newRelPath };
  });

  ipcMain.handle('category:create', (_evt, parentRelPath, name) => {
    const parentAbs = resolveSafe(parentRelPath);
    const safeName = name.trim().replace(/[\\/:*?"<>|]/g, '_');
    if (!safeName) throw new Error('Category name cannot be empty.');
    const abs = path.join(parentAbs, safeName);
    if (fs.existsSync(abs)) throw new Error('A category with that name already exists here.');
    fs.mkdirSync(abs, { recursive: true });
    return { relPath: toRelPath(abs) };
  });

  ipcMain.handle('category:delete', (_evt, relPath) => {
    const abs = resolveSafe(relPath);
    if (abs === path.resolve(config.libraryRoot)) {
      throw new Error('Cannot delete the library root.');
    }
    const entries = fs.readdirSync(abs);
    if (entries.length > 0) {
      throw new Error('This category is not empty. Move or delete its contents first.');
    }
    fs.rmdirSync(abs);
    return { ok: true };
  });

  ipcMain.handle('file:reveal', (_evt, relPath) => {
    shell.showItemInFolder(resolveSafe(relPath));
  });

  ipcMain.handle('file:delete', (_evt, relPath) => {
    const abs = resolveSafe(relPath);
    ensureTrashDir();
    const trashName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${path.basename(abs)}`;
    fs.renameSync(abs, path.join(TRASH_DIR, trashName));
    return { trashName, originalRelPath: relPath };
  });

  ipcMain.handle('file:restore', (_evt, trashName, originalRelPath) => {
    const trashAbs = path.join(TRASH_DIR, trashName);
    if (!fs.existsSync(trashAbs)) throw new Error('That file is no longer in the trash.');
    const destAbs = resolveSafe(originalRelPath);
    const destDir = path.dirname(destAbs);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const finalDest = fs.existsSync(destAbs) ? uniqueDestPath(destDir, path.basename(destAbs)) : destAbs;
    fs.renameSync(trashAbs, finalDest);
    const relPath = toRelPath(finalDest);
    migrateNoteKey(originalRelPath, relPath);
    return { relPath };
  });

  ipcMain.handle('file:import', async (_evt, destDirRelPath) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'STL Models', extensions: ['stl'] }],
      title: 'Import STL files',
    });
    if (result.canceled || result.filePaths.length === 0) return { imported: [] };

    const destDir = resolveSafe(destDirRelPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const imported = [];
    for (const srcAbs of result.filePaths) {
      try {
        const destAbs = uniqueDestPath(destDir, path.basename(srcAbs));
        fs.copyFileSync(srcAbs, destAbs);
        imported.push(toRelPath(destAbs));
      } catch {
        continue;
      }
    }
    return { imported };
  });

  ipcMain.handle('notes:get', () => notes);

  ipcMain.handle('notes:set', (_evt, relPath, text) => {
    if (text && text.trim()) {
      notes[relPath] = text;
    } else {
      delete notes[relPath];
    }
    saveNotes(notes);
    return { ok: true };
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#202020',
    backgroundMaterial: 'mica',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#242424',
      symbolColor: '#e8e8e8',
      height: 44,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  ensureLibraryRoot();
  registerIpcHandlers();
  await syncNewFilesFromSource();
  createWindow();
  startSourceWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
