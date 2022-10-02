'use-strict';

const path = require('path');
const execa = require('execa');
const util = require('electron-util');
const { BrowserWindow, screen, ipcMain, dialog, shell, app } = require('electron');

const binary = path.join(util.fixPathForAsarUnpack(__dirname), 'binaries/video-devices');
const permissionsBinary = path.join(util.fixPathForAsarUnpack(__dirname), 'binaries/permissions');
const contentPath = path.join(util.fixPathForAsarUnpack(__dirname), 'camera/camera.html');


const PADDING = 20;

const devices = ['Default'];

try {
  devices.push(...execa.sync(binary).stdout.trim().split('\n'));
} catch { }

const config = {
  deviceName: {
    title: 'Device',
    description: 'Which device to display.',
    enum: devices,
    required: true,
    default: 'Default'
  },
  borderRadius: {
    title: 'Border Radius',
    description: 'Any valid `border-radius` value, like `10px` or `50%`.',
    type: 'string',
    required: true,
    default: '50%'
  },
  hoverOpacity: {
    title: 'Hover Opacity',
    description: 'Opacity of the window on when moused over.',
    type: 'number',
    minimum: 0,
    maximum: 1,
    default: 0.6,
    required: true
  },
  width: {
    title: 'Width',
    description: 'Width of the window.',
    type: 'number',
    minimum: 0,
    default: 128,
    required: true
  },
  height: {
    title: 'Height',
    description: 'Height of the window.',
    type: 'number',
    minimum: 0,
    default: 128,
    required: true
  }
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

  const position = getBounds(cropArea, bounds, {
    width: config.get('width'),
    height: config.get('height')
  });

  state.window = new BrowserWindow({
    ...position,
    closable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    visualEffectState: 'inactive',
    titleBarStyle: 'customButtonsOnHover',
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
      videoDeviceName: config.get('deviceName'),
      hoverOpacity: config.get('hoverOpacity'),
      borderRadius: config.get('borderRadius')
    });
  });

  return new Promise(resolve => {
    ipcMain.on('kap-camera-mount', resolve);

    // Resolve after 5 seconds to not block recording if for some reason there's no event
    setTimeout(resolve, 5000);
  });
};

const didStopRecording = ({ state }) => {
  if (state.window) {
    state.window.destroy();
  }
};

const configDescription =
  `Create a window showing the selected camera on the bottom-left corner of the recording.
The window is click-through and its hover opacity and size can be adjusted.

To move the window, hold Command before you hover over it, then click and drag it anywhere on the screen.
`;

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
    message: 'kap-camera cannot access the camera.',
    detail: 'kap-camera requires camera access to be able to show the contents of the webcam. You can grant this in the System Preferences. Afterwards, launch Kap for the changes to take effect.',
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
