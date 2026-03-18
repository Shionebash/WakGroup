const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getApiUrl: () => ipcRenderer.invoke('get-api-url'),
    setOpacity: (value) => ipcRenderer.invoke('set-opacity', value),
    toggleClickThrough: () => ipcRenderer.invoke('toggle-click-through'),
    openGroupDetail: (groupId) => ipcRenderer.invoke('open-group-detail', groupId),
    openPvpGroupDetail: (groupId) => ipcRenderer.invoke('open-pvp-group-detail', groupId),
    openCreateGroup: (type) => ipcRenderer.invoke('open-create-group', type),
    openDrops: (dungeonId, selectedDrops) => ipcRenderer.invoke('open-drops', { dungeonId, selectedDrops }),
    openChat: (groupId) => ipcRenderer.invoke('open-chat', groupId),
    openWiki: () => ipcRenderer.invoke('open-wiki'),
    openLogin: () => ipcRenderer.invoke('open-login'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    closeCurrentWindow: () => ipcRenderer.invoke('close-current-window'),
    minimizeCurrentWindow: () => ipcRenderer.invoke('minimize-current-window'),
    showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
    onClickThroughChanged: (cb) => ipcRenderer.on('click-through-changed', (_, v) => cb(v)),
    onOpenChat: (cb) => ipcRenderer.on('open-chat', (_, groupId) => cb(groupId)),
    onOAuthToken: (cb) => ipcRenderer.on('oauth-token', (_, token) => cb(token)),
    onDropsSelected: (cb) => ipcRenderer.on('drops-selected', (_, drops) => cb(drops)),
});
