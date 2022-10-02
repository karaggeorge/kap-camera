'use-strict';

const path = require('path');
const execa = require('execa');
const util = require('electron-util');
const { BrowserWindow, screen, ipcMain, dialog, shell, app } = require('electron');

const fixPath = (p) => path.join(util.fixPathForAsarUnpack(__dirname), p)

const contentPath = fixPath('camera/index.html')
const devicesBinary = fixPath('binaries/devices');
const permissionsBinary = fixPath('binaries/permissions');

const PADDING = 20;

const devices = ['Default'];

try {
  devices.push(...execa.sync(devicesBinary).stdout.trim().split('\n'));
} catch { }

const config = {
  device: {
    title: 'Device',
    description: 'Select a camera to display.',
    enum: devices,
    required: true,
    default: 'Default'
  },
  rounded: {
    title: 'Corners',
    description: 'Corners of your camera overlay.',
    enum: ['Circle', 'Rounded', 'Square'],
    required: true,
    default: 'Circle'
  },
  size: {
    title: 'Size',
    description: 'How large should the preview be?',
    enum: ['Small', 'Medium', 'Large'],
    required: true,
    default: 'Medium'
  },
};

const getBounds = (cropArea, screenBounds, { width, height }) => {
  return {
    x: cropArea.x + screenBounds.x + cropArea.width - width - PADDING,
    y: screenBounds.height - (cropArea.y + cropArea.height) + screenBounds.y + cropArea.height - height - PADDING,
    width,
    height
  };
}

const willStartRecording = async ({ state, config, apertureOptions: { screenId, cropArea } }) => {
  const hasPermissions = await ensureCameraPermission();

  if (!hasPermissions) {
    return;
  }

  const screens = screen.getAllDisplays();
  const { bounds } = screens.find(s => s.id === screenId) || {};

  const size = config.get('size') === "Small" ? 180 : config.get('size') === "Medium" ? 300 : 500

  const position = getBounds(cropArea, bounds, {
    width: size,
    height: size
  });

  state.window = new BrowserWindow({
    ...position,
    closable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    visualEffectState: 'inactive',
    titleBarStyle: 'customButtonsOnHover',
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  state.window.loadFile(contentPath);

  // state.window.openDevTools({ mode: 'detach' });

  state.window.webContents.on('did-finish-load', () => {
    state.window.webContents.send('data', {
      videoDeviceName: config.get('device'),
      borderRadius: config.get('rounded') === "Circle" ? "50%" : config.get("rounded") === "Rounded" ? "16px" : "0px"
    });
  });

  return new Promise(resolve => {
    ipcMain.on('kap-camera-mount', resolve);
    setTimeout(resolve, 5000); // Resolve in 5s if no event
  });
};

const didStopRecording = ({ state }) => {
  if (state.window) {
    state.window.destroy();
  }
};

const configDescription = `Create a window showing the selected camera on your recording`;

const openSystemPreferences = path => shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${path}`);

const hasCameraPermission = async () => {
  try {
    return (await execa(permissionsBinary)).stdout === 'true';
  } catch {
    return false;
  }
}

const ensureCameraPermission = async () => {
  const hasPermission = await hasCameraPermission();

  if (hasPermission) {
    return true;
  }

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Open System Preferences', 'Cancel'],
    defaultId: 0,
    message: 'kap-cam cannot access the camera.',
    detail: 'kap-cam needs camera access to work correctly. You can grant this in the System Preferences. Relaunch Kap for the changes to take effect.',
    cancelId: 1
  });

  if (response === 0) {
    await openSystemPreferences('Privacy_Camera');
    app.quit();
  }

  return false;
}

exports.recordServices = [{
  title: 'Show Camera',
  config,
  configDescription,
  willStartRecording,
  didStopRecording,
  willEnable: ensureCameraPermission
}];
