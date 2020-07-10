'use-strict';

const util = require('electron-util');
const path = require('path');
const {BrowserWindow, screen, systemPreferences, ipcMain} = require('electron');
const execa = require('execa');

const binary = path.join(util.fixPathForAsarUnpack(__dirname), 'video-devices');
const contentPath = path.join(util.fixPathForAsarUnpack(__dirname), 'index.html');
const PADDING = 20;

const devices = ['Default'];

try {
  devices.push(...execa.sync(binary).stdout.trim().split('\n'));
} catch {}

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
    default: 100,
    required: true
  },
  height: {
    title: 'Height',
    description: 'Height of the window.',
    type: 'number',
    minimum: 0,
    default: 100,
    required: true
  }
};

const getBounds = (cropArea, screenBounds, {width, height}) => {
  return {
    x: cropArea.x + screenBounds.x + cropArea.width - width - PADDING,
    y: screenBounds.height - (cropArea.y + cropArea.height) + screenBounds.y + cropArea.height - height - PADDING,
    width,
    height
  };
}

const willStartRecording = async ({state, config, apertureOptions: {screenId, cropArea}}) => {
  const params = new URLSearchParams({
    videoDeviceName: config.get('deviceName'),
    hoverOpacity: config.get('hoverOpacity'),
    borderRadius: config.get('borderRadius')
  }).toString();

  const screens = screen.getAllDisplays();
  const {bounds} = screens.find(s => s.id === screenId) || {};

  const position = getBounds(cropArea, bounds, {
    width: config.get('width'),
    height: config.get('height')
  });

  state.window = new BrowserWindow({
    ...position,
    closable: false,
    minimizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    titleBarStyle: 'customButtonsOnHover',
    webPreferences: {nodeIntegration: true}
  });

  // state.window.openDevTools({mode: 'detach'});

  state.window.loadFile(contentPath);

  state.window.webContents.on('did-finish-load', () => {
    state.window.webContents.send('data', {
      videoDeviceName: config.get('deviceName'),
      hoverOpacity: config.get('hoverOpacity'),
      borderRadius: config.get('borderRadius')
    });
  });

  return new Promise(resolve => {
    ipcMain.on('mount', resolve);
  })
};

const didStopRecording = ({state}) => {
  if (state.window) {
    state.window.destroy();
  }
};

const configDescription =
`Create a window showing the selected camera on the bottom-left corner of the recording.
The window is click-through and its hover opacity and size can be adjusted.

To move the window, hold Command before you hover over it, then click and drag it anywhere on the screen.
`;

const willEnable = () => systemPreferences.askForMediaAccess('camera');

exports.recordServices = [{
  title: 'Show Camera',
  config,
  configDescription,
  willStartRecording,
  didStopRecording,
  willEnable
}];
