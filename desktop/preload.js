const { contextBridge, ipcRenderer } = require('electron');

// Safe bridge exposed to the web UI as window.zaiqaPrint.
// Only these specific functions are available — no full Node access.
contextBridge.exposeInMainWorld('zaiqaPrint', {
  // Returns an array of connected printers: [{ name, displayName, isDefault }]
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  // Silently print raw HTML to a specific printer (no dialog).
  // opts: { html: string, deviceName: string, copies?: number }
  silentPrint: (opts) => ipcRenderer.invoke('silent-print', opts),

  // True when running inside the Electron desktop app.
  isDesktop: true,
});
