const { app, BrowserWindow, globalShortcut, ipcMain, shell, Notification, screen } = require('electron');
const path = require('path');
const http = require('http');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let chatWindow = null;
let detailWindow = null;
let authWindow = null;
let clickThrough = false;
let updateCheckInterval = null;
const resizeSessions = new Map();

function sendUpdaterStatus(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater-status', payload);
    }
}

function applyClickThroughToAllWindows(value) {
    mainWindow?.setIgnoreMouseEvents(value, { forward: true });
    if (chatWindow && !chatWindow.isDestroyed()) chatWindow.setIgnoreMouseEvents(value, { forward: true });
    if (detailWindow && !detailWindow.isDestroyed()) detailWindow.setIgnoreMouseEvents(value, { forward: true });
}

const API_URL = process.env.WAKGROUP_API_URL || 'https://wakgroup.onrender.com';
const WEB_URL = process.env.WAKGROUP_WEB_URL || 'https://wakgroup.vercel.app';
const RENDERER_URL = `file://${path.join(__dirname, '../dist-renderer/index.html')}`;
const DESKTOP_CALLBACK_PORT = 45678;
const APP_ICON = path.join(__dirname, '../assets/icon.ico');
let downloadedUpdateAvailable = false;
let isInstallingUpdate = false;

function createSecureWindowOptions(overrides = {}) {
    return {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: path.join(__dirname, 'preload.js'),
        ...overrides,
    };
}

function createOverlayWindow(options = {}) {
    const {
        minWidth = 340,
        minHeight = 420,
        ...rest
    } = options;

    return new BrowserWindow({
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        roundedCorners: true,
        alwaysOnTop: true,
        resizable: true,
        hasShadow: false,
        icon: APP_ICON,
        minWidth,
        minHeight,
        webPreferences: {
            ...createSecureWindowOptions(),
        },
        ...rest,
    });
}

function installDownloadedUpdate({ silent = true, forceRunAfter = false } = {}) {
    if (!downloadedUpdateAvailable || isInstallingUpdate) {
        return false;
    }

    isInstallingUpdate = true;
    setImmediate(() => autoUpdater.quitAndInstall(silent, forceRunAfter));
    return true;
}

function isAllowedExternalUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);
        const allowedOrigins = new Set([
            new URL(API_URL).origin,
            new URL(WEB_URL).origin,
            'https://discord.com',
            'https://www.discord.com',
        ]);

        if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port === String(DESKTOP_CALLBACK_PORT)) {
            return true;
        }

        return url.protocol === 'https:' && allowedOrigins.has(url.origin);
    } catch {
        return false;
    }
}

function hardenAuthWindow(win) {
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, targetUrl) => {
        if (!isAllowedExternalUrl(targetUrl)) {
            event.preventDefault();
        }
    });
}

