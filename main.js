const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { desktopCapturer } = require('electron');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Listen for resize-window event and resize accordingly
  ipcMain.on('resize-window', (event, { width, height }) => {
    // Get the dimensions of the primary display
    const { workAreaSize } = screen.getPrimaryDisplay();

    // Position the window to the bottom left corner
    const x = 0;
    const y = workAreaSize.height - height;

    // Set the window size and position
    mainWindow.setSize(width, height);
    mainWindow.setPosition(x, y);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Screen capturing
ipcMain.handle('get-sources', async (event) => {
  const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
  return sources;
});
