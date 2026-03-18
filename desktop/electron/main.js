const { app, BrowserWindow, globalShortcut, ipcMain, shell, Notification, screen } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let chatWindow = null;
let detailWindow = null;
let authWindow = null;
let clickThrough = false;

function applyClickThroughToAllWindows(value) {
    mainWindow?.setIgnoreMouseEvents(value, { forward: true });
    if (chatWindow && !chatWindow.isDestroyed()) chatWindow.setIgnoreMouseEvents(value, { forward: true });
    if (detailWindow && !detailWindow.isDestroyed()) detailWindow.setIgnoreMouseEvents(value, { forward: true });
}

const API_URL = 'http://localhost:4000';
const RENDERER_URL = `file://${path.join(__dirname, '../dist-renderer/index.html')}`;
const DESKTOP_CALLBACK_PORT = 45678;

function createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 420,
        height: 680,
        x: width - 440,
        y: 40,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        skipTaskbar: false,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
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

    detailWindow = new BrowserWindow({
        width: 420,
        height: 640,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
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

    chatWindow = new BrowserWindow({
        width: 380,
        height: 520,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
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

    const createWin = new BrowserWindow({
        width,
        height,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
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

    const dropsWin = new BrowserWindow({
        width,
        height,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
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
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"><title>Wakfu LFG</title></head>
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
    createMainWindow();
    startOAuthCallbackServer();

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
    shell.openExternal('http://localhost:3000/wiki');
});

ipcMain.handle('open-login', () => {
    const loginUrl = `${API_URL}/auth/discord?from=desktop`;
    
    const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        frame: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    
    authWindow.loadURL(loginUrl);
    
    // Check for token in URL
    const checkForToken = () => {
        if (authWindow.isDestroyed()) return;
        const url = authWindow.webContents.getURL();
        if (url && url.includes('token=')) {
            try {
                const urlObj = new URL(url);
                const token = urlObj.searchParams.get('token');
                if (token && mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('oauth-token', token);
                }
            } catch(e) {}
        }
    };
    
    authWindow.webContents.on('did-finish-load', () => {
        checkForToken();
    });
    
    // Also try to get token via executeJavaScript
    authWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            if (authWindow.isDestroyed()) return;
            authWindow.webContents.executeJavaScript(`
                (function() {
                    var token = sessionStorage.getItem('oauth_token');
                    if (token) return token;
                    var url = window.location.href;
                    var match = url.match(/token=([^&]+)/);
                    return match ? match[1] : null;
                })();
            `).then((token) => {
                if (token && mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('oauth-token', token);
                }
            }).catch(() => {});
        }, 1000);
    });
    
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