function setupAutoUpdater() {
    if (!app.isPackaged) {
        return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('error', (error) => {
        console.error('Auto-update error:', error);
        isInstallingUpdate = false;
        sendUpdaterStatus({
            type: 'error',
            message: error?.message || 'No se pudo completar la actualizacion.',
        });
    });

    autoUpdater.on('update-available', (info) => {
        sendUpdaterStatus({
            type: 'available',
            version: info.version,
            detail: 'Hay una nueva version lista. Puedes decidir si deseas descargarla ahora o mas tarde.',
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        sendUpdaterStatus({
            type: 'downloading',
            percent: progress?.percent || 0,
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        downloadedUpdateAvailable = true;
        sendUpdaterStatus({
            type: 'downloaded',
            version: info.version,
            detail: 'La actualizacion ya esta lista. Se instalara en silencio al cerrar la app o puedes aplicarla ahora.',
        });
    });

    autoUpdater.checkForUpdates().catch((error) => {
        console.error('Initial update check failed:', error);
    });

    updateCheckInterval = setInterval(() => {
        autoUpdater.checkForUpdates().catch((error) => {
            console.error('Scheduled update check failed:', error);
        });
    }, 6 * 60 * 60 * 1000);
}

function createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = createOverlayWindow({
        width: 420,
        height: 680,
        x: width - 440,
        y: 40,
        skipTaskbar: false,
        minWidth: 360,
        minHeight: 560,
    });

    mainWindow.loadURL(RENDERER_URL);

    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setIgnoreMouseEvents(false);

    // Keep always on top
    mainWindow.on('blur', () => {
        if (clickThrough) return;
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
    });
}

function createDetailWindow(groupId, isPvp = false) {
    if (detailWindow && !detailWindow.isDestroyed()) {
        detailWindow.focus();
        detailWindow.loadURL(`${RENDERER_URL}#${isPvp ? 'pvp' : 'group'}/${groupId}`);
        return;
    }

    detailWindow = createOverlayWindow({
        width: 420,
        height: 640,
        minWidth: 360,
        minHeight: 520,
    });

    detailWindow.loadURL(`${RENDERER_URL}#${isPvp ? 'pvp' : 'group'}/${groupId}`);
    detailWindow.setAlwaysOnTop(true, 'screen-saver');
    detailWindow.on('closed', () => { detailWindow = null; });
}

function createChatWindow(groupId) {
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.focus();
        chatWindow.loadURL(`${RENDERER_URL}#chat/${groupId}`);
        return;
    }

    chatWindow = createOverlayWindow({
        width: 380,
        height: 520,
        minWidth: 340,
        minHeight: 420,
    });

    chatWindow.loadURL(`${RENDERER_URL}#chat/${groupId}`);
    chatWindow.setAlwaysOnTop(true, 'screen-saver');
    chatWindow.on('closed', () => { chatWindow = null; });
}

function createCreateWindow(type) {
    const hash = type === 'pvp' ? 'create-pvp' : 'create-pve';
    const width = 380;
    const height = 580;

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const x = Math.round(screenWidth / 2 - width / 2);
    const y = Math.round(screenHeight / 2 - height / 2);

    const createWin = createOverlayWindow({
        width,
        height,
        x,
        y,
        minWidth: 360,
        minHeight: 500,
    });

    createWin.loadURL(`${RENDERER_URL}#${hash}`);
    createWin.setAlwaysOnTop(true, 'screen-saver');
}

function createDropsWindow(dungeonId, selectedDrops = []) {
    const width = 360;
    const height = 520;
    const hash = `drops/${dungeonId}${selectedDrops.length > 0 ? '?' + selectedDrops.join(',') : ''}`;

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const x = Math.round(screenWidth / 2 - width / 2);
    const y = Math.round(screenHeight / 2 - height / 2);

    const dropsWin = createOverlayWindow({
        width,
        height,
        x,
        y,
        minWidth: 320,
        minHeight: 420,
    });

    dropsWin.loadURL(`${RENDERER_URL}#${hash}`);
    dropsWin.setAlwaysOnTop(true, 'screen-saver');
}

function startOAuthCallbackServer() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://localhost:${DESKTOP_CALLBACK_PORT}`);
        if (url.pathname === '/callback' && req.method === 'GET') {
            const token = url.searchParams.get('token');
            if (token && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('oauth-token', token);
            }
            if (authWindow && !authWindow.isDestroyed()) {
                authWindow.close();
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"><title>WakGroup</title></head>
                <body style="font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <p style="text-align:center;">✅ Iniciado sesión en la mini app.<br>Puedes cerrar esta pestaña.</p>
                </body></html>
            `);
            return;
        }
        res.writeHead(404);
        res.end();
    });
    server.listen(DESKTOP_CALLBACK_PORT, '127.0.0.1', () => {
        console.log(`OAuth callback server listening on http://127.0.0.1:${DESKTOP_CALLBACK_PORT}`);
    });
}

app.whenReady().then(() => {
    app.setAppUserModelId('com.wakgroup.desktop');
    createMainWindow();
    startOAuthCallbackServer();
    setupAutoUpdater();

    // Ctrl+Alt+W — toggle click-through en todas las ventanas
    globalShortcut.register('CommandOrControl+Alt+W', () => {
        clickThrough = !clickThrough;
        applyClickThroughToAllWindows(clickThrough);
        mainWindow?.webContents.send('click-through-changed', clickThrough);
        chatWindow?.webContents?.send('click-through-changed', clickThrough);
        detailWindow?.webContents?.send('click-through-changed', clickThrough);
    });

    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('will-quit', () => {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
    }
});

app.on('before-quit', (event) => {
    if (downloadedUpdateAvailable && !isInstallingUpdate) {
        event.preventDefault();
        installDownloadedUpdate({ silent: true, forceRunAfter: false });
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-api-url', () => API_URL);

ipcMain.handle('set-opacity', (event, value) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setOpacity(value);
});

ipcMain.handle('toggle-click-through', () => {
    clickThrough = !clickThrough;
    applyClickThroughToAllWindows(clickThrough);
    mainWindow?.webContents.send('click-through-changed', clickThrough);
    chatWindow?.webContents?.send('click-through-changed', clickThrough);
    detailWindow?.webContents?.send('click-through-changed', clickThrough);
    return clickThrough;
});

ipcMain.handle('start-window-resize', (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !payload?.edge) return false;

    resizeSessions.set(event.sender.id, {
        edge: payload.edge,
        startBounds: win.getBounds(),
        startX: Number(payload.screenX),
        startY: Number(payload.screenY),
        minWidth: win.getMinimumSize()[0] || 320,
        minHeight: win.getMinimumSize()[1] || 320,
    });

    return true;
});

ipcMain.handle('update-window-resize', (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const session = resizeSessions.get(event.sender.id);
    if (!win || !session) return false;

    const deltaX = Number(payload.screenX) - session.startX;
    const deltaY = Number(payload.screenY) - session.startY;
    const nextBounds = { ...session.startBounds };
    const edge = session.edge;

    if (edge.includes('e')) {
        nextBounds.width = Math.max(session.minWidth, session.startBounds.width + deltaX);
    }

    if (edge.includes('s')) {
        nextBounds.height = Math.max(session.minHeight, session.startBounds.height + deltaY);
    }

    if (edge.includes('w')) {
        const width = Math.max(session.minWidth, session.startBounds.width - deltaX);
        nextBounds.x = session.startBounds.x + (session.startBounds.width - width);
        nextBounds.width = width;
    }

    if (edge.includes('n')) {
        const height = Math.max(session.minHeight, session.startBounds.height - deltaY);
        nextBounds.y = session.startBounds.y + (session.startBounds.height - height);
        nextBounds.height = height;
    }

    win.setBounds(nextBounds);
    return true;
});

ipcMain.handle('end-window-resize', (event) => {
    resizeSessions.delete(event.sender.id);
    return true;
});

ipcMain.handle('download-update', async () => {
    await autoUpdater.downloadUpdate();
    return true;
});

ipcMain.handle('install-update', async () => {
    return installDownloadedUpdate({ silent: true, forceRunAfter: true });
});

ipcMain.handle('open-group-detail', (_, groupId) => {
    createDetailWindow(groupId, false);
});

ipcMain.handle('open-pvp-group-detail', (_, groupId) => {
    createDetailWindow(groupId, true);
});

ipcMain.handle('open-chat', (_, groupId) => {
    createChatWindow(groupId);
});

ipcMain.handle('open-create-group', (_, type) => {
    createCreateWindow(type);
});

ipcMain.handle('open-drops', (_, { dungeonId, selectedDrops }) => {
    createDropsWindow(dungeonId, selectedDrops);
});

ipcMain.handle('close-current-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.handle('minimize-current-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
});

ipcMain.handle('open-wiki', () => {
    shell.openExternal(`${WEB_URL}/wiki`);
});

ipcMain.handle('open-login', () => {
    const loginUrl = `${API_URL}/auth/discord?from=desktop&desktop_callback_port=${DESKTOP_CALLBACK_PORT}`;
    
    authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        frame: true,
        parent: mainWindow,
        icon: APP_ICON,
        webPreferences: {
            ...createSecureWindowOptions(),
        },
    });
    hardenAuthWindow(authWindow);
    authWindow.loadURL(loginUrl);
    
    authWindow.on('closed', () => {
        authWindow = null;
    });
});

ipcMain.handle('close-window', () => {
    mainWindow?.close();
});
ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize();
});

ipcMain.handle('show-notification', (_, { title, body }) => {
    if (Notification.isSupported()) {
        new Notification({ title, body, silent: false }).show();
    }
});
